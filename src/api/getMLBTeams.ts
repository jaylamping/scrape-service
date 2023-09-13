import axios from 'axios';

const getMLBTeams = async () => {
  try {
    const teams = await axios.post('http://localhost:4000/graphql', {
      query: `
                query {
                    teamsByLeague(league: "MLB") {
                        name
                    }
                }
            `
    });
    return teams.data.data.teamsByLeague.map((team: any) => team.name);
  } catch (err) {
    console.log(err);
  }
};

export default getMLBTeams;
