import sqlite3
import json
import sys

db_path = '/root/n8n/database.sqlite'
wf_id = 'autofill-assessment-wf-id'
prompt_path = '/tmp/prompt_autofill_assessment.txt'

def main():
    print(f"Updating assessment workflow prompt using {prompt_path}...")
    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            new_prompt_content = f.read()
    except Exception as e:
        print(f"Error reading prompt file: {e}")
        sys.exit(1)

    db = sqlite3.connect(db_path)
    cursor = db.cursor()

    cursor.execute("SELECT nodes FROM workflow_entity WHERE id = ?", (wf_id,))
    row = cursor.fetchone()
    if not row:
        print(f"Workflow {wf_id} not found in database.")
        db.close()
        sys.exit(1)

    nodes = json.loads(row[0])
    modified = False

    for node in nodes:
        if node.get('name') == 'Message a model':
            params = node.get('parameters', {})
            responses = params.get('responses', {})
            values = responses.get('values', [])
            if len(values) > 0:
                old_len = len(values[0].get('content', ''))
                if not new_prompt_content.startswith('='):
                    new_prompt_content = '=' + new_prompt_content
                values[0]['content'] = new_prompt_content
                new_len = len(new_prompt_content)
                print(f"Successfully updated prompt in '{node.get('name')}' node. Length from {old_len} to {new_len}.")
                modified = True
            else:
                print("Warning: 'Message a model' node has no responses values.")

    if modified:
        cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (json.dumps(nodes), wf_id))
        db.commit()
        print(f"Workflow {wf_id} updated successfully in SQLite database!")
    else:
        print(f"No modifications made to workflow {wf_id}.")

    db.close()

if __name__ == '__main__':
    main()
