from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role, get_client_ip
from app.models import Bed, BedStatus, User, UserRole
from app.schemas import BedOut, BedStatusUpdate
from app.services.booking_service import is_bed_available_for_dates, expire_unpaid_bookings
from app.core.audit import record_audit

router = APIRouter(prefix="/beds", tags=["Beds & Property"])

@router.get("", response_model=List[BedOut])
def list_beds(
    check_in: Optional[date] = Query(None, description="Check-in date (YYYY-MM-DD)"),
    check_out: Optional[date] = Query(None, description="Check-out date (YYYY-MM-DD)"),
    floor: Optional[int] = Query(None, ge=1, le=3, description="Filter by floor (1, 2, or 3)"),
    db: Session = Depends(get_db)
):
    # Expire any unpaid holds first
    expire_unpaid_bookings(db)

    query = db.query(Bed)
    if floor:
        query = query.filter(Bed.floor_number == floor)
    beds = query.order_by(Bed.floor_number, Bed.bed_number).all()

    results = []
    for bed in beds:
        item = BedOut.model_validate(bed)
        if check_in and check_out:
            if check_out <= check_in:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Check-out date must be strictly after check-in date."
                )
            item.is_available_for_dates = is_bed_available_for_dates(db, bed.id, check_in, check_out)
        else:
            item.is_available_for_dates = (bed.status == BedStatus.AVAILABLE.value)
        results.append(item)

    return results

@router.get("/{bed_id}", response_model=BedOut)
def get_bed(bed_id: int, db: Session = Depends(get_db)):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found.")
    return BedOut.model_validate(bed)

@router.patch("/{bed_id}/status", response_model=BedOut)
def update_bed_status(
    bed_id: int,
    data: BedStatusUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found.")

    valid_statuses = [s.value for s in BedStatus]
    if data.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid bed status. Must be one of: {valid_statuses}"
        )

    old_status = bed.status
    bed.status = data.status
    db.commit()
    db.refresh(bed)

    record_audit(
        db=db,
        user=current_user,
        action="BED_STATUS_CHANGED",
        entity_type="Bed",
        entity_id=bed.id,
        details={"bed_number": bed.bed_number, "old_status": old_status, "new_status": bed.status},
        ip_address=get_client_ip(request)
    )

    return BedOut.model_validate(bed)
