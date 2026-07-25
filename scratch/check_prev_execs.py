import sqlite3
import json

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

# Get execution data for 35523 and 35522
for exec_id in [35523, 35522]:
    cursor.execute("SELECT data FROM execution_data WHERE executionId = ?", (exec_id,))
    row = cursor.fetchone()
    if row:
        with open(f"/tmp/execution_{exec_id}.json", "w") as f:
            f.write(row[0])
        print(f"Dumped {exec_id}")
    else:
        print(f"Not found {exec_id}")
conn.close()
