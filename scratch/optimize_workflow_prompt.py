import sqlite3
import json

db_path = '/root/n8n/database.sqlite'
target_id = 'dBgLoNjM9e9dgdHq'

db = sqlite3.connect(db_path)
cursor = db.cursor()

cursor.execute("SELECT nodes FROM workflow_entity WHERE id = ?", (target_id,))
row = cursor.fetchone()
if not row:
    print(f"Workflow {target_id} not found.")
    db.close()
    exit(1)

nodes = json.loads(row[0])
modified = False

optimized_prompt = (
    "Analiza el documento PDF clínico adjunto y extrae toda la información del paciente usando exactamente este esquema JSON:\n\n"
    "{\n"
    "  \"document_type\": null,\n"
    "  \"source_system\": null,\n"
    "  \"patient\": {\n"
    "    \"full_name\": null,\n"
    "    \"first_name\": null,\n"
    "    \"middle_name\": null,\n"
    "    \"last_name\": null,\n"
    "    \"dob\": null,\n"
    "    \"age\": null,\n"
    "    \"sex\": null,\n"
    "    \"ssn\": null,\n"
    "    \"emr_id\": null,\n"
    "    \"race\": null,\n"
    "    \"ethnicity\": null,\n"
    "    \"preferred_language\": null\n"
    "  },\n"
    "  \"contact_information\": {\n"
    "    \"address_line_1\": null,\n"
    "    \"address_line_2\": null,\n"
    "    \"city\": null,\n"
    "    \"state\": null,\n"
    "    \"zip_code\": null,\n"
    "    \"email\": null,\n"
    "    \"home_phone\": null,\n"
    "    \"mobile_phone\": null,\n"
    "    \"office_phone\": null\n"
    "  },\n"
    "  \"family_information\": {\n"
    "    \"next_of_kin\": null,\n"
    "    \"relation_to_patient\": null,\n"
    "    \"phone\": null,\n"
    "    \"address\": null\n"
    "  },\n"
    "  \"insurance\": {\n"
    "    \"primary_payer\": {\n"
    "      \"payer\": null,\n"
    "      \"insured_id_number\": null,\n"
    "      \"group_number\": null\n"
    "    }\n"
    "  },\n"
    "  \"pcp\": {\n"
    "    \"name\": null,\n"
    "    \"clinic_name\": null,\n"
    "    \"phone\": null,\n"
    "    \"address\": null\n"
    "  },\n"
    "  \"psychiatrist\": {\n"
    "    \"name\": null,\n"
    "    \"phone\": null,\n"
    "    \"address\": null\n"
    "  },\n"
    "  \"psychiatric_diagnoses\": [],\n"
    "  \"medical_diagnoses\": [],\n"
    "  \"psychiatric_medications\": [],\n"
    "  \"medical_medications\": [],\n"
    "  \"pharmacy\": {\n"
    "    \"name\": null,\n"
    "    \"phone\": null,\n"
    "    \"fax\": null,\n"
    "    \"address\": null\n"
    "  },\n"
    "  \"presenting_problems\": null\n"
    "}\n\n"
    "Instrucciones de extracción y clasificación inteligente:\n"
    "1. En 'patient.emr_id', busca el número de cuenta de EMR (como 'Acc No.', 'Account Number', 'EMR ID', 'Chart No.').\n"
    "2. Clasificación de Proveedores:\n"
    "   - Identifica si el proveedor de la visita es un proveedor psiquiátrico o de salud mental (ej. Psiquiatra, APRN de salud mental, psicólogo, clínica de mental health). Si es así, pon sus datos en 'psychiatrist'.\n"
    "   - Si es un proveedor de medicina familiar/general (PCP) (ej. MD general, clínica familiar), pon sus datos en 'pcp'.\n"
    "   - Si tienes dudas sobre a cuál corresponde, haz tu mejor intento de clasificarlo según la especialidad o contexto de la visita.\n"
    "3. Clasificación de Diagnósticos:\n"
    "   - En 'psychiatric_diagnoses', incluye todas las condiciones de salud mental o psiquiátricas (ej. depresión, ansiedad, insomnio, trastorno bipolar, esquizofrenia, TDAH/ADHD, dependencia de sustancias, deterioro cognitivo, demencia, etc.).\n"
    "   - En 'medical_diagnoses', incluye todas las condiciones físicas o médicas generales (ej. hipertensión, COPD/EPOC, diabetes, cataratas, asma, dolores físicos, problemas cardíacos, renales, cirugías previas, etc.).\n"
    "   - Haz tu mejor intento de clasificar todos los diagnósticos encontrados según su naturaleza clínica en lugar de dejarlos en blanco.\n"
    "   - Para cada diagnóstico en los arrays, usa la estructura: { \"code\": \"código ICD-10 si existe o null\", \"description\": \"descripción de la condición\" }\n"
    "4. Clasificación de Medicaciones:\n"
    "   - En 'psychiatric_medications', incluye todas las medicaciones psicotrópicas o psiquiátricas (ej. sertralina, temazepam, xanax, alprazolam, seroquel, quetiapina, trazodona, gabapentina, etc.).\n"
    "   - En 'medical_medications', incluye todas las medicaciones físicas o médicas generales (ej. insulina, lisinopril, metformina, famotidina, inhaladores, etc.).\n"
    "   - Clasifica de forma proactiva cada medicamento en el grupo correspondiente según su uso terapéutico principal. Si tienes dudas, haz tu mejor intento basándote en la indicación clínica.\n"
    "   - Para cada medicación en los arrays, usa la estructura: { \"name\": \"nombre del medicamento\", \"sig\": \"instrucciones de uso o null\" }\n"
    "5. En 'presenting_problems', extrae el motivo de consulta o chief complaint.\n\n"
    "Devuelve únicamente el objeto JSON válido."
)

for node in nodes:
    if node.get('name') == 'OpenAI Responses API' and node.get('type') == 'n8n-nodes-base.httpRequest':
        params = node.get('parameters', {})
        body_str = params.get('jsonBody', '')
        
        has_equals = body_str.startswith('=')
        body_str_clean = body_str[1:] if has_equals else body_str
        
        try:
            body = json.loads(body_str_clean)
            if 'input' in body and len(body['input']) > 1:
                msg = body['input'][1] # user message
                if 'content' in msg and len(msg['content']) > 0:
                    msg['content'][0]['text'] = optimized_prompt
                    params['jsonBody'] = ('=' if has_equals else '') + json.dumps(body)
                    modified = True
                    print("Prompt schema successfully updated to optimized proactive version!")
        except Exception as e:
            print("Failed to parse jsonBody:", e)

if modified:
    cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (json.dumps(nodes), target_id))
    db.commit()
    print("Workflow updated successfully in the database!")
else:
    print("No nodes were updated.")

db.close()
