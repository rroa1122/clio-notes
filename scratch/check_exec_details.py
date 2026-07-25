import sqlite3
conn = sqlite3.connect("/root/n8n/database.sqlite")
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("Tables:", tables)

# Print execution tables schemas
for t in tables:
    if 'execution' in t.lower():
        cursor.execute(f"PRAGMA table_info({t})")
        print(f"\nSchema of {t}:", [r[1] for r in cursor.fetchall()])

# Query last 3 executions
cursor.execute("SELECT id, workflowId, finished, status, startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 3")
print("\nLast executions:")
for r in cursor.fetchall():
    print(r)

# If execution_data exists, query the data column for the last execution
if 'execution_data' in tables:
    cursor.execute("SELECT executionId, workflowData FROM execution_data ORDER BY executionId DESC LIMIT 1")
    row = cursor.fetchone()
    if row:
        print("\nLast execution data:")
        print("executionId:", row[0])
        print("workflowData (truncated):", str(row[1])[:500])
