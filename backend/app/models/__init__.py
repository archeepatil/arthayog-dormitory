import enum
from datetime import datetime, date, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Float, Text, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    OWNER_ADMIN = "OWNER_ADMIN"
    STAFF_EMPLOYEE = "STAFF_EMPLOYEE"
    CUSTOMER_GUEST = "CUSTOMER_GUEST"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    role = Column(String(50), default=UserRole.CUSTOMER_GUEST.value, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    bookings = relationship("Booking", back_populates="guest", foreign_keys="Booking.guest_id")
    created_tasks = relationship("StaffTask", back_populates="creator", foreign_keys="StaffTask.created_by_id")
    assigned_tasks = relationship("StaffTask", back_populates="assignee", foreign_keys="StaffTask.assigned_to_id")

class BedStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    OCCUPIED = "OCCUPIED"
    CLEANING_REQUIRED = "CLEANING_REQUIRED"
    CLEANING_IN_PROGRESS = "CLEANING_IN_PROGRESS"
    MAINTENANCE = "MAINTENANCE"

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    bed_number = Column(String(20), unique=True, index=True, nullable=False)
    floor_number = Column(Integer, nullable=False)  # 1, 2, or 3
    base_price_inr = Column(Float, default=499.0, nullable=False)
    status = Column(String(50), default=BedStatus.AVAILABLE.value, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    bookings = relationship("Booking", back_populates="bed")
    cleaning_logs = relationship("CleaningLog", back_populates="bed")
    maintenance_tickets = relationship("MaintenanceTicket", back_populates="bed")

class BookingStatus(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED_PAYMENT_PENDING = "APPROVED_PAYMENT_PENDING"
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"

class BookingType(str, enum.Enum):
    ONLINE = "ONLINE"
    PHONE_WALKIN = "PHONE_WALKIN"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(50), unique=True, index=True, nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    guest_name = Column(String(255), nullable=False)
    guest_phone = Column(String(30), nullable=False)
    guest_email = Column(String(255), nullable=True)
    guest_id_proof_type = Column(String(50), nullable=True)  # AADHAAR, PAN, DRIVING_LICENSE, etc.
    guest_id_proof_number = Column(String(100), nullable=True)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=False)
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    status = Column(String(50), default=BookingStatus.PENDING_APPROVAL.value, nullable=False, index=True)
    booking_type = Column(String(50), default=BookingType.ONLINE.value, nullable=False)
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    group_code = Column(String(50), index=True, nullable=True)
    event_name = Column(String(100), nullable=True)
    hold_expires_at = Column(DateTime, nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    checked_in_at = Column(DateTime, nullable=True)
    checked_out_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    guest = relationship("User", foreign_keys=[guest_id], back_populates="bookings")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    bed = relationship("Bed", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    guest_photos = relationship("GuestPhoto", back_populates="booking", cascade="all, delete-orphan")
    identity_verifications = relationship("IdentityVerification", back_populates="booking", cascade="all, delete-orphan")

class PaymentStatus(str, enum.Enum):
    NOT_ENABLED = "NOT_ENABLED"
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

class PaymentMethod(str, enum.Enum):
    UPI = "UPI"
    CARD = "CARD"
    CASH = "CASH"
    NETBANKING = "NETBANKING"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), default=PaymentStatus.PENDING.value, nullable=False, index=True)
    method = Column(String(50), default=PaymentMethod.UPI.value, nullable=False)
    razorpay_order_id = Column(String(100), nullable=True, index=True)
    razorpay_payment_id = Column(String(100), nullable=True, index=True)
    razorpay_signature = Column(String(255), nullable=True)
    error_reason = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    booking = relationship("Booking", back_populates="payments")

class CleaningStatus(str, enum.Enum):
    CLEANING_REQUIRED = "CLEANING_REQUIRED"
    CLEANING_IN_PROGRESS = "CLEANING_IN_PROGRESS"
    COMPLETED = "COMPLETED"

class CleaningLog(Base):
    __tablename__ = "cleaning_logs"

    id = Column(Integer, primary_key=True, index=True)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=False)
    staff_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default=CleaningStatus.CLEANING_REQUIRED.value, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    bed = relationship("Bed", back_populates="cleaning_logs")
    staff = relationship("User")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(50), nullable=False)
    unit = Column(String(30), nullable=False)
    current_quantity = Column(Integer, default=0, nullable=False)
    min_threshold = Column(Integer, default=5, nullable=False)
    unit_cost = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    transactions = relationship("InventoryTransaction", back_populates="item")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    change_type = Column(String(50), nullable=False)  # PURCHASE, USAGE, ADJUSTMENT
    quantity = Column(Integer, nullable=False)  # positive for stock in, negative for usage
    unit_cost = Column(Float, nullable=True)
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    item = relationship("InventoryItem", back_populates="transactions")
    performed_by = relationship("User")

class MaintenanceCategory(str, enum.Enum):
    BED_EQUIPMENT = "BED_EQUIPMENT"
    BATHROOM = "BATHROOM"
    ELECTRICAL = "ELECTRICAL"
    PLUMBING = "PLUMBING"
    OTHER = "OTHER"

class MaintenancePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class MaintenanceStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), default=MaintenanceCategory.BED_EQUIPMENT.value, nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    priority = Column(String(50), default=MaintenancePriority.MEDIUM.value, nullable=False)
    status = Column(String(50), default=MaintenanceStatus.OPEN.value, nullable=False)
    description = Column(Text, nullable=False)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    bed = relationship("Bed", back_populates="maintenance_tickets")
    reported_by = relationship("User", foreign_keys=[reported_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class StaffTask(Base):
    __tablename__ = "staff_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    task_type = Column(String(50), default="CLEANING", nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default=TaskStatus.PENDING.value, nullable=False)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    bed = relationship("Bed")
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="created_tasks")
    assignee = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tasks")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=False)
    user_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=True)
    details_json = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)

    user = relationship("User")

class PropertySetting(Base):
    __tablename__ = "property_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

class PhoneNumber(Base):
    """
    Owner-configurable phone numbers for guest contact (Call Only).
    """
    __tablename__ = "phone_numbers"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(100), nullable=False)  # Front Desk, Owner, Day Staff, Night Staff
    phone_number = Column(String(30), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    show_to_customers = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

class GuestPhoto(Base):
    """
    Secure storage for live guest photo captured at check-in.
    """
    __tablename__ = "guest_photos"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    photo_data = Column(Text, nullable=False)  # Secure Base64 or stored asset identifier
    captured_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    retention_info = Column(String(100), default="30_DAYS", nullable=True)
    captured_at = Column(DateTime, default=utcnow, nullable=False)

    booking = relationship("Booking", back_populates="guest_photos")
    captured_by = relationship("User", foreign_keys=[captured_by_user_id])

class IdentityVerification(Base):
    """
    Authorized Aadhaar Identity Verification record.
    Stores only legally permitted audit reference and masked ID.
    Never stores biometrics, raw passwords, or OTP secrets.
    """
    __tablename__ = "identity_verifications"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="NOT_VERIFIED", nullable=False)  # VERIFIED, PENDING, FAILED, NOT_VERIFIED
    verification_method = Column(String(100), default="AADHAAR_UIDAI", nullable=True)
    masked_id = Column(String(50), nullable=True)  # e.g. XXXX-XXXX-1234
    provider_reference = Column(String(100), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    booking = relationship("Booking", back_populates="identity_verifications")
    verified_by_user = relationship("User", foreign_keys=[verified_by])

