import sqlite3

conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

cursor.execute("SELECT data FROM execution_data WHERE executionId = 35529")
row = cursor.fetchone()
if row:
    with open("/tmp/execution_35529.json", "w") as f:
        f.write(row[0])
    print("Dumped 35529")
else:
    print("Not found 35529")
conn.close()
