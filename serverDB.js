const express = require('express');
const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const app = express();

const port = 3000;

app.use(express.json());

let tokenInfo = {
  value: null,
  timestamp: Date.now(),
};

const uri = "";
const client = new MongoClient(uri);

let apiKeys;

client.connect(err => {
  if(err) throw err;
  console.log("Connected to MongoDB...");
  apiKeys = client.db("apiKeysDB").collection("apiKeys");

  // Start the server after the database connection is established.
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
});


async function getToken() {
  try {
    const url = "https://api.github.com/";
    const headers = {
      "Authorization": "token gho_asew",
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

  const key = await apiKeys.findOne({ key: apiKey });

  if (!key) {
    return res.status(403).send('Invalid API Key.');
  }

  if (key.count >= key.limit) {
    return res.status(429).send('API Key usage limit exceeded.');
  }

  try {
    const { messages, model, temperature } = req.body;
    const result = await openaiAgentTest(messages, model, temperature);

    // increment the usage count for the API key
    await apiKeys.updateOne({ key: apiKey }, { $inc: { count: 1 } });

    if (result.error) {
      return res.status(500).send(result.error);
    }

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Test the openaiAgentTest function
openaiAgentTest([{ 'role': 'system', 'content': 'You are a helpful assistant.' }])
  .then(response => console.log(response))
  .catch(error => console.error(error));

process.on('SIGINT', () => {
  client.close();
  console.log("MongoDB connection closed.");
  process.exit();
});
