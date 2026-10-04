from sqlalchemy.orm import Session
from app.models import User, UserRole, Bed, BedStatus, InventoryItem
from app.core.security import hash_password
from app.core.config import settings

def seed_initial_data(db: Session):
    """
    Seeds the exact 16 beds (Floor 1: 5, Floor 2: 6, Floor 3: 5),
    inventory items, and initial admin/staff users.
    """
    # 1. Seed Owner Admin
    owner = db.query(User).filter(User.email == settings.INITIAL_OWNER_EMAIL).first()
    if not owner:
        owner = User(
            email=settings.INITIAL_OWNER_EMAIL,
            full_name="Arthayog Owner / Administrator",
            phone="+919876543210",
            role=UserRole.OWNER_ADMIN.value,
            password_hash=hash_password(settings.INITIAL_OWNER_PASSWORD),
            is_active=True,
            is_verified=True
        )
        db.add(owner)

    # 2. Seed Staff User
    staff = db.query(User).filter(User.email == settings.INITIAL_STAFF_EMAIL).first()
    if not staff:
        staff = User(
            email=settings.INITIAL_STAFF_EMAIL,
            full_name="Arthayog Front Desk Operations",
            phone="+919876543211",
            role=UserRole.STAFF_EMPLOYEE.value,
            password_hash=hash_password(settings.INITIAL_STAFF_PASSWORD),
            is_active=True,
            is_verified=True
        )
        db.add(staff)

    # 3. Seed Demo Customer User
    customer = db.query(User).filter(User.email == "guest@example.com").first()
    if not customer:
        customer = User(
            email="guest@example.com",
            full_name="Rahul Sharma",
            phone="+919876543212",
            role=UserRole.CUSTOMER_GUEST.value,
            password_hash=hash_password("GuestSecurePassword123!"),
            is_active=True,
            is_verified=True
        )
        db.add(customer)

    # 4. Seed Exactly 16 Beds Across 3 Floors
    # Floor 1: 5 beds (B101 to B105)
    # Floor 2: 6 beds (B201 to B206)
    # Floor 3: 5 beds (B301 to B305)
    floor_configs = [
        (1, 5, 499.0, "Floor 1 Ground dormitory bed with reading light & charging socket"),
        (2, 6, 549.0, "Floor 2 Premium quiet dormitory bed with private locker"),
        (3, 5, 499.0, "Floor 3 Top floor airy dormitory bed with mountain/town view")
    ]

    for floor_num, bed_count, price, desc in floor_configs:
        for b_idx in range(1, bed_count + 1):
            bed_num = f"B{floor_num}0{b_idx}"
            existing = db.query(Bed).filter(Bed.bed_number == bed_num).first()
            if not existing:
                bed = Bed(
                    bed_number=bed_num,
                    floor_number=floor_num,
                    base_price_inr=price,
                    status=BedStatus.AVAILABLE.value,
                    description=desc
                )
                db.add(bed)

    # 5. Seed Inventory Items
    standard_inventory = [
        ("Bedsheets (Cotton Single)", "Linen", "pcs", 35, 10, 250.0),
        ("Bath Towels", "Linen", "pcs", 30, 8, 180.0),
        ("Warm Blankets", "Linen", "pcs", 24, 6, 450.0),
        ("Guest Soap Bars", "Toiletries", "pcs", 50, 15, 25.0),
        ("Toilet Paper Rolls", "Toiletries", "rolls", 40, 10, 35.0),
        ("Drinking Water 20L Jars", "Beverages", "jars", 12, 4, 40.0),
        ("Floor Cleaning Solution", "Housekeeping", "litres", 15, 5, 120.0),
        ("Hand Sanitizer 500ml", "Housekeeping", "bottles", 20, 5, 90.0)
    ]

    for name, cat, unit, qty, min_thresh, cost in standard_inventory:
        inv = db.query(InventoryItem).filter(InventoryItem.name == name).first()
        if not inv:
            inv = InventoryItem(
                name=name,
                category=cat,
                unit=unit,
                current_quantity=qty,
                min_threshold=min_thresh,
                unit_cost=cost
            )
            db.add(inv)

    db.commit()
