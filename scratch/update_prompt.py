import sqlite3
import json
import sys

def main():
    db_path = '/root/n8n/database.sqlite'
    prompt_path = '/tmp/new_prompt.txt'
    workflow_id = 'autofill-assessment-wf-id'

    # Read new prompt
    with open(prompt_path, 'r', encoding='utf-8') as f:
        new_prompt = f.read()
    if not new_prompt.startswith('='):
        new_prompt = '=' + new_prompt

    # Connect to DB
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get current nodes
    cursor.execute("SELECT nodes FROM workflow_entity WHERE id = ?", (workflow_id,))
    row = cursor.fetchone()
    if not row:
        print(f"Error: Workflow {workflow_id} not found in database.")
        sys.exit(1)

    nodes_json = row[0]
    nodes = json.loads(nodes_json)

    # Find and update prompt in the Message a model node
    found = False
    for node in nodes:
        if node.get('name') == 'Message a model':
            # Check options/responses structure
            if 'responses' in node.get('parameters', {}):
                values = node['parameters']['responses'].get('values', [])
                if values and len(values) > 0:
                    values[0]['content'] = new_prompt
                    found = True
                    print("Successfully updated prompt in responses.values[0].content")
            elif 'prompt' in node.get('parameters', {}):
                node['parameters']['prompt'] = new_prompt
                found = True
                print("Successfully updated prompt in parameters.prompt")

    if not found:
        print("Error: Could not find 'Message a model' node parameters to update.")
        sys.exit(1)

    # Save back
    updated_nodes_json = json.dumps(nodes)
    cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (updated_nodes_json, workflow_id))
    conn.commit()
    conn.close()
    print("Database updated successfully.")

if __name__ == '__main__':
    main()
