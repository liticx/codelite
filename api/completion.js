const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

let tokenInfo = {
  value: null,
  timestamp: Date.now(),
};

async function getToken() {
  try {
    const url = "https://api.github.com/copilot_internal/v2/token";
    const headers = {
      "Authorization": "token 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",
      "Editor-Version": "vscode/1.83.0",
      "Editor-Plugin-Version": "copilot-chat/0.8.0"
    };

    const response = await axios.get(url, { headers });

    if (response.status === 200) {
      // save the token and the current time to tokenInfo
      tokenInfo = {
        value: response.data.token,
        timestamp: Date.now(),
      };
      return tokenInfo.value;
    }
  } catch (error) {
    console.error(error);
    return { error: error.message };
  }
}

let apiKeys = {
  'godlikemode': { count: 0, limit: 100000,  messages: [] },
  'sp-ea960874-e227-473b-b5b3-37b02023823b': { count: 0, limit: 1000,  messages: [] },
  'sp-1faaefb5-3089-4fce-be41-00c510db6802': { count: 0, limit: 800,  messages: [] },
  'sp-7078876f-6934-4cc7-844f-5a304503c614': { count: 0, limit: 500,  messages: [] },
  'sp-5bb3f71a-572f-45a5-acc4-ece3ef851d24': { count: 0, limit: 200,  messages: [] },
};

async function openaiAgentTest(messages, model = "gpt-4", temperature = 0.7) {
  // Refresh the token if it's older than 10 minutes
  if (!tokenInfo.value || Date.now() - tokenInfo.timestamp > 600 * 1000) {
    const newToken = await getToken();
    if (newToken.error) {
      console.error(`Error refreshing token: ${newToken.error}`);
      return;
    }
  }

  try {
    const response = await axios({
      method: 'post',
      url: "https://api.githubcopilot.com/chat/completions",
      headers: {
        "Editor-Version": "vscode/1.83.0",
        "Authorization": `Bearer ${tokenInfo.value}`,
      },
      data: {
        messages,
        model,
        temperature,
        role: "system", // You can replace "system" with the role you want
      },
      timeout: 130000
    });

    if (response.status !== 200) {
      throw new Error("Response 404");
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    return { error: error.message };
  }
}

app.post('/api/completions', async (req, res) => {
  const apiKey = req.headers['api-key'];
  if (!apiKey || !apiKeys[apiKey]) {
    return res.status(403).send('Invalid API Key.');
  }

  if (apiKeys[apiKey].count >= apiKeys[apiKey].limit) {
    return res.status(429).send('API Key usage limit exceeded.');
  }

  try {
    const { messages, model, temperature } = req.body;
    // Append the new message to the conversation history
    apiKeys[apiKey].messages.push(...messages);
    const result = await openaiAgentTest(apiKeys[apiKey].messages, model, temperature);

    // increment the usage count for the API key
    apiKeys[apiKey].count++;

    if (result.error) {
      return res.status(500).send(result.error);
    }

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

app.post('/', async (req, res) => {
  res.send('This server is used as API endpoints for https://codelite.streamlit.app');
});

module.exports = app;