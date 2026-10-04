from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_role, get_client_ip
from app.models import StaffTask, TaskStatus, Bed, User, UserRole
from app.schemas import StaffTaskCreate, StaffTaskUpdate, StaffTaskOut
from app.core.audit import record_audit

router = APIRouter(prefix="/tasks", tags=["Staff Tasks"])

def enrich_task(t: StaffTask) -> StaffTaskOut:
    return StaffTaskOut(
        id=t.id,
        title=t.title,
        task_type=t.task_type,
        bed_id=t.bed_id,
        bed_number=t.bed.bed_number if t.bed else None,
        assigned_to_id=t.assigned_to_id,
        assigned_to_name=t.assignee.full_name if t.assignee else None,
        created_by_name=t.creator.full_name if t.creator else None,
        status=t.status,
        due_date=t.due_date,
        completed_at=t.completed_at,
        notes=t.notes,
        created_at=t.created_at
    )

@router.get("", response_model=List[StaffTaskOut])
def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_to_me: Optional[bool] = Query(False),
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    query = db.query(StaffTask)
    if status_filter:
        query = query.filter(StaffTask.status == status_filter)
    if assigned_to_me:
        query = query.filter(StaffTask.assigned_to_id == current_user.id)
    tasks = query.order_by(StaffTask.created_at.desc()).all()
    return [enrich_task(t) for t in tasks]

@router.post("", response_model=StaffTaskOut)
def create_task(
    data: StaffTaskCreate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    task = StaffTask(
        title=data.title,
        task_type=data.task_type,
        bed_id=data.bed_id,
        assigned_to_id=data.assigned_to_id,
        created_by_id=current_user.id,
        due_date=data.due_date,
        notes=data.notes,
        status=TaskStatus.PENDING.value
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    record_audit(
        db=db,
        user=current_user,
        action="STAFF_TASK_CREATED",
        entity_type="StaffTask",
        entity_id=task.id,
        details={"title": task.title, "task_type": task.task_type},
        ip_address=get_client_ip(request)
    )

    return enrich_task(task)

@router.patch("/{task_id}", response_model=StaffTaskOut)
def update_task(
    task_id: int,
    data: StaffTaskUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    task = db.query(StaffTask).filter(StaffTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    if data.assigned_to_id is not None:
        task.assigned_to_id = data.assigned_to_id
    if data.notes is not None:
        task.notes = data.notes

    if data.status:
        task.status = data.status
        if data.status == TaskStatus.COMPLETED.value:
            task.completed_at = datetime.now(timezone.utc)

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="STAFF_TASK_UPDATED",
        entity_type="StaffTask",
        entity_id=task.id,
        details={"status": task.status, "completed_at": str(task.completed_at)},
        ip_address=get_client_ip(request)
    )

    db.refresh(task)
    return enrich_task(task)
