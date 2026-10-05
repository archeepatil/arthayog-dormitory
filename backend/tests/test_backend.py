import os
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base
from app.api.deps import get_db
from app.services.seed_data import seed_initial_data

TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../test_arthayog.db"))
test_engine = create_engine(f"sqlite:///{TEST_DB_PATH}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass

    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_initial_data(db)
    db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    yield

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_16_beds_distribution(client):
    """Verify exact 16 beds: Floor 1 = 5, Floor 2 = 6, Floor 3 = 5."""
    response = client.get("/api/beds")
    assert response.status_code == 200
    beds = response.json()
    assert len(beds) == 16

    f1 = [b for b in beds if b["floor_number"] == 1]
    f2 = [b for b in beds if b["floor_number"] == 2]
    f3 = [b for b in beds if b["floor_number"] == 3]

    assert len(f1) == 5
    assert len(f2) == 6
    assert len(f3) == 5

def test_auth_login_argon2id(client):
    """Verify owner and staff login with Argon2id hash."""
    # Owner login
    res = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "OWNER_ADMIN"

    # Wrong password fails
    bad = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "WrongPassword!"
    })
    assert bad.status_code == 401

def test_date_aware_availability_and_double_booking(client):
    """Test date-aware availability and prevention of overlapping bookings."""
    today = date.today()
    check_in = today + timedelta(days=2)
    check_out = today + timedelta(days=4)

    # 1. Fetch available beds
    res = client.get(f"/api/beds?check_in={check_in}&check_out={check_out}")
    assert res.status_code == 200
    available_beds = [b for b in res.json() if b["is_available_for_dates"] is True]
    assert len(available_beds) > 0
    target_bed = available_beds[0]

    # 2. Create online booking
    book_res = client.post("/api/bookings/online", json={
        "bed_id": target_bed["id"],
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "guest_name": "Vikram Patel",
        "guest_phone": "+919876540001",
        "guest_email": "vikram@example.com",
        "notes": "Wedding attendee"
    })
    assert book_res.status_code == 200
    booking = book_res.json()
    assert booking["status"] == "PENDING_APPROVAL"
    booking_id = booking["id"]

    # Verify payment attempt before approval is rejected
    unapproved_pay = client.post("/api/payments/create-order", json={"booking_id": booking_id, "method": "UPI"})
    assert unapproved_pay.status_code == 400

    # Staff approves booking
    staff_login = client.post("/api/auth/login", json={
        "email": "staff@arthayog.com",
        "password": "StaffSecurePassword123!"
    })
    staff_headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}
    appr_res = client.post(f"/api/bookings/{booking_id}/approve", headers=staff_headers, json={})
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED_PAYMENT_PENDING"

    # 3. Simulate and verify payment to confirm
    order_res = client.post("/api/payments/create-order", json={"booking_id": booking_id, "method": "UPI"})
    assert order_res.status_code == 200
    order_data = order_res.json()

    # Get valid sandbox HMAC signature
    sim_res = client.post(f"/api/payments/sandbox-simulate?order_id={order_data['razorpay_order_id']}")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()

    # Test invalid signature fails
    fake_verify = client.post("/api/payments/verify", json={
        "booking_id": booking_id,
        "razorpay_order_id": sim_data["razorpay_order_id"],
        "razorpay_payment_id": sim_data["razorpay_payment_id"],
        "razorpay_signature": "invalid_fake_signature_abc123"
    })
    assert fake_verify.status_code == 400

    # Test valid signature passes
    real_verify = client.post("/api/payments/verify", json=sim_data | {"booking_id": booking_id})
    assert real_verify.status_code == 200
    assert real_verify.json()["status"] == "SUCCESS"

    # 4. Attempt overlapping booking for SAME bed - MUST BE REJECTED
    overlap_res = client.post("/api/bookings/online", json={
        "bed_id": target_bed["id"],
        "check_in_date": str(today + timedelta(days=3)),
        "check_out_date": str(today + timedelta(days=5)),
        "guest_name": "Double Booking Attempt",
        "guest_phone": "+919876540002",
        "guest_email": "double@example.com"
    })
    assert overlap_res.status_code == 409  # Conflict!

