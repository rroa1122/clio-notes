import sqlite3
import json
import uuid

def main():
    db_path = '/root/n8n/database.sqlite'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Fetch source workflow
    cursor.execute("SELECT * FROM workflow_entity WHERE id = 'K3aJ8zeSNCBx6QFL'")
    row = cursor.fetchone()
    if not row:
        print("Source workflow K3aJ8zeSNCBx6QFL not found.")
        return
        
    # Get column names
    col_names = [description[0] for description in cursor.description]
    row_dict = dict(zip(col_names, row))
    
    # 2. Modify properties for Case Assignment Standalone
    new_id = 'K3zH8zeSNCBx6QFL'
    new_name = 'NOTA MEDICA CASE ASSIGNMENT'
    new_version_id = str(uuid.uuid4())
    
    row_dict['id'] = new_id
    row_dict['name'] = new_name
    row_dict['active'] = 1
    row_dict['versionId'] = new_version_id
    row_dict['activeVersionId'] = None  # Clear foreign key to avoid history mismatch
    row_dict['versionCounter'] = 1
    
    # Update nodes JSON to point to tcm-case-assignment-note
    nodes = json.loads(row_dict['nodes'])
    updated_webhook = False
    for node in nodes:
        if node.get('type') == 'n8n-nodes-base.webhook':
            if 'parameters' not in node:
                node['parameters'] = {}
            node['parameters']['path'] = 'tcm-case-assignment-note'
            updated_webhook = True
            print("Updated webhook node path to 'tcm-case-assignment-note'")
            
    if not updated_webhook:
        print("Warning: Webhook node not found in nodes list!")
        
    row_dict['nodes'] = json.dumps(nodes)
    
    # 3. Clean up existing clone
    cursor.execute("DELETE FROM workflow_entity WHERE id = ?", (new_id,))
    
    # 4. Insert cloned row
    columns = ', '.join(f'"{c}"' for c in col_names)
    placeholders = ', '.join('?' for _ in col_names)
    values = [row_dict[c] for c in col_names]
    
    cursor.execute(f'INSERT INTO workflow_entity ({columns}) VALUES ({placeholders})', values)
    conn.commit()
    print(f"Successfully cloned workflow K3aJ8zeSNCBx6QFL to {new_id} ({new_name}) in n8n database.")
    
    conn.close()

if __name__ == '__main__':
    main()
