import sqlite3
import json

def main():
    conn = sqlite3.connect('/root/n8n/database.sqlite')
    row = conn.execute("SELECT nodes FROM workflow_entity WHERE id = 'autofill-assessment-wf-id'").fetchone()
    if not row:
        print("Workflow not found")
        return
    nodes = json.loads(row[0])
    node = [n for n in nodes if n.get('name') == 'Message a model'][0]
    print(json.dumps(node, indent=2))

if __name__ == '__main__':
    main()
