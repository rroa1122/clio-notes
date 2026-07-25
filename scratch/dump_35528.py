import sqlite3

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

for exec_id in [35527, 35528]:
    cursor.execute("SELECT data FROM execution_data WHERE executionId = ?", (exec_id,))
    row = cursor.fetchone()
    if row:
        with open(f"/tmp/execution_{exec_id}.json", "w") as f:
            f.write(row[0])
        print(f"Dumped {exec_id}")
    else:
        print(f"Not found {exec_id}")
conn.close()
