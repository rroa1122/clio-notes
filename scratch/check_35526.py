import sqlite3
import json

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

for exec_id in [35526, 35527]:
    cursor.execute("SELECT data FROM execution_data WHERE executionId = ?", (exec_id,))
    row = cursor.fetchone()
    if row:
        try:
            # Simple substring search since resolving the JSON references is slow or circular
            data_str = row[0]
            # find filename
            idx = data_str.find('"filename"')
            if idx != -1:
                print(f"Exec {exec_id} filename context:", data_str[idx:idx+150])
            else:
                print(f"Exec {exec_id} filename not found")
        except Exception as e:
            print(f"Exec {exec_id} error: {e}")
    else:
        print(f"Exec {exec_id} row not found")
conn.close()