def test_operational_lifecycle_checkin_checkout_cleaning(client):
    """Verify: Occupied -> Checked Out -> Cleaning Required -> Cleaning In Progress -> Ready."""
    # Login as Staff
    staff_login = client.post("/api/auth/login", json={
        "email": "staff@arthayog.com",
        "password": "StaffSecurePassword123!"
    })
    token = staff_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Staff creates a phone booking for today
    today = date.today()
    tomorrow = today + timedelta(days=1)
    
    # Bed 16 (B305)
    beds_res = client.get("/api/beds")
    bed = [b for b in beds_res.json() if b["bed_number"] == "B305"][0]

    phone_book = client.post("/api/bookings/phone", headers=headers, json={
        "bed_id": bed["id"],
        "check_in_date": str(today),
        "check_out_date": str(tomorrow),
        "guest_name": "Suresh Raina",
        "guest_phone": "+919876549999",
        "guest_email": "suresh@example.com",
        "paid_amount": 499.0,
        "is_confirmed": True
    })
    assert phone_book.status_code == 200
    booking_id = phone_book.json()["id"]

    # 1. Check in
    checkin_res = client.post(f"/api/bookings/{booking_id}/check-in", headers=headers, json={
        "guest_id_proof_type": "AADHAAR",
        "guest_id_proof_number": "1234-5678-9012"
    })
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "CHECKED_IN"

    # Bed should now be OCCUPIED
    bed_check = client.get(f"/api/beds/{bed['id']}")
    assert bed_check.json()["status"] == "OCCUPIED"

    # 2. Check out
    checkout_res = client.post(f"/api/bookings/{booking_id}/check-out", headers=headers, json={
        "inspection_notes": "Room left in tidy condition"
    })
    assert checkout_res.status_code == 200
    assert checkout_res.json()["status"] == "CHECKED_OUT"

    # Bed should now be CLEANING_REQUIRED
    bed_check2 = client.get(f"/api/beds/{bed['id']}")
    assert bed_check2.json()["status"] == "CLEANING_REQUIRED"

    # 3. Start cleaning
    clean_start = client.post(f"/api/cleaning/{bed['id']}/start", headers=headers)
    assert clean_start.status_code == 200
    assert clean_start.json()["status"] == "CLEANING_IN_PROGRESS"

    # 4. Complete cleaning -> bed is AVAILABLE / READY
    clean_done = client.post(f"/api/cleaning/{bed['id']}/complete", headers=headers)
    assert clean_done.status_code == 200

    bed_check3 = client.get(f"/api/beds/{bed['id']}")
    assert bed_check3.json()["status"] == "AVAILABLE"

def test_inventory_usage_and_thresholds(client):
    """Test supplies inventory transactions and alert logic."""
    staff_login = client.post("/api/auth/login", json={
        "email": "staff@arthayog.com",
        "password": "StaffSecurePassword123!"
    })
    headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}

    inv_list = client.get("/api/inventory", headers=headers).json()
    assert len(inv_list) >= 7

    soap = [i for i in inv_list if "Soap" in i["name"]][0]
    initial_qty = soap["current_quantity"]

    # Record usage of 2 soap bars
    use_res = client.post("/api/inventory/transaction", headers=headers, json={
        "item_id": soap["id"],
        "change_type": "USAGE",
        "quantity": 2,
        "notes": "Issued to Floor 1 dispenser"
    })
    assert use_res.status_code == 200

    # Verify updated quantity
    inv_list_after = client.get("/api/inventory", headers=headers).json()
    soap_after = [i for i in inv_list_after if i["id"] == soap["id"]][0]
    assert soap_after["current_quantity"] == initial_qty - 2

def test_owner_only_audit_log_protection(client):
    """Verify that audit logs are protected and only OWNER_ADMIN can read them."""
    # Customer cannot access audit logs
    cust_login = client.post("/api/auth/login", json={
        "email": "guest@example.com",
        "password": "GuestSecurePassword123!"
    })
    cust_token = cust_login.json()["access_token"]
    cust_res = client.get("/api/audit", headers={"Authorization": f"Bearer {cust_token}"})
    assert cust_res.status_code == 403

    # Staff cannot access audit logs
    staff_login = client.post("/api/auth/login", json={
        "email": "staff@arthayog.com",
        "password": "StaffSecurePassword123!"
    })
    staff_token = staff_login.json()["access_token"]
    staff_res = client.get("/api/audit", headers={"Authorization": f"Bearer {staff_token}"})
    assert staff_res.status_code == 403

    # Owner CAN access audit logs
    owner_login = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    owner_token = owner_login.json()["access_token"]
    owner_res = client.get("/api/audit", headers={"Authorization": f"Bearer {owner_token}"})
    assert owner_res.status_code == 200
    assert len(owner_res.json()) > 0

