import json
import glob
import os

files = [
    'scratch/tcm_workflow.json',
    'scratch/initial_home_visit_workflow.json',
    'scratch/assessment_workflow.json',
    'scratch/service_plan_workflow.json',
    'scratch/adult_certification_workflow.json',
    'scratch/workflow_extract.json'
]

for f in files:
    if not os.path.exists(f):
        continue
    with open(f, 'r', encoding='utf-8') as fp:
        data = json.load(fp)
    print(f"\n==========================================")
    print(f"Workflow: {f} (ID: {data.get('id')}, Name: {data.get('name')})")
    nodes = data.get('nodes', [])
    print(f"Nodes ({len(nodes)}):")
    for n in nodes:
        print(f"  - {n.get('name')} [{n.get('type')}] (id: {n.get('id')})")
    print(f"Connections:")
    connections = data.get('connections', {})
    for src, targets in connections.items():
        print(f"  {src} -> {targets}")
