import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_role, get_client_ip
from app.models import PropertySetting, Bed, User, UserRole
from app.core.audit import record_audit
from app.core.security import hash_password

router = APIRouter(prefix="/settings", tags=["Property Settings"])

# Default Review QR Code
DEFAULT_REVIEW_QR = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://g.page/r/arthayog-dormitory/review&color=0-0-0&bgcolor=255-255-255"

# ----------------- Schemas -----------------

class PropertySettingsOut(BaseModel):
    property_name: str
    logo_url: str
    description: str
    contact_phone: str
    whatsapp_number: str
    email: str
    address: str
    location_details: str
    check_in_time: str
    check_out_time: str
    facilities: List[str]
    amenities: List[str]
    customer_instructions: str
    booking_instructions: str
    cancellation_policy: str
    updated_at: Optional[str] = None

class PropertySettingsUpdate(BaseModel):
    property_name: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    location_details: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    facilities: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    customer_instructions: Optional[str] = None
    booking_instructions: Optional[str] = None
    cancellation_policy: Optional[str] = None

class PricingSettingsOut(BaseModel):
    standard_price_inr: float
    floor_prices: Dict[str, float]
    updated_at: str

class PricingSettingsUpdate(BaseModel):
    standard_price_inr: float
    floor_prices: Optional[Dict[str, float]] = None

class StaffMember(BaseModel):
    name: str
    email: str
    phone: str
    shift: str  # "Day" or "Night"
    is_active: bool

class StaffRosterOut(BaseModel):
    day_staff: StaffMember
    night_staff: StaffMember
    updated_at: Optional[str] = None

class StaffRosterUpdate(BaseModel):
    day_staff: Optional[StaffMember] = None
    night_staff: Optional[StaffMember] = None

class ReviewSettingsOut(BaseModel):
    review_qr_image: str
    review_url: str
    review_title: str
    review_instructions: str
    review_rating: str
    review_count: str
    is_enabled: bool

class ReviewSettingsUpdate(BaseModel):
    review_qr_image: Optional[str] = None
    review_url: Optional[str] = None
    review_title: Optional[str] = None
    review_instructions: Optional[str] = None
    review_rating: Optional[str] = None
    review_count: Optional[str] = None
    is_enabled: Optional[bool] = None

# ----------------- DB Helper Functions -----------------

def get_setting(db: Session, key: str, default: str = "") -> str:
    item = db.query(PropertySetting).filter(PropertySetting.key == key).first()
    return item.value if item else default

def set_setting(db: Session, key: str, value: str, description: str = ""):
    item = db.query(PropertySetting).filter(PropertySetting.key == key).first()
    if not item:
        item = PropertySetting(key=key, value=value, description=description)
        db.add(item)
    else:
        item.value = value
        if description:
            item.description = description
    db.commit()

# ----------------- Property Information Endpoints -----------------

DEFAULT_FACILITIES = [
    "Air Conditioning in all dormitory halls",
    "High-Speed Wi-Fi for work & leisure",
    "Dedicated Private Keycard Lockers",
    "24/7 Hot Water Showers",
    "RO Purified Drinking Water",
    "Daily Bed Linen Turnaround & Sanitization",
    "24/7 Security CCTV & Secure Access",
    "Individual Power Outlet (230V) & Reading Lamp"
]

DEFAULT_AMENITIES = [
    "Clean Linens, Pillows & Blanket provided",
    "Luggage Storage Facility",
    "Silent Hours observed from 10:30 PM",
    "Uninterrupted Power Backup Generator",
    "Common Dining & Refreshment Lounge"
]

