import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import buildDictionary from '../util/buildDictionary';

puppeteer.use(StealthPlugin());

const url: string = 'https://buffstreams.app/';

let visitedLinks = new Set();

const buffStreamScraper = async () => {
  const dictionary = await buildDictionary();
  let pageCounter = 0;
  const crawlPage = async (browser: Browser, url: string) => {
    const dictionaryMatch = dictionary.some(word => url.includes(word));
    if (pageCounter > 0) {
      if (visitedLinks.has(url) || url.includes('blog') || url.charAt(url.length - 1) === '#' || !dictionaryMatch) {
        return;
      }
    }

    pageCounter++;

    console.log(`navigating to ${url}`);
    console.log('visited links: ', visitedLinks);

    visitedLinks.add(url);

    const page = await browser.newPage();
    await page.goto(url);

    const links = await page.$$eval('a', links => {
      return links.map(link => link.href).filter(href => href.includes('https://buffstreams.app/'));
    });

    await page.close();

    for (const link of links) {
      await crawlPage(browser, link);
    }
  };

  const browser = await puppeteer.launch({ headless: 'new' });

  await crawlPage(browser, url);

  await browser.close();
};

export default buffStreamScraper;
