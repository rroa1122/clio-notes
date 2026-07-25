import sqlite3
import json

db_path = '/root/n8n/database.sqlite'
target_id = 'dBgLoNjM9e9dgdHq'

db = sqlite3.connect(db_path)
cursor = db.cursor()

cursor.execute("SELECT nodes FROM workflow_entity WHERE id = ?", (target_id,))
row = cursor.fetchone()
if row:
    nodes = json.loads(row[0])
    for node in nodes:
        if node.get('name') == 'OpenAI Responses API':
            with open("/tmp/node_params.json", "w") as f:
                json.dump(node.get('parameters', {}), f, indent=2)
            print("Wrote to /tmp/node_params.json")
db.close()