@router.get("/property", response_model=PropertySettingsOut)
def get_property_info(db: Session = Depends(get_db)):
    """
    Public endpoint: Returns owner-customized property information.
    """
    fac_str = get_setting(db, "property_facilities", "")
    facilities = json.loads(fac_str) if fac_str else DEFAULT_FACILITIES

    amen_str = get_setting(db, "property_amenities", "")
    amenities = json.loads(amen_str) if amen_str else DEFAULT_AMENITIES

    return PropertySettingsOut(
        property_name=get_setting(db, "property_name", "Arthayog Dormitory"),
        logo_url=get_setting(db, "property_logo_url", ""),
        description=get_setting(
            db, "property_description",
            "A clean, quiet, and thoughtfully planned 16-bed boutique dormitory offering comfortable living right in the city center."
        ),
        contact_phone=get_setting(db, "property_contact_phone", "+91 98765 43210"),
        whatsapp_number=get_setting(db, "property_whatsapp_number", "+91 98765 43210"),
        email=get_setting(db, "property_email", "stay@arthayog.com"),
        address=get_setting(db, "property_address", "12, Shanti Marg, City Center, Near Metro Station"),
        location_details=get_setting(
            db, "property_location_details",
            "Prime downtown location, 2 minutes walk from central transit terminal, food street, and commercial hub."
        ),
        check_in_time=get_setting(db, "property_check_in_time", "12:00 PM"),
        check_out_time=get_setting(db, "property_check_out_time", "11:00 AM"),
        facilities=facilities,
        amenities=amenities,
        customer_instructions=get_setting(
            db, "property_customer_instructions",
            "Please bring a valid Government Photo ID (Aadhaar, Passport, or Driving License) for check-in verification."
        ),
        booking_instructions=get_setting(
            db, "property_booking_instructions",
            "Check live availability, select your stay dates and preferred bed, and confirm your reservation with our front desk."
        ),
        cancellation_policy=get_setting(
            db, "property_cancellation_policy",
            "Free cancellation up to 24 hours prior to check-in time. For same-day assistance, please call our 24/7 front desk."
        ),
        updated_at=get_setting(db, "property_updated_at", "")
    )

