import axios from 'axios';

const getNFLTeams = async () => {
  try {
    const teams = await axios.post('http://localhost:4000/graphql', {
      query: `
                query {
                    teamsByLeague(league: "NFL") {
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

export default getNFLTeams;
