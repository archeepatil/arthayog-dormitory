import React, { useState } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Minus, 
  History, 
  CheckCircle2, 
  ShoppingBag,
  IndianRupee,
  Layers,
  X,
  Edit2,
  Trash2,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function InventoryView({ 
  inventory = [], 
  transactions = [], 
  loading, 
  user,
  onRecordTransaction, 
  onRefresh,
  onShowToast
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null means adding new item

  // Transaction form state
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState('USAGE'); // 'USAGE' or 'PURCHASE'
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');

  // Item Form state
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'LINEN',
    unit: 'Pieces',
    current_quantity: 10,
    min_threshold: 5,
    unit_cost: 0.0
  });

  const isOwner = user?.role === 'OWNER_ADMIN';

  // Derived metrics from real DB
  const lowStockCount = inventory.filter(i => (i.current_quantity ?? i.current_stock) <= (i.min_threshold ?? i.minimum_stock_threshold)).length;
  const totalStockUnits = inventory.reduce((acc, i) => acc + (i.current_quantity ?? i.current_stock ?? 0), 0);
  
  const totalPurchasedUnits = transactions
    .filter(t => t.change_type === 'PURCHASE')
    .reduce((acc, t) => acc + Math.abs(t.quantity), 0);

  const totalUsedUnits = transactions
    .filter(t => t.change_type === 'USAGE')
    .reduce((acc, t) => acc + Math.abs(t.quantity), 0);

  // Categories present in inventory
  const categories = ['ALL', ...new Set(inventory.map(i => i.category).filter(Boolean))];

  // Filtering
  const filteredItems = inventory.filter(item => {
    const itemName = (item.name || item.item_name || '').toLowerCase();
    const itemCat = (item.category || '').toUpperCase();
    const matchesSearch = !searchQuery.trim() || itemName.includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || itemCat === selectedCategory.toUpperCase();
    return matchesSearch && matchesCat;
  });

  // Action handlers
  const handleOpenTransaction = (item, type) => {
    setSelectedItem(item);
    setActionType(type);
    setQuantity(1);
    setUnitCost(type === 'PURCHASE' ? (item.unit_cost || '') : '');
    setNotes('');
    setTxModalOpen(true);
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await onRecordTransaction({
        item_id: selectedItem.id,
        change_type: actionType,
        quantity: parseInt(quantity, 10),
        unit_cost: unitCost ? parseFloat(unitCost) : null,
        notes: notes || undefined
      });
      setTxModalOpen(false);
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    }
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      category: 'LINEN',
      unit: 'Pieces',
      current_quantity: 10,
      min_threshold: 5,
      unit_cost: 0.0
    });
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name || item.item_name || '',
      category: item.category || 'LINEN',
      unit: item.unit || 'Pieces',
      current_quantity: item.current_quantity ?? item.current_stock ?? 0,
      min_threshold: item.min_threshold ?? item.minimum_stock_threshold ?? 5,
      unit_cost: item.unit_cost || 0.0
    });
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;

    try {
      if (editingItem) {
        // Edit existing
        await api.inventory.update(editingItem.id, {
          name: itemForm.name.trim(),
          category: itemForm.category.trim(),
          unit: itemForm.unit.trim(),
          current_quantity: parseInt(itemForm.current_quantity, 10),
          min_threshold: parseInt(itemForm.min_threshold, 10),
          unit_cost: parseFloat(itemForm.unit_cost) || 0.0
        });
        if (onShowToast) onShowToast(`Inventory item '${itemForm.name}' updated!`, 'success');
      } else {
        // Create new
        await api.inventory.create({
          name: itemForm.name.trim(),
          category: itemForm.category.trim(),
          unit: itemForm.unit.trim(),
          current_quantity: parseInt(itemForm.current_quantity, 10),
          min_threshold: parseInt(itemForm.min_threshold, 10),
          unit_cost: parseFloat(itemForm.unit_cost) || 0.0
        });
        if (onShowToast) onShowToast(`New inventory item '${itemForm.name}' added to database!`, 'success');
      }
      setItemModalOpen(false);
      onRefresh();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Operation failed.', 'error');
    }
  };

  const handleDeleteItem = async (item) => {
    const itemName = item.name || item.item_name;
    const ok = window.confirm(`Are you sure you want to permanently delete '${itemName}' from inventory?`);
    if (!ok) return;

    try {
      await api.inventory.delete(item.id);
      if (onShowToast) onShowToast(`Item '${itemName}' removed.`, 'info');
      onRefresh();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to delete item.', 'error');
    }
  };

  return (
    <div className="inventory-module animate-fade-in">
      {/* Header */}
      <div className="card inv-header-card">
        <div className="inv-header-left">
          <span className="badge badge-accent">{t('inv_badge', 'Owner Customizable Supplies')}</span>
          <h2>{t('inv_title', 'Dormitory Inventory Management')}</h2>
          <p className="subtitle">
            {t('inv_sub', 'Track real stock, record purchases, log staff daily usage & set low-stock reorder points')}
          </p>
        </div>
        <div className="inv-header-actions">
          {isOwner && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddItem}>
              <Plus size={14} /> {t('btn_add_item', 'Add Inventory Item')}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={loading}>
            {t('refresh_btn', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Real Database Telemetry Strip */}
      <div className="inv-stats-row">
        <div className="card inv-stat-card">
          <span className="stat-lbl">{t('inv_total_items', 'Active Items')}</span>
          <div className="stat-val">{inventory.length}</div>
          <span className="stat-sub">{t('tracked_in_db', 'Tracked in DB')}</span>
        </div>

        <div className="card inv-stat-card">
          <span className="stat-lbl">{t('inv_total_units', 'Current Stock')}</span>
          <div className="stat-val text-success">{totalStockUnits}</div>
          <span className="stat-sub">{t('remaining_units', 'Remaining Total Units')}</span>
        </div>

        <div className="card inv-stat-card">
          <span className="stat-lbl">{t('btn_record_purchase', 'Purchased')}</span>
          <div className="stat-val text-primary">+{totalPurchasedUnits}</div>
          <span className="stat-sub">{t('logged_restocks', 'Logged Restocks')}</span>
        </div>

        <div className="card inv-stat-card">
          <span className="stat-lbl">{t('btn_record_usage', 'Used')}</span>
          <div className="stat-val text-muted">-{totalUsedUnits}</div>
          <span className="stat-sub">{t('issued_to_guests', 'Issued to Guests')}</span>
        </div>

        <div className={`card inv-stat-card ${lowStockCount > 0 ? 'alert' : ''}`}>
          <span className="stat-lbl">{t('inv_low_stock', 'Low Stock')}</span>
          <div className={`stat-val ${lowStockCount > 0 ? 'text-danger' : 'text-success'}`}>
            {lowStockCount}
          </div>
          <span className="stat-sub">{t('items_need_reorder', 'Below Reorder Level')}</span>
        </div>
      </div>

      {/* Low Stock Banner Alert */}
      {lowStockCount > 0 && (
        <div className="card low-stock-banner animate-fade-in">
          <AlertTriangle size={20} color="#B91C1C" />
          <div className="banner-text">
            <strong>{lowStockCount} {t('low_stock_alerts', 'items need reorder!')}</strong>
            <span>{t('restock_required_sub', 'Restock required to maintain bed turnaround readiness for incoming guests.')}</span>
          </div>
        </div>
      )}

      {/* Sub Tabs: Stock vs History */}
      <div className="card inv-nav-card">
        <div className="inv-tabs-left">
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            <Package size={15} /> {t('inv_tab_items', 'Current Stock')} ({filteredItems.length})
          </button>
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={15} /> {t('inv_tab_history', 'Transaction History')} ({transactions.length})
          </button>
        </div>

        {activeTab === 'items' && (
          <div className="inv-filters-right">
            <div className="search-field">
              <Search size={14} />
              <input 
                type="text" 
                placeholder={t('inv_search_ph', 'Search supplies...')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="cat-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? t('filter_all', 'All Categories') : c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: ITEMS GRID */}
      {activeTab === 'items' && (
        <div className="inv-grid">
          {filteredItems.length === 0 ? (
            <div className="card empty-panel">
              <Package size={36} color="#A8A29E" />
              <p>{t('no_items_found', 'No inventory items found matching your filter.')}</p>
              {isOwner && (
                <button className="btn btn-primary btn-sm" onClick={handleOpenAddItem} style={{ marginTop: '12px' }}>
                  <Plus size={14} /> {t('btn_add_item', 'Add First Item')}
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const currentQty = item.current_quantity ?? item.current_stock ?? 0;
              const threshold = item.min_threshold ?? item.minimum_stock_threshold ?? 5;
              const isLow = currentQty <= threshold;
              const itemName = item.name || item.item_name;

              return (
                <div key={item.id} className={`card inv-card ${isLow ? 'is-low' : ''}`}>
                  <div className="inv-card-header">
                    <div>
                      <span className="cat-pill">{item.category}</span>
                      <h4 className="item-title">{itemName}</h4>
                    </div>
                    <div className={`stock-status-pill ${isLow ? 'low' : 'ok'}`}>
                      <span className="qty-num">{currentQty}</span>
                      <span className="qty-unit">{item.unit}</span>
                    </div>
                  </div>

                  <div className="inv-card-metrics">
                    <div className="metric-box">
                      <span className="lbl">{t('inv_col_min', 'Min Threshold')}</span>
                      <span className="val">{threshold} {item.unit}</span>
                    </div>
                    {item.unit_cost > 0 && (
                      <div className="metric-box">
                        <span className="lbl">{t('inv_col_cost', 'Unit Cost')}</span>
                        <span className="val">₹{item.unit_cost}</span>
                      </div>
                    )}
                    <div className="metric-box">
                      <span className="lbl">{t('col_status', 'Status')}</span>
                      <span className={`val-status ${isLow ? 'text-danger' : 'text-success'}`}>
                        {isLow ? `⚠️ ${t('inv_low_stock', 'Low Stock')}` : `✓ ${t('status_normal', 'Normal')}`}
                      </span>
                    </div>
                  </div>

                  {/* Operational Usage & Purchase Buttons */}
                  <div className="inv-card-actions">
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenTransaction(item, 'USAGE')}
                      title="Record usage"
                    >
                      <Minus size={13} /> {t('inv_action_consume', 'Deduct Used')}
                    </button>
                    <button 
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenTransaction(item, 'PURCHASE')}
                      title="Record purchase/restock"
                    >
                      <Plus size={13} /> {t('inv_action_restock', 'Restock')}
                    </button>

                    {isOwner && (
                      <div className="owner-card-btns">
                        <button 
                          type="button"
                          className="btn btn-ghost btn-sm icon-btn"
                          onClick={() => handleOpenEditItem(item)}
                          title="Edit Item Details"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          type="button"
                          className="btn btn-ghost btn-sm icon-btn text-danger"
                          onClick={() => handleDeleteItem(item)}
                          title="Delete Item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: TRANSACTIONS HISTORY */}
      {activeTab === 'history' && (
        <div className="card table-container">
          {transactions.length === 0 ? (
            <div className="empty-panel">
              <History size={36} color="#A8A29E" />
              <p>{t('no_transactions', 'No inventory transactions recorded yet.')}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="hospitality-table">
                <thead>
                  <tr>
                    <th>{t('col_timestamp', 'Timestamp')}</th>
                    <th>{t('inv_col_item', 'Supply Item')}</th>
                    <th>{t('col_action', 'Action')}</th>
                    <th>{t('quantity', 'Quantity')}</th>
                    <th>{t('inv_col_cost', 'Unit Cost')}</th>
                    <th>{t('col_user', 'Logged By')}</th>
                    <th>{t('notes', 'Notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleString()}</td>
                      <td><strong>{tx.item_name || `Item #${tx.item_id}`}</strong></td>
                      <td>
                        <span className={`badge ${tx.change_type === 'PURCHASE' ? 'badge-confirmed' : 'badge-occupied'}`}>
                          {tx.change_type === 'PURCHASE' ? `+ ${t('btn_record_purchase', 'PURCHASE')}` : `- ${t('btn_record_usage', 'USAGE')}`}
                        </span>
                      </td>
                      <td>
                        <strong>{tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}</strong>
                      </td>
                      <td>{tx.unit_cost ? `₹${tx.unit_cost}` : '—'}</td>
                      <td>{tx.performed_by_name || 'Staff'}</td>
                      <td>{tx.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TRANSACTION MODAL (PURCHASE OR USAGE) */}
      {txModalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setTxModalOpen(false)}>
          <div className="modal-card inv-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{actionType === 'USAGE' ? 'Record Supply Usage' : 'Record Supply Purchase / Restock'}</h3>
              <button type="button" className="btn btn-ghost btn-sm modal-close-btn" onClick={() => setTxModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitTransaction} className="modal-body form-layout">
              <div className="form-group">
                <label className="form-label">Supply Item</label>
                <div className="static-field">
                  <strong>{selectedItem?.name || selectedItem?.item_name}</strong> — Current: {selectedItem?.current_quantity ?? selectedItem?.current_stock} {selectedItem?.unit}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity to {actionType === 'USAGE' ? 'Deduct' : 'Add'} ({selectedItem?.unit}) *</label>
                <input 
                  type="number" 
                  min="1" 
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  className="form-input" 
                  required 
                />
              </div>

              {actionType === 'PURCHASE' && (
                <div className="form-group">
                  <label className="form-label">Unit Cost (₹ INR)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={unitCost} 
                    onChange={e => setUnitCost(e.target.value)} 
                    className="form-input" 
                    placeholder="e.g. 25.00"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Context / Notes</label>
                <input 
                  type="text" 
                  placeholder={actionType === 'USAGE' ? 'e.g. 4 towels issued to Floor 1' : 'e.g. 20 water jars delivered by vendor'} 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="modal-actions-right">
                <button type="button" className="btn btn-secondary" onClick={() => setTxModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm {actionType === 'USAGE' ? 'Usage' : 'Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT ITEM MODAL (OWNER ONLY) */}
      {itemModalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setItemModalOpen(false)}>
          <div className="modal-card inv-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h3>
              <button type="button" className="btn btn-ghost btn-sm modal-close-btn" onClick={() => setItemModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="modal-body form-layout">
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Premium White Towels, Bath Soap, Mineral Water"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. LINEN, TOILETRIES, BEVERAGE, CLEANING"
                    value={itemForm.category}
                    onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit of Measure *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Pieces, Bars, Bottles, Liters"
                    value={itemForm.unit}
                    onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Current Stock *</label>
                  <input 
                    type="number" 
                    min="0"
                    className="form-input"
                    value={itemForm.current_quantity}
                    onChange={e => setItemForm({ ...itemForm, current_quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Threshold *</label>
                  <input 
                    type="number" 
                    min="1"
                    className="form-input"
                    value={itemForm.min_threshold}
                    onChange={e => setItemForm({ ...itemForm, min_threshold: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Cost (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input"
                    value={itemForm.unit_cost}
                    onChange={e => setItemForm({ ...itemForm, unit_cost: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-right">
                <button type="button" className="btn btn-secondary" onClick={() => setItemModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .inventory-module {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .inv-header-card {
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          flex-wrap: wrap;
          gap: 16px;
        }
        .inv-header-left h2 {
          font-family: var(--font-serif);
          font-size: 1.55rem;
          color: var(--text-main);
          margin-top: 4px;
        }
        .inv-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .inv-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 14px;
        }
        .inv-stat-card {
          padding: 16px 20px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-md);
        }
        .inv-stat-card.alert {
          border-color: #FECACA;
          background: #FEF2F2;
        }
        .stat-lbl {
          font-size: 0.72rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-muted);
        }
        .stat-val {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.2;
          margin: 4px 0 2px;
        }
        .stat-sub {
          font-size: 0.72rem;
          color: var(--text-dim);
        }
        .low-stock-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          color: #991B1B;
          font-size: 0.88rem;
        }
        .banner-text {
          display: flex;
          flex-direction: column;
        }
        .inv-nav-card {
          padding: 12px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          flex-wrap: wrap;
          gap: 14px;
        }
        .inv-tabs-left {
          display: flex;
          gap: 8px;
        }
        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text-muted);
          transition: var(--transition);
        }
        .tab-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-main);
        }
        .tab-btn.active {
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid var(--primary-border);
        }
        .inv-filters-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .search-field {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }
        .search-field input {
          border: none;
          background: transparent;
          font-size: 0.84rem;
          outline: none;
          width: 160px;
        }
        .cat-select {
          padding: 6px 10px;
          font-size: 0.84rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-strong);
          background: #FFFFFF;
          outline: none;
        }
        .inv-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 16px;
        }
        .inv-card {
          padding: 20px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: var(--transition);
        }
        .inv-card.is-low {
          border-color: #FED7AA;
          background: #FFFDF9;
        }
        .inv-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .cat-pill {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-dim);
          letter-spacing: 0.5px;
        }
        .item-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 2px;
        }
        .stock-status-pill {
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .stock-status-pill.ok {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .stock-status-pill.low {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }
        .qty-num {
          font-size: 1.35rem;
          font-weight: 800;
          line-height: 1;
        }
        .qty-unit {
          font-size: 0.72rem;
          font-weight: 600;
        }
        .inv-card-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: var(--bg-secondary);
          padding: 10px 12px;
          border-radius: var(--radius-sm);
        }
        .metric-box {
          display: flex;
          flex-direction: column;
        }
        .metric-box .lbl {
          font-size: 0.68rem;
          color: var(--text-dim);
          text-transform: uppercase;
          font-weight: 600;
        }
        .metric-box .val {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .metric-box .val-status {
          font-size: 0.8rem;
          font-weight: 700;
        }
        .inv-card-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: auto;
        }
        .owner-card-btns {
          margin-left: auto;
          display: flex;
          gap: 4px;
        }
        .icon-btn {
          padding: 6px;
        }
        .empty-panel {
          grid-column: 1 / -1;
          padding: 48px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--text-muted);
        }
        .static-field {
          padding: 8px 12px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
        }
        .modal-actions-right {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }
      `}</style>
    </div>
  );
}
