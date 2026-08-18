import sqlite3
import json

db = sqlite3.connect('/root/n8n/database.sqlite')
row = db.execute("SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 1").fetchone()
if row:
    print(f"Exec ID: {row[0]}")
    parsed = json.loads(row[1])
    if isinstance(parsed, list):
        print(f"List items types: {[type(x).__name__ for x in parsed[:5]]}")
        for i, item in enumerate(parsed):
            if isinstance(item, str) and ('runData' in item or 'resultData' in item or 'Normalize' in item):
                print(f"Found str at {i}: {item[:200]}")
            elif isinstance(item, dict):
                print(f"Found dict at {i}, keys: {list(item.keys())}")
