import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import buildDictionary from '../util/buildDictionary';
import getMatchupIdFromLink from '../util/getMatchupIdFromLink';
import addURLToMatchup from '../api/addURLToMatchup';

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

  await page.goto(url, { timeout: 0 });

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

    const timeout: NodeJS.Timeout = setTimeout(async () => {
      reject(`No URL found for ${url}`);
    }, 2000);

    page.on('request', async request => {
      if (request.url().endsWith('.m3u8')) {
        // need to capture the entire request object here and save as one entity
        // so i can spoof the header info down the road
        // for example
        // const b64request = btoa(JSON.stringify(request));
        // the resulting string should be what i save to DB and extract later

        clearTimeout(timeout);
        await page.close();
        resolve(request.url());
      }
    });

    await page.goto(url, { timeout: 0 });
    await page
      .waitForSelector('#video-player', { timeout: 2000 })
      .then(async () => {
        try {
          await page.click('#video-player');
        } catch (err) {
          await page.close();
          reject(`Unable to click video for ${url}`);
        }
      })
      .catch(async () => {
        await page.close();
        reject(`Unable to find video for link ${url}`);
      });
  });
};

const buffStreamScraper = async () => {
  const crawlBrowser: Browser = await initializeBrowser();
  const matchupBrowser: Browser = await initializeBrowser();
  const dictionary: Array<object> = await buildDictionary();
  let pageCounter = 0;

  await crawlPage(crawlBrowser, URL, dictionary, pageCounter);
  crawlBrowser.close();

  console.log('Crawling complete. Moving to matchup pages...');

  for (const link of matchupLinks) {
    let streamUrl: string = '';

    try {
      streamUrl = await scrapeMatchupPage(matchupBrowser, link);
    } catch (err) {
      console.log(err);
    }
    const matchupId = await getMatchupIdFromLink(link);

    if (streamUrl && matchupId) {
      const matchup = await addURLToMatchup(matchupId, streamUrl);
      console.log(`URL added for matchup - ${matchup.name}`);
    }
  }

  await matchupBrowser.close();
};

export default buffStreamScraper;
