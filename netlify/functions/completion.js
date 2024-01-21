const axios = require('axios');

async function makeRequest() {
  try {
    const response = await axios.get('https://api-codelite.netlify.app/.netlify/functions/completion');

    console.log(response.data);
  } catch (error) {
    console.error(`Error: ${error}`);
  }
}

makeRequest();

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
        role: "system",
      },
      timeout: 130000
    });

    if (response.status !== 200) {
      throw new Error("Response 404");
    }

    return { choices: [{ message: { role: 'assistant', content: response.data.choices[0].message.content } }] };
  } catch (error) {
    console.error(error);
    return { error: error.message };
  }
}

exports.handler = async function(event, context) {
  const data = JSON.parse(event.body);

  try {
    const { messages, model, temperature } = data;
    const result = await openaiAgentTest(messages, model, temperature);

    if (result.error) {
      return { statusCode: 500, body: result.error };
    }

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: 'An error occurred while processing your request.' };
  }
};