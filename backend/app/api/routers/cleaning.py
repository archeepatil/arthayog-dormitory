from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_role, get_client_ip
from app.models import Bed, BedStatus, CleaningLog, CleaningStatus, User, UserRole
from app.schemas import CleaningLogOut
from app.core.audit import record_audit

router = APIRouter(prefix="/cleaning", tags=["Cleaning Workflow"])

@router.get("/queue", response_model=List[CleaningLogOut])
def get_cleaning_queue(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    """
    Returns current active cleaning logs for beds that are CLEANING_REQUIRED or CLEANING_IN_PROGRESS.
    """
    logs = db.query(CleaningLog).join(Bed).filter(
        Bed.status.in_([BedStatus.CLEANING_REQUIRED.value, BedStatus.CLEANING_IN_PROGRESS.value])
    ).order_by(CleaningLog.created_at.desc()).all()

    results = []
    for log in logs:
        out = CleaningLogOut(
            id=log.id,
            bed_id=log.bed_id,
            bed_number=log.bed.bed_number if log.bed else None,
            floor_number=log.bed.floor_number if log.bed else None,
            staff_id=log.staff_id,
            staff_name=log.staff.full_name if log.staff else None,
            status=log.status,
            started_at=log.started_at,
            completed_at=log.completed_at,
            notes=log.notes,
            created_at=log.created_at
        )
        results.append(out)
    return results

@router.post("/{bed_id}/start", response_model=CleaningLogOut)
def start_cleaning(
    bed_id: int,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found.")

    bed.status = BedStatus.CLEANING_IN_PROGRESS.value

    # Look for existing pending cleaning log or create new
    log = db.query(CleaningLog).filter(
        CleaningLog.bed_id == bed.id,
        CleaningLog.status == CleaningStatus.CLEANING_REQUIRED.value
    ).first()

    now = datetime.now(timezone.utc)
    if not log:
        log = CleaningLog(
            bed_id=bed.id,
            staff_id=current_user.id,
            status=CleaningStatus.CLEANING_IN_PROGRESS.value,
            started_at=now
        )
        db.add(log)
    else:
        log.status = CleaningStatus.CLEANING_IN_PROGRESS.value
        log.staff_id = current_user.id
        log.started_at = now

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="CLEANING_STARTED",
        entity_type="CleaningLog",
        entity_id=log.id,
        details={"bed_number": bed.bed_number, "staff": current_user.full_name},
        ip_address=get_client_ip(request)
    )

    db.refresh(log)
    return CleaningLogOut(
        id=log.id,
        bed_id=log.bed_id,
        bed_number=bed.bed_number,
        floor_number=bed.floor_number,
        staff_id=log.staff_id,
        staff_name=current_user.full_name,
        status=log.status,
        started_at=log.started_at,
        completed_at=log.completed_at,
        notes=log.notes,
        created_at=log.created_at
    )

@router.post("/{bed_id}/complete", response_model=CleaningLogOut)
def complete_cleaning(
    bed_id: int,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found.")

    now = datetime.now(timezone.utc)
    bed.status = BedStatus.AVAILABLE.value  # Ready!

    log = db.query(CleaningLog).filter(
        CleaningLog.bed_id == bed.id,
        CleaningLog.status == CleaningStatus.CLEANING_IN_PROGRESS.value
    ).first()

    if not log:
        log = CleaningLog(
            bed_id=bed.id,
            staff_id=current_user.id,
            status=CleaningStatus.COMPLETED.value,
            started_at=now,
            completed_at=now
        )
        db.add(log)
    else:
        log.status = CleaningStatus.COMPLETED.value
        log.completed_at = now

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="CLEANING_COMPLETED_BED_READY",
        entity_type="Bed",
        entity_id=bed.id,
        details={"bed_number": bed.bed_number, "status": "AVAILABLE_READY"},
        ip_address=get_client_ip(request)
    )

    db.refresh(log)
    return CleaningLogOut(
        id=log.id,
        bed_id=log.bed_id,
        bed_number=bed.bed_number,
        floor_number=bed.floor_number,
        staff_id=log.staff_id,
        staff_name=log.staff.full_name if log.staff else current_user.full_name,
        status=log.status,
        started_at=log.started_at,
        completed_at=log.completed_at,
        notes=log.notes,
        created_at=log.created_at
    )
