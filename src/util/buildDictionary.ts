import getNFLTeams from '../api/getNFLTeams';

const buildDictionary = async () => {
  let dictionary: string[] = [];
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

  const nflTeams = await getNFLTeams();
  const nflTeamArray: Array<string> = Array.from(
    new Set(
      nflTeams.map((team: string) => {
        const words = team.split(' ');
        return words[words.length - 1];
      })
    )
  );

  dictionary = [...dictionary, ...defaults, ...nflTeamArray];

  return dictionary;
};

export default buildDictionary;
