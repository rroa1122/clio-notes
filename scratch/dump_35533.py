import sqlite3

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

cursor.execute("SELECT data FROM execution_data WHERE executionId = 35533")
row = cursor.fetchone()
if row:
    with open("/tmp/execution_35533.json", "w") as f:
        f.write(row[0])
    print("Dumped 35533")
else:
    print("Not found 35533")
conn.close()
