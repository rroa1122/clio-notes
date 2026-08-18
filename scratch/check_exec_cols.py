import sqlite3

db = sqlite3.connect('/root/n8n/database.sqlite')
cursor = db.cursor()
cursor.execute("PRAGMA table_info(execution_entity)")
print("execution_entity columns:", [c[1] for c in cursor.fetchall()])

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("All tables:", [t[0] for t in cursor.fetchall()])
