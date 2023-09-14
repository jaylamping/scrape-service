import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import buildDictionary from '../util/buildDictionary';

puppeteer.use(StealthPlugin());

const url: string = 'https://buffstreams.app/';

const defaults = [
  'nflstreams',
  'ufcstreams',
  'boxingstreams',
  'formula1streams',
  'nbastreams',
  'nhlstreams',
  'mlbstreams',
  'ncaastreams'
];

let visitedLinks = new Set();
let matchupLinks: Set<string> = new Set();

const buffStreamScraper = async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const dictionary: Array<string> = await buildDictionary();

  let pageCounter = 0;

  /**
   * Crawls the buffstreams website for links
   * @param browser puppeteer browser instance
   * @param url url to crawl
   * @param dictionary dictionary of words to match against
   * @returns void
   */
  const crawlPage = async (browser: Browser, url: string, dictionary: Array<string>) => {
    const dictionaryMatch = dictionary.some(word => url.includes(word)) || defaults.some(word => url.includes(word));
    const matchupMatch = dictionary.some(word => url.includes(word));

    if (pageCounter > 0) {
      if (visitedLinks.has(url) || url.includes('blog') || url.charAt(url.length - 1) === '#' || !dictionaryMatch) {
        return;
      }
    }

    pageCounter++;

    console.log(`navigating to ${url}`);
    console.log('visited links: ', visitedLinks);

    visitedLinks.add(url);

    if (matchupMatch) {
      matchupLinks.add(url);
    }

    const page = await browser.newPage();
    await page.goto(url);

    const links = await page.$$eval(
      'a',
      (links, url) => {
        return links.map(link => link.href).filter(href => href.includes(url));
      },
      url
    );

    await page.close();

    for (const link of links) {
      await crawlPage(browser, link, dictionary);
    }

    return matchupLinks;
  };

  /**
   * Scrapes the matchup page for the video source
   * @param browser puppeteer browser instance
   * @param url url of the matchup page
   * @returns video source url
   */
  const scrapeMatchupPage = async (browser: Browser, url: string) => {
    const page = await browser.newPage();

    page.on('request', request => {
      if (request.url().endsWith('.m3u8')) {
        console.log(`Found .m3u8 URL: ${request.url()}`);
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
  };

  const links: Set<string> = (await crawlPage(browser, url, dictionary)) ?? new Set();
  [...links].map(link => {
    scrapeMatchupPage(browser, link);
  });
  //await browser.close();
};

export default buffStreamScraper;
