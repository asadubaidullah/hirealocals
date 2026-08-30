import os
import sys
import sqlite3
import traceback

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
os.chdir(BASE_DIR)

try:
    from app.config import settings

    print("BASE_DIR:", BASE_DIR)
    print("DATABASE_URL:", repr(settings.database_url))

    db_url = settings.database_url

    if db_url.startswith("sqlite:///"):
        db_path = db_url[len("sqlite:///"):]
    else:
        db_path = db_url

    print("DB_PATH:", repr(db_path))
    print("DB_EXISTS:", os.path.exists(db_path))
    print("DB_READABLE:", os.access(db_path, os.R_OK))
    print("DB_WRITABLE:", os.access(db_path, os.W_OK))

    parent = os.path.dirname(db_path)
    print("PARENT:", repr(parent))
    print("PARENT_EXISTS:", os.path.isdir(parent))
    print("PARENT_WRITABLE:", os.access(parent, os.W_OK))

    con = sqlite3.connect(db_path, timeout=5)
    result = con.execute("PRAGMA integrity_check").fetchone()

    print("SQLITE_CONNECT: OK")
    print("INTEGRITY:", result)

    con.close()

except Exception:
    print("PROBE FAILED")
    traceback.print_exc()