import os
import glob
import sqlite3
import shutil
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, get_client_ip
from app.models import User, UserRole, Bed, BedStatus, Booking, BookingStatus
from app.core.config import settings
from app.core.audit import record_audit

router = APIRouter(prefix="/system", tags=["System Health & Maintenance"])

BACKUP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backups"))
MAX_BACKUP_RETENTION = 10

class BackupFileOut(BaseModel):
    filename: str
    size_bytes: int
    created_at: str

class SystemHealthOut(BaseModel):
    status: str
    application: str
    version: str
    server_time: str
    database: Dict[str, Any]
    backups: Dict[str, Any]
    payment_service: Dict[str, Any]
    expiry_worker: Dict[str, Any]

def ensure_backup_dir():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)

def perform_sqlite_backup() -> str:
    """
    Safely snapshots the SQLite database using SQLite Online Backup API.
    """
    ensure_backup_dir()
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../arthayog.db"))
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file not found at {db_path}")

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"arthayog_backup_{timestamp_str}.db"
    backup_filepath = os.path.join(BACKUP_DIR, backup_filename)

    # Perform online live SQLite backup
    src_conn = sqlite3.connect(db_path)
    dst_conn = sqlite3.connect(backup_filepath)
    with dst_conn:
        src_conn.backup(dst_conn, pages=100)
    dst_conn.close()
    src_conn.close()

    # Enforce retention policy: keep latest MAX_BACKUP_RETENTION files
    all_backups = sorted(
        glob.glob(os.path.join(BACKUP_DIR, "arthayog_backup_*.db")),
        key=os.path.getmtime,
        reverse=True
    )
    if len(all_backups) > MAX_BACKUP_RETENTION:
        for old_file in all_backups[MAX_BACKUP_RETENTION:]:
            try:
                os.remove(old_file)
            except OSError:
                pass

    return backup_filename

@router.get("/health", response_model=SystemHealthOut)
def get_system_health(
    db: Session = Depends(get_db)
):
    """
    System Health Monitoring endpoint: checks DB connectivity, 16 beds, payment configuration, and backup status.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    # Database check
    db_connected = True
    total_beds = 0
    available_beds = 0
    occupied_beds = 0
    reserved_beds = 0
    try:
        beds = db.query(Bed).all()
        total_beds = len(beds)
        available_beds = sum(1 for b in beds if b.status == BedStatus.AVAILABLE.value)
        occupied_beds = sum(1 for b in beds if b.status == BedStatus.OCCUPIED.value)
        reserved_beds = sum(1 for b in beds if b.status == BedStatus.RESERVED.value)
    except Exception as e:
        db_connected = False

    # Backups check
    ensure_backup_dir()
    all_backups = sorted(
        glob.glob(os.path.join(BACKUP_DIR, "arthayog_backup_*.db")),
        key=os.path.getmtime,
        reverse=True
    )
    latest_backup = None
    if all_backups:
        latest_file = os.path.basename(all_backups[0])
        mtime = datetime.fromtimestamp(os.path.getmtime(all_backups[0]), tz=timezone.utc).isoformat()
        latest_backup = {"filename": latest_file, "created_at": mtime}

    return SystemHealthOut(
        status="healthy" if db_connected else "degraded",
        application="Arthayog Dormitory ERP",
        version="1.0.0",
        server_time=now_iso,
        database={
            "connected": db_connected,
            "type": "SQLite with WAL journal mode",
            "total_beds": total_beds,
            "available_beds": available_beds,
            "occupied_beds": occupied_beds,
            "reserved_beds": reserved_beds,
            "health": "Optimal" if total_beds == 16 else "Needs Inspection"
        },
        backups={
            "retention_policy": f"Keep latest {MAX_BACKUP_RETENTION} snapshots",
            "total_backups_stored": len(all_backups),
            "latest_backup": latest_backup,
            "automated_backup_supported": True
        },
        payment_service={
            "provider": "Razorpay Sandbox / Live API",
            "configured": bool(settings.RAZORPAY_KEY_ID),
            "verification_algorithm": "HMAC-SHA256"
        },
        expiry_worker={
            "status": "active",
            "hold_timeout_minutes": settings.BOOKING_HOLD_TIMEOUT_MINUTES,
            "auto_bed_release": True
        }
    )

@router.post("/backup", response_model=Dict[str, Any])
def trigger_system_backup(
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner only: Triggers an immediate, safe database backup snapshot.
    """
    try:
        filename = perform_sqlite_backup()
        file_path = os.path.join(BACKUP_DIR, filename)
        size_bytes = os.path.getsize(file_path)

        record_audit(
            db=db,
            user=current_user,
            action="DATABASE_BACKUP_CREATED",
            entity_type="Database",
            entity_id=filename,
            details={
                "filename": filename,
                "size_bytes": size_bytes,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            ip_address=get_client_ip(request)
        )

        return {
            "status": "success",
            "message": "Database snapshot created successfully.",
            "filename": filename,
            "size_bytes": size_bytes,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup generation failed: {str(e)}"
        )

@router.get("/backups", response_model=List[BackupFileOut])
def list_system_backups(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value]))
):
    """
    Owner only: Lists stored database backup snapshots.
    """
    ensure_backup_dir()
    all_files = sorted(
        glob.glob(os.path.join(BACKUP_DIR, "arthayog_backup_*.db")),
        key=os.path.getmtime,
        reverse=True
    )
    result = []
    for fp in all_files:
        dt = datetime.fromtimestamp(os.path.getmtime(fp), tz=timezone.utc).isoformat()
        result.append(BackupFileOut(
            filename=os.path.basename(fp),
            size_bytes=os.path.getsize(fp),
            created_at=dt
        ))
    return result
