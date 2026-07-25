import sqlite3
import json
conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()
cursor.execute("SELECT nodes, connections FROM workflow_entity WHERE id = ?", ("dBgLoNjM9e9dgdHq",))
row = cursor.fetchone()
if row:
    wf = {"nodes": json.loads(row[0]), "connections": json.loads(row[1])}
    with open("/tmp/workflow_extract.json", "w") as f:
        json.dump(wf, f, indent=2)
    print("Done")
else:
    print("Not found")
