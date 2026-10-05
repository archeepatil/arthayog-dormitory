import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user_optional, require_role, get_client_ip
from app.models import Booking, BookingStatus, Bed, BedStatus, Payment, PaymentStatus, PaymentMethod, User, UserRole
from app.schemas import (
    PaymentOrderCreate, PaymentOrderOut, PaymentVerifyRequest,
    PaymentOut, CashPaymentRecord
)
from app.services.razorpay_service import razorpay_service
from app.core.config import settings
from app.core.audit import record_audit

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create-order", response_model=PaymentOrderOut)
def create_payment_order(
    data: PaymentOrderCreate,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if booking.status in [BookingStatus.CANCELLED.value, BookingStatus.EXPIRED.value, BookingStatus.REJECTED.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pay for booking with status '{booking.status}'."
        )

    # If booking was pending approval, automatically transition to payment pending
    if booking.status == BookingStatus.PENDING_APPROVAL.value:
        booking.status = BookingStatus.APPROVED_PAYMENT_PENDING.value
        booking.approved_at = datetime.now(timezone.utc)
        db.commit()

    remaining_amount = round(booking.total_amount - booking.paid_amount, 2)
    if remaining_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already fully paid."
        )


    receipt = f"rcpt_{booking.booking_code}_{uuid.uuid4().hex[:4]}"
    order_data = razorpay_service.create_order(
        amount_inr=remaining_amount,
        receipt_id=receipt,
        notes={"booking_code": booking.booking_code, "guest_name": booking.guest_name}
    )

    payment = Payment(
        booking_id=booking.id,
        amount=remaining_amount,
        currency="INR",
        status=PaymentStatus.PENDING.value,
        method=data.method or PaymentMethod.UPI.value,
        razorpay_order_id=order_data["id"]
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return PaymentOrderOut(
        payment_id=payment.id,
        razorpay_order_id=order_data["id"],
        amount=remaining_amount,
        currency="INR",
        key_id=razorpay_service.key_id,
        booking_code=booking.booking_code
    )

@router.post("/sandbox-simulate")
def get_sandbox_test_signature(order_id: str):
    """
    For sandbox/test environment: provides valid HMAC SHA256 test payment credentials
    so the client can execute the real server-side verification workflow.
    """
    test_payment_id = f"pay_test_{uuid.uuid4().hex[:12]}"
    signature = razorpay_service.generate_sandbox_signature(order_id, test_payment_id)
    return {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": test_payment_id,
        "razorpay_signature": signature
    }

@router.post("/verify", response_model=PaymentOut)
def verify_payment(
    data: PaymentVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(
        Payment.booking_id == data.booking_id,
        Payment.razorpay_order_id == data.razorpay_order_id
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment order not found for this booking."
        )

    if payment.status == PaymentStatus.SUCCESS.value:
        # Prevent duplicate processing
        return PaymentOut.model_validate(payment)

    # Perform strict server-side HMAC-SHA256 signature verification
    is_valid = razorpay_service.verify_payment_signature(
        order_id=data.razorpay_order_id,
        payment_id=data.razorpay_payment_id,
        signature=data.razorpay_signature
    )

    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated booking not found.")

    if not is_valid:
        payment.status = PaymentStatus.FAILED.value
        payment.error_reason = "Cryptographic signature verification failed."
        db.commit()

        record_audit(
            db=db,
            user=None,
            action="PAYMENT_VERIFICATION_FAILED",
            entity_type="Payment",
            entity_id=payment.id,
            details={"order_id": data.razorpay_order_id, "reason": payment.error_reason},
            ip_address=get_client_ip(request)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Invalid payment signature."
        )

    # Signature is cryptographically verified!
    payment.status = PaymentStatus.SUCCESS.value
    payment.razorpay_payment_id = data.razorpay_payment_id
    payment.razorpay_signature = data.razorpay_signature
    payment.verified_at = datetime.now(timezone.utc)

    # Update booking
    booking.paid_amount += payment.amount
    if booking.paid_amount >= booking.total_amount:
        booking.status = BookingStatus.CONFIRMED.value
        booking.hold_expires_at = None

    db.commit()

    record_audit(
        db=db,
        user=None,
        action="PAYMENT_VERIFIED_SUCCESS",
        entity_type="Payment",
        entity_id=payment.id,
        details={
            "booking_code": booking.booking_code,
            "order_id": data.razorpay_order_id,
            "payment_id": data.razorpay_payment_id,
            "amount": payment.amount,
            "booking_status": booking.status
        },
        ip_address=get_client_ip(request)
    )

    db.refresh(payment)
    return PaymentOut.model_validate(payment)

@router.post("/record-cash", response_model=PaymentOut)
def record_counter_payment(
    data: CashPaymentRecord,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if data.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive.")

    payment = Payment(
        booking_id=booking.id,
        amount=data.amount,
        currency="INR",
        status=PaymentStatus.SUCCESS.value,
        method=data.method,
        razorpay_payment_id=f"counter_{uuid.uuid4().hex[:10]}",
        verified_at=datetime.now(timezone.utc)
    )
    db.add(payment)

    booking.paid_amount += data.amount
    if booking.paid_amount >= booking.total_amount:
        booking.status = BookingStatus.CONFIRMED.value
        booking.hold_expires_at = None

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="COUNTER_PAYMENT_RECORDED",
        entity_type="Payment",
        entity_id=payment.id,
        details={
            "booking_code": booking.booking_code,
            "amount": data.amount,
            "method": data.method,
            "notes": data.notes
        },
        ip_address=get_client_ip(request)
    )

    db.refresh(payment)
    return PaymentOut.model_validate(payment)
