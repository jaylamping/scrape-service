import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import buildDictionary from '../util/buildDictionary';
import getUpcomingMatchups from '../api/getUpcomingMatchups';
import getMatchupIdFromLink from '../util/getMatchupIdFromLink';

const URL = 'https://buffstreams.app/';
const EXECUTABLE_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const DEFAULTS = new Set([
  'nflstreams',
  'ufcstreams',
  'boxingstreams',
  'formula1streams',
  'nbastreams',
  'nhlstreams',
  'mlbstreams',
  'ncaastreams'
]);

let visitedLinks: Set<string> = new Set();
let matchupLinks: Set<string> = new Set();

const clickyLink = (url: string, dictionary: Array<any>) => {
  const match =
    dictionary
      .map(obj => obj.name)
      .some(arrayString =>
        arrayString.split(' ').some((word: string) => url.toLowerCase().includes(word.toLowerCase()))
      ) || [...DEFAULTS].some(word => url.includes(word));
  return !visitedLinks.has(url) && !url.includes('blog') && url.charAt(url.length - 1) !== '#' && match;
};

const initializeBrowser = async () => {
  puppeteer.use(StealthPlugin());

  return puppeteer.launch({
    headless: 'new',
    executablePath: EXECUTABLE_PATH,
    timeout: 0
  });
};

/**
 * Crawls the buffstreams website for links
 * @param browser puppeteer browser instance
 * @param url url to crawl
 * @param dictionary dictionary of words to match against
 * @returns matchup links
 */
const crawlPage = async (browser: Browser, url: string, dictionary: Array<any>, pageCounter: number) => {
  // dip out this bitch if link doesn't match dictionary
  if (pageCounter > 0 && !clickyLink(url, dictionary)) return;

  pageCounter++;

  console.log(`Navigating to ${url}`);
  visitedLinks.add(url);

  // add url to matchupLinks if dictionary matchup
  if (
    dictionary
      .map(obj => obj.name)
      .some(arrayString =>
        arrayString.split(' ').some((word: string) => url.toLowerCase().includes(word.toLowerCase()))
      )
  ) {
    matchupLinks.add(url);
  }

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);

  await page.goto(url, { waitUntil: 'load', timeout: 0 });

  const links = await page.$$eval(
    'a',
    (links, URL) => {
      return links.map(link => link.href).filter(href => href.includes(URL));
    },
    URL
  );

  await page.close();

  for (const link of links) {
    await crawlPage(browser, link, dictionary, pageCounter);
  }

  return matchupLinks;
};

/**
 * Scrapes the matchup page for the video source
 * @param browser puppeteer browser instance
 * @param url url of the matchup page
 * @returns video source url
 */
const scrapeMatchupPage = async (browser: Browser, url: string): Promise<string> => {
  return new Promise<string>(async (resolve, reject) => {
    const page: Page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    const timeout: NodeJS.Timeout = setTimeout(() => {
      reject(new Error('No .m3u8 URL found within the time limit.'));
    }, 3000);

    page.on('request', async request => {
      if (request.url().endsWith('.m3u8')) {
        clearTimeout(timeout);
        resolve(request.url());
      }
    });

    await page.goto(url, { waitUntil: 'load', timeout: 0 });
    await page.waitForSelector('#video-player');

    try {
      await page.click('#video-player');
    } catch (err) {
      reject(`Unable to click video for link ${url}`);
    }
    await page.waitForFunction(
      selector => {
        const element: HTMLVideoElement | null = document.querySelector(selector);
        return element && element.src && element.src.length > 0;
      },
      {},
      'video'
    );

    await page.close();
  });
};

const buffStreamScraper = async () => {
  const browser: Browser = await initializeBrowser();
  const dictionary: Array<object> = await buildDictionary();
  let pageCounter = 0;

  const links: Set<string> = (await crawlPage(browser, URL, dictionary, pageCounter)) ?? new Set();

  for (const link of links) {
    try {
      console.log(link);
      const streamUrl = await scrapeMatchupPage(browser, link);
      const matchupId = await getMatchupIdFromLink(link);

      if (streamUrl && matchupId) {
        console.log('YAYYYYYYY');
      }

      console.log(`Found stream for ${link}: ${streamUrl}`);
      console.log(`Matchup ID: ${matchupId}`);
    } catch (err) {
      console.log(err);
    }
  }

  //await browser.close();
};

export default buffStreamScraper;
