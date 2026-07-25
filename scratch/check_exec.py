import sqlite3
conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(execution_entity)")
cols = [col[1] for col in cursor.fetchall()]
print("Columns:", cols)

cursor.execute("SELECT id, workflowId, status, finished, startedAt, error FROM execution_entity ORDER BY startedAt DESC LIMIT 5")
for row in cursor.fetchall():
    print(row)
