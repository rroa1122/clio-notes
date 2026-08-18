import sqlite3
import json

def deref(val, raw_data, visited=None):
    if visited is None:
        visited = set()
    val_id = id(val)
    if val_id in visited:
        return val
    visited.add(val_id)
    if isinstance(val, str):
        try:
            idx = int(val)
            if isinstance(raw_data, list) and 0 <= idx < len(raw_data):
                return deref(raw_data[idx], raw_data, visited)
        except ValueError:
            pass
    if isinstance(val, list):
        return [deref(item, raw_data, visited) for item in val]
    if isinstance(val, dict):
        res = {}
        for k, v in val.items():
            res[k] = deref(v, raw_data, visited)
        return res
    return val

def main():
    conn = sqlite3.connect('/root/n8n/database.sqlite')
    row = conn.execute('SELECT data FROM execution_data WHERE executionId=45475').fetchone()
    if not row:
        print("Not found")
        return
    raw_data = json.loads(row[0])
    root = deref("0", raw_data)
    
    # Let's search for "Message a model" recursively
    def find_node(val, path=""):
        if isinstance(val, dict):
            if val.get('name') == 'Message a model':
                print(f"Found node at: {path}")
                # Print keys of val
                print("Node keys:", val.keys())
                # Print keys of data
                if 'data' in val:
                    print("Data keys:", val['data'].keys() if isinstance(val['data'], dict) else type(val['data']))
                    # Let's dump the node details
                    print(json.dumps(val, indent=2)[:3000])
            for k, v in val.items():
                find_node(v, f"{path}.{k}")
        elif isinstance(val, list):
            for i, v in enumerate(val):
                find_node(v, f"{path}[{i}]")
                
    find_node(root)

if __name__ == '__main__':
    main()
