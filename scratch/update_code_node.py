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
    
    # New code content for JavaScript3 node
    js_code = """/**
 * n8n Code node — Parse OpenAI "Message a model" output and post-process
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
    const note = JSON.parse(extractJsonString(text));
    
    // Clean up dummy provider/physician names with dynamic input variables from Code in JavaScript node
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

    # 2. Modify node parameters
    modified = False
    for node in nodes:
        if node.get('name') == 'Code in JavaScript3':
            node['parameters']['jsCode'] = js_code
            modified = True
            print("Changed Code in JavaScript3 jsCode parameter")
            
    if not modified:
        print("Node 'Code in JavaScript3' not found")
        return
        
    # 3. Update database
    conn.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'autofill-assessment-wf-id'", (json.dumps(nodes),))
    conn.commit()
    print("Database updated successfully.")

if __name__ == '__main__':
    main()
