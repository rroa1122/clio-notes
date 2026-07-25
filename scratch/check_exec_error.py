import sqlite3
import json
import zlib

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

# Get execution data
cursor.execute("SELECT data FROM execution_data WHERE executionId = 35524")
row = cursor.fetchone()
if not row:
    print("Execution not found")
else:
    data_val = row[0]
    print("Type of data:", type(data_val))
    
    # n8n execution data can be compressed with zlib/gzip or stored as JSON string
    if isinstance(data_val, bytes):
        try:
            # Try decompressing
            decompressed = zlib.decompress(data_val)
            print("Decompressed successfully")
            data_str = decompressed.decode('utf-8')
        except Exception as e:
            print("Failed to decompress:", e)
            data_str = data_val.decode('utf-8', errors='ignore')
    else:
        data_str = data_val

    # Parse and look for error
    try:
        data_json = json.loads(data_str)
        # Dump to file to read
        with open("/tmp/execution_35524.json", "w") as f:
            json.dump(data_json, f, indent=2)
        print("Wrote JSON to /tmp/execution_35524.json")
        
        # Search for error messages
        def search_error(obj, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if k == 'error' or 'message' in str(k).lower() and isinstance(v, str):
                        print(f"Found error at {path}.{k}: {v}")
                    search_error(v, f"{path}.{k}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    search_error(item, f"{path}[{i}]")
                    
        search_error(data_json)
    except Exception as e:
        print("Failed to parse JSON:", e)
        print("Data snippet:", str(data_str)[:1000])

conn.close()
