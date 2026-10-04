from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_role, get_client_ip
from app.models import MaintenanceTicket, MaintenanceStatus, Bed, BedStatus, User, UserRole
from app.schemas import MaintenanceTicketCreate, MaintenanceTicketUpdate, MaintenanceTicketOut
from app.core.audit import record_audit

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

def enrich_ticket(t: MaintenanceTicket) -> MaintenanceTicketOut:
    return MaintenanceTicketOut(
        id=t.id,
        title=t.title,
        category=t.category,
        bed_id=t.bed_id,
        bed_number=t.bed.bed_number if t.bed else None,
        priority=t.priority,
        status=t.status,
        description=t.description,
        reported_by_id=t.reported_by_id,
        reported_by_name=t.reported_by.full_name if t.reported_by else None,
        assigned_to_id=t.assigned_to_id,
        assigned_to_name=t.assigned_to.full_name if t.assigned_to else None,
        resolution_notes=t.resolution_notes,
        created_at=t.created_at,
        resolved_at=t.resolved_at
    )

@router.get("", response_model=List[MaintenanceTicketOut])
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    query = db.query(MaintenanceTicket)
    if status_filter:
        query = query.filter(MaintenanceTicket.status == status_filter)
    tickets = query.order_by(MaintenanceTicket.created_at.desc()).all()
    return [enrich_ticket(t) for t in tickets]

@router.post("", response_model=MaintenanceTicketOut)
def create_ticket(
    data: MaintenanceTicketCreate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    bed = None
    if data.bed_id:
        bed = db.query(Bed).filter(Bed.id == data.bed_id).first()
        if not bed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found.")
        # Unavailable beds/equipment must not be offered
        bed.status = BedStatus.MAINTENANCE.value

    ticket = MaintenanceTicket(
        title=data.title,
        category=data.category,
        bed_id=data.bed_id,
        priority=data.priority,
        status=MaintenanceStatus.OPEN.value,
        description=data.description,
        reported_by_id=current_user.id,
        assigned_to_id=data.assigned_to_id
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    record_audit(
        db=db,
        user=current_user,
        action="MAINTENANCE_TICKET_CREATED",
        entity_type="MaintenanceTicket",
        entity_id=ticket.id,
        details={
            "title": ticket.title,
            "category": ticket.category,
            "bed_number": bed.bed_number if bed else None,
            "priority": ticket.priority
        },
        ip_address=get_client_ip(request)
    )

    return enrich_ticket(ticket)

@router.patch("/{ticket_id}", response_model=MaintenanceTicketOut)
def update_ticket(
    ticket_id: int,
    data: MaintenanceTicketUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    if data.priority:
        ticket.priority = data.priority
    if data.assigned_to_id is not None:
        ticket.assigned_to_id = data.assigned_to_id
    if data.resolution_notes is not None:
        ticket.resolution_notes = data.resolution_notes

    if data.status:
        ticket.status = data.status
        if data.status == MaintenanceStatus.RESOLVED.value:
            ticket.resolved_at = datetime.now(timezone.utc)
            # If a bed was in MAINTENANCE, restore it to CLEANING_REQUIRED or AVAILABLE
            if ticket.bed_id:
                bed = db.query(Bed).filter(Bed.id == ticket.bed_id).first()
                if bed and bed.status == BedStatus.MAINTENANCE.value:
                    bed.status = BedStatus.CLEANING_REQUIRED.value

    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="MAINTENANCE_TICKET_UPDATED",
        entity_type="MaintenanceTicket",
        entity_id=ticket.id,
        details={
            "status": ticket.status,
            "priority": ticket.priority,
            "resolution_notes": ticket.resolution_notes
        },
        ip_address=get_client_ip(request)
    )

    db.refresh(ticket)
    return enrich_ticket(ticket)
