import uuid
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_current_user_optional, require_role, get_client_ip
from app.models import (
    Bed, BedStatus, Booking, BookingStatus, BookingType,
    Payment, PaymentStatus, PaymentMethod, CleaningLog, CleaningStatus,
    User, UserRole
)
from app.schemas import (
    BookingCreateOnline, BookingCreatePhone, BookingOut,
    BookingCheckIn, BookingCheckOut, BookingCancel, PaymentOut,
    GroupBookingCreate, GroupBookingOut, GroupBookingBedOut, GroupBookingModify
)
from app.services.booking_service import is_bed_available_for_dates, expire_unpaid_bookings
from app.core.config import settings
from app.core.audit import record_audit

router = APIRouter(prefix="/bookings", tags=["Bookings Engine"])

def generate_booking_code() -> str:
    now_year = datetime.now(timezone.utc).year
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"AY-{now_year}-{random_suffix}"

def enrich_booking_out(b: Booking) -> BookingOut:
    out = BookingOut(
        id=b.id,
        booking_code=b.booking_code,
        guest_id=b.guest_id,
        guest_name=b.guest_name,
        guest_phone=b.guest_phone,
        guest_email=b.guest_email,
        guest_id_proof_type=b.guest_id_proof_type,
        guest_id_proof_number=b.guest_id_proof_number,
        bed_id=b.bed_id,
        bed_number=b.bed.bed_number if b.bed else None,
        floor_number=b.bed.floor_number if b.bed else None,
        check_in_date=b.check_in_date,
        check_out_date=b.check_out_date,
        status=b.status,
        booking_type=b.booking_type,
        group_code=b.group_code,
        event_name=b.event_name,
        notes=b.notes,
        total_amount=b.total_amount,
        paid_amount=b.paid_amount,
        hold_expires_at=b.hold_expires_at,
        checked_in_at=b.checked_in_at,
        checked_out_at=b.checked_out_at,
        created_at=b.created_at,
        payments=[PaymentOut.model_validate(p) for p in b.payments] if b.payments else []
    )
    return out

