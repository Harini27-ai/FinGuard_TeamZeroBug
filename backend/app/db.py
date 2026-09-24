from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def init_db():
    # Import all models to register with Base metadata
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Safe migration for existing SQLite database
    if engine.dialect.name == "sqlite":
        with engine.connect() as conn:
            try:
                res = conn.exec_driver_sql("PRAGMA table_info(transactions)")
                existing_cols = {row[1] for row in res.fetchall()}
                new_columns = [
                    ("user_id", "INTEGER REFERENCES users(id) ON DELETE CASCADE"),
                    ("account_ref_id", "INTEGER REFERENCES financial_accounts(id) ON DELETE SET NULL"),
                    ("transaction_type", "VARCHAR(20) DEFAULT 'expense'"),
                    ("category", "VARCHAR(50) DEFAULT 'Other'"),
                    ("description", "VARCHAR(255) DEFAULT ''"),
                    ("transaction_date", "DATETIME")
                ]
                for col_name, col_type in new_columns:
                    if col_name not in existing_cols:
                        conn.exec_driver_sql(f"ALTER TABLE transactions ADD COLUMN {col_name} {col_type}")
                conn.commit()
            except Exception as e:
                # Log or pass if already up to date
                pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
