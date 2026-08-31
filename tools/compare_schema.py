import subprocess

inspect_script = """
import sqlite3
import sys
sys.path.insert(0, '/home/awmnmeeypf/hirealocals-backend')
from app.models import SQLModel

conn = sqlite3.connect('/home/awmnmeeypf/hirealocals-backend/hirealocals.db')
c = conn.cursor()

db_tables = sorted([r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()])
model_tables = sorted(SQLModel.metadata.tables.keys())

print('=== ALL PRODUCTION DB TABLES (' + str(len(db_tables)) + ') ===')
for t in db_tables:
    print(' ', t)

missing_tables = [t for t in model_tables if t not in db_tables]
extra_tables = [t for t in db_tables if t not in model_tables]

print('=== SCHEMA COMPARISON: TABLES ===')
print('Missing tables:', missing_tables)
print('Extra tables (legacy):', extra_tables)

missing_cols = {}
extra_cols = {}
for t in db_tables:
    db_cols = {r[1]: r[2] for r in c.execute('PRAGMA table_info(' + t + ')').fetchall()}
    if t in SQLModel.metadata.tables:
        model_col_names = set(col.name for col in SQLModel.metadata.tables[t].columns)
        m_missing = [col for col in model_col_names if col not in db_cols]
        m_extra = [col for col in db_cols if col not in model_col_names]
        if m_missing: missing_cols[t] = m_missing
        if m_extra: extra_cols[t] = m_extra

print('=== SCHEMA COMPARISON: COLUMNS ===')
print('Missing columns in existing tables:', missing_cols)
print('Extra columns in existing tables:', extra_cols)

db_indexes = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").fetchall()]
print('=== DB INDEXES (' + str(len(db_indexes)) + ') ===')
for idx in db_indexes:
    print(' ', idx)
"""

proc = subprocess.run(['ssh', 'hirealocals-prod', '/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python'], input=inspect_script, text=True, capture_output=True)
print(proc.stdout)
