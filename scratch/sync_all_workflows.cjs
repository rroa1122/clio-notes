const fs = require('fs');
const { execSync } = require('child_process');

const remotePythonScript = `import sqlite3
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
    '/tmp/assessment_workflow.json',
    '/tmp/service_plan_workflow.json',
    '/tmp/adult_certification_workflow.json'
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

db.commit()
db.close()
print("All workflows successfully synchronized to n8n database!")
`;

fs.writeFileSync('scratch/remote_sync_script.py', remotePythonScript, 'utf8');

const sshKey = 'C:\\Users\\REINIER\\.ssh\\id_rsa_clinicflow';
const host = 'root@clinicflow.dev';

console.log('[1/3] Uploading workflow JSONs and sync script to server...');
const filesToUpload = [
    'scratch/tcm_workflow.json',
    'scratch/initial_home_visit_workflow.json',
    'scratch/assessment_workflow.json',
    'scratch/service_plan_workflow.json',
    'scratch/adult_certification_workflow.json',
    'scratch/remote_sync_script.py'
].join(' ');

execSync(`scp -i ${sshKey} -o StrictHostKeyChecking=no ${filesToUpload} ${host}:/tmp/`, { stdio: 'inherit' });

console.log('\n[2/3] Executing database update script on server...');
execSync(`ssh -i ${sshKey} -o StrictHostKeyChecking=no ${host} "python3 /tmp/remote_sync_script.py"`, { stdio: 'inherit' });

console.log('\n[3/3] Restarting n8n docker container to load new workflows...');
execSync(`ssh -i ${sshKey} -o StrictHostKeyChecking=no ${host} "docker restart n8n"`, { stdio: 'inherit' });

console.log('\n✅ Phase 1 n8n workflow deployment complete!');
