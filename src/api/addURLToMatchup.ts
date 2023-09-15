import axios from 'axios';

const addURLToMatchup = async (id: string, url: string) => {
  try {
    const matchup = await axios.post('http://localhost:4000/graphql', {
      query: `
                mutation {
                    addURLToMatchup(id: ${id}, url: "${url}") {
                        name
                        id
                    }
                }
            `
    });
    return matchup.data.data.addURLToMatchup;
  } catch (err) {
    console.log(err);
  }
};

export default addURLToMatchup;