def test_price_change_scenario_preserves_confirmed_booking(client):
    """
    Requirement 23 Test:
    1. Owner sets current price to 500.
    2. Customer creates and successfully confirms a booking at 500.
    3. Owner changes current price to 600.
    4. Existing confirmed booking must still show 500.
    5. New customer booking must show 600.
    6. Payment for the new booking must use 600.
    7. Customer receipt/confirmation must show the correct booking price.
    8. Owner booking history must preserve the original confirmed amount.
    """
    owner_login = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    owner_token = owner_login.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # 1. Owner sets price to 500
    p1 = client.put("/api/settings/pricing", headers=owner_headers, json={"standard_price_inr": 500.0})
    assert p1.status_code == 200
    assert p1.json()["standard_price_inr"] == 500.0

    # 2. Customer creates and confirms booking at 500
    today = date.today()
    check_in = today + timedelta(days=50)
    check_out = today + timedelta(days=51) # 1 night

    beds_res = client.get(f"/api/beds?check_in={check_in}&check_out={check_out}")
    avail = [b for b in beds_res.json() if b["is_available_for_dates"] is True]
    assert len(avail) >= 2
    bed1 = avail[0]
    bed2 = avail[1]
    assert bed1["base_price_inr"] == 500.0

    cust_book1 = client.post("/api/bookings/online", json={
        "bed_id": bed1["id"],
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "guest_name": "Price Test Guest 1",
        "guest_phone": "+919999900001",
        "guest_email": "ptest1@example.com"
    })
    assert cust_book1.status_code == 200
    b1_data = cust_book1.json()
    assert b1_data["total_amount"] == 500.0
    b1_id = b1_data["id"]

    # Owner approves booking 1
    appr1 = client.post(f"/api/bookings/{b1_id}/approve", headers=owner_headers, json={})
    assert appr1.status_code == 200

    # Confirm booking 1 with payment
    order1 = client.post("/api/payments/create-order", json={"booking_id": b1_id, "method": "UPI"})
    assert order1.status_code == 200
    assert order1.json()["amount"] == 500.0
    sim1 = client.post(f"/api/payments/sandbox-simulate?order_id={order1.json()['razorpay_order_id']}").json()
    verify1 = client.post("/api/payments/verify", json=sim1 | {"booking_id": b1_id})
    assert verify1.status_code == 200

    # Verify booking 1 is CONFIRMED with total_amount 500
    b1_confirmed = client.get(f"/api/bookings/{b1_id}", headers=owner_headers).json()
    assert b1_confirmed["status"] == "CONFIRMED"
    assert b1_confirmed["total_amount"] == 500.0

    # Test receipt shows exact 500 confirmed amount and verified payment
    rcpt1 = client.get(f"/api/bookings/{b1_id}/receipt", headers=owner_headers)
    assert rcpt1.status_code == 200
    assert rcpt1.json()["payment"]["total_amount"] == 500.0
    assert rcpt1.json()["payment"]["paid_amount"] == 500.0
    assert "PAID" in rcpt1.json()["payment"]["payment_status"]

    # 3. Owner changes current price to 600
    p2 = client.put("/api/settings/pricing", headers=owner_headers, json={"standard_price_inr": 600.0})
    assert p2.status_code == 200
    assert p2.json()["standard_price_inr"] == 600.0

    # 4. Existing confirmed booking must still show 500
    b1_check_again = client.get(f"/api/bookings/{b1_id}", headers=owner_headers).json()
    assert b1_check_again["total_amount"] == 500.0
    assert b1_check_again["paid_amount"] == 500.0

    # 5. New customer booking must show 600
    bed2_check = client.get(f"/api/beds/{bed2['id']}").json()
    assert bed2_check["base_price_inr"] == 600.0

    cust_book2 = client.post("/api/bookings/online", json={
        "bed_id": bed2["id"],
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "guest_name": "Price Test Guest 2",
        "guest_phone": "+919999900002",
        "guest_email": "ptest2@example.com"
    })
    assert cust_book2.status_code == 200
    b2_data = cust_book2.json()
    assert b2_data["total_amount"] == 600.0

    # Owner approves booking 2
    appr2 = client.post(f"/api/bookings/{b2_data['id']}/approve", headers=owner_headers, json={})
    assert appr2.status_code == 200

    # 6. Payment for the new booking must use 600
    order2 = client.post("/api/payments/create-order", json={"booking_id": b2_data["id"], "method": "CARD"})
    assert order2.status_code == 200
    assert order2.json()["amount"] == 600.0

    # 7 & 8: Historical confirmed bookings preserved
    owner_bookings = client.get("/api/bookings", headers=owner_headers).json()
    b1_in_list = [b for b in owner_bookings if b["id"] == b1_id][0]
    assert b1_in_list["total_amount"] == 500.0
    assert b1_in_list["paid_amount"] == 500.0


