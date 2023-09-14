import axios from 'axios';

const getUpcomingMatchups = async () => {
  try {
    const matchups = await axios.post('http://localhost:4000/graphql', {
      query: `
                query {
                    getUpcomingMatchups {
                        name
                        id
                    }
                }
            `
    });
    return matchups.data.data.getUpcomingMatchups;
  } catch (err) {
    console.log(err);
  }
};

export default getUpcomingMatchups;
