import sqlite3
import json
import uuid
import sys
import os
from datetime import datetime

db_path = '/root/n8n/database.sqlite'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    sys.exit(1)

workflow_files = [
    '/tmp/tcm_workflow.json',
    '/tmp/initial_home_visit_workflow.json',
    '/tmp/case_assignment_workflow.json',
    '/tmp/assessment_workflow.json',
    '/tmp/service_plan_workflow.json',
    '/tmp/adult_certification_workflow.json',
    '/tmp/gather_pcp_record_workflow.json',
    '/tmp/gather_psy_record_workflow.json',
    '/tmp/pc_emergency_contact_workflow.json',
    '/tmp/service_plan_discussion_workflow.json',
    '/tmp/agency_npi_lookup_workflow.json'
]

db = sqlite3.connect(db_path)
cursor = db.cursor()

for wf_file in workflow_files:
    if not os.path.exists(wf_file):
        print(f"Skipping missing {wf_file}")
        continue
        
    with open(wf_file, 'r', encoding='utf-8') as f:
        wf_data = json.load(f)
        
    wf_id = wf_data.get('id')
    name = wf_data.get('name')
    nodes = wf_data.get('nodes', [])
    connections = wf_data.get('connections', {})
    settings = wf_data.get('settings', {})
    
    nodes_str = json.dumps(nodes)
    connections_str = json.dumps(connections)
    settings_str = json.dumps(settings) if settings else None
    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%f')[:-3]
    
    cursor.execute("SELECT 1 FROM workflow_entity WHERE id = ?", (wf_id,))
    exists = cursor.fetchone()
    
    if exists:
        print(f"Updating workflow: {name} ({wf_id})...")
        cursor.execute("""
            UPDATE workflow_entity
            SET name = ?, nodes = ?, connections = ?, settings = ?, updatedAt = ?, versionId = ?
            WHERE id = ?
        """, (name, nodes_str, connections_str, settings_str, now, str(uuid.uuid4()), wf_id))
    else:
        print(f"Inserting new workflow: {name} ({wf_id})...")
        cursor.execute("""
            INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, createdAt, updatedAt, versionId)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
        """, (wf_id, name, nodes_str, connections_str, settings_str, now, now, str(uuid.uuid4())))
        # n8n 1.x: a workflow needs an owner project, or it is not listed/activated
        try:
            cursor.execute("SELECT projectId FROM shared_workflow WHERE role = 'workflow:owner' LIMIT 1")
            row = cursor.fetchone()
            if row:
                cursor.execute("""
                    INSERT OR IGNORE INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt)
                    VALUES (?, ?, 'workflow:owner', ?, ?)
                """, (wf_id, row[0], now, now))
        except Exception as e:
            print(f"Warning: could not set owner for {wf_id}: {e}")

db.commit()
db.close()
print("All workflows successfully synchronized to n8n database!")
