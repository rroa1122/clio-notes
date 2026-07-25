import sqlite3
import json

db_path = '/root/n8n/database.sqlite'
target_id = 'dBgLoNjM9e9dgdHq'

db = sqlite3.connect(db_path)
cursor = db.cursor()

cursor.execute("SELECT nodes FROM workflow_entity WHERE id = ?", (target_id,))
row = cursor.fetchone()
if row:
    nodes_str = row[0]
    nodes = json.loads(nodes_str)
    modified = False
    
    for node in nodes:
        if node.get('name') == 'OpenAI Responses API' and node.get('type') == 'n8n-nodes-base.httpRequest':
            params = node.get('parameters', {})
            body_str = params.get('jsonBody', '')
            
            # Find the user prompt instructions in body_str and append explicit instructions for diagnoses.historical
            # Let's search for "Reglas de objetos dentro de arrays"
            target_marker = 'Reglas de objetos dentro de arrays:'
            if target_marker in body_str:
                # Add specific instruction for diagnoses.historical to extract Past Medical History
                replacement = (
                    "Instrucciones de extracción adicionales:\\n"
                    "- Extrae TODOS los antecedentes médicos y quirúrgicos del paciente (como los listados en 'Past Medical History', 'Surgical History' o 'Active Problems') e inclúyelos en 'diagnoses.historical'. Si no tienen un código ICD, deja el campo 'code' como null o vacío, pero pon la descripción.\\n\\n"
                    "Reglas de objetos dentro de arrays:"
                )
                body_str = body_str.replace(target_marker, replacement)
                params['jsonBody'] = body_str
                modified = True
                print("Prompt successfully updated in OpenAI Responses API node!")
                
    if modified:
        cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (json.dumps(nodes), target_id))
        db.commit()
        print("Workflow updated successfully in the database!")
    else:
        print("Target marker was not found in the workflow prompt.")
else:
    print(f"Workflow {target_id} not found.")

db.close()
