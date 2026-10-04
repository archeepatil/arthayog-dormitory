from datetime import datetime, date, timezone, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api.deps import get_db, require_role
from app.models import (
    Bed, BedStatus, Booking, BookingStatus,
    Payment, PaymentStatus, InventoryItem,
    StaffTask, TaskStatus, MaintenanceTicket, MaintenanceStatus,
    UserRole, User
)
from app.schemas import DashboardStatsOut
from app.services.booking_service import expire_unpaid_bookings

router = APIRouter(prefix="/reports", tags=["Reports & Dashboard"])

@router.get("/dashboard", response_model=DashboardStatsOut)
def get_dashboard_metrics(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    expire_unpaid_bookings(db)
    today = date.today()

    total_beds = db.query(Bed).count()
    available_beds = db.query(Bed).filter(Bed.status == BedStatus.AVAILABLE.value).count()
    reserved_beds = db.query(Bed).filter(Bed.status == BedStatus.RESERVED.value).count()
    occupied_beds = db.query(Bed).filter(Bed.status == BedStatus.OCCUPIED.value).count()
    cleaning_beds = db.query(Bed).filter(
        Bed.status.in_([BedStatus.CLEANING_REQUIRED.value, BedStatus.CLEANING_IN_PROGRESS.value])
    ).count()
    maintenance_beds = db.query(Bed).filter(Bed.status == BedStatus.MAINTENANCE.value).count()

    today_checkins = db.query(Booking).filter(
        Booking.check_in_date == today,
        Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.CHECKED_IN.value])
    ).count()

    today_checkouts = db.query(Booking).filter(
        Booking.check_out_date == today,
        Booking.status.in_([BookingStatus.CHECKED_IN.value, BookingStatus.CHECKED_OUT.value])
    ).count()

    pending_bookings = db.query(Booking).filter(
        Booking.status == BookingStatus.PENDING_PAYMENT.value
    ).all()
    pending_payments_count = len(pending_bookings)
    pending_payments_amount = round(sum(b.total_amount - b.paid_amount for b in pending_bookings), 2)

    # Actual verified successful revenue
    revenue_res = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.SUCCESS.value
    ).scalar()
    total_revenue_inr = round(float(revenue_res), 2)

    low_stock_items_count = db.query(InventoryItem).filter(
        InventoryItem.current_quantity <= InventoryItem.min_threshold
    ).count()

    pending_staff_tasks_count = db.query(StaffTask).filter(
        StaffTask.status.in_([TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value])
    ).count()

    active_maintenance_count = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.status.in_([MaintenanceStatus.OPEN.value, MaintenanceStatus.IN_PROGRESS.value])
    ).count()

    return DashboardStatsOut(
        total_beds=total_beds,
        available_beds=available_beds,
        reserved_beds=reserved_beds,
        occupied_beds=occupied_beds,
        cleaning_beds=cleaning_beds,
        maintenance_beds=maintenance_beds,
        today_checkins_count=today_checkins,
        today_checkouts_count=today_checkouts,
        pending_payments_count=pending_payments_count,
        pending_payments_amount=pending_payments_amount,
        total_revenue_inr=total_revenue_inr,
        low_stock_items_count=low_stock_items_count,
        pending_staff_tasks_count=pending_staff_tasks_count,
        active_maintenance_count=active_maintenance_count
    )