@router.post("/online", response_model=BookingOut)
def create_online_booking(
    data: BookingCreateOnline,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    expire_unpaid_bookings(db)

    if data.check_out_date <= data.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be strictly after check-in date."
        )

    bed = db.query(Bed).filter(Bed.id == data.bed_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected bed not found.")

    if not is_bed_available_for_dates(db, bed.id, data.check_in_date, data.check_out_date):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Bed {bed.bed_number} is no longer available for the selected dates."
        )

    nights = max((data.check_out_date - data.check_in_date).days, 1)
    total_amount = round(bed.base_price_inr * nights, 2)
    hold_expiry = datetime.now(timezone.utc) + timedelta(minutes=settings.BOOKING_HOLD_TIMEOUT_MINUTES)

    booking = Booking(
        booking_code=generate_booking_code(),
        guest_id=current_user.id if current_user else None,
        guest_name=data.guest_name,
        guest_phone=data.guest_phone,
        guest_email=data.guest_email,
        bed_id=bed.id,
        check_in_date=data.check_in_date,
        check_out_date=data.check_out_date,
        status=BookingStatus.PENDING_PAYMENT.value,
        booking_type=BookingType.ONLINE.value,
        notes=data.notes,
        total_amount=total_amount,
        paid_amount=0.0,
        hold_expires_at=hold_expiry
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    record_audit(
        db=db,
        user=current_user,
        action="ONLINE_BOOKING_INITIATED",
        entity_type="Booking",
        entity_id=booking.id,
        details={
            "booking_code": booking.booking_code,
            "bed_number": bed.bed_number,
            "nights": nights,
            "total_amount": total_amount,
            "hold_expires_at": hold_expiry.isoformat()
        },
        ip_address=get_client_ip(request)
    )

    return enrich_booking_out(booking)

@router.post("/phone", response_model=BookingOut)
def create_phone_booking(
    data: BookingCreatePhone,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    """
    Staff / Owner phone booking workflow for wedding/event groups, walk-ins, phone reservations.
    """
    expire_unpaid_bookings(db)

    if data.check_out_date <= data.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be strictly after check-in date."
        )

    bed = db.query(Bed).filter(Bed.id == data.bed_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected bed not found.")

    if not is_bed_available_for_dates(db, bed.id, data.check_in_date, data.check_out_date):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Bed {bed.bed_number} is not available for the requested dates."
        )

    nights = max((data.check_out_date - data.check_in_date).days, 1)
    total_amount = data.total_amount if data.total_amount is not None else round(bed.base_price_inr * nights, 2)
    paid_amount = data.paid_amount or 0.0

    is_confirmed = data.is_confirmed or (paid_amount >= total_amount)
    status_str = BookingStatus.CONFIRMED.value if is_confirmed else BookingStatus.PENDING_PAYMENT.value
    hold_expiry = None if is_confirmed else datetime.now(timezone.utc) + timedelta(minutes=settings.BOOKING_HOLD_TIMEOUT_MINUTES * 4)

    booking = Booking(
        booking_code=generate_booking_code(),
        guest_name=data.guest_name,
        guest_phone=data.guest_phone,
        guest_email=data.guest_email,
        guest_id_proof_type=data.guest_id_proof_type,
        guest_id_proof_number=data.guest_id_proof_number,
        bed_id=bed.id,
        check_in_date=data.check_in_date,
        check_out_date=data.check_out_date,
        status=status_str,
        booking_type=BookingType.PHONE_WALKIN.value,
        notes=data.notes,
        total_amount=total_amount,
        paid_amount=paid_amount,
        hold_expires_at=hold_expiry,
        created_by_id=current_user.id
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # If upfront payment was made
    if paid_amount > 0:
        method_str = data.payment_method or PaymentMethod.CASH.value
        payment = Payment(
            booking_id=booking.id,
            amount=paid_amount,
            currency="INR",
            status=PaymentStatus.SUCCESS.value,
            method=method_str,
            verified_at=datetime.now(timezone.utc)
        )
        db.add(payment)
        db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="PHONE_BOOKING_CREATED",
        entity_type="Booking",
        entity_id=booking.id,
        details={
            "booking_code": booking.booking_code,
            "guest_name": booking.guest_name,
            "bed_number": bed.bed_number,
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "status": booking.status
        },
        ip_address=get_client_ip(request)
    )

    db.refresh(booking)
    return enrich_booking_out(booking)

@router.get("", response_model=List[BookingOut])
def list_bookings(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expire_unpaid_bookings(db)
    query = db.query(Booking)

    # Backend-enforced role authorization:
    # Customer/Guest can only view their own bookings
    if current_user.role == UserRole.CUSTOMER_GUEST.value:
        query = query.filter(
            (Booking.guest_id == current_user.id) |
            (Booking.guest_email == current_user.email)
        )
    
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Booking.booking_code.ilike(s)) |
            (Booking.guest_name.ilike(s)) |
            (Booking.guest_phone.ilike(s))
        )

    bookings = query.order_by(Booking.created_at.desc()).all()
    return [enrich_booking_out(b) for b in bookings]

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    # Access check
    if current_user.role == UserRole.CUSTOMER_GUEST.value:
        if booking.guest_id != current_user.id and booking.guest_email != current_user.email:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return enrich_booking_out(booking)

