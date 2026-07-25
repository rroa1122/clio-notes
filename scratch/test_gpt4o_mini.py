import requests
import json
import time

url = 'https://api.openai.com/v1/responses'
headers = {
    'Authorization': 'Bearer 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',
    'Content-Type': 'application/json'
}

data = {
    'model': 'gpt-4o-mini',
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

print("Testing gpt-4o-mini...")
start_time = time.time()
try:
    res = requests.post(url, headers=headers, json=data, timeout=30)
    elapsed = time.time() - start_time
    print("Status:", res.status_code)
    print("Time taken:", elapsed, "seconds")
    print("Response:", res.text[:500])
except Exception as e:
    print("Error:", e)
