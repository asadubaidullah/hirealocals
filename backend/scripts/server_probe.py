import os
import sqlite3

from app.config import settings

print("DATABASE_URL:", repr(settings.database_url))

prefix = "sqlite:///"
db_path = settings.database_url

if db_path.startswith("sqlite:////"):
    db_path = db_path[len("sqlite:///"):]
elif db_path.startswith(prefix):
    db_path = db_path[len(prefix):]

print("DB_PATH:", repr(db_path))
print("DB_EXISTS:", os.path.exists(db_path))
print("DB_READABLE:", os.access(db_path, os.R_OK))
print("DB_WRITABLE:", os.access(db_path, os.W_OK))

parent = os.path.dirname(db_path)
print("PARENT:", repr(parent))
print("PARENT_EXISTS:", os.path.isdir(parent))
print("PARENT_WRITABLE:", os.access(parent, os.W_OK))

try:
    con = sqlite3.connect(db_path, timeout=5)
    result = con.execute("PRAGMA integrity_check").fetchone()
    print("SQLITE_CONNECT: OK")
    print("INTEGRITY:", result)
    con.close()
except Exception as e:
    print("SQLITE_CONNECT: FAIL")
    print(type(e).__name__, str(e))