@router.post("/{booking_id}/check-in", response_model=BookingOut)
def check_in_guest(
    booking_id: int,
    data: BookingCheckIn,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if booking.status not in [BookingStatus.CONFIRMED.value, BookingStatus.PENDING_PAYMENT.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check in booking with status '{booking.status}'."
        )

    bed = db.query(Bed).filter(Bed.id == booking.bed_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found.")

    if bed.status == BedStatus.MAINTENANCE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bed is currently under maintenance.")

    booking.status = BookingStatus.CHECKED_IN.value
    booking.checked_in_at = datetime.now(timezone.utc)
    booking.guest_id_proof_type = data.guest_id_proof_type
    booking.guest_id_proof_number = data.guest_id_proof_number
    if data.notes:
        booking.notes = f"{booking.notes or ''}\n[Check-in note]: {data.notes}".strip()

    bed.status = BedStatus.OCCUPIED.value
    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="GUEST_CHECKED_IN",
        entity_type="Booking",
        entity_id=booking.id,
        details={
            "booking_code": booking.booking_code,
            "guest_name": booking.guest_name,
            "bed_number": bed.bed_number,
            "id_proof_type": data.guest_id_proof_type
        },
        ip_address=get_client_ip(request)
    )

    db.refresh(booking)
    return enrich_booking_out(booking)

@router.post("/{booking_id}/check-out", response_model=BookingOut)
def check_out_guest(
    booking_id: int,
    data: BookingCheckOut,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if booking.status != BookingStatus.CHECKED_IN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check out booking that is currently '{booking.status}'."
        )

    bed = db.query(Bed).filter(Bed.id == booking.bed_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found.")

    booking.status = BookingStatus.CHECKED_OUT.value
    booking.checked_out_at = datetime.now(timezone.utc)
    if data.inspection_notes:
        booking.notes = f"{booking.notes or ''}\n[Check-out inspection]: {data.inspection_notes}".strip()
    if data.additional_charges and data.additional_charges > 0:
        booking.total_amount += data.additional_charges

    # Bed transition: Occupied -> Checked Out -> Cleaning Required
    bed.status = BedStatus.CLEANING_REQUIRED.value

    # Create cleaning log entry
    cleaning_log = CleaningLog(
        bed_id=bed.id,
        status=CleaningStatus.CLEANING_REQUIRED.value,
        notes=f"Auto-generated after checkout of booking {booking.booking_code}"
    )
    db.add(cleaning_log)
    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="GUEST_CHECKED_OUT",
        entity_type="Booking",
        entity_id=booking.id,
        details={
            "booking_code": booking.booking_code,
            "guest_name": booking.guest_name,
            "bed_number": bed.bed_number,
            "bed_status": bed.status
        },
        ip_address=get_client_ip(request)
    )

    db.refresh(booking)
    return enrich_booking_out(booking)

@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    data: BookingCancel,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    # Permissions
    if current_user.role == UserRole.CUSTOMER_GUEST.value:
        if booking.guest_id != current_user.id and booking.guest_email != current_user.email:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        if booking.status in [BookingStatus.CHECKED_IN.value, BookingStatus.CHECKED_OUT.value]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel checked-in/out booking.")

    if booking.status in [BookingStatus.CANCELLED.value, BookingStatus.CHECKED_OUT.value]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Booking is already {booking.status}.")

    old_status = booking.status
    booking.status = BookingStatus.CANCELLED.value
    booking.notes = f"{booking.notes or ''}\n[Cancelled]: {data.cancellation_reason}".strip()

    bed = db.query(Bed).filter(Bed.id == booking.bed_id).first()
    if bed and bed.status in [BedStatus.RESERVED.value, BedStatus.OCCUPIED.value]:
        bed.status = BedStatus.AVAILABLE.value

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="BOOKING_CANCELLED",
        entity_type="Booking",
        entity_id=booking.id,
        details={
            "booking_code": booking.booking_code,
            "old_status": old_status,
            "reason": data.cancellation_reason
        },
        ip_address=get_client_ip(request)
    )

    db.refresh(booking)
    return enrich_booking_out(booking)

@router.post("/expire-check")
def trigger_expiry_check(db: Session = Depends(get_db)):
    released_count = expire_unpaid_bookings(db)
    return {"message": "Expiry check executed", "expired_bookings_released": released_count}

# ----------------- Bulk Floor / Group / Wedding Booking Endpoints -----------------

