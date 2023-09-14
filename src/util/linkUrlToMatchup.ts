import buildDictionary from './buildDictionary';

const linkUrlToMatchup = (pageUrl, streamUrl) => {
  const dictionary = buildDictionary();

  const matchup = dictionary[matchupUrl];
  return {
    matchup,
    streamUrl
  };
};
