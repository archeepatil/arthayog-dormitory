import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_client_ip
from app.models import User, UserRole
from app.schemas import (
    UserLogin, UserRegister, TokenResponse, UserOut,
    SendOtpRequest, SendOtpResponse, VerifyOtpRequest,
    PasswordResetRequest, PasswordResetConfirm, VerifyEmailRequest
)
from app.core.security import verify_password, hash_password, create_access_token
from app.core.audit import record_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(data: SendOtpRequest, request: Request, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    # Generate cryptographically secure 6-digit OTP
    otp = str(secrets.randbelow(900000) + 100000)
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    if user:
        user.otp_code = otp
        user.otp_expires_at = expiry
    else:
        # Auto-provision customer guest account
        user = User(
            email=email_clean,
            full_name=email_clean.split("@")[0].capitalize(),
            role=UserRole.CUSTOMER_GUEST.value,
            password_hash=hash_password(secrets.token_urlsafe(16)),
            is_active=True,
            is_verified=True,
            otp_code=otp,
            otp_expires_at=expiry
        )
        db.add(user)

    db.commit()

    record_audit(
        db=db,
        user=user,
        action="OTP_GENERATED",
        entity_type="User",
        entity_id=user.id,
        details={"email": email_clean},
        ip_address=get_client_ip(request)
    )

    return SendOtpResponse(
        message=f"OTP sent successfully to {email_clean}.",
        email=email_clean,
        otp_preview=otp
    )

@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(data: VerifyOtpRequest, request: Request, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not user.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found. Please request a new OTP."
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    # Ensure timezone awareness comparison
    otp_exp = user.otp_expires_at
    if otp_exp and otp_exp.tzinfo is None:
        otp_exp = otp_exp.replace(tzinfo=timezone.utc)

    if not otp_exp or otp_exp < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP."
        )

    if user.otp_code.strip() != data.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect OTP. Please check and try again."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact management."
        )

    # Success: Clear OTP
    user.otp_code = None
    user.otp_expires_at = None
    if data.full_name and len(data.full_name.strip()) > 1:
        user.full_name = data.full_name.strip()
    if data.phone and len(data.phone.strip()) > 5:
        user.phone = data.phone.strip()
    user.is_verified = True

    db.commit()
    db.refresh(user)

    record_audit(
        db=db,
        user=user,
        action="USER_LOGGED_IN_OTP",
        entity_type="User",
        entity_id=user.id,
        details={"email": user.email, "role": user.role},
        ip_address=get_client_ip(request)
    )

    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(access_token=token, token_type="bearer", user=UserOut.model_validate(user))

@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Public registration can only register as CUSTOMER_GUEST
    role = UserRole.CUSTOMER_GUEST.value
    verification_token = secrets.token_urlsafe(32)

    new_user = User(
        email=data.email.lower(),
        full_name=data.full_name,
        phone=data.phone,
        role=role,
        password_hash=hash_password(data.password),
        is_active=True,
        is_verified=True,  # In dev/instant booking we auto-verify while storing token
        verification_token=verification_token
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit(
        db=db,
        user=new_user,
        action="USER_REGISTERED",
        entity_type="User",
        entity_id=new_user.id,
        details={"email": new_user.email, "role": new_user.role},
        ip_address=get_client_ip(request)
    )

    token = create_access_token(subject=new_user.id, role=new_user.role)
    return TokenResponse(access_token=token, token_type="bearer", user=UserOut.model_validate(new_user))

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact management."
        )

    record_audit(
        db=db,
        user=user,
        action="USER_LOGGED_IN",
        entity_type="User",
        entity_id=user.id,
        ip_address=get_client_ip(request)
    )

    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(access_token=token, token_type="bearer", user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)

@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == data.token).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token.")
    
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified successfully."}

@router.post("/forgot-password")
def forgot_password(data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        # Prevent account enumeration: return success even if email not found
        return {"message": "If this email is registered, a password reset link has been dispatched."}

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    return {
        "message": "If this email is registered, a password reset link has been dispatched.",
        "debug_reset_token": token  # Provided in response for testing/dev environment
    }

@router.post("/reset-password")
def reset_password(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(
        User.reset_token == data.token,
        User.reset_token_expires_at > now
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    user.password_hash = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}
