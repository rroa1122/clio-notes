import sqlite3
import json
import os

db_path = '/root/n8n/database.sqlite'
db = sqlite3.connect(db_path)
c = db.cursor()

ids = ['K3rH8zeSNCBx6QFL', 'K3sH8zeSNCBx6QFL', 'K3tH8zeSNCBx6QFL', 'RvtViS0iE8lV67yf']

for wf_id in ids:
    c.execute("SELECT id, name, nodes, connections, settings FROM workflow_entity WHERE id = ?", (wf_id,))
    row = c.fetchone()
    if row:
        wf_id, name, nodes, connections, settings = row
        data = {
            "id": wf_id,
            "name": name,
            "nodes": json.loads(nodes) if isinstance(nodes, str) else nodes,
            "connections": json.loads(connections) if isinstance(connections, str) else connections,
            "settings": json.loads(settings) if isinstance(settings, str) and settings else {}
        }
        filename = f"/tmp/{wf_id}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Exported {name} ({wf_id}) -> {filename}")
    else:
        print(f"Workflow {wf_id} not found")
