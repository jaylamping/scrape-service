import getNFLTeams from '../api/getNFLTeams';
import getMLBTeams from '../api/getMLBTeams';

const buildDictionary = async () => {
  let dictionary: string[] = [];

  const nflTeams = await getNFLTeams();
  const mlbTeams = await getMLBTeams();

  const nflTeamArray: Array<string> = Array.from(
    new Set(
      nflTeams.map((team: string) => {
        team = team.toLowerCase();
        const words = team.split(' ');
        return words[words.length - 1];
      })
    )
  );

  const mlbTeamArray: Array<string> = Array.from(
    new Set(
      mlbTeams.map((team: string) => {
        team = team.toLowerCase();
        const words = team.split(' ');
        return words[words.length - 1];
      })
    )
  );

  dictionary = [...dictionary, ...nflTeamArray, ...mlbTeamArray];

  return dictionary;
};

export default buildDictionary;
