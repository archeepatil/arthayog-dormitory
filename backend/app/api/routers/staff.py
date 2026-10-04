from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_role, get_client_ip
from app.models import User, UserRole
from app.schemas import UserOut, StaffCreate, StaffUpdate
from app.core.security import hash_password
from app.core.audit import record_audit

router = APIRouter(prefix="/staff", tags=["Staff Management"])

@router.get("", response_model=List[UserOut])
def list_staff(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(
        User.role.in_([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])
    ).order_by(User.role, User.full_name).all()
    return [UserOut.model_validate(u) for u in users]

@router.put("/{user_id}", response_model=UserOut)
def update_staff_user(
    user_id: int,
    data: StaffUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found.")

    if data.email and data.email.lower() != user.email:
        existing = db.query(User).filter(User.email == data.email.lower(), User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already in use.")
        user.email = data.email.lower()

    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.phone is not None:
        user.phone = data.phone.strip()
    if data.password is not None and data.password.strip():
        user.password_hash = hash_password(data.password)
    if data.is_active is not None and user_id != current_user.id:
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)

    record_audit(
        db=db,
        user=current_user,
        action="STAFF_ACCOUNT_UPDATED",
        entity_type="User",
        entity_id=user.id,
        details={"email": user.email, "name": user.full_name, "is_active": user.is_active},
        ip_address=get_client_ip(request)
    )

    return UserOut.model_validate(user)

@router.patch("/{user_id}/toggle-active", response_model=UserOut)
def toggle_user_active(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.is_active = not user.is_active
    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="STAFF_STATUS_TOGGLED",
        entity_type="User",
        entity_id=user.id,
        details={"email": user.email, "is_active": user.is_active},
        ip_address=get_client_ip(request)
    )

    db.refresh(user)
    return UserOut.model_validate(user)

@router.post("", response_model=UserOut)
def create_staff_user(
    data: StaffCreate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    allowed_roles = [UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value]
    if data.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role must be one of: {allowed_roles}"
        )

    user = User(
        email=data.email.lower(),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
        password_hash=hash_password(data.password),
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit(
        db=db,
        user=current_user,
        action="STAFF_ACCOUNT_CREATED",
        entity_type="User",
        entity_id=user.id,
        details={"email": user.email, "role": user.role, "name": user.full_name},
        ip_address=get_client_ip(request)
    )

    return UserOut.model_validate(user)
