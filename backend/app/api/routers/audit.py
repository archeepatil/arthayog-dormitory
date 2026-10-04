from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_role
from app.models import AuditLog, User, UserRole
from app.schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["Audit Logging"])

@router.get("", response_model=List[AuditLogOut])
def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_email: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_email:
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [AuditLogOut.model_validate(log) for log in logs]
