import sqlite3
import json

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

cursor.execute("SELECT id, name, nodes FROM workflow_entity WHERE active = 1")
for row in cursor.fetchall():
    wf_id, name, nodes_str = row
    nodes = json.loads(nodes_str)
    for node in nodes:
        node_str = json.dumps(node)
        if 'openai' in node_str.lower():
            print(f"Workflow: {name} (ID: {wf_id})")
            print(f"  Node Type: {node.get('type')}")
            print(f"  Node Name: {node.get('name')}")
            # If it's an HTTP request node or OpenAI node, print interesting parameters
            params = node.get('parameters', {})
            if 'model' in str(params):
                print(f"  Model: {params.get('model')}")
            if 'url' in params:
                print(f"  URL: {params.get('url')}")
            if 'jsonBody' in params:
                try:
                    body = params.get('jsonBody')
                    print(f"  Body snippet: {str(body)[:300]}")
                except Exception as e:
                    pass
            print("-" * 50)
conn.close()
