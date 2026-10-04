import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models import AuditLog, User

def record_audit(
    db: Session,
    user: Optional[User],
    action: str,
    entity_type: str,
    entity_id: Optional[str | int] = None,
    details: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Persists an immutable audit log entry.
    Ensures passwords, tokens, and payment secrets are filtered out.
    """
    user_id = user.id if user else None
    user_email = user.email if user else "system@arthayog.internal"
    user_role = user.role if user else "SYSTEM"

    clean_details = None
    if details:
        # Sanitize sensitive fields
        sanitized = {}
        for k, v in details.items():
            if any(secret_term in k.lower() for secret_term in ["password", "token", "secret", "cvv", "key"]):
                sanitized[k] = "***REDACTED***"
            else:
                sanitized[k] = str(v) if isinstance(v, (datetime_check := object)) else v
        clean_details = json.dumps(sanitized)

    log_entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details_json=clean_details,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
