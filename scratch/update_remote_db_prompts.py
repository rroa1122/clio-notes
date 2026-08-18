import sqlite3
import json
import sys

db_path = '/root/n8n/database.sqlite'

# Mapping of workflow ID to the prompt file uploaded to /tmp/
wf_mapping = {
    'edM28zeSNCBx6QFI': '/tmp/tcm_prompt.md',
    'GppDFTdj19n9o3Q2': '/tmp/prompt_assessment.txt',
    'RvtViS0iE8lV67ye': '/tmp/prompt_service_plan.txt',
    'K3aJ8zeSNCBx6QFL': '/tmp/prompt_initial_home_visit.txt',
    'K3zH8zeSNCBx6QFL': '/tmp/prompt_case_assignment.txt',
    'K3yH8zeSNCBx6QFL': '/tmp/prompt_monthly_home_visit.txt',
    'K3rH8zeSNCBx6QFL': '/tmp/prompt_gather_pcp.txt',
    'K3sH8zeSNCBx6QFL': '/tmp/prompt_gather_psy.txt',
    'K3tH8zeSNCBx6QFL': '/tmp/prompt_pc_emergency_contact.txt',
    'K3vH8zeSNCBx6QFL': '/tmp/prompt_adult_certification.txt'
}

def update_workflow(wf_id, prompt_path):
    print(f"Updating workflow {wf_id} using {prompt_path}...")
    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            new_prompt_content = f.read()
    except Exception as e:
        print(f"Error reading prompt file {prompt_path}: {e}")
        return False

    db = sqlite3.connect(db_path)
    cursor = db.cursor()

    cursor.execute("SELECT nodes FROM workflow_entity WHERE id = ?", (wf_id,))
    row = cursor.fetchone()
    if not row:
        print(f"Workflow {wf_id} not found in database.")
        db.close()
        return False

    nodes = json.loads(row[0])
    modified = False

    for node in nodes:
        if node.get('name') == 'Message a model' and node.get('type') == '@n8n/n8n-nodes-langchain.openAi':
            params = node.get('parameters', {})
            responses = params.get('responses', {})
            values = responses.get('values', [])
            if len(values) > 0:
                old_len = len(values[0].get('content', ''))
                if not new_prompt_content.startswith('='):
                    new_prompt_content = '=' + new_prompt_content
                values[0]['content'] = new_prompt_content
                new_len = len(new_prompt_content)
                print(f"  Successfully updated prompt in '{node.get('name')}' node. Length changed from {old_len} to {new_len}.")
                modified = True
            else:
                print("  Warning: 'Message a model' node has no responses values.")

    if modified:
        cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (json.dumps(nodes), wf_id))
        db.commit()
        print(f"  Workflow {wf_id} updated successfully in SQLite database!")
        success = True
    else:
        print(f"  No modifications made to workflow {wf_id}.")
        success = False

    db.close()
    return success

if __name__ == '__main__':
    all_success = True
    for wf_id, prompt_path in wf_mapping.items():
        if not update_workflow(wf_id, prompt_path):
            all_success = False
    
    if all_success:
        print("ALL WORKFLOWS UPDATED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("SOME WORKFLOWS FAILED TO UPDATE.")
        sys.exit(1)
