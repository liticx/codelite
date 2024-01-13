import requests
import json

API_KEY = input("Please enter your API key: ")
BASE_URL = "https://api-codelite.netlify.app/.netlify/functions/completion"

def chat_with_bot(message, model="gpt-4", temperature=0.7):
    headers = {
        'api-key': API_KEY,
        'Content-Type': 'application/json'
    }

    data = {
        'messages': [{'role': 'user', 'content': message}],
        'model': model,
        'temperature': temperature
    }

    response = requests.post(BASE_URL, headers=headers, data=json.dumps(data))
    ##print(f"Response Status Code: {response.status_code}")

    if response.status_code == 200:
        return response.text
    else:
        print(f"Request failed with status code {response.status_code}")
        return None

def main():
    print("Testing the API key...")
    test_response = chat_with_bot('Hello')
    if test_response:
        print("API key is valid! You can start the conversation with the chatbot now.")
        while True:
            message = input("> ")
            if message.lower() == "quit":
                break

            response = chat_with_bot(message)
            if response:
                print(f'Bot: {response}')
    else:
        print("API key seems to be invalid. Please check and try again.")

if __name__ == "__main__":
    main()