@router.put("/property", response_model=PropertySettingsOut)
def update_property_info(
    data: PropertySettingsUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner/Admin only: Updates property details in the database.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    
    if data.property_name is not None:
        set_setting(db, "property_name", data.property_name.strip(), "Property Name")
    if data.logo_url is not None:
        set_setting(db, "property_logo_url", data.logo_url.strip(), "Property Logo URL")
    if data.description is not None:
        set_setting(db, "property_description", data.description.strip(), "Property Description")
    if data.contact_phone is not None:
        set_setting(db, "property_contact_phone", data.contact_phone.strip(), "Contact Phone")
    if data.whatsapp_number is not None:
        set_setting(db, "property_whatsapp_number", data.whatsapp_number.strip(), "WhatsApp Number")
    if data.email is not None:
        set_setting(db, "property_email", data.email.strip(), "Property Email")
    if data.address is not None:
        set_setting(db, "property_address", data.address.strip(), "Physical Address")
    if data.location_details is not None:
        set_setting(db, "property_location_details", data.location_details.strip(), "Location Details")
    if data.check_in_time is not None:
        set_setting(db, "property_check_in_time", data.check_in_time.strip(), "Standard Check-in Time")
    if data.check_out_time is not None:
        set_setting(db, "property_check_out_time", data.check_out_time.strip(), "Standard Check-out Time")
    if data.facilities is not None:
        set_setting(db, "property_facilities", json.dumps(data.facilities), "Available Facilities")
    if data.amenities is not None:
        set_setting(db, "property_amenities", json.dumps(data.amenities), "Room Amenities")
    if data.customer_instructions is not None:
        set_setting(db, "property_customer_instructions", data.customer_instructions.strip(), "Customer Instructions")
    if data.booking_instructions is not None:
        set_setting(db, "property_booking_instructions", data.booking_instructions.strip(), "Booking Instructions")
    if data.cancellation_policy is not None:
        set_setting(db, "property_cancellation_policy", data.cancellation_policy.strip(), "Cancellation Policy")

    set_setting(db, "property_updated_at", now_iso, "Timestamp of last property info update")

    record_audit(
        db=db,
        user=current_user,
        action="PROPERTY_SETTINGS_UPDATED",
        entity_type="PropertySetting",
        entity_id="property_info",
        details={"updated_by": current_user.email, "timestamp": now_iso},
        ip_address=get_client_ip(request)
    )

    return get_property_info(db)

# ----------------- Pricing Endpoints -----------------

@router.get("/pricing", response_model=PricingSettingsOut)
def get_pricing_settings(db: Session = Depends(get_db)):
    """
    Public endpoint: Returns active accommodation pricing from the database.
    """
    beds = db.query(Bed).all()
    if beds:
        # Standard price is average or first bed price
        std_price = float(beds[0].base_price_inr)
        floor_prices = {}
        for b in beds:
            fl_key = str(b.floor_number)
            if fl_key not in floor_prices:
                floor_prices[fl_key] = float(b.base_price_inr)
    else:
        std_price = float(get_setting(db, "standard_bed_price_inr", "499.0"))
        floor_prices = {"1": std_price, "2": std_price, "3": std_price}

    updated_at = get_setting(db, "pricing_last_updated_at", datetime.now(timezone.utc).isoformat())

    return PricingSettingsOut(
        standard_price_inr=std_price,
        floor_prices=floor_prices,
        updated_at=updated_at
    )

@router.put("/pricing", response_model=PricingSettingsOut)
def update_pricing_settings(
    data: PricingSettingsUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner/Admin only: Changes current accommodation price in the database.
    Updates all beds' base_price_inr so new bookings use the new price.
    Existing confirmed bookings preserve their locked total_amount!
    """
    if data.standard_price_inr <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Accommodation price must be a positive number."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    old_price_str = get_setting(db, "standard_bed_price_inr", "499.0")
    
    # Update beds table base_price_inr
    beds = db.query(Bed).all()
    for bed in beds:
        if data.floor_prices and str(bed.floor_number) in data.floor_prices:
            bed.base_price_inr = float(data.floor_prices[str(bed.floor_number)])
        else:
            bed.base_price_inr = float(data.standard_price_inr)

    set_setting(db, "standard_bed_price_inr", str(data.standard_price_inr), "Global standard nightly bed price in INR")
    set_setting(db, "pricing_last_updated_at", now_iso, "Timestamp when pricing was last changed")

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="ACCOMMODATION_PRICE_UPDATED",
        entity_type="PropertySetting",
        entity_id="standard_bed_price_inr",
        details={
            "old_price": old_price_str,
            "new_price": data.standard_price_inr,
            "floor_prices": data.floor_prices,
            "timestamp": now_iso
        },
        ip_address=get_client_ip(request)
    )

    return get_pricing_settings(db)

# ----------------- Simple Two-Staff Roster Endpoints -----------------

DEFAULT_DAY_STAFF = {
    "name": "Ramesh Sharma",
    "email": "staff@arthayog.com",
    "phone": "+91 98765 11111",
    "shift": "Day Shift (08:00 AM – 08:00 PM)",
    "is_active": True
}

DEFAULT_NIGHT_STAFF = {
    "name": "Suresh Patel",
    "email": "nightstaff@arthayog.com",
    "phone": "+91 98765 22222",
    "shift": "Night Shift (08:00 PM – 08:00 AM)",
    "is_active": True
}

@router.get("/staff-roster", response_model=StaffRosterOut)
def get_staff_roster(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner only: Retrieves the simple two-member staff roster (Day & Night shifts).
    """
    day_str = get_setting(db, "staff_day_shift", "")
    night_str = get_setting(db, "staff_night_shift", "")

    day_data = json.loads(day_str) if day_str else DEFAULT_DAY_STAFF
    night_data = json.loads(night_str) if night_str else DEFAULT_NIGHT_STAFF
    updated_at = get_setting(db, "staff_roster_updated_at", "")

    return StaffRosterOut(
        day_staff=StaffMember(**day_data),
        night_staff=StaffMember(**night_data),
        updated_at=updated_at
    )

@router.put("/staff-roster", response_model=StaffRosterOut)
def update_staff_roster(
    data: StaffRosterUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner only: Configures the two staff members (Day & Night shifts).
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    if data.day_staff is not None:
        set_setting(db, "staff_day_shift", json.dumps(data.day_staff.model_dump()), "Day Shift Staff Details")
        # Ensure user account exists or update it
        user = db.query(User).filter(User.email == data.day_staff.email.lower()).first()
        if user:
            user.full_name = data.day_staff.name
            user.phone = data.day_staff.phone
            user.is_active = data.day_staff.is_active
            db.commit()

    if data.night_staff is not None:
        set_setting(db, "staff_night_shift", json.dumps(data.night_staff.model_dump()), "Night Shift Staff Details")
        # Ensure user account exists or update it
        user = db.query(User).filter(User.email == data.night_staff.email.lower()).first()
        if user:
            user.full_name = data.night_staff.name
            user.phone = data.night_staff.phone
            user.is_active = data.night_staff.is_active
            db.commit()

    set_setting(db, "staff_roster_updated_at", now_iso, "Timestamp of staff roster update")

    record_audit(
        db=db,
        user=current_user,
        action="STAFF_ROSTER_UPDATED",
        entity_type="PropertySetting",
        entity_id="staff_roster",
        details={"updated_by": current_user.email, "timestamp": now_iso},
        ip_address=get_client_ip(request)
    )

    return get_staff_roster(current_user=current_user, db=db)

# ----------------- Review QR Endpoints -----------------

@router.get("/review", response_model=ReviewSettingsOut)
def get_review_settings(db: Session = Depends(get_db)):
    """
    Publicly accessible endpoint: returns the active Review QR Code and Google Review details.
    """
    qr_image = get_setting(db, "review_qr_image", DEFAULT_REVIEW_QR)
    review_url = get_setting(db, "review_url", "https://g.page/r/arthayog-dormitory/review")
    review_title = get_setting(db, "review_title", "Review Arthayog Dormitory on Google")
    review_instructions = get_setting(db, "review_instructions", "Scan QR code with your smartphone camera to rate our stay & share your feedback")
    review_rating = get_setting(db, "review_rating", "4.9")
    review_count = get_setting(db, "review_count", "142")
    is_enabled = get_setting(db, "review_is_enabled", "true").lower() == "true"

    return ReviewSettingsOut(
        review_qr_image=qr_image,
        review_url=review_url,
        review_title=review_title,
        review_instructions=review_instructions,
        review_rating=review_rating,
        review_count=review_count,
        is_enabled=is_enabled
    )

@router.put("/review", response_model=ReviewSettingsOut)
def update_review_settings(
    data: ReviewSettingsUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner/Admin only: updates the Review QR Code image URL/base64, Google review link, and texts.
    """
    if data.review_qr_image is not None:
        set_setting(db, "review_qr_image", data.review_qr_image, "Review QR Code image data or URL")
    if data.review_url is not None:
        set_setting(db, "review_url", data.review_url, "Google review direct URL")
    if data.review_title is not None:
        set_setting(db, "review_title", data.review_title, "Review section title")
    if data.review_instructions is not None:
        set_setting(db, "review_instructions", data.review_instructions, "Review instructions")
    if data.review_rating is not None:
        set_setting(db, "review_rating", data.review_rating, "Average star rating")
    if data.review_count is not None:
        set_setting(db, "review_count", data.review_count, "Review counter")
    if data.is_enabled is not None:
        set_setting(db, "review_is_enabled", "true" if data.is_enabled else "false", "Display review QR on public user portal")

    record_audit(
        db=db,
        user=current_user,
        action="REVIEW_QR_SETTINGS_UPDATED",
        entity_type="PropertySetting",
        entity_id="review_qr_image",
        details={
            "review_url": data.review_url,
            "has_qr_image": bool(data.review_qr_image),
            "is_enabled": data.is_enabled
        },
        ip_address=get_client_ip(request)
    )

    return get_review_settings(db)

# ----------------- Owner-Customizable Payment QR Endpoints -----------------

DEFAULT_PAYMENT_QR = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=arthayog@oksbi%26pn=Arthayog%20Dormitory%26cu=INR&color=0-0-0&bgcolor=255-255-255"

class PaymentQrSettingsOut(BaseModel):
    payment_qr_image: str
    upi_id: str
    payee_name: str
    instructions: str
    is_enabled: bool
    updated_at: Optional[str] = None

class PaymentQrSettingsUpdate(BaseModel):
    payment_qr_image: Optional[str] = None
    upi_id: Optional[str] = None
    payee_name: Optional[str] = None
    instructions: Optional[str] = None
    is_enabled: Optional[bool] = None

@router.get("/payment-qr", response_model=PaymentQrSettingsOut)
def get_payment_qr_settings(db: Session = Depends(get_db)):
    """
    Public/Staff endpoint: Retrieves the active owner-customized Payment QR and UPI details.
    Customer and Staff payment screens fetch this dynamically.
    """
    qr_image = get_setting(db, "payment_qr_image", DEFAULT_PAYMENT_QR)
    upi_id = get_setting(db, "payment_upi_id", "arthayog@oksbi")
    payee_name = get_setting(db, "payment_payee_name", "Arthayog Dormitory")
    instructions = get_setting(
        db, "payment_instructions",
        "Scan with any UPI App (GPay, PhonePe, Paytm, BHIM) to complete your reservation."
    )
    is_enabled = get_setting(db, "payment_qr_is_enabled", "true").lower() == "true"
    updated_at = get_setting(db, "payment_qr_updated_at", "")

    return PaymentQrSettingsOut(
        payment_qr_image=qr_image,
        upi_id=upi_id,
        payee_name=payee_name,
        instructions=instructions,
        is_enabled=is_enabled,
        updated_at=updated_at
    )

@router.put("/payment-qr", response_model=PaymentQrSettingsOut)
def update_payment_qr_settings(
    data: PaymentQrSettingsUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner only: Uploads, replaces, or reconfigures the active dormitory Payment QR and UPI settings.
    Old QR is immediately deactivated. All payment screens switch to this new configuration.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    if data.payment_qr_image is not None:
        set_setting(db, "payment_qr_image", data.payment_qr_image.strip(), "Active Payment QR image (URL or Base64)")
    if data.upi_id is not None:
        set_setting(db, "payment_upi_id", data.upi_id.strip(), "Dormitory official UPI ID")
    if data.payee_name is not None:
        set_setting(db, "payment_payee_name", data.payee_name.strip(), "Official UPI Payee Name")
    if data.instructions is not None:
        set_setting(db, "payment_instructions", data.instructions.strip(), "UPI payment instructions")
    if data.is_enabled is not None:
        set_setting(db, "payment_qr_is_enabled", "true" if data.is_enabled else "false", "Payment QR active status")

    set_setting(db, "payment_qr_updated_at", now_iso, "Timestamp when Payment QR was updated")

    record_audit(
        db=db,
        user=current_user,
        action="PAYMENT_QR_UPDATED",
        entity_type="PropertySetting",
        entity_id="payment_qr_image",
        details={
            "upi_id": data.upi_id,
            "payee_name": data.payee_name,
            "is_enabled": data.is_enabled,
            "has_new_image": bool(data.payment_qr_image),
            "timestamp": now_iso
        },
        ip_address=get_client_ip(request)
    )

    return get_payment_qr_settings(db)

@router.delete("/payment-qr", response_model=PaymentQrSettingsOut)
def disable_payment_qr_settings(
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """
    Owner only: Disables the current Payment QR code.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    set_setting(db, "payment_qr_is_enabled", "false", "Payment QR active status")
    set_setting(db, "payment_qr_updated_at", now_iso, "Timestamp when Payment QR was updated")

    record_audit(
        db=db,
        user=current_user,
        action="PAYMENT_QR_DISABLED",
        entity_type="PropertySetting",
        entity_id="payment_qr_image",
        details={"disabled_by": current_user.email, "timestamp": now_iso},
        ip_address=get_client_ip(request)
    )

    return get_payment_qr_settings(db)

