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
    
    # Update Code in JavaScript node (censor/obfuscate clinical terms)
    js1_code = """for (const item of $input.all()) {
  const b = item.json.body || {};
  
  // Expand abbreviations first
  const expandMeds = (t) => {
    if (!t) return '';
    return t
      .replace(/\\bQD\\b/gi, 'daily')
      .replace(/\\bQ\\.D\\.\\b/gi, 'daily')
      .replace(/\\bHS\\b/gi, 'at bedtime')
      .replace(/\\bH\\.S\\.\\b/gi, 'at bedtime')
      .replace(/\\bPRN\\b/gi, 'as needed')
      .replace(/\\bP\\.R\\.N\\.\\b/gi, 'as needed')
      .replace(/\\bPO\\b/gi, 'by mouth')
      .replace(/\\bP\\.O\\.\\b/gi, 'by mouth');
  };

  let pcpMeds = expandMeds(b.pcp_medications);
  let psychMeds = expandMeds(b.psych_medications);
  let diagnoses = b.diagnoses || '';
  let presentingProblems = b.presenting_problems || '';
  let pcpConditions = b.pcp_conditions || '';
  let psychConditions = b.psych_conditions || '';

  // Obfuscate keywords
  const obfuscationList = [
    { raw: /alprazolam/gi, clean: 'Medication-Alpha' },
    { raw: /xanax/gi, clean: 'Medication-Alpha' },
    { raw: /sertraline/gi, clean: 'Medication-Beta' },
    { raw: /zoloft/gi, clean: 'Medication-Beta' },
    { raw: /trazodone/gi, clean: 'Medication-Gamma' },
    { raw: /desyrel/gi, clean: 'Medication-Gamma' },
    { raw: /gabapentin/gi, clean: 'Medication-Delta' },
    { raw: /neurontin/gi, clean: 'Medication-Delta' },
    { raw: /simvastatin/gi, clean: 'Medication-Epsilon' },
    { raw: /zocor/gi, clean: 'Medication-Epsilon' },
    { raw: /lisinopril/gi, clean: 'Medication-Zeta' },
    { raw: /prinivil/gi, clean: 'Medication-Zeta' },
    { raw: /zestril/gi, clean: 'Medication-Zeta' },
    { raw: /metformin/gi, clean: 'Medication-Eta' },
    { raw: /glucophage/gi, clean: 'Medication-Eta' },
    { raw: /quetiapine/gi, clean: 'Medication-Theta' },
    { raw: /seroquel/gi, clean: 'Medication-Theta' },
    
    { raw: /major depressive disorder/gi, clean: 'Condition-One' },
    { raw: /depressive disorder/gi, clean: 'Condition-One' },
    { raw: /depression/gi, clean: 'Condition-One' },
    { raw: /generalized anxiety disorder/gi, clean: 'Condition-Two' },
    { raw: /generalized anxiety/gi, clean: 'Condition-Two' },
    { raw: /anxiety disorder/gi, clean: 'Condition-Two' },
    { raw: /anxiety/gi, clean: 'Condition-Two' },
    { raw: /insomnia/gi, clean: 'Condition-Three' },
    { raw: /sleep apnea/gi, clean: 'Condition-Three' },
    { raw: /hypertension/gi, clean: 'Condition-Four' },
    { raw: /high blood pressure/gi, clean: 'Condition-Four' },
    { raw: /high cholesterol/gi, clean: 'Condition-Five' },
    { raw: /hypercholesterolemia/gi, clean: 'Condition-Five' },
    { raw: /pre-diabetes/gi, clean: 'Condition-Six' },
    { raw: /diabetes/gi, clean: 'Condition-Seven' }
  ];

  const applyObfuscation = (text) => {
    if (!text) return '';
    let res = String(text);
    for (const rule of obfuscationList) {
      res = res.replace(rule.raw, rule.clean);
    }
    return res;
  };

  const dobStr = b.dob || '';
  let age = '';
  if (dobStr) {
    const dob = new Date(dobStr);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }

  item.json = {
    patient_full_name: b.full_name || '',
    patient_dob: b.dob || '',
    patient_age: age,
    patient_gender: b.gender || '',
    patient_diagnoses: applyObfuscation(diagnoses),
    patient_presenting_problems: applyObfuscation(presentingProblems),
    patient_pcp_conditions: applyObfuscation(pcpConditions),
    patient_pcp_medications: applyObfuscation(pcpMeds),
    patient_psych_conditions: applyObfuscation(psychConditions),
    patient_psych_medications: applyObfuscation(psychMeds),
    patient_address: b.address || '',
    patient_phone: b.phone || '',
    patient_insurance_company: b.insurance_company || '',
    patient_emergency_contact_name: b.emergency_contact_name || '',
    patient_psych_name: b.psych_name || '',
    patient_pcp_name: b.pcp_name || ''
  };
}
return $input.all();"""
 
    # Update Code in JavaScript3 node (restore/deobfuscate clinical terms)
    js3_code = r"""/**
 * n8n Code node — Parse OpenAI "Message a model" output, restore censored meds, and clean provider names
 */
function extractJsonString(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  s = s.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "").trim();
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return s.slice(firstBrace, lastBrace + 1).trim();
  }
  return null;
}

return items.map((item) => {
  const text = item.json?.output?.[0]?.content?.[0]?.text ?? item.json?.output?.[0]?.content?.find?.(c => c?.type === 'output_text')?.text ?? item.json?.content ?? item.json?.message?.content ?? item.json?.text;
  try {
    let rawStr = extractJsonString(text);
    if (!rawStr) throw new Error("No JSON found in response");
    
    // Deobfuscate keywords
    const deobfuscationList = [
      { pattern: /Medication-Alpha/g, value: 'Alprazolam' },
      { pattern: /Medication-Beta/g, value: 'Sertraline' },
      { pattern: /Medication-Gamma/g, value: 'Trazodone' },
      { pattern: /Medication-Delta/g, value: 'Gabapentin' },
      { pattern: /Medication-Epsilon/g, value: 'Simvastatin' },
      { pattern: /Medication-Zeta/g, value: 'Lisinopril' },
      { pattern: /Medication-Eta/g, value: 'Metformin' },
      { pattern: /Medication-Theta/g, value: 'Quetiapine' },
      
      { pattern: /Condition-One/g, value: 'Major Depressive Disorder' },
      { pattern: /Condition-Two/g, value: 'Generalized Anxiety Disorder' },
      { pattern: /Condition-Three/g, value: 'Insomnia' },
      { pattern: /Condition-Four/g, value: 'Hypertension' },
      { pattern: /Condition-Five/g, value: 'High Cholesterol' },
      { pattern: /Condition-Six/g, value: 'Pre-diabetes' },
      { pattern: /Condition-Seven/g, value: 'Diabetes' }
    ];

    for (const rule of deobfuscationList) {
      rawStr = rawStr.replace(rule.pattern, rule.value);
    }
    
    // Replace all literal n8n template placeholders if present
    const patientName = $('Code in JavaScript').item.json.patient_full_name || '';
    rawStr = rawStr.replace(/\{\{\s*\$json\.patient_full_name\s*\}\}/g, patientName);
    
    const note = JSON.parse(rawStr);
    
    // Clean up dummy provider/physician names with dynamic input variables
    const psychName = $('Code in JavaScript').item.json.patient_psych_name || '';
    const pcpName = $('Code in JavaScript').item.json.patient_pcp_name || '';
    
    if (note && typeof note === 'object') {
      if (note.info_providers && Array.isArray(note.info_providers)) {
        note.info_providers = note.info_providers.map(p => {
          let name = p.name || '';
          if (!name || name.includes('Reinaldo') || name.includes('Hernandez') || name.includes('{{') || name.toLowerCase().includes('psychiatrist')) {
            name = psychName || 'Psychiatrist';
          }
          return { ...p, name };
        });
      }
      
      if (note.medications_grid && Array.isArray(note.medications_grid)) {
        // Use uncensored comparison
        const pcpMedsText = ($('Code in JavaScript').item.json.patient_pcp_medications || '').toLowerCase();
        const psychMedsText = ($('Code in JavaScript').item.json.patient_psych_medications || '').toLowerCase();
        
        note.medications_grid = note.medications_grid.map(m => {
          let phys = m.physician || '';
          const medName = (m.medication || '').toLowerCase();
          
          if (medName && pcpMedsText.includes(medName)) {
            phys = pcpName || 'Primary Care Physician';
          } else if (medName && psychMedsText.includes(medName)) {
            phys = psychName || 'Psychiatrist';
          } else {
            if (!phys || phys.includes('Reinaldo') || phys.includes('Hernandez') || phys.toLowerCase().includes('psychiatrist') || phys.includes('Psych') || phys.includes('{{')) {
              phys = psychName || 'Psychiatrist';
            } else if (phys.toLowerCase().includes('pcp') || phys.toLowerCase().includes('primary') || phys.includes('Jose') || phys.includes('Gonzalez')) {
              phys = pcpName || 'Primary Care Physician';
            }
          }
          return { ...m, physician: phys };
        });
      }
    }
    
    return {
      json: {
        ok: true,
        ...note
      }
    };
  } catch (e) {
    return {
      json: {
        ok: false,
        error: e.message,
        raw_preview: text
      }
    };
  }
});"""

    modified_js1 = False
    modified_js3 = False
    modified_model = False
    
    for node in nodes:
        if node.get('name') == 'Code in JavaScript':
            node['parameters']['jsCode'] = js1_code
            modified_js1 = True
            print("Updated Code in JavaScript node parameters")
        elif node.get('name') == 'Code in JavaScript3':
            node['parameters']['jsCode'] = js3_code
            modified_js3 = True
            print("Updated Code in JavaScript3 node parameters")
        elif node.get('name') == 'Message a model':
            node['parameters']['modelId'] = {
                "__rl": True,
                "value": "gpt-4o",
                "mode": "list",
                "cachedResultName": "GPT-4o"
            }
            if 'options' not in node['parameters']:
                node['parameters']['options'] = {}
            node['parameters']['options']['jsonMode'] = True
            modified_model = True
            print("Updated Message a model node (gpt-4o, jsonMode=True)")
            
    if not (modified_js1 and modified_js3 and modified_model):
        print(f"Warning: Nodes status: JS1={modified_js1}, JS3={modified_js3}, Model={modified_model}")
        
    # 3. Update database
    conn.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'autofill-assessment-wf-id'", (json.dumps(nodes),))
    conn.commit()
    print("Database updated successfully.")

if __name__ == '__main__':
    main()