@router.get("/detailed-analytics")
def get_detailed_analytics(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner-only comprehensive analytics:
    Revenue by payment method, floor occupancy breakdown, booking status distributions.
    """
    # 1. Revenue by payment method
    revenue_by_method = db.query(
        Payment.method,
        func.count(Payment.id).label("count"),
        func.coalesce(func.sum(Payment.amount), 0.0).label("total")
    ).filter(
        Payment.status == PaymentStatus.SUCCESS.value
    ).group_by(Payment.method).all()

    method_breakdown = [
        {"method": r[0], "transactions": r[1], "revenue": round(float(r[2]), 2)}
        for r in revenue_by_method
    ]

    # 2. Floor Occupancy & Bed Distribution
    floors_data = []
    for fl in [1, 2, 3]:
        beds = db.query(Bed).filter(Bed.floor_number == fl).all()
        total_floor_beds = len(beds)
        occupied = sum(1 for b in beds if b.status == BedStatus.OCCUPIED.value)
        reserved = sum(1 for b in beds if b.status == BedStatus.RESERVED.value)
        available = sum(1 for b in beds if b.status == BedStatus.AVAILABLE.value)
        cleaning = sum(1 for b in beds if b.status in [BedStatus.CLEANING_REQUIRED.value, BedStatus.CLEANING_IN_PROGRESS.value])
        maintenance = sum(1 for b in beds if b.status == BedStatus.MAINTENANCE.value)
        rate = round((occupied / total_floor_beds * 100), 1) if total_floor_beds > 0 else 0.0

        floors_data.append({
            "floor": fl,
            "total_beds": total_floor_beds,
            "occupied": occupied,
            "reserved": reserved,
            "available": available,
            "cleaning": cleaning,
            "maintenance": maintenance,
            "occupancy_rate_percent": rate
        })

    # 3. Booking Status counts & Cancellations
    status_counts = db.query(
        Booking.status,
        func.count(Booking.id)
    ).group_by(Booking.status).all()
    booking_stats = {s[0]: s[1] for s in status_counts}

    # 4. Periodic Booking Counts (Daily, Weekly, Monthly)
    now_utc = datetime.now(timezone.utc)
    one_day_ago = now_utc - timedelta(days=1)
    one_week_ago = now_utc - timedelta(days=7)
    one_month_ago = now_utc - timedelta(days=30)

    daily_bookings_count = db.query(Booking).filter(Booking.created_at >= one_day_ago).count()
    weekly_bookings_count = db.query(Booking).filter(Booking.created_at >= one_week_ago).count()
    monthly_bookings_count = db.query(Booking).filter(Booking.created_at >= one_month_ago).count()

    daily_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.SUCCESS.value,
        Payment.created_at >= one_day_ago
    ).scalar()

    weekly_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.SUCCESS.value,
        Payment.created_at >= one_week_ago
    ).scalar()

    monthly_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.SUCCESS.value,
        Payment.created_at >= one_month_ago
    ).scalar()

    # 5. Bed Usage Distribution (Real database bookings per bed)
    bed_usage_query = db.query(
        Bed.bed_number,
        Bed.floor_number,
        func.count(Booking.id).label("total_bookings")
    ).outerjoin(Booking, Booking.bed_id == Bed.id).group_by(Bed.id).order_by(Bed.floor_number, Bed.bed_number).all()

    bed_usage = [
        {"bed_number": b[0], "floor_number": b[1], "total_bookings": b[2]}
        for b in bed_usage_query
    ]

    # 6. Inventory Purchases vs Consumption
    from app.models import InventoryTransaction
    inv_purchases = db.query(
        func.coalesce(func.sum(InventoryTransaction.quantity), 0),
        func.coalesce(func.sum(InventoryTransaction.quantity * InventoryTransaction.unit_cost), 0.0)
    ).filter(InventoryTransaction.change_type == "PURCHASE").first()

    inv_usage = db.query(
        func.coalesce(func.sum(func.abs(InventoryTransaction.quantity)), 0)
    ).filter(InventoryTransaction.change_type == "USAGE").scalar()

    # 7. Guest History Summary
    unique_guests_count = db.query(func.count(func.distinct(Booking.guest_phone))).scalar() or 0
    repeat_guests = db.query(
        Booking.guest_name,
        Booking.guest_phone,
        func.count(Booking.id).label("stays")
    ).group_by(Booking.guest_phone).having(func.count(Booking.id) > 1).order_by(func.count(Booking.id).desc()).limit(5).all()

    guest_history = {
        "total_unique_guests": unique_guests_count,
        "frequent_guests": [{"name": g[0], "phone": g[1], "stays": g[2]} for g in repeat_guests]
    }

    # 8. Total inventory valuation
    inventory_val = db.query(
        func.coalesce(func.sum(InventoryItem.current_quantity * InventoryItem.unit_cost), 0.0)
    ).scalar()

    return {
        "revenue_by_method": method_breakdown,
        "floor_occupancy": floors_data,
        "booking_stats": booking_stats,
        "periodic_metrics": {
            "daily_bookings": daily_bookings_count,
            "weekly_bookings": weekly_bookings_count,
            "monthly_bookings": monthly_bookings_count,
            "daily_revenue_inr": round(float(daily_revenue), 2),
            "weekly_revenue_inr": round(float(weekly_revenue), 2),
            "monthly_revenue_inr": round(float(monthly_revenue), 2)
        },
        "bed_usage": bed_usage,
        "inventory_analytics": {
            "valuation_inr": round(float(inventory_val), 2),
            "total_purchased_units": inv_purchases[0] if inv_purchases else 0,
            "total_purchase_spend_inr": round(float(inv_purchases[1]), 2) if inv_purchases else 0.0,
            "total_consumed_units": inv_usage or 0
        },
        "guest_history": guest_history
    }
