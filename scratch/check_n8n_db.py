import sqlite3

db = sqlite3.connect('/root/n8n/database.sqlite')
rows = db.execute("SELECT id, name, active FROM workflow_entity").fetchall()
for r in rows:
    print(f"ID: {r[0]}, Name: {r[1]}, Active: {r[2]}")

# Also check webhook_entity
print("\nWebhook Entity:")
w_rows = db.execute("SELECT workflowId, webhookPath, method FROM webhook_entity").fetchall()
for w in w_rows:
    print(f"Workflow: {w[0]}, Path: {w[1]}, Method: {w[2]}")
