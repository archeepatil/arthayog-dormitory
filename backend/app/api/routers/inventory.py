from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_role, get_client_ip
from app.models import InventoryItem, InventoryTransaction, User, UserRole
from app.schemas import (
    InventoryItemOut, InventoryItemCreate, InventoryItemUpdate,
    InventoryTransactionCreate, InventoryTransactionOut
)
from app.core.audit import record_audit

router = APIRouter(prefix="/inventory", tags=["Inventory & Supplies"])

def enrich_item(item: InventoryItem) -> InventoryItemOut:
    return InventoryItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        unit=item.unit,
        current_quantity=item.current_quantity,
        min_threshold=item.min_threshold,
        unit_cost=item.unit_cost,
        is_low_stock=(item.current_quantity <= item.min_threshold),
        updated_at=item.updated_at
    )

@router.get("", response_model=List[InventoryItemOut])
def list_inventory(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    items = db.query(InventoryItem).order_by(InventoryItem.category, InventoryItem.name).all()
    return [enrich_item(item) for item in items]

@router.get("/alerts", response_model=List[InventoryItemOut])
def get_low_stock_alerts(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    items = db.query(InventoryItem).filter(InventoryItem.current_quantity <= InventoryItem.min_threshold).all()
    return [enrich_item(item) for item in items]

@router.post("", response_model=InventoryItemOut)
def create_inventory_item(
    data: InventoryItemCreate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    existing = db.query(InventoryItem).filter(InventoryItem.name.ilike(data.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item already exists in inventory.")

    item = InventoryItem(
        name=data.name,
        category=data.category,
        unit=data.unit,
        current_quantity=data.current_quantity,
        min_threshold=data.min_threshold,
        unit_cost=data.unit_cost
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    record_audit(
        db=db,
        user=current_user,
        action="INVENTORY_ITEM_CREATED",
        entity_type="InventoryItem",
        entity_id=item.id,
        details={"name": item.name, "category": item.category, "quantity": item.current_quantity},
        ip_address=get_client_ip(request)
    )

    return enrich_item(item)

@router.put("/{item_id}", response_model=InventoryItemOut)
def update_inventory_item(
    item_id: int,
    data: InventoryItemUpdate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found.")

    if data.name is not None and data.name.strip():
        name_clean = data.name.strip()
        existing = db.query(InventoryItem).filter(InventoryItem.name.ilike(name_clean), InventoryItem.id != item_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Another item with this name already exists.")
        item.name = name_clean

    if data.category is not None:
        item.category = data.category.strip()
    if data.unit is not None:
        item.unit = data.unit.strip()
    if data.current_quantity is not None:
        item.current_quantity = data.current_quantity
    if data.min_threshold is not None:
        item.min_threshold = data.min_threshold
    if data.unit_cost is not None:
        item.unit_cost = data.unit_cost

    db.commit()
    db.refresh(item)

    record_audit(
        db=db,
        user=current_user,
        action="INVENTORY_ITEM_UPDATED",
        entity_type="InventoryItem",
        entity_id=item.id,
        details={"name": item.name, "category": item.category, "quantity": item.current_quantity},
        ip_address=get_client_ip(request)
    )

    return enrich_item(item)

@router.delete("/{item_id}")
def delete_inventory_item(
    item_id: int,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found.")

    item_name = item.name
    # Delete related transactions
    db.query(InventoryTransaction).filter(InventoryTransaction.item_id == item_id).delete()
    db.delete(item)
    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action="INVENTORY_ITEM_DELETED",
        entity_type="InventoryItem",
        entity_id=item_id,
        details={"name": item_name},
        ip_address=get_client_ip(request)
    )

    return {"message": f"Inventory item '{item_name}' removed successfully."}

@router.post("/transaction", response_model=InventoryTransactionOut)
def record_inventory_transaction(
    data: InventoryTransactionCreate,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == data.item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found.")

    change_type = data.change_type.upper()
    qty = data.quantity

    if change_type == "USAGE":
        # Usages reduce stock
        if qty <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usage quantity must be positive.")
        if item.current_quantity < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock! Available: {item.current_quantity} {item.unit}, Requested: {qty} {item.unit}."
            )
        item.current_quantity -= qty
        signed_qty = -qty
    elif change_type == "PURCHASE":
        if qty <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase quantity must be positive.")
        item.current_quantity += qty
        if data.unit_cost and data.unit_cost > 0:
            item.unit_cost = data.unit_cost
        signed_qty = qty
    elif change_type == "ADJUSTMENT":
        item.current_quantity += qty
        signed_qty = qty
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid change_type.")

    tx = InventoryTransaction(
        item_id=item.id,
        change_type=change_type,
        quantity=signed_qty,
        unit_cost=data.unit_cost or item.unit_cost,
        performed_by_id=current_user.id,
        notes=data.notes
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    record_audit(
        db=db,
        user=current_user,
        action=f"INVENTORY_{change_type}",
        entity_type="InventoryItem",
        entity_id=item.id,
        details={
            "item_name": item.name,
            "quantity_delta": signed_qty,
            "remaining_quantity": item.current_quantity,
            "notes": data.notes
        },
        ip_address=get_client_ip(request)
    )

    return InventoryTransactionOut(
        id=tx.id,
        item_id=tx.item_id,
        item_name=item.name,
        change_type=tx.change_type,
        quantity=tx.quantity,
        unit_cost=tx.unit_cost,
        performed_by_name=current_user.full_name,
        notes=tx.notes,
        created_at=tx.created_at
    )

@router.get("/transactions", response_model=List[InventoryTransactionOut])
def list_transactions(
    current_user: User = Depends(require_role([UserRole.OWNER_ADMIN.value, UserRole.STAFF_EMPLOYEE.value])),
    db: Session = Depends(get_db)
):
    txs = db.query(InventoryTransaction).order_by(InventoryTransaction.created_at.desc()).limit(100).all()
    results = []
    for t in txs:
        results.append(InventoryTransactionOut(
            id=t.id,
            item_id=t.item_id,
            item_name=t.item.name if t.item else None,
            change_type=t.change_type,
            quantity=t.quantity,
            unit_cost=t.unit_cost,
            performed_by_name=t.performed_by.full_name if t.performed_by else None,
            notes=t.notes,
            created_at=t.created_at
        ))
    return results
