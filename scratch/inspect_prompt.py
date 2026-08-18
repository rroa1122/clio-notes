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

def main():
    conn = sqlite3.connect('/root/n8n/database.sqlite')
    row = conn.execute("SELECT data FROM execution_data WHERE executionId = 45516").fetchone()
    if not row:
        print("Execution not found")
        return
    data = json.loads(row[0])
    resolved = unflat(data)
    
    # Locate the node parameters for 'Message a model'
    run_data = resolved.get('resultData', {}).get('runData', {})
    model_node = run_data.get('Message a model', [])
    if model_node:
        # Let's search recursively for any string containing 'database administrative mapping'
        found_paths = []
        visited = set()
        def search_string(obj, path=""):
            if id(obj) in visited:
                return
            visited.add(id(obj))
            if isinstance(obj, str):
                if "database administrative mapping" in obj.lower():
                    found_paths.append((path, obj))
            elif isinstance(obj, dict):
                for k, v in obj.items():
                    search_string(v, f"{path}['{k}']")
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    search_string(v, f"{path}[{i}]")
                    
        search_string(resolved)
        if found_paths:
            print(f"Found {len(found_paths)} occurrences:")
            for p, s in found_paths:
                print(f"\nPath: {p}")
                print("Preview:", s[:300])
        else:
            print("Prompt text not found in execution data.")
    else:
        print("Message a model run data not found")

if __name__ == '__main__':
    main()
