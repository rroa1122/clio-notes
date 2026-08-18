import sqlite3
import json

def main():
    conn = sqlite3.connect('/root/n8n/database.sqlite')
    row = conn.execute("SELECT data FROM execution_data WHERE executionId = 45516").fetchone()
    if not row:
        print("Execution not found")
        return
    def find_key(obj, key):
        if isinstance(obj, dict):
            if key in obj:
                return obj[key]
            for v in obj.values():
                res = find_key(v, key)
                if res: return res
        elif isinstance(obj, list):
            for item in obj:
                res = find_key(item, key)
                if res: return res
        return None

    data = json.loads(row[0])
    model_run = find_key(data, 'Message a model')
    if model_run and isinstance(model_run, list) and len(model_run) > 0:
        print("INPUT DATA:")
        print(json.dumps(model_run[0].get('inputData', {}), indent=2))
    else:
        print("Message a model run data not found")


if __name__ == '__main__':
    main()
