import sqlite3
import json

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

cursor.execute("SELECT id, name, nodes FROM workflow_entity WHERE active = 1")
for row in cursor.fetchall():
    wf_id, name, nodes_str = row
    nodes = json.loads(nodes_str)
    for node in nodes:
        if node.get('type') == 'n8n-nodes-base.webhook':
            print(f"Workflow: {name} (ID: {wf_id})")
            print("Webhook Node:", json.dumps(node, indent=2))
            print("-" * 50)
conn.close()
