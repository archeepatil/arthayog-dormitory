# Arthayog Dormitory ERP

A genuine, secure, production-ready full-stack Enterprise Resource Planning (ERP) platform for **Arthayog Dormitory**, a 16-bed small-town property.

---

## 🏛️ Property & System Overview

- **Bed Capacity**: Exactly 16 pod beds distributed across 3 floors:
  - **Floor 1**: 5 beds (`B101` – `B105`)
  - **Floor 2**: 6 beds (`B201` – `B206`)
  - **Floor 3**: 5 beds (`B301` – `B305`)
- **Operational Roles**:
  - `OWNER_ADMIN`: Complete system telemetry, executive dashboard, staff management, financial reports, supplies purchasing, and immutable audit logs.
  - `STAFF_EMPLOYEE`: Front desk daily operations, phone/walk-in reservations, guest check-in (ID verification), check-out, cleaning turnaround workflow, supply usage logging, maintenance tickets, and duty tasks.
  - `CUSTOMER_GUEST`: Date-aware availability lookup, online reservation, server-verified payments, and personal booking passes.
- **Persistent Backend**: Powered by FastAPI and SQLAlchemy ORM with SQLite (WAL mode) / PostgreSQL compatibility.
- **Genuine Payment Gateway**: Razorpay Indian payment gateway integration with server-side HMAC-SHA256 signature verification. Never trusts client-only success.
- **Security & Cryptography**: Argon2id password hashing, JWT Bearer tokens, backend-enforced role authorization, and sanitized audit logging.

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment & install dependencies
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Run automated test suite
$env:PYTHONPATH="backend"
pytest tests/test_backend.py -v

# Run FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API OpenAPI Swagger documentation is available at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev -- --host 127.0.0.1 --port 5173
```
Access the application at: `http://127.0.0.1:5173`

---

## 🔑 Default Accounts (Argon2id Hashed)

| Role | Email | Password |
|---|---|---|
| **Owner / Admin** | `owner@arthayog.com` | `AdminSecurePassword123!` |
| **Front Desk Staff** | `staff@arthayog.com` | `StaffSecurePassword123!` |
| **Guest Customer** | `guest@example.com` | `GuestSecurePassword123!` |

*(Instant role switcher buttons are also provided in the UI Sign In modal for testing).*

---

## 🔄 Core Operational Lifecycle

1. **Date-Aware Availability**:
   - Querying date ranges checks overlapping bookings `[check_in, check_out)` in the database.
   - Prevents double-bookings with database conflict checks.
2. **Provisional Hold & Auto-Release**:
   - Unpaid provisional reservations are held for 15 minutes before being automatically transitioned to `EXPIRED` and released back into inventory by a background worker.
3. **Turnaround Cleaning Workflow**:
   - `Occupied` → `Checked Out` → `Cleaning Required` → `Cleaning In Progress` → `Ready (Available)`.
4. **Supplies Inventory**:
   - Persistent tracking of bedsheets, bath towels, warm blankets, soap bars, toilet paper, drinking water jars, and cleaning fluids with low-stock alerts.
5. **Maintenance & Lockout**:
   - Reporting a bed equipment issue automatically marks the bed into `MAINTENANCE` status, preventing it from being offered to customers.
6. **Immutable Audit Logs**:
   - Traceable owner-only records of every administrative, booking, check-in, checkout, cleaning, and financial action. Passwords and payment secrets are automatically redacted.
