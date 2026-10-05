from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

# Enable SQLite foreign keys & WAL mode
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def migrate_db():
    """
    Ensures newly added columns in SQLite/Postgres tables exist without needing alembic.
    """
    from sqlalchemy import text
    with engine.connect() as conn:
        # Check bookings table columns
        try:
            info = conn.execute(text("PRAGMA table_info(bookings)")).fetchall()
            existing_cols = [row[1] for row in info]
            if "rejection_reason" not in existing_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN rejection_reason TEXT"))
            if "approved_by_id" not in existing_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN approved_by_id INTEGER"))
            if "approved_at" not in existing_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN approved_at TIMESTAMP"))
            conn.commit()
        except Exception as e:
            # Not sqlite or table not created yet
            pass

