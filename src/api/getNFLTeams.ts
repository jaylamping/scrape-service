import axios from 'axios';

const getNFLTeams = async () => {
  try {
    const teams = await axios.post('http://localhost:4000/graphql', {
      query: `
                query {
                    teamsByLeague(league: "NFL") {
                        name
                        id
                    }
                }
            `
    });
    return teams.data.data.teamsByLeague;
  } catch (err) {
    console.log(err);
  }
};

export default getNFLTeams;
