from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date

# ----------------- Auth & User Schemas -----------------
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: Optional[str] = "CUSTOMER_GUEST"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class VerifyEmailRequest(BaseModel):
    token: str

class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    phone: Optional[str] = None
    role: str = "STAFF_EMPLOYEE"

class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

# ----------------- Bed Schemas -----------------
class BedOut(BaseModel):
    id: int
    bed_number: str
    floor_number: int
    base_price_inr: float
    status: str
    description: Optional[str] = None
    is_available_for_dates: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

class BedStatusUpdate(BaseModel):
    status: str

# ----------------- Booking Schemas -----------------
class BookingCreateOnline(BaseModel):
    bed_id: int
    check_in_date: date
    check_out_date: date
    guest_name: str
    guest_phone: str
    guest_email: EmailStr
    notes: Optional[str] = None

class BookingCreatePhone(BaseModel):
    bed_id: int
    check_in_date: date
    check_out_date: date
    guest_name: str
    guest_phone: str
    guest_email: Optional[EmailStr] = None
    guest_id_proof_type: Optional[str] = None
    guest_id_proof_number: Optional[str] = None
    total_amount: Optional[float] = None
    paid_amount: Optional[float] = 0.0
    payment_method: Optional[str] = "CASH"
    notes: Optional[str] = None
    is_confirmed: Optional[bool] = False

class BookingCheckIn(BaseModel):
    guest_id_proof_type: str
    guest_id_proof_number: str
    notes: Optional[str] = None

class BookingCheckOut(BaseModel):
    inspection_notes: Optional[str] = None
    additional_charges: Optional[float] = 0.0

class BookingCancel(BaseModel):
    cancellation_reason: str

class PaymentOut(BaseModel):
    id: int
    booking_id: int
    amount: float
    currency: str
    status: str
    method: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class BookingApproveRequest(BaseModel):
    notes: Optional[str] = None

class BookingRejectRequest(BaseModel):
    rejection_reason: Optional[str] = None

class BookingOut(BaseModel):
    id: int
    booking_code: str
    guest_id: Optional[int] = None
    guest_name: str
    guest_phone: str
    guest_email: Optional[str] = None
    guest_id_proof_type: Optional[str] = None
    guest_id_proof_number: Optional[str] = None
    bed_id: int
    bed_number: Optional[str] = None
    floor_number: Optional[int] = None
    check_in_date: date
    check_out_date: date
    status: str
    booking_type: str
    group_code: Optional[str] = None
    event_name: Optional[str] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    total_amount: float
    paid_amount: float
    hold_expires_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    created_at: datetime
    payments: List[PaymentOut] = []
    guest_photo_available: bool = False
    identity_verification_status: Optional[str] = None
    identity_verification_masked_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class BookingReceiptOut(BaseModel):
    receipt_number: str
    generated_at: datetime
    property: dict
    customer: dict
    booking: dict
    payment: dict
    status: str

class PhoneNumberCreate(BaseModel):
    label: str
    phone_number: str
    is_active: bool = True
    show_to_customers: bool = True
    display_order: int = 0

class PhoneNumberUpdate(BaseModel):
    label: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    show_to_customers: Optional[bool] = None
    display_order: Optional[int] = None

class PhoneNumberOut(BaseModel):
    id: int
    label: str
    phone_number: str
    is_active: bool
    show_to_customers: bool
    display_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GuestPhotoUpload(BaseModel):
    photo_data: str  # Base64 data URL

class GuestPhotoOut(BaseModel):
    id: int
    booking_id: int
    guest_id: Optional[int] = None
    captured_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)

class IdentityVerificationRequest(BaseModel):
    aadhaar_number: Optional[str] = None
    verification_method: Optional[str] = "AADHAAR_UIDAI"

class IdentityVerificationOut(BaseModel):
    id: int
    booking_id: int
    guest_id: Optional[int] = None
    status: str
    verification_method: Optional[str] = None
    masked_id: Optional[str] = None
    provider_reference: Optional[str] = None
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GroupBookingCreate(BaseModel):
    guest_name: str
    guest_phone: str
    guest_email: Optional[EmailStr] = None
    event_name: Optional[str] = "Group / Wedding Stay"
    check_in_date: date
    check_out_date: date
    floors: List[int] = Field(..., description="Floors to reserve, e.g. [1, 2] or [1, 2, 3] for whole property")
    bed_ids: Optional[List[int]] = None
    notes: Optional[str] = None
    is_confirmed: Optional[bool] = False
    paid_amount: Optional[float] = 0.0
    payment_method: Optional[str] = "CASH"

