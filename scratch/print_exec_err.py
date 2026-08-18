import sqlite3
import json

db = sqlite3.connect('/root/n8n/database.sqlite')
row = db.execute("SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 1").fetchone()
if row:
    parsed = json.loads(row[1])
    for item in parsed:
        if isinstance(item, dict) and 'message' in item:
            print("Error message:", item.get('message'))
            print("Error node:", item.get('node'))
            print("Error stack:", item.get('stack'))