def build_group_booking_out(group_bookings: List[Booking], unavailable_beds: List[str] = None) -> GroupBookingOut:
    if not group_bookings:
        raise HTTPException(status_code=404, detail="No bookings found for this group.")

    lead = group_bookings[0]
    assigned_beds = []
    floors_set = set()
    total_amount = 0.0
    paid_amount = 0.0

    for b in group_bookings:
        nights = max((b.check_out_date - b.check_in_date).days, 1)
        fl = b.bed.floor_number if b.bed else 1
        floors_set.add(fl)
        total_amount += b.total_amount
        paid_amount += b.paid_amount
        assigned_beds.append(GroupBookingBedOut(
            booking_id=b.id,
            booking_code=b.booking_code,
            bed_id=b.bed_id,
            bed_number=b.bed.bed_number if b.bed else "",
            floor_number=fl,
            base_price_inr=b.bed.base_price_inr if b.bed else round(b.total_amount / nights, 2),
            status=b.status,
            nights=nights,
            total_amount=b.total_amount
        ))

    all_statuses = {b.status for b in group_bookings}
    if BookingStatus.CHECKED_IN.value in all_statuses:
        status_val = BookingStatus.CHECKED_IN.value
    elif BookingStatus.CONFIRMED.value in all_statuses:
        status_val = BookingStatus.CONFIRMED.value
    elif BookingStatus.CANCELLED.value in all_statuses and len(all_statuses) == 1:
        status_val = BookingStatus.CANCELLED.value
    else:
        status_val = lead.status

    nights = max((lead.check_out_date - lead.check_in_date).days, 1)

    return GroupBookingOut(
        group_code=lead.group_code or lead.booking_code,
        event_name=lead.event_name or "Group / Wedding Stay",
        guest_name=lead.guest_name,
        guest_phone=lead.guest_phone,
        guest_email=lead.guest_email,
        check_in_date=lead.check_in_date,
        check_out_date=lead.check_out_date,
        nights=nights,
        floors_selected=sorted(list(floors_set)),
        total_beds_assigned=len(assigned_beds),
        assigned_beds=assigned_beds,
        unavailable_beds_on_floors=unavailable_beds or [],
        total_amount=round(total_amount, 2),
        paid_amount=round(paid_amount, 2),
        status=status_val,
        booking_type="GROUP_WEDDING",
        created_at=lead.created_at,
        notes=lead.notes
    )

@router.post("/group", response_model=GroupBookingOut)
def create_group_booking(
    data: GroupBookingCreate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    """
    Staff / Owner: Creates a group/wedding bulk booking for selected floors.
    Automatically assigns all available beds on the requested floor(s) for the selected dates.
    Flags any unavailable beds so double booking is strictly prevented.
    """
    expire_unpaid_bookings(db)

    if data.check_out_date <= data.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be strictly after check-in date."
        )

    if not data.floors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one floor (Floor 1, 2, or 3)."
        )

    # Fetch all beds on selected floors
    query = db.query(Bed).filter(Bed.floor_number.in_(data.floors))
    if data.bed_ids:
        query = query.filter(Bed.id.in_(data.bed_ids))
    candidate_beds = query.order_by(Bed.floor_number, Bed.bed_number).all()

    if not candidate_beds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No beds found on the selected floor(s)."
        )

    available_beds = []
    unavailable_beds = []

    for b in candidate_beds:
        if is_bed_available_for_dates(db, b.id, data.check_in_date, data.check_out_date):
            available_beds.append(b)
        else:
            unavailable_beds.append(f"Bed {b.bed_number} (Floor {b.floor_number})")

    if not available_beds:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"All beds on selected floor(s) are already booked for {data.check_in_date} to {data.check_out_date}."
        )

    now_utc = datetime.now(timezone.utc)
    group_code = f"AY-GRP-{now_utc.year}-{uuid.uuid4().hex[:6].upper()}"
    nights = max((data.check_out_date - data.check_in_date).days, 1)

    is_confirmed = data.is_confirmed or (data.paid_amount and data.paid_amount > 0)
    status_str = BookingStatus.CONFIRMED.value if is_confirmed else BookingStatus.PENDING_PAYMENT.value
    hold_expiry = None if is_confirmed else now_utc + timedelta(minutes=settings.BOOKING_HOLD_TIMEOUT_MINUTES * 4)

    created_bookings = []
    total_group_amount = 0.0

    for bed in available_beds:
        bed_total = round(bed.base_price_inr * nights, 2)
        total_group_amount += bed_total

        b = Booking(
            booking_code=generate_booking_code(),
            guest_name=data.guest_name,
            guest_phone=data.guest_phone,
            guest_email=data.guest_email,
            bed_id=bed.id,
            check_in_date=data.check_in_date,
            check_out_date=data.check_out_date,
            status=status_str,
            booking_type="GROUP_WEDDING",
            group_code=group_code,
            event_name=data.event_name or "Group / Wedding Stay",
            notes=data.notes,
            total_amount=bed_total,
            paid_amount=0.0,
            hold_expires_at=hold_expiry,
            created_by_id=current_user.id
        )
        db.add(b)
        created_bookings.append(b)

    db.commit()

    # Credit paid amount to lead booking if upfront payment made
    if data.paid_amount and data.paid_amount > 0 and created_bookings:
        created_bookings[0].paid_amount = min(data.paid_amount, total_group_amount)
        payment = Payment(
            booking_id=created_bookings[0].id,
            amount=data.paid_amount,
            currency="INR",
            status=PaymentStatus.SUCCESS.value,
            method=data.payment_method or PaymentMethod.CASH.value,
            verified_at=now_utc
        )
        db.add(payment)
        db.commit()

    for b in created_bookings:
        db.refresh(b)

    record_audit(
        db=db,
        user=current_user,
        action="GROUP_BOOKING_CREATED",
        entity_type="GroupBooking",
        entity_id=group_code,
        details={
            "group_code": group_code,
            "event_name": data.event_name,
            "guest_name": data.guest_name,
            "floors": data.floors,
            "beds_assigned": len(available_beds),
            "beds_unavailable": len(unavailable_beds),
            "total_amount": round(total_group_amount, 2),
            "paid_amount": data.paid_amount
        },
        ip_address=get_client_ip(request)
    )

    return build_group_booking_out(created_bookings, unavailable_beds)

