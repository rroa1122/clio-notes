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
cur.execute('SELECT data FROM execution_data WHERE executionId = 35550')
row = cur.fetchone()
if row:
    raw_data = json.loads(row[0])
    try:
        resolved = unflat(raw_data)
        run_data = resolved.get('resultData', {}).get('runData', {})
        print("Nodes in runData:", list(run_data.keys()))
        
        # Check "Respond to Webhook" node
        webhook_node = run_data.get('Respond to Webhook', [])
        if webhook_node:
            print("\n=== Webhook Response Node Output ===")
            print(json.dumps(webhook_node[0].get('data', {}).get('main', [[]])[0][0].get('json', {}), indent=2))
        else:
            model_node = run_data.get('Message a model', [])
            if model_node:
                print("\n=== Message a Model Node Output ===")
                print(json.dumps(model_node[0].get('data', {}).get('main', [[]])[0][0].get('json', {}), indent=2))
    except Exception as e:
        print("Failed to unflat and parse data:", e)
        import traceback
        traceback.print_exc()
else:
    print("Execution data not found")
conn.close()
