"""Create a timestamped database backup. Supports SQLite and PostgreSQL."""
from __future__ import annotations
import argparse, os, shutil, sqlite3, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.engine import make_url
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings


def main()->int:
    parser=argparse.ArgumentParser();parser.add_argument("--output",default="backups");args=parser.parse_args()
    backend=Path(__file__).resolve().parents[1]; out=Path(args.output); out=out if out.is_absolute() else backend/out; out.mkdir(parents=True,exist_ok=True)
    stamp=datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    url=make_url(settings.database_url)
    if url.get_backend_name()=="sqlite":
        db_path=Path(url.database or "hirealocals.db"); db_path=db_path if db_path.is_absolute() else backend/db_path
        if not db_path.exists(): print(f"SQLite database not found: {db_path}",file=sys.stderr);return 2
        target=out/f"hirealocals-{stamp}.sqlite3"
        src=sqlite3.connect(str(db_path)); dst=sqlite3.connect(str(target))
        try: src.backup(dst)
        finally: dst.close();src.close()
        print(target);return 0
    if url.get_backend_name().startswith("postgresql"):
        pg_dump=shutil.which("pg_dump")
        if not pg_dump: print("pg_dump is required for PostgreSQL backups and was not found in PATH.",file=sys.stderr);return 3
        target=out/f"hirealocals-{stamp}.dump"
        cmd=[pg_dump,"--format=custom","--no-owner","--no-privileges","--file",str(target),"--host",url.host or "localhost","--port",str(url.port or 5432),"--username",url.username or "postgres",url.database or "hirealocals"]
        env=os.environ.copy();
        if url.password: env["PGPASSWORD"]=url.password
        subprocess.run(cmd,check=True,env=env);print(target);return 0
    print("Unsupported DATABASE_URL backend.",file=sys.stderr);return 4

if __name__=="__main__": raise SystemExit(main())