@router.get("/group/{group_code}", response_model=GroupBookingOut)
def get_group_booking(
    group_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches the details and all assigned beds for a Group / Wedding booking.
    """
    bookings = db.query(Booking).filter(Booking.group_code == group_code).all()
    if not bookings:
        raise HTTPException(status_code=404, detail=f"Group booking '{group_code}' not found.")

    if current_user.role == UserRole.CUSTOMER_GUEST.value:
        if bookings[0].guest_email != current_user.email:
            raise HTTPException(status_code=403, detail="Access denied.")

    return build_group_booking_out(bookings)

@router.get("/groups/active", response_model=List[GroupBookingOut])
def list_active_group_bookings(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    """
    Staff / Owner: Lists all active group bookings grouped by group_code.
    """
    expire_unpaid_bookings(db)
    bookings = db.query(Booking).filter(
        Booking.group_code.isnot(None),
        Booking.status != BookingStatus.CANCELLED.value
    ).order_by(Booking.created_at.desc()).all()

    groups_map = {}
    for b in bookings:
        if b.group_code not in groups_map:
            groups_map[b.group_code] = []
        groups_map[b.group_code].append(b)

    return [build_group_booking_out(grp_list) for grp_list in groups_map.values()]

@router.put("/group/{group_code}", response_model=GroupBookingOut)
def modify_group_booking(
    group_code: str,
    data: GroupBookingModify,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    """
    Staff / Owner: Modifies a group booking:
    - Release specific beds (reduces group size, makes beds immediately available)
    - Add floor(s) or bed(s) to group
    - Modify stay dates (with availability conflict check)
    - Update event notes / name
    """
    bookings = db.query(Booking).filter(Booking.group_code == group_code).all()
    if not bookings:
        raise HTTPException(status_code=404, detail=f"Group booking '{group_code}' not found.")

    lead = bookings[0]
    now_utc = datetime.now(timezone.utc)

    # 1. Update event name or notes
    if data.event_name:
        for b in bookings:
            b.event_name = data.event_name
    if data.notes:
        for b in bookings:
            b.notes = f"{b.notes or ''}\n[Modified]: {data.notes}".strip()

    # 2. Release specified beds or remove floors
    if data.remove_floors:
        for b in bookings:
            bed = db.query(Bed).filter(Bed.id == b.bed_id).first()
            if bed and bed.floor_number in data.remove_floors and b.status != BookingStatus.CANCELLED.value:
                b.status = BookingStatus.CANCELLED.value
                if bed.status in [BedStatus.RESERVED.value, BedStatus.OCCUPIED.value]:
                    bed.status = BedStatus.AVAILABLE.value

    if data.release_bed_ids:
        for b in bookings:
            if b.bed_id in data.release_bed_ids and b.status != BookingStatus.CANCELLED.value:
                b.status = BookingStatus.CANCELLED.value
                bed = db.query(Bed).filter(Bed.id == b.bed_id).first()
                if bed and bed.status in [BedStatus.RESERVED.value, BedStatus.OCCUPIED.value]:
                    bed.status = BedStatus.AVAILABLE.value

    # 3. Change dates
    if data.check_in_date or data.check_out_date:
        new_in = data.check_in_date or lead.check_in_date
        new_out = data.check_out_date or lead.check_out_date
        if new_out <= new_in:
            raise HTTPException(status_code=400, detail="Check-out date must be after check-in date.")

        active_in_group = [b for b in bookings if b.status != BookingStatus.CANCELLED.value]
        # Check conflicts for all active beds on new dates (excluding current booking ID)
        for b in active_in_group:
            if not is_bed_available_for_dates(db, b.bed_id, new_in, new_out, exclude_booking_id=b.id):
                bed_name = b.bed.bed_number if b.bed else f"ID {b.bed_id}"
                raise HTTPException(
                    status_code=409,
                    detail=f"Bed {bed_name} is not available for new dates {new_in} to {new_out}."
                )

        new_nights = max((new_out - new_in).days, 1)
        for b in active_in_group:
            b.check_in_date = new_in
            b.check_out_date = new_out
            per_night_rate = b.bed.base_price_inr if b.bed else 499.0
            b.total_amount = round(per_night_rate * new_nights, 2)

    # 4. Add additional floors or beds
    unavailable_added = []
    if data.add_floors or data.add_bed_ids:
        query = db.query(Bed)
        if data.add_floors:
            query = query.filter(Bed.floor_number.in_(data.add_floors))
        if data.add_bed_ids:
            query = query.filter(Bed.id.in_(data.add_bed_ids))
        candidates = query.all()

        existing_bed_ids = {b.bed_id for b in bookings if b.status != BookingStatus.CANCELLED.value}
        nights = max((lead.check_out_date - lead.check_in_date).days, 1)

        for bed in candidates:
            if bed.id in existing_bed_ids:
                continue
            if is_bed_available_for_dates(db, bed.id, lead.check_in_date, lead.check_out_date):
                bed_total = round(bed.base_price_inr * nights, 2)
                new_b = Booking(
                    booking_code=generate_booking_code(),
                    guest_name=lead.guest_name,
                    guest_phone=lead.guest_phone,
                    guest_email=lead.guest_email,
                    bed_id=bed.id,
                    check_in_date=lead.check_in_date,
                    check_out_date=lead.check_out_date,
                    status=lead.status,
                    booking_type="GROUP_WEDDING",
                    group_code=group_code,
                    event_name=lead.event_name,
                    notes=lead.notes,
                    total_amount=bed_total,
                    paid_amount=0.0,
                    created_by_id=current_user.id
                )
                db.add(new_b)
                bookings.append(new_b)
                if bed.status == BedStatus.AVAILABLE.value and lead.status == BookingStatus.CONFIRMED.value:
                    bed.status = BedStatus.RESERVED.value
            else:
                unavailable_added.append(f"Bed {bed.bed_number} (Floor {bed.floor_number})")

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="GROUP_BOOKING_MODIFIED",
        entity_type="GroupBooking",
        entity_id=group_code,
        details={
            "group_code": group_code,
            "released_beds": data.release_bed_ids,
            "new_dates": f"{data.check_in_date} to {data.check_out_date}" if data.check_in_date else None
        },
        ip_address=get_client_ip(request)
    )

    # Refresh and return
    refreshed_bookings = db.query(Booking).filter(
        Booking.group_code == group_code,
        Booking.status != BookingStatus.CANCELLED.value
    ).all()

    return build_group_booking_out(refreshed_bookings, unavailable_added)

@router.post("/group/{group_code}/cancel", response_model=GroupBookingOut)
def cancel_group_booking(
    group_code: str,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    """
    Staff / Owner: Cancels all bookings in the group and immediately frees all beds.
    """
    bookings = db.query(Booking).filter(Booking.group_code == group_code).all()
    if not bookings:
        raise HTTPException(status_code=404, detail=f"Group booking '{group_code}' not found.")

    for b in bookings:
        if b.status not in [BookingStatus.CANCELLED.value, BookingStatus.CHECKED_OUT.value]:
            b.status = BookingStatus.CANCELLED.value
            bed = db.query(Bed).filter(Bed.id == b.bed_id).first()
            if bed and bed.status in [BedStatus.RESERVED.value, BedStatus.OCCUPIED.value]:
                bed.status = BedStatus.AVAILABLE.value

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="GROUP_BOOKING_CANCELLED",
        entity_type="GroupBooking",
        entity_id=group_code,
        details={"group_code": group_code, "cancelled_by": current_user.email},
        ip_address=get_client_ip(request)
    )

    for b in bookings:
        db.refresh(b)
    return build_group_booking_out(bookings)

@router.post("/group/{group_code}/check-in", response_model=GroupBookingOut)
def check_in_group_booking(
    group_code: str,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    """
    Staff / Owner: Bulk checks in all active beds in the group.
    """
    bookings = db.query(Booking).filter(
        Booking.group_code == group_code,
        Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.PENDING_PAYMENT.value])
    ).all()
    if not bookings:
        raise HTTPException(status_code=400, detail="No eligible bookings found for check-in in this group.")

    now_utc = datetime.now(timezone.utc)
    for b in bookings:
        b.status = BookingStatus.CHECKED_IN.value
        b.checked_in_at = now_utc
        bed = db.query(Bed).filter(Bed.id == b.bed_id).first()
        if bed:
            bed.status = BedStatus.OCCUPIED.value

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="GROUP_GUEST_CHECKED_IN",
        entity_type="GroupBooking",
        entity_id=group_code,
        details={"group_code": group_code, "count": len(bookings)},
        ip_address=get_client_ip(request)
    )

    all_grp = db.query(Booking).filter(Booking.group_code == group_code).all()
    return build_group_booking_out(all_grp)

@router.post("/group/{group_code}/check-out", response_model=GroupBookingOut)
def check_out_group_booking(
    group_code: str,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    """
    Staff / Owner: Bulk checks out all checked-in beds in the group.
    """
    bookings = db.query(Booking).filter(
        Booking.group_code == group_code,
        Booking.status == BookingStatus.CHECKED_IN.value
    ).all()
    if not bookings:
        raise HTTPException(status_code=400, detail="No checked-in bookings found for checkout in this group.")

    now_utc = datetime.now(timezone.utc)
    for b in bookings:
        b.status = BookingStatus.CHECKED_OUT.value
        b.checked_out_at = now_utc
        bed = db.query(Bed).filter(Bed.id == b.bed_id).first()
        if bed:
            bed.status = BedStatus.CLEANING_REQUIRED.value
            cleaning_log = CleaningLog(
                bed_id=bed.id,
                status=CleaningStatus.CLEANING_REQUIRED.value,
                notes=f"Auto-queued after group checkout {group_code}"
            )
            db.add(cleaning_log)

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="GROUP_GUEST_CHECKED_OUT",
        entity_type="GroupBooking",
        entity_id=group_code,
        details={"group_code": group_code, "count": len(bookings)},
        ip_address=get_client_ip(request)
    )

    all_grp = db.query(Booking).filter(Booking.group_code == group_code).all()
    return build_group_booking_out(all_grp)

