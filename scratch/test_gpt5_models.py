import requests
import json

url = 'https://api.openai.com/v1/responses'
headers = {
    'Authorization': 'Bearer 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',
    'Content-Type': 'application/json'
}

data = {
    'model': 'gpt-5-mini',
    'input': [
        {
            'role': 'user',
            'content': [
                {
                    'type': 'input_text',
                    'text': 'Say hello'
                }
            ]
        }
    ]
}

print("Testing gpt-5-mini...")
try:
    res = requests.post(url, headers=headers, json=data, timeout=30)
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)

# Test gpt-5.4 as well
print("\nTesting gpt-5.4...")
data['model'] = 'gpt-5.4'
try:
    res = requests.post(url, headers=headers, json=data, timeout=30)
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)
