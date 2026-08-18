import sqlite3
import json

def main():
    conn = sqlite3.connect('/root/n8n/database.sqlite')
    row = conn.execute("SELECT nodes FROM workflow_entity WHERE id = 'autofill-assessment-wf-id'").fetchone()
    if not row:
        print("Workflow not found")
        return
    nodes = json.loads(row[0])
    print("Nodes in workflow:")
    for n in nodes:
        print(f"Name: '{n.get('name')}', Type: '{n.get('type')}'")

if __name__ == '__main__':
    main()
