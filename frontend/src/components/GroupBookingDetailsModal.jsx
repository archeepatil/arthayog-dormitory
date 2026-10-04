import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Calendar, 
  BedDouble, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  LogOut, 
  Trash2, 
  Phone, 
  Mail, 
  Layers, 
  DollarSign 
} from 'lucide-react';
import { api } from '../api';

export default function GroupBookingDetailsModal({ group, isOpen, onClose, onRefresh }) {
  const [currentGroup, setCurrentGroup] = useState(group);
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing state
  const [showEditSection, setShowEditSection] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState(group?.check_in_date || '');
  const [editCheckOut, setEditCheckOut] = useState(group?.check_out_date || '');
  const [floorToAdd, setFloorToAdd] = useState('');
  const [floorToRemove, setFloorToRemove] = useState('');

  // Keep currentGroup updated if prop changes
  React.useEffect(() => {
    if (group) {
      setCurrentGroup(group);
      setEditCheckIn(group.check_in_date || '');
      setEditCheckOut(group.check_out_date || '');
    }
  }, [group]);

  if (!isOpen || !currentGroup) return null;

  const handleCheckInAll = async () => {
    if (!window.confirm(`Check-in all eligible beds in group ${currentGroup.group_code}?`)) return;
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const updated = await api.bookings.checkInGroup(currentGroup.group_code);
      setCurrentGroup(updated);
      setSuccessMsg('All guests checked in successfully.');
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to check-in group.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCheckOutAll = async () => {
    if (!window.confirm(`Check-out all checked-in beds in group ${currentGroup.group_code}? This will release the beds.`)) return;
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const updated = await api.bookings.checkOutGroup(currentGroup.group_code);
      setCurrentGroup(updated);
      setSuccessMsg('All beds checked out and released.');
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to check-out group.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReleaseBed = async (bedId, bedNumber) => {
    if (!window.confirm(`Release Bed ${bedNumber} from this group? It will become immediately available for other guests.`)) return;
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const updated = await api.bookings.modifyGroup(currentGroup.group_code, { release_bed_ids: [bedId] });
      setCurrentGroup(updated);
      setSuccessMsg(`Bed ${bedNumber} released successfully. Group now has ${updated.total_beds_assigned} beds.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to release bed.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdateDates = async (e) => {
    e.preventDefault();
    if (!editCheckIn || !editCheckOut) return;
    if (editCheckOut <= editCheckIn) {
      setErrorMsg('Check-out date must be strictly after check-in date.');
      return;
    }
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const updated = await api.bookings.modifyGroup(currentGroup.group_code, {
        check_in_date: editCheckIn,
        check_out_date: editCheckOut
      });
      setCurrentGroup(updated);
      setSuccessMsg(`Stay dates successfully updated to ${editCheckIn} → ${editCheckOut}!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update stay dates. Another reservation may conflict with requested dates.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddFloor = async () => {
    if (!floorToAdd) return;
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const updated = await api.bookings.modifyGroup(currentGroup.group_code, {
        add_floors: [parseInt(floorToAdd, 10)]
      });
      setCurrentGroup(updated);
      setSuccessMsg(`Floor ${floorToAdd} added to group! Total beds assigned: ${updated.total_beds_assigned}.`);
      setFloorToAdd('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || `Failed to add Floor ${floorToAdd}.`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveFloor = async () => {
    if (!floorToRemove) return;
    if (!window.confirm(`Remove Floor ${floorToRemove} from this group? All its beds will be released.`)) return;
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const updated = await api.bookings.modifyGroup(currentGroup.group_code, {
        remove_floors: [parseInt(floorToRemove, 10)]
      });
      setCurrentGroup(updated);
      setSuccessMsg(`Floor ${floorToRemove} removed from group! Remaining beds: ${updated.total_beds_assigned}.`);
      setFloorToRemove('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || `Failed to remove Floor ${floorToRemove}.`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelGroup = async () => {
    if (!window.confirm(`Cancel entire group booking ${currentGroup.group_code}? All assigned beds will be released.`)) return;
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const updated = await api.bookings.cancelGroup(currentGroup.group_code);
      setCurrentGroup(updated);
      setSuccessMsg('Group booking cancelled and all beds released.');
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cancel group booking.');
    } finally {
      setLoadingAction(false);
    }
  };

  const unselectedFloors = [1, 2, 3].filter(f => !currentGroup.floors_selected?.includes(f));
  const selectedFloors = currentGroup.floors_selected || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window modal-wide animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="group-title-strip">
            <div className="group-icon-wrap">
              <Users size={22} color="#C25E40" />
            </div>
            <div>
              <h3>{currentGroup.event_name || 'Group / Wedding Stay'}</h3>
              <span className="code-pill">{currentGroup.group_code}</span>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="success-banner">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="group-summary-card">
          <div className="summary-field">
            <span>Primary Guest:</span>
            <strong>{currentGroup.guest_name}</strong>
          </div>
          <div className="summary-field">
            <span>Contact Phone:</span>
            <strong>{currentGroup.guest_phone}</strong>
          </div>
          <div className="summary-field">
            <span>Stay Dates:</span>
            <strong>{currentGroup.check_in_date} to {currentGroup.check_out_date} ({currentGroup.nights} Nights)</strong>
          </div>
          <div className="summary-field">
            <span>Total Group Fare:</span>
            <strong className="text-primary">₹{currentGroup.total_amount}</strong>
          </div>
          <div className="summary-field">
            <span>Advance Paid:</span>
            <strong className="text-success">₹{currentGroup.paid_amount}</strong>
          </div>
          <div className="summary-field">
            <span>Group Status:</span>
            <span className={`status-pill status-${currentGroup.status?.toLowerCase()}`}>{currentGroup.status}</span>
          </div>
        </div>

        {/* Group Edit Controls Accordion */}
        {currentGroup.status !== 'CANCELLED' && currentGroup.status !== 'CHECKED_OUT' && (
          <div className="group-edit-section card mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0 font-weight-bold" style={{ fontSize: '0.9rem', color: '#1C1917' }}>
                Group Modification & Bed Allocations
              </h5>
              <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowEditSection(!showEditSection)}
              >
                {showEditSection ? 'Hide Editing Tools' : 'Edit Dates & Floors / Beds'}
              </button>
            </div>

            {showEditSection && (
              <div className="edit-controls-body pt-2" style={{ borderTop: '1px solid #EAE8E3' }}>
                <div className="row g-2 mb-3">
                  {/* Change Dates Form */}
                  <form onSubmit={handleUpdateDates} className="d-flex gap-2 align-items-end flex-wrap mb-2">
                    <div style={{ flex: '1 1 140px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78716C' }}>Change Check-In</label>
                      <input 
                        type="date" 
                        className="form-control form-control-sm"
                        value={editCheckIn}
                        onChange={(e) => setEditCheckIn(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78716C' }}>Change Check-Out</label>
                      <input 
                        type="date" 
                        className="form-control form-control-sm"
                        value={editCheckOut}
                        onChange={(e) => setEditCheckOut(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={loadingAction} style={{ height: '31px' }}>
                      Update Dates
                    </button>
                  </form>
                </div>

                <div className="d-flex gap-3 flex-wrap">
                  {/* Add Floor */}
                  {unselectedFloors.length > 0 && (
                    <div className="d-flex gap-1 align-items-center">
                      <select 
                        className="form-select form-select-sm" 
                        value={floorToAdd} 
                        onChange={(e) => setFloorToAdd(e.target.value)}
                        style={{ width: '150px' }}
                      >
                        <option value="">Select Floor...</option>
                        {unselectedFloors.map(f => (
                          <option key={f} value={f}>Floor {f} ({f === 2 ? '6' : '5'} Beds)</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        className="btn btn-outline-primary btn-sm" 
                        onClick={handleAddFloor}
                        disabled={!floorToAdd || loadingAction}
                      >
                        Add Floor
                      </button>
                    </div>
                  )}

                  {/* Remove Floor */}
                  {selectedFloors.length > 1 && (
                    <div className="d-flex gap-1 align-items-center">
                      <select 
                        className="form-select form-select-sm" 
                        value={floorToRemove} 
                        onChange={(e) => setFloorToRemove(e.target.value)}
                        style={{ width: '150px' }}
                      >
                        <option value="">Select Floor to Remove...</option>
                        {selectedFloors.map(f => (
                          <option key={f} value={f}>Floor {f}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        className="btn btn-outline-danger btn-sm" 
                        onClick={handleRemoveFloor}
                        disabled={!floorToRemove || loadingAction}
                      >
                        Remove Floor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="assigned-beds-container">
          <div className="assigned-beds-header">
            <h4>Assigned Beds in Group ({currentGroup.assigned_beds?.length || 0})</h4>
            <span className="info-sub">Floors: {currentGroup.floors_selected?.join(', ')}</span>
          </div>

          <div className="beds-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bed Number</th>
                  <th>Floor</th>
                  <th>Rate</th>
                  <th>Status</th>
                  <th>Individual Action</th>
                </tr>
              </thead>
              <tbody>
                {currentGroup.assigned_beds?.map((b) => (
                  <tr key={b.booking_id}>
                    <td>
                      <strong>Bed {b.bed_number}</strong>
                      <small className="d-block text-secondary">{b.booking_code}</small>
                    </td>
                    <td>Floor {b.floor_number}</td>
                    <td>₹{b.total_amount}</td>
                    <td>
                      <span className={`status-badge status-${b.status?.toLowerCase()}`}>{b.status}</span>
                    </td>
                    <td>
                      {b.status !== 'CANCELLED' && b.status !== 'CHECKED_OUT' && (
                        <button
                          type="button"
                          className="btn-text-danger"
                          onClick={() => handleReleaseBed(b.bed_id, b.bed_number)}
                          disabled={loadingAction}
                        >
                          Release Bed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-actions-bar">
          <div className="left-actions">
            {currentGroup.status !== 'CANCELLED' && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleCancelGroup}
                disabled={loadingAction}
              >
                Cancel Entire Group
              </button>
            )}
          </div>
          <div className="right-actions">
            {currentGroup.status !== 'CHECKED_IN' && currentGroup.status !== 'CHECKED_OUT' && currentGroup.status !== 'CANCELLED' && (
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={handleCheckInAll}
                disabled={loadingAction}
              >
                <UserCheck size={15} /> Check-In All Beds
              </button>
            )}
            {currentGroup.status === 'CHECKED_IN' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCheckOutAll}
                disabled={loadingAction}
              >
                <LogOut size={15} /> Check-Out All Beds
              </button>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <style>{`
          .group-title-strip {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .group-icon-wrap {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: rgba(194, 94, 64, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .code-pill {
            font-family: monospace;
            font-size: 0.8rem;
            color: var(--primary);
            background: #FAF4EF;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
          }
          .group-summary-card {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            background: var(--bg-primary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 14px 16px;
            margin: 12px 0 16px 0;
          }
          .summary-field {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .summary-field span {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
          }
          .summary-field strong {
            font-size: 0.92rem;
          }
          .assigned-beds-container {
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            background: #FFFFFF;
            overflow: hidden;
            margin-bottom: 16px;
          }
          .assigned-beds-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #FAF8F5;
            border-bottom: 1px solid var(--border-subtle);
          }
          .assigned-beds-header h4 {
            margin: 0;
            font-size: 0.92rem;
            font-weight: 600;
          }
          .info-sub {
            font-size: 0.8rem;
            color: var(--text-secondary);
          }
          .beds-table-wrapper {
            max-height: 260px;
            overflow-y: auto;
          }
          .btn-text-danger {
            background: none;
            border: none;
            color: #DC2626;
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            padding: 2px 6px;
          }
          .btn-text-danger:hover {
            text-decoration: underline;
          }
          .modal-actions-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 12px;
            border-top: 1px solid var(--border-subtle);
          }
          .right-actions {
            display: flex;
            gap: 8px;
          }
        `}</style>
      </div>
    </div>
  );
}
