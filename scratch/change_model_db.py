import sqlite3
import json

db_path = '/root/n8n/database.sqlite'
target_id = 'dBgLoNjM9e9dgdHq'

db = sqlite3.connect(db_path)
cursor = db.cursor()

cursor.execute("SELECT nodes FROM workflow_entity WHERE id = ?", (target_id,))
row = cursor.fetchone()
if row:
    nodes_str = row[0]
    nodes = json.loads(nodes_str)
    modified = False
    for node in nodes:
        if node.get('name') == 'OpenAI Responses API' and node.get('type') == 'n8n-nodes-base.httpRequest':
            params = node.get('parameters', {})
            body_str = params.get('jsonBody', '')
            if '"model": "gpt-5.4"' in body_str:
                params['jsonBody'] = body_str.replace('"model": "gpt-5.4"', '"model": "gpt-5-mini"')
                modified = True
                print("Updated model in node OpenAI Responses API parameters to gpt-5-mini")
            elif '"model":"gpt-5.4"' in body_str:
                params['jsonBody'] = body_str.replace('"model":"gpt-5.4"', '"model":"gpt-5-mini"')
                modified = True
                print("Updated model in node OpenAI Responses API parameters to gpt-5-mini (no space)")
    
    if modified:
        cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (json.dumps(nodes), target_id))
        db.commit()
        print("Workflow updated successfully in the database!")
    else:
        print("Model gpt-5.4 was not found in OpenAI Responses API parameters.")
else:
    print(f"Workflow {target_id} not found.")

db.close()
