import sqlite3
import json

def main():
    conn = sqlite3.connect('/root/n8n/database.sqlite')
    row = conn.execute('SELECT data FROM execution_data WHERE executionId=45475').fetchone()
    if not row:
        print("Not found")
        return
    data = json.loads(row[0])
    # Let's search for "Message a model" inside the raw data dict or list
    # Because of references/refs in n8n execution data, let's just print the keys and find the node
    if isinstance(data, dict):
        print("Keys of execution data:", data.keys())
    elif isinstance(data, list):
        print("Execution data is a list of length:", len(data))
    
    # We can write a recursive search for node with name "Message a model"
    def find_node(val, path=""):
        if isinstance(val, dict):
            if val.get('name') == 'Message a model':
                print(f"Found node at path: {path}")
                print(json.dumps(val, indent=2)[:1000]) # first 1000 chars
            for k, v in val.items():
                find_node(v, f"{path}.{k}")
        elif isinstance(val, list):
            for i, v in enumerate(val):
                find_node(v, f"{path}[{i}]")
                
    find_node(data)

if __name__ == '__main__':
    main()
