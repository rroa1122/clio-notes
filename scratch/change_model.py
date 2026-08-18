import sqlite3
import json

def main():
    db_path = '/root/n8n/database.sqlite'
    conn = sqlite3.connect(db_path)
    
    # 1. Fetch current nodes
    row = conn.execute("SELECT nodes FROM workflow_entity WHERE id = 'autofill-assessment-wf-id'").fetchone()
    if not row:
        print("Workflow not found")
        return
        
    nodes = json.loads(row[0])
    
    # 2. Modify modelId
    modified = False
    for node in nodes:
        if node.get('name') == 'Message a model':
            model_id = node.get('parameters', {}).get('modelId')
            if isinstance(model_id, dict):
                model_id['value'] = 'gpt-4o'
                model_id['cachedResultName'] = 'GPT-4o'
            else:
                node['parameters']['modelId'] = 'gpt-4o'
            modified = True
            print("Changed modelId back to gpt-4o")
            
    if not modified:
        print("Node 'Message a model' not found")
        return
        
    # 3. Update database
    conn.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'autofill-assessment-wf-id'", (json.dumps(nodes),))
    conn.commit()
    print("Database updated successfully with gpt-4o-mini.")

if __name__ == '__main__':
    main()