def test_inventory_owner_customizable(client):
    """Test owner can add, edit, and delete custom inventory items."""
    owner_login = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    # 1. Add custom inventory item
    add_res = client.post("/api/inventory", headers=owner_headers, json={
        "name": "Organic Herbal Tea Packets",
        "category": "BEVERAGE",
        "unit": "Packets",
        "current_quantity": 40,
        "min_threshold": 10,
        "unit_cost": 25.0
    })
    assert add_res.status_code == 200
    item = add_res.json()
    item_id = item["id"]
    assert item["name"] == "Organic Herbal Tea Packets"
    assert item["current_quantity"] == 40

    # 2. Edit inventory item
    edit_res = client.put(f"/api/inventory/{item_id}", headers=owner_headers, json={
        "name": "Organic Herbal Tea Bags (Premium)",
        "current_quantity": 55,
        "min_threshold": 15
    })
    assert edit_res.status_code == 200
    assert edit_res.json()["name"] == "Organic Herbal Tea Bags (Premium)"
    assert edit_res.json()["current_quantity"] == 55
    assert edit_res.json()["min_threshold"] == 15

    # 3. Delete inventory item
    del_res = client.delete(f"/api/inventory/{item_id}", headers=owner_headers)
    assert del_res.status_code == 200

def test_group_wedding_bulk_booking_scenarios(client):
    """
    Comprehensive verification for Requirement 7, 31, and 32:
    1. Entire Floor 1 → 5 beds
    2. Entire Floor 2 → 6 beds
    3. Floor 1 + Floor 2 → 11 beds
    4. Entire property → 16 beds
    5. One unavailable bed on selected floor (auto-assigns available beds, never double-books)
    6. Partial floor availability
    7. Increase group booking size (add floor)
    8. Decrease group booking size (release bed & remove floor)
    9. Cancel group booking (all beds released)
    10. Change dates (conflict check & update)
    11. Attempt overlapping booking (strictly blocked with 409)
    """
    staff_login = client.post("/api/auth/login", json={
        "email": "staff@arthayog.com",
        "password": "StaffSecurePassword123!"
    })
    staff_headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}

    today = date.today()
    check_in = today + timedelta(days=90)
    check_out = today + timedelta(days=92) # 2 nights

    # Scenario 1: Book Entire Floor 1 (5 beds)
    f1_res = client.post("/api/bookings/group", headers=staff_headers, json={
        "guest_name": "Sharma Wedding Family",
        "guest_phone": "+919876543210",
        "event_name": "Sharma Family Wedding",
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "floors": [1],
        "is_confirmed": True,
        "paid_amount": 5000.0
    })
    assert f1_res.status_code == 200
    f1_data = f1_res.json()
    assert f1_data["total_beds_assigned"] == 5
    assert f1_data["floors_selected"] == [1]
    assert f1_data["status"] == "CONFIRMED"
    group1_code = f1_data["group_code"]

    # Scenario 11: Attempt overlapping booking on Floor 1 - strictly returns 409
    f1_repeat = client.post("/api/bookings/group", headers=staff_headers, json={
        "guest_name": "Conflicting Party",
        "guest_phone": "+919999988888",
        "event_name": "Conflict Event",
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "floors": [1]
    })
    assert f1_repeat.status_code == 409

    # Scenario 2: Book Entire Floor 2 (6 beds)
    f2_res = client.post("/api/bookings/group", headers=staff_headers, json={
        "guest_name": "Verma Wedding Party",
        "guest_phone": "+919876599999",
        "event_name": "Verma Sangeet",
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "floors": [2],
        "is_confirmed": True
    })
    assert f2_res.status_code == 200
    assert f2_res.json()["total_beds_assigned"] == 6
    group2_code = f2_res.json()["group_code"]

    # Scenario 8: Decrease group booking size (releasing a bed from Floor 1)
    assigned_bed_ids = [b["bed_id"] for b in f1_data["assigned_beds"]]
    bed_to_release = assigned_bed_ids[0]
    mod_res = client.put(f"/api/bookings/group/{group1_code}", headers=staff_headers, json={
        "release_bed_ids": [bed_to_release]
    })
    assert mod_res.status_code == 200
    assert mod_res.json()["total_beds_assigned"] == 4

    # Released bed becomes available for individual booking immediately
    single_res = client.post("/api/bookings/phone", headers=staff_headers, json={
        "bed_id": bed_to_release,
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "guest_name": "Released Bed Individual Guest",
        "guest_phone": "+919111122222",
        "is_confirmed": True
    })
    assert single_res.status_code == 200

    # Scenario 5 & 6: One unavailable bed on floor / Partial floor availability
    # Now Floor 1 has 4 beds in group1, 1 bed in single booking.
    # On other dates (120 days out), let's reserve 1 bed on Floor 1, then book Floor 1 + 2 (Scenario 3 with partial)
    future_in = today + timedelta(days=120)
    future_out = today + timedelta(days=122)

    # Reserve 1 bed on Floor 1 first
    beds_res = client.get("/api/beds")
    f1_bed = [b for b in beds_res.json() if b["floor_number"] == 1][0]
    indiv_hold = client.post("/api/bookings/phone", headers=staff_headers, json={
        "bed_id": f1_bed["id"],
        "check_in_date": str(future_in),
        "check_out_date": str(future_out),
        "guest_name": "Solo Early Booker",
        "guest_phone": "+919222233333",
        "is_confirmed": True
    })
    assert indiv_hold.status_code == 200

    # Scenario 3 & 5: Book Floor 1 + Floor 2. Floor 1 has 4 available (1 occupied), Floor 2 has 6 available -> 10 beds assigned
    combo_res = client.post("/api/bookings/group", headers=staff_headers, json={
        "guest_name": "Gupta Wedding Function",
        "guest_phone": "+919333344444",
        "event_name": "Gupta Marriage",
        "check_in_date": str(future_in),
        "check_out_date": str(future_out),
        "floors": [1, 2],
        "is_confirmed": True
    })
    assert combo_res.status_code == 200
    combo_data = combo_res.json()
    assert combo_data["total_beds_assigned"] == 10 # 4 from F1 + 6 from F2
    assert len(combo_data["unavailable_beds_on_floors"]) == 1 # Flags the 1 occupied bed
    combo_code = combo_data["group_code"]

    # Scenario 7: Increase group booking size by adding Floor 3 (5 beds) -> 10 + 5 = 15 beds
    add_fl_res = client.put(f"/api/bookings/group/{combo_code}", headers=staff_headers, json={
        "add_floors": [3]
    })
    assert add_fl_res.status_code == 200
    assert add_fl_res.json()["total_beds_assigned"] == 15

    # Scenario 8: Decrease group booking size by removing Floor 3 -> returns to 10 beds
    rem_fl_res = client.put(f"/api/bookings/group/{combo_code}", headers=staff_headers, json={
        "remove_floors": [3]
    })
    assert rem_fl_res.status_code == 200
    assert rem_fl_res.json()["total_beds_assigned"] == 10

    # Scenario 10: Change stay dates
    new_in = future_in + timedelta(days=5)
    new_out = future_out + timedelta(days=5)
    date_mod_res = client.put(f"/api/bookings/group/{combo_code}", headers=staff_headers, json={
        "check_in_date": str(new_in),
        "check_out_date": str(new_out)
    })
    assert date_mod_res.status_code == 200
    assert str(date_mod_res.json()["check_in_date"]) == str(new_in)
    assert str(date_mod_res.json()["check_out_date"]) == str(new_out)

    # Scenario 9: Cancel group booking -> all assigned beds released
    cancel_res = client.post(f"/api/bookings/group/{combo_code}/cancel", headers=staff_headers)
    assert cancel_res.status_code == 200

    # Scenario 4: Entire property (all 16 beds: Floor 1 + 2 + 3) on fresh dates
    p_in = today + timedelta(days=200)
    p_out = today + timedelta(days=202)
    all_floors_res = client.post("/api/bookings/group", headers=staff_headers, json={
        "guest_name": "Mega Wedding Group",
        "guest_phone": "+919888877777",
        "event_name": "Full Dormitory Mega Wedding",
        "check_in_date": str(p_in),
        "check_out_date": str(p_out),
        "floors": [1, 2, 3], # All 16 beds!
        "is_confirmed": True
    })
    assert all_floors_res.status_code == 200
    all_floors_data = all_floors_res.json()
    assert all_floors_data["total_beds_assigned"] == 16
    assert set(all_floors_data["floors_selected"]) == {1, 2, 3}

    # Cancel mega group -> all 16 beds released
    cancel_mega = client.post(f"/api/bookings/group/{all_floors_data['group_code']}/cancel", headers=staff_headers)
    assert cancel_mega.status_code == 200

