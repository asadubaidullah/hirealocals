from sqlmodel import SQLModel, Session, create_engine
from .config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
    "connect_args": connect_args,
}
if not settings.database_url.startswith("sqlite"):
    # Conservative defaults for a small production deployment. These can be tuned later.
    engine_kwargs.update({"pool_size": 10, "max_overflow": 20, "pool_recycle": 1800})

engine = create_engine(settings.database_url, **engine_kwargs)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    if settings.database_url.startswith("sqlite"):
        with engine.connect() as conn:
            from sqlalchemy import text
            try:
                cols = [r[1] for r in conn.execute(text("PRAGMA table_info(booking)")).fetchall()]
                if "discount_amount" not in cols:
                    conn.execute(text("ALTER TABLE booking ADD COLUMN discount_amount FLOAT DEFAULT 0.0"))
                if "promo_code" not in cols:
                    conn.execute(text("ALTER TABLE booking ADD COLUMN promo_code VARCHAR(40) DEFAULT ''"))
                conn.commit()
            except Exception:
                pass


def get_session():
    with Session(engine) as session:
        yield session
