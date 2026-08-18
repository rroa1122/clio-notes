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
    data_row = conn.execute('SELECT data FROM execution_data WHERE executionId=45475').fetchone()
    if not data_row:
        print("Execution data not found")
        return
        
    raw_data = json.loads(data_row[0])
    root = deref("0", raw_data)
    
    if isinstance(root, dict):
        res_data = root.get('resultData', {})
        run_data = res_data.get('runData', {})
        
        # Get Code in JavaScript output (input to Message a model)
        code_node = run_data.get('Code in JavaScript', [])
        if code_node and len(code_node) > 0:
            json_data = code_node[0].get('data', {}).get('main', [[]])[0]
            if json_data and len(json_data) > 0:
                print("Code in JavaScript Output JSON:")
                print(json.dumps(json_data[0].get('json', {}), indent=2))
        
        # Get OpenAI prompt parameter or input message
        # Let's inspect the node parameters from the workflow or node execution data if saved
        # We can see execution logs or similar. Let's see what else is in run_data for Message a model
        openai_node = run_data.get('Message a model', [])
        if openai_node and len(openai_node) > 0:
            print("Message a model Node data:")
            # print keys of openai_node[0]
            print(openai_node[0].keys())
            if 'parameterExpressions' in openai_node[0]:
                print("parameterExpressions:", openai_node[0]['parameterExpressions'])

if __name__ == '__main__':
    main()
