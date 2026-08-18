import sqlite3
import json

db = sqlite3.connect('/root/n8n/database.sqlite')
row = db.execute("SELECT id, finished, mode, status, data FROM execution_entity ORDER BY id DESC LIMIT 1").fetchone()
if row:
    print(f"Exec ID: {row[0]}, Finished: {row[1]}, Mode: {row[2]}, Status: {row[3]}")
    data = json.loads(row[4])
    resultData = data.get('resultData', {})
    runData = resultData.get('runData', {})
    print("Executed nodes in runData:")
    for node_name in runData.keys():
        print(f"  - {node_name}")
        items = runData[node_name][0].get('data', {}).get('main', [[]])[0]
        if items and len(items) > 0:
            print(f"    output count: {len(items)}, sample json keys: {list(items[0].get('json', {}).keys())[:10]}")
