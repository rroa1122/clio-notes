import sqlite3
import json

def unflat(serialized):
    cache = {}
    def resolve(idx):
        if idx in cache:
            return cache[idx]
        if not isinstance(idx, int) or idx < 0 or idx >= len(serialized):
            return idx
        val = serialized[idx]
        if val is None:
            return None
        if isinstance(val, (list, dict)):
            if isinstance(val, list):
                res = []
                cache[idx] = res
                for item in val:
                    try:
                        res.append(resolve(int(item)))
                    except Exception:
                        res.append(item)
                return res
            else:
                res = {}
                cache[idx] = res
                for k in val.keys():
                    try:
                        res[k] = resolve(int(val[k]))
                    except Exception:
                        res[k] = val[k]
                return res
        return val
    return resolve(0)

conn = sqlite3.connect('/root/n8n/database.sqlite')
cur = conn.cursor()
cur.execute('SELECT data FROM execution_data WHERE executionId = 45523')
row = cur.fetchone()
if row:
    raw_data = json.loads(row[0])
    try:
        resolved = unflat(raw_data)
        run_data = resolved.get('resultData', {}).get('runData', {})
        print("Nodes in runData:", list(run_data.keys()))
        
        js3_node = run_data.get('Code in JavaScript3', [])
        if js3_node:
            main_data = js3_node[0]['data'].get('main', [[]])[0]
            if main_data and 'json' in main_data[0]:
                js = main_data[0]['json']
                print("medications_grid:", json.dumps(js.get('medications_grid', []), indent=2))
                print("domain_mental_health_note:", js.get('domain_mental_health_note'))
                print("domain_physical_health_note:", js.get('domain_physical_health_note'))
    except Exception as e:
        print("Failed to unflat and parse data:", e)
        import traceback
        traceback.print_exc()
else:
    print("Execution data not found")
conn.close()
