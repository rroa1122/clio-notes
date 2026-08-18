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
    row = conn.execute('SELECT data FROM execution_data WHERE executionId=45516').fetchone()
    if not row:
        print("Not found")
        return
    data = json.loads(row[0])
    print("Type of data:", type(data))
    print("Length of list:", len(data))
    
    # Print medications_grid and response text
    if len(data) > 14:
        root = deref("14", data)
        try:
            text = root[0]['data']['main'][0][0]['json']['output'][0]['content'][0]['text']
            print("FULL TEXT OUTPUT:")
            print(text)
        except Exception as e:
            print("Error extracting text:", e)

if __name__ == '__main__':
    main()
