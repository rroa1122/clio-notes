import sqlite3

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

cursor.execute("SELECT data FROM execution_data WHERE executionId = 35534")
row = cursor.fetchone()
if row:
    with open("/tmp/execution_35534.json", "w") as f:
        f.write(row[0])
    print("Dumped 35534")
else:
    print("Not found 35534")
conn.close()
