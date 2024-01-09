const axios = require('axios');

axios.post('http://localhost:3000/api/completions', {
  messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
  model: 'gpt-4',
  temperature: 0.7,
}).then(response => {
  console.log(response.data);
}).catch(error => {
  console.error(error);
});