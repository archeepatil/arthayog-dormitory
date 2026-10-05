from datetime import date, datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import Bed, Booking, BookingStatus, BedStatus
from app.core.config import settings

def is_bed_available_for_dates(
    db: Session,
    bed_id: int,
    check_in: date,
    check_out: date,
    exclude_booking_id: Optional[int] = None
) -> bool:
    """
    Checks if a bed is available between check_in and check_out dates.
    Two bookings [A_in, A_out) and [B_in, B_out) overlap if:
      A_in < B_out and A_out > B_in
    """
    now = datetime.now(timezone.utc)
    
    # Bed must exist and not be permanently in MAINTENANCE
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        return False
    if bed.status == BedStatus.MAINTENANCE.value:
        return False

    # Check active bookings
    active_statuses = [
        BookingStatus.CONFIRMED.value,
        BookingStatus.CHECKED_IN.value,
    ]

    hold_pending_statuses = [
        BookingStatus.APPROVED_PAYMENT_PENDING.value,
        BookingStatus.PENDING_PAYMENT.value,
    ]

    # Query conflicting bookings
    conflict_query = db.query(Booking).filter(
        Booking.bed_id == bed_id,
        Booking.check_in_date < check_out,
        Booking.check_out_date > check_in,
        or_(
            Booking.status.in_(active_statuses),
            and_(
                Booking.status.in_(hold_pending_statuses),
                Booking.hold_expires_at > now
            )
        )
    )

    if exclude_booking_id:
        conflict_query = conflict_query.filter(Booking.id != exclude_booking_id)

    conflict = conflict_query.first()
    return conflict is None

def expire_unpaid_bookings(db: Session) -> int:
    """
    Releases beds for unpaid provisional bookings whose hold has expired.
    Transitions status to EXPIRED.
    """
    now = datetime.now(timezone.utc)
    expired_bookings = db.query(Booking).filter(
        Booking.status.in_([
            BookingStatus.PENDING_PAYMENT.value,
            BookingStatus.APPROVED_PAYMENT_PENDING.value
        ]),
        Booking.hold_expires_at <= now
    ).all()

    count = 0
    for booking in expired_bookings:
        booking.status = BookingStatus.EXPIRED.value
        # If the bed was marked RESERVED, change it back to AVAILABLE if not occupied
        bed = db.query(Bed).filter(Bed.id == booking.bed_id).first()
        if bed and bed.status == BedStatus.RESERVED.value:
            bed.status = BedStatus.AVAILABLE.value
        count += 1

    if count > 0:
        db.commit()
    return count