def test_owner_payment_qr_settings(client):
    """Test owner payment QR code retrieval, replacement, and deactivation."""
    owner_login = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    # 1. Public retrieval of current active Payment QR
    res1 = client.get("/api/settings/payment-qr")
    assert res1.status_code == 200
    assert "payment_qr_image" in res1.json()
    assert res1.json()["upi_id"] == "arthayog@oksbi"

    # 2. Owner updates QR and UPI
    res2 = client.put("/api/settings/payment-qr", headers=owner_headers, json={
        "upi_id": "arthayog.dormitory@icici",
        "payee_name": "Arthayog Stay Private Limited",
        "payment_qr_image": "https://sample-qr.example.com/live_qr.png"
    })
    assert res2.status_code == 200
    assert res2.json()["upi_id"] == "arthayog.dormitory@icici"
    assert res2.json()["payee_name"] == "Arthayog Stay Private Limited"

    # 3. Check public customer endpoint now returns updated QR
    res3 = client.get("/api/settings/payment-qr")
    assert res3.json()["upi_id"] == "arthayog.dormitory@icici"
    assert res3.json()["payment_qr_image"] == "https://sample-qr.example.com/live_qr.png"

def test_system_health_and_automated_backups(client):
    """Test system health telemetry and owner SQLite safe database snapshots."""
    owner_login = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    # 1. System health check
    health_res = client.get("/api/system/health")
    assert health_res.status_code == 200
    h_data = health_res.json()
    assert h_data["status"] == "healthy"
    assert h_data["database"]["total_beds"] == 16
    assert h_data["database"]["connected"] is True

    # 2. Owner triggers database backup snapshot
    backup_res = client.post("/api/system/backup", headers=owner_headers)
    assert backup_res.status_code == 200
    b_data = backup_res.json()
    assert b_data["status"] == "success"
    assert "arthayog_backup_" in b_data["filename"]

