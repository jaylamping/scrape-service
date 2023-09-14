import buildDictionary from './buildDictionary';
import getUpcomingMatchups from '../api/getUpcomingMatchups';
import { match } from 'assert';

const getMatchupIdFromLink = async (link: string) => {
  const dictionary: Array<any> = await buildDictionary();
  const matchups: Array<object> = await getUpcomingMatchups();
  let linkArray: Array<string> = new Array();
  let matchCnt: number = 0;

  const formattedMatchups: Array<object> = matchups.map((matchup: any) => {
    const wordArray = {
      name: matchup.name
        .toLowerCase()
        .split(' ')
        .filter((word: string) => word !== 'vs')
        .sort()
        .join(''),
      id: matchup.id
    };
    return wordArray;
  });

  const slashSplitArray: Array<string> = link.split('/');

  // array of terms from link
  slashSplitArray.forEach(segment => {
    const dashSplitArray = segment.split('-');
    linkArray = [...linkArray, ...dashSplitArray];
  });

  // flattened array from dictionary
  const termsArray = dictionary.map(obj => obj.name.toLowerCase().split(' ')).flat();

  // filter out terms that are not in the dictionary and sort and concat
  const filteredTermString: string = linkArray
    .filter(term => termsArray.includes(term.toLowerCase()))
    .sort()
    .join('');

  // find matching matchup lol
  const matchingMatchup: any = formattedMatchups.find((matchup: any) => {
    return matchup.name === filteredTermString;
  });

  return matchingMatchup?.id;
};

export default getMatchupIdFromLink;
