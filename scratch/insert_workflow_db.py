import sqlite3
import json
import uuid
import sys
from datetime import datetime

db_path = '/root/n8n/database.sqlite'
workflow_file = '/tmp/initial_home_visit_workflow.json'

print(f"Reading workflow file: {workflow_file}...")
try:
    with open(workflow_file, 'r', encoding='utf-8') as f:
        wf_data = json.load(f)
except Exception as e:
    print(f"Error reading workflow file: {e}")
    sys.exit(1)

wf_id = wf_data.get('id', 'K3aJ8zeSNCBx6QFL')
name = wf_data.get('name', 'NOTA MEDICA INITIAL HOME VISIT')
nodes = wf_data.get('nodes', [])
connections = wf_data.get('connections', {})
settings = wf_data.get('settings', {})
static_data = wf_data.get('staticData', None)
pin_data = wf_data.get('pinData', None)
meta = wf_data.get('meta', {})

# Connect to database
db = sqlite3.connect(db_path)
cursor = db.cursor()

# Check if it already exists
cursor.execute("SELECT 1 FROM workflow_entity WHERE id = ?", (wf_id,))
exists = cursor.fetchone()

# Format JSON columns
nodes_str = json.dumps(nodes)
connections_str = json.dumps(connections)
settings_str = json.dumps(settings) if settings else None
static_data_str = json.dumps(static_data) if static_data else None
pin_data_str = json.dumps(pin_data) if pin_data else None
meta_str = json.dumps(meta) if meta else None

now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%f')[:-3] # YYYY-MM-DD HH:MM:SS.SSS

if exists:
    print(f"Workflow {wf_id} already exists. Updating it...")
    cursor.execute("""
        UPDATE workflow_entity
        SET name = ?, nodes = ?, connections = ?, settings = ?, staticData = ?, pinData = ?, meta = ?, updatedAt = ?, versionId = ?
        WHERE id = ?
    """, (name, nodes_str, connections_str, settings_str, static_data_str, pin_data_str, meta_str, now, str(uuid.uuid4()), wf_id))
    print("Workflow updated successfully!")
else:
    print(f"Workflow {wf_id} does not exist. Creating/inserting new workflow...")
    # Find another workflow to copy metadata fields (like parentFolderId, triggerCount, etc.)
    cursor.execute("SELECT parentFolderId, triggerCount, active FROM workflow_entity LIMIT 1")
    row = cursor.fetchone()
    parent_folder_id = row[0] if row else None
    trigger_count = row[1] if row else 0
    active = 1 # Force it active

    cursor.execute("""
        INSERT INTO workflow_entity (
            id, name, active, nodes, connections, settings, staticData, pinData,
            versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt,
            isArchived, versionCounter, description, activeVersionId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, '', NULL)
    """, (
        wf_id, name, active, nodes_str, connections_str, settings_str, static_data_str, pin_data_str,
        str(uuid.uuid4()), trigger_count, meta_str, parent_folder_id, now, now
    ))
    print("Workflow created and inserted successfully!")

# Register webhook in webhook_entity to activate it in production
print(f"Registering webhook path 'tcm-initial-home-visit-note' for workflow {wf_id}...")
cursor.execute("""
    INSERT OR REPLACE INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength)
    VALUES (?, ?, ?, ?, ?, ?)
""", (wf_id, 'tcm-initial-home-visit-note', 'POST', 'Webhook', '', None))
print("Webhook registered successfully!")

# Register project owner relation in shared_workflow
print(f"Registering shared_workflow owner relation for workflow {wf_id}...")
cursor.execute("""
    INSERT OR REPLACE INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
""", (wf_id, 'I0peieOmzRZFMir9', 'workflow:owner', now, now))
print("Shared workflow relation registered successfully!")

db.commit()
db.close()
print("Database operations complete.")
