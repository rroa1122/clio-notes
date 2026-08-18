import sqlite3
import json
conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()
cursor.execute("SELECT nodes, connections FROM workflow_entity WHERE id = ?", ("autofill-assessment-wf-id",))
row = cursor.fetchone()
if row:
    nodes = json.loads(row[0])
    for n in nodes:
        print(f"{n.get('name')} -> {n.get('type')}")
else:
    print("Not found")
