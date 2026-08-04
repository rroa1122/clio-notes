import sqlite3
import json
import uuid
import sys
from datetime import datetime

db_path = '/root/n8n/database.sqlite'
prompt_file = '/tmp/prompt_hurricane_addendum.txt'
source_wf_id = 'K3aJ8zeSNCBx6QFL' # Initial Home Visit (two-block joint note)
target_wf_id = 'K3cH8zeSNCBx6QFL' # New Hurricane Addendum
target_wf_name = 'NOTA MEDICA HURRICANE ADDENDUM'
target_webhook_path = 'tcm-hurricane-addendum-note'

print(f"Reading prompt file from: {prompt_file}...")
try:
    with open(prompt_file, 'r', encoding='utf-8') as f:
        new_prompt_content = f.read()
        if not new_prompt_content.startswith('='):
            new_prompt_content = '=' + new_prompt_content
except Exception as e:
    print(f"Error reading prompt file: {e}")
    sys.exit(1)

# Connect to n8n database
db = sqlite3.connect(db_path)
cursor = db.cursor()

# 1. Fetch the template workflow nodes/connections from K3aJ8zeSNCBx6QFL
print(f"Fetching template workflow {source_wf_id}...")
cursor.execute("SELECT nodes, connections, settings, meta, parentFolderId, triggerCount FROM workflow_entity WHERE id = ?", (source_wf_id,))
row = cursor.fetchone()
if not row:
    print(f"Source workflow {source_wf_id} not found in database. Cannot duplicate.")
    db.close()
    sys.exit(1)

nodes_str, connections_str, settings_str, meta_str, parent_folder_id, trigger_count = row
nodes = json.loads(nodes_str)
connections = json.loads(connections_str)

# 2. Modify the nodes to update Webhook path and Prompt
modified_webhook = False
modified_prompt = False

for node in nodes:
    # Update webhook path
    if node.get('type') == 'n8n-nodes-base.webhook':
        params = node.get('parameters', {})
        old_path = params.get('path')
        params['path'] = target_webhook_path
        print(f"  Updated webhook node '{node.get('name')}' path from '{old_path}' to '{target_webhook_path}'.")
        modified_webhook = True
        
    # Update OpenAI Responses API / Message a model prompt
    if node.get('name') == 'Message a model' and node.get('type') == '@n8n/n8n-nodes-langchain.openAi':
        params = node.get('parameters', {})
        responses = params.get('responses', {})
        values = responses.get('values', [])
        if len(values) > 0:
            old_len = len(values[0].get('content', ''))
            values[0]['content'] = new_prompt_content
            new_len = len(new_prompt_content)
            print(f"  Updated system prompt in '{node.get('name')}' node. Length changed from {old_len} to {new_len}.")
            modified_prompt = True

if not modified_webhook:
    print("Warning: Webhook node was not found or not modified.")
if not modified_prompt:
    print("Warning: Message a model node was not found or not modified.")

# Create/Update target workflow
now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%f')[:-3]

cursor.execute("SELECT 1 FROM workflow_entity WHERE id = ?", (target_wf_id,))
exists = cursor.fetchone()

nodes_json = json.dumps(nodes)
connections_json = json.dumps(connections)

if exists:
    print(f"Workflow {target_wf_id} already exists. Updating it...")
    cursor.execute("""
        UPDATE workflow_entity
        SET name = ?, nodes = ?, connections = ?, settings = ?, meta = ?, updatedAt = ?, versionId = ?
        WHERE id = ?
    """, (target_wf_name, nodes_json, connections_json, settings_str, meta_str, now, str(uuid.uuid4()), target_wf_id))
else:
    print(f"Workflow {target_wf_id} does not exist. Creating it...")
    cursor.execute("""
        INSERT INTO workflow_entity (
            id, name, active, nodes, connections, settings, staticData, pinData,
            versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt,
            isArchived, versionCounter, description, activeVersionId
        ) VALUES (?, ?, 1, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, 0, 1, '', NULL)
    """, (
        target_wf_id, target_wf_name, nodes_json, connections_json, settings_str,
        str(uuid.uuid4()), trigger_count, meta_str, parent_folder_id, now, now
    ))

# 3. Register webhook path in webhook_entity
print(f"Registering webhook path '{target_webhook_path}' for workflow {target_wf_id}...")
cursor.execute("""
    INSERT OR REPLACE INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength)
    VALUES (?, ?, 'POST', 'Webhook', '', NULL)
""", (target_wf_id, target_webhook_path))

# 4. Register ownership in shared_workflow (copy project ID if available)
cursor.execute("SELECT projectId FROM shared_workflow WHERE workflowId = ? LIMIT 1", (source_wf_id,))
proj_row = cursor.fetchone()
project_id = proj_row[0] if proj_row else 'I0peieOmzRZFMir9'

print(f"Registering ownership for workflow {target_wf_id} in project {project_id}...")
cursor.execute("""
    INSERT OR REPLACE INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt)
    VALUES (?, ?, 'workflow:owner', ?, ?)
""", (target_wf_id, project_id, now, now))

db.commit()
db.close()
print("DATABASE OPERATIONS COMPLETED SUCCESSFULLY!")