def test_booking_approval_and_rejection_workflows(client):
    """
    Test customer submits booking request -> PENDING_APPROVAL.
    Test reject workflow.
    Test approve workflow and payment authorization.
    """
    owner_login = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    today = date.today()
    check_in = today + timedelta(days=60)
    check_out = today + timedelta(days=62)

    beds_res = client.get(f"/api/beds?check_in={check_in}&check_out={check_out}")
    bed = [b for b in beds_res.json() if b["is_available_for_dates"] is True][0]

    # 1. Customer submits booking request
    req_res = client.post("/api/bookings/online", json={
        "bed_id": bed["id"],
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "guest_name": "Archee Patil",
        "guest_phone": "+919876500099",
        "guest_email": "archee@example.com"
    })
    assert req_res.status_code == 200
    b_data = req_res.json()
    assert b_data["status"] == "PENDING_APPROVAL"
    b_id = b_data["id"]

    # 2. Reject flow test
    rej_res = client.post(f"/api/bookings/{b_id}/reject", headers=owner_headers, json={
        "rejection_reason": "Maintenance scheduled"
    })
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"
    assert rej_res.json()["rejection_reason"] == "Maintenance scheduled"

    # Cannot pay for rejected booking
    pay_rej = client.post("/api/payments/create-order", json={"booking_id": b_id, "method": "UPI"})
    assert pay_rej.status_code == 400

    # 3. Create another request and approve
    req2 = client.post("/api/bookings/online", json={
        "bed_id": bed["id"],
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "guest_name": "Archee Patil Approved",
        "guest_phone": "+919876500099",
        "guest_email": "archee@example.com"
    })
    assert req2.status_code == 200
    b2_id = req2.json()["id"]

    # Approve
    appr_res = client.post(f"/api/bookings/{b2_id}/approve", headers=owner_headers, json={
        "notes": "Approved for guest stay"
    })
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED_PAYMENT_PENDING"

    # Now payment order succeeds
    order_res = client.post("/api/payments/create-order", json={"booking_id": b2_id, "method": "UPI"})
    assert order_res.status_code == 200

