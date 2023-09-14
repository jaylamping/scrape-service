import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import buildDictionary from '../util/buildDictionary';

puppeteer.use(StealthPlugin());

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

const clickyLink = (url: string, dictionary: Array<string>) => {
  const match = dictionary.some(word => url.includes(word)) || [...DEFAULTS].some(word => url.includes(word));
  return !visitedLinks.has(url) && !url.includes('blog') && url.charAt(url.length - 1) !== '#' && match;
};

const initializeBrowser = async () => {
  return puppeteer.launch({
    headless: 'new',
    executablePath: EXECUTABLE_PATH
  });
};

/**
 * Crawls the buffstreams website for links
 * @param browser puppeteer browser instance
 * @param url url to crawl
 * @param dictionary dictionary of words to match against
 * @returns matchup links
 */
const crawlPage = async (browser: Browser, url: string, dictionary: Array<string>, pageCounter: number) => {
  // dip out this bitch if link doesn't match dictionary
  if (pageCounter > 0 && !clickyLink(url, dictionary)) return;

  pageCounter++;

  console.log(`Navigating to ${url}`);
  visitedLinks.add(url);
  if (dictionary.some(word => url.includes(word))) {
    matchupLinks.add(url);
  }

  const page = await browser.newPage();
  await page.goto(url);

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

    const timeout: NodeJS.Timeout = setTimeout(() => {
      reject(new Error('No .m3u8 URL found within the time limit.'));
    }, 3000);

    page.on('request', async request => {
      if (request.url().endsWith('.m3u8')) {
        clearTimeout(timeout);
        resolve(request.url());
      }
    });

    await page.goto(url);
    await page.waitForSelector('#video-player');

    await page.click('#video-player');

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
  const browser = await initializeBrowser();
  const dictionary = await buildDictionary();
  let pageCounter = 0;

  const links: Set<string> = (await crawlPage(browser, URL, dictionary, pageCounter)) ?? new Set();

  for (const link of links) {
    const streamUrl = await scrapeMatchupPage(browser, link);
    console.log(streamUrl);
  }

  // await browser.close();
};

export default buffStreamScraper;
