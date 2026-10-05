import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, migrate_db
from app.services.seed_data import seed_initial_data
from app.services.booking_service import expire_unpaid_bookings
from app.api.routers import (
    auth, beds, bookings, payments,
    cleaning, inventory, maintenance,
    tasks, reports, audit, staff, settings as settings_router, system
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("arthayog")

async def background_booking_expiry_loop():
    """
    Background worker that runs every 60 seconds to release
    unpaid provisional bookings whose hold timeout has elapsed.
    """
    logger.info("Started background booking expiry worker.")
    while True:
        try:
            db = SessionLocal()
            released = expire_unpaid_bookings(db)
            if released > 0:
                logger.info(f"Released {released} expired bookings back to availability.")
            db.close()
        except Exception as e:
            logger.error(f"Error in background expiry loop: {e}")
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed data
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    migrate_db()


    logger.info("Seeding initial ERP data (16 beds, supplies, default admin)...")
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    # Launch background worker
    worker_task = asyncio.create_task(background_booking_expiry_loop())
    logger.info("Arthayog ERP Backend initialized successfully.")

    yield

    # Shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("Arthayog ERP Backend shut down cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-world production ERP backend for Arthayog Dormitory (16 Beds, Payments, Cleaning, Supplies, Maintenance, Audit)",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
api_v1_prefix = "/api"
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(beds.router, prefix=api_v1_prefix)
app.include_router(bookings.router, prefix=api_v1_prefix)
app.include_router(payments.router, prefix=api_v1_prefix)
app.include_router(cleaning.router, prefix=api_v1_prefix)
app.include_router(inventory.router, prefix=api_v1_prefix)
app.include_router(maintenance.router, prefix=api_v1_prefix)
app.include_router(tasks.router, prefix=api_v1_prefix)
app.include_router(reports.router, prefix=api_v1_prefix)
app.include_router(audit.router, prefix=api_v1_prefix)
app.include_router(staff.router, prefix=api_v1_prefix)
app.include_router(settings_router.router, prefix=api_v1_prefix)
app.include_router(system.router, prefix=api_v1_prefix)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
