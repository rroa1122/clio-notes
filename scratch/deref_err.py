import sqlite3
import json

db = sqlite3.connect('/root/n8n/database.sqlite')
row = db.execute("SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 1").fetchone()
if row:
    parsed = json.loads(row[1])
    def deref(val):
        if isinstance(val, int) and val < len(parsed):
            return parsed[val]
        return val

    for i in [20, 21, 91, 18]:
        print(f"Index {i}: {deref(i)}")