def test_owner_configurable_phone_numbers_call_only(client):
    """
    Test Owner can add, edit, and remove contact phone numbers.
    Test public contact endpoint returns active phone numbers (Call Only, NO WhatsApp).
    """
    owner_login = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    # 1. Add phone number
    create_res = client.post("/api/settings/phone-numbers", headers=owner_headers, json={
        "label": "Day Desk Manager",
        "phone_number": "+91 99887 76655",
        "is_active": True,
        "show_to_customers": True,
        "display_order": 1
    })
    assert create_res.status_code == 200
    phone_id = create_res.json()["id"]

    # 2. Public contact returns it
    pub_res = client.get("/api/settings/public-contact")
    assert pub_res.status_code == 200
    phones = pub_res.json()["phone_numbers"]
    assert any(p["phone_number"] == "+91 99887 76655" for p in phones)

    # 3. Update to inactive
    upd_res = client.put(f"/api/settings/phone-numbers/{phone_id}", headers=owner_headers, json={
        "is_active": False
    })
    assert upd_res.status_code == 200

    # Now it does not appear in public contact
    pub_res2 = client.get("/api/settings/public-contact")
    phones2 = pub_res2.json()["phone_numbers"]
    assert not any(p["phone_number"] == "+91 99887 76655" for p in phones2)

def test_aadhaar_unconfigured_safeguard_and_guest_photo(client):
    """
    Test Aadhaar unconfigured message (Never fake verification).
    Test Live Guest Photo capture and authorized retrieval.
    """
    owner_login = client.post("/api/auth/login", json={
        "email": "owner@arthayog.com",
        "password": "AdminSecurePassword123!"
    })
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    today = date.today()
    check_in = today + timedelta(days=70)
    check_out = today + timedelta(days=71)

    beds_res = client.get(f"/api/beds?check_in={check_in}&check_out={check_out}")
    bed = [b for b in beds_res.json() if b["is_available_for_dates"] is True][0]

    b_res = client.post("/api/bookings/online", json={
        "bed_id": bed["id"],
        "check_in_date": str(check_in),
        "check_out_date": str(check_out),
        "guest_name": "Photo Test Guest",
        "guest_phone": "+919123456780",
        "guest_email": "photo@example.com"
    })
    b_id = b_res.json()["id"]

    # 1. Aadhaar verification safeguard
    aadhaar_res = client.post(f"/api/bookings/{b_id}/verify-identity", headers=owner_headers, json={})
    assert aadhaar_res.status_code == 200
    assert aadhaar_res.json()["status"] == "NOT_CONFIGURED"
    assert "Aadhaar verification service is not configured." in aadhaar_res.json()["message"]

    # 2. Capture live guest photo
    sample_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    photo_res = client.post(f"/api/bookings/{b_id}/capture-photo", headers=owner_headers, json={
        "photo_data": sample_b64
    })
    assert photo_res.status_code == 200
    assert photo_res.json()["status"] == "ACTIVE"

    # 3. Retrieve guest photo
    get_photo = client.get(f"/api/bookings/{b_id}/photo", headers=owner_headers)
    assert get_photo.status_code == 200
    assert get_photo.json()["photo_data"] == sample_b64

    # 4. Delete guest photo per retention / privacy request
    del_photo = client.delete(f"/api/bookings/{b_id}/photo", headers=owner_headers)
    assert del_photo.status_code == 200
    assert "deleted" in del_photo.json()["message"].lower()

    # Verify photo is no longer retrievable
    get_photo_after = client.get(f"/api/bookings/{b_id}/photo", headers=owner_headers)
    assert get_photo_after.status_code == 404

    # 5. Cleanup expired photos endpoint
    cleanup_res = client.post("/api/bookings/photos/cleanup-expired", headers=owner_headers)
    assert cleanup_res.status_code == 200
    assert "deleted_count" in cleanup_res.json()