class GroupBookingBedOut(BaseModel):
    booking_id: int
    booking_code: str
    bed_id: int
    bed_number: str
    floor_number: int
    base_price_inr: float
    status: str
    nights: int
    total_amount: float

class GroupBookingOut(BaseModel):
    group_code: str
    event_name: str
    guest_name: str
    guest_phone: str
    guest_email: Optional[str] = None
    check_in_date: date
    check_out_date: date
    nights: int
    floors_selected: List[int]
    total_beds_assigned: int
    assigned_beds: List[GroupBookingBedOut]
    unavailable_beds_on_floors: List[str] = []
    total_amount: float
    paid_amount: float
    status: str
    booking_type: str
    created_at: datetime
    notes: Optional[str] = None

class GroupBookingModify(BaseModel):
    event_name: Optional[str] = None
    check_in_date: Optional[date] = None
    check_out_date: Optional[date] = None
    add_floors: Optional[List[int]] = None
    remove_floors: Optional[List[int]] = None
    add_bed_ids: Optional[List[int]] = None
    release_bed_ids: Optional[List[int]] = None
    notes: Optional[str] = None

# ----------------- Payment Schemas -----------------
class PaymentOrderCreate(BaseModel):
    booking_id: int
    method: Optional[str] = "UPI"

class PaymentOrderOut(BaseModel):
    payment_id: int
    razorpay_order_id: str
    amount: float
    currency: str
    key_id: str
    booking_code: str

class PaymentVerifyRequest(BaseModel):
    booking_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class CashPaymentRecord(BaseModel):
    booking_id: int
    amount: float
    method: str = "CASH"
    notes: Optional[str] = None

# ----------------- Cleaning Schemas -----------------
class CleaningLogOut(BaseModel):
    id: int
    bed_id: int
    bed_number: Optional[str] = None
    floor_number: Optional[int] = None
    staff_id: Optional[int] = None
    staff_name: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Inventory Schemas -----------------
class InventoryItemOut(BaseModel):
    id: int
    name: str
    category: str
    unit: str
    current_quantity: int
    min_threshold: int
    unit_cost: float
    is_low_stock: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InventoryItemCreate(BaseModel):
    name: str
    category: str
    unit: str
    current_quantity: int = 0
    min_threshold: int = 5
    unit_cost: float = 0.0

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    current_quantity: Optional[int] = None
    min_threshold: Optional[int] = None
    unit_cost: Optional[float] = None

class InventoryTransactionCreate(BaseModel):
    item_id: int
    change_type: str  # PURCHASE, USAGE, ADJUSTMENT
    quantity: int
    unit_cost: Optional[float] = None
    notes: Optional[str] = None

class InventoryTransactionOut(BaseModel):
    id: int
    item_id: int
    item_name: Optional[str] = None
    change_type: str
    quantity: int
    unit_cost: Optional[float] = None
    performed_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Maintenance Schemas -----------------
class MaintenanceTicketCreate(BaseModel):
    title: str
    category: str = "BED_EQUIPMENT"
    bed_id: Optional[int] = None
    priority: str = "MEDIUM"
    description: str
    assigned_to_id: Optional[int] = None

class MaintenanceTicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[int] = None
    resolution_notes: Optional[str] = None

class MaintenanceTicketOut(BaseModel):
    id: int
    title: str
    category: str
    bed_id: Optional[int] = None
    bed_number: Optional[str] = None
    priority: str
    status: str
    description: str
    reported_by_id: int
    reported_by_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Staff Tasks Schemas -----------------
class StaffTaskCreate(BaseModel):
    title: str
    task_type: str = "CLEANING"
    bed_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None

class StaffTaskUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None
    notes: Optional[str] = None

class StaffTaskOut(BaseModel):
    id: int
    title: str
    task_type: str
    bed_id: Optional[int] = None
    bed_number: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None
    status: str
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Audit Log Schemas -----------------
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: str
    user_role: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details_json: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Dashboard & Reports Schemas -----------------
class DashboardStatsOut(BaseModel):
    total_beds: int
    available_beds: int
    reserved_beds: int
    occupied_beds: int
    cleaning_beds: int
    maintenance_beds: int
    today_checkins_count: int
    today_checkouts_count: int
    pending_payments_count: int
    pending_payments_amount: float
    pending_approval_count: int = 0
    total_revenue_inr: float
    low_stock_items_count: int
    pending_staff_tasks_count: int
    active_maintenance_count: int

