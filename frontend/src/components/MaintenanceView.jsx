import React, { useState } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ShieldAlert,
  User,
  X
} from 'lucide-react';

export default function MaintenanceView({ 
  tickets, 
  beds, 
  loading, 
  onCreateTicket, 
  onUpdateTicket, 
  onRefresh 
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('BED_EQUIPMENT');
  const [bedId, setBedId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    await onCreateTicket({
      title,
      category,
      bed_id: bedId ? parseInt(bedId) : null,
      priority,
      description
    });
    setModalOpen(false);
    setTitle('');
    setDescription('');
    setBedId('');
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    await onUpdateTicket(selectedTicket.id, {
      status: 'RESOLVED',
      resolution_notes: resolutionNotes
    });
    setResolveModalOpen(false);
    setSelectedTicket(null);
    setResolutionNotes('');
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="badge badge-maintenance"><AlertTriangle size={12} /> CRITICAL</span>;
      case 'HIGH':
        return <span className="badge badge-maintenance">HIGH</span>;
      case 'MEDIUM':
        return <span className="badge badge-pending">MEDIUM</span>;
      case 'LOW':
        return <span className="badge">LOW</span>;
      default:
        return <span className="badge">{p}</span>;
    }
  };

  return (
    <div className="maintenance-view animate-fade-in">
      <div className="card maint-header-card">
        <div>
          <span className="badge badge-accent">Facilities & Asset Health</span>
          <h2>Property Maintenance & Repair Tickets</h2>
          <p className="subtitle">
            Report issues, lock defective beds out of reservation engine, and track resolution
          </p>
        </div>
        <div className="maint-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Report Issue
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card loading-card">
          <p>Loading maintenance tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="card maint-empty">
          <div className="success-icon-box">
            <CheckCircle2 size={36} color="#2D6A4F" />
          </div>
          <h3>All Facilities & Pods Are in Good Order</h3>
          <p>No open maintenance tickets. All 16 beds and fixtures functional.</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map((t) => (
            <div key={t.id} className={`card ticket-card ${t.status === 'RESOLVED' ? 'resolved' : 'open'}`}>
              <div className="ticket-top">
                <div className="ticket-title-box">
                  <span className="cat-tag">{t.category}</span>
                  <h4>{t.title}</h4>
                </div>
                {getPriorityBadge(t.priority)}
              </div>

              {t.bed_number && (
                <div className="ticket-bed-pill">
                  <Wrench size={13} color="#C25E40" />
                  <span>Pod {t.bed_number} (Marked in Maintenance)</span>
                </div>
              )}

              <p className="ticket-desc">{t.description || 'No description provided.'}</p>

              <div className="ticket-meta-info">
                <span>Reported: {new Date(t.created_at).toLocaleDateString()}</span>
                {t.reported_by && <span>By: {t.reported_by}</span>}
              </div>

              {t.status === 'RESOLVED' ? (
                <div className="resolution-box">
                  <span className="res-tag">✓ RESOLVED</span>
                  <p>{t.resolution_notes || 'Resolved and returned to service.'}</p>
                </div>
              ) : (
                <div className="ticket-actions">
                  <button 
                    className="btn btn-secondary btn-block btn-sm"
                    onClick={() => { setSelectedTicket(t); setResolveModalOpen(true); }}
                  >
                    Mark Resolved & Clear Bed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Ticket Modal */}
      {modalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="modal-card maint-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Defect or Repair Issue</h3>
              <button className="btn btn-ghost btn-sm modal-close-btn" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body form-layout">
              <div className="form-group">
                <label className="form-label">Issue Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Reading lamp loose, AC water drop" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="form-input" 
                  required 
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="form-select">
                    <option value="BED_EQUIPMENT">Bed / Pod Fixture</option>
                    <option value="ELECTRICAL">Electrical / Socket</option>
                    <option value="PLUMBING">Plumbing / Washroom</option>
                    <option value="HVAC">AC / Climate</option>
                    <option value="OTHER">Other Facility</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Bed Pod</label>
                  <select value={bedId} onChange={e => setBedId(e.target.value)} className="form-select">
                    <option value="">General (No Specific Bed)</option>
                    {beds.map(b => (
                      <option key={b.id} value={b.id}>Pod {b.bed_number} (Floor {b.floor_number})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="form-select">
                  <option value="LOW">LOW (Can await scheduled service)</option>
                  <option value="MEDIUM">MEDIUM (Fix today)</option>
                  <option value="HIGH">HIGH (Affects guest stay)</option>
                  <option value="CRITICAL">CRITICAL (Emergency / Safety)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description & Specifics</label>
                <textarea 
                  rows="3" 
                  placeholder="Describe location, symptoms, technician requirements..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="modal-actions-right">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setResolveModalOpen(false)}>
          <div className="modal-card maint-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Resolve Maintenance Ticket</h3>
              <button className="btn btn-ghost btn-sm modal-close-btn" onClick={() => setResolveModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResolve} className="modal-body form-layout">
              <div className="form-group">
                <label className="form-label">Ticket</label>
                <div className="static-field">{selectedTicket?.title}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Resolution Notes</label>
                <textarea 
                  rows="3" 
                  placeholder="e.g. Replaced LED lamp and tested socket 230V" 
                  value={resolutionNotes} 
                  onChange={e => setResolutionNotes(e.target.value)} 
                  className="form-input" 
                  required 
                />
              </div>
              <div className="modal-actions-right">
                <button type="button" className="btn btn-secondary" onClick={() => setResolveModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Resolution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .maintenance-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .maint-header-card {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .maint-header-card h2 {
          font-family: var(--font-serif);
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 4px;
        }
        .subtitle {
          font-size: 0.88rem;
          color: var(--text-muted);
        }
        .maint-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .loading-card {
          padding: 60px;
          text-align: center;
          color: var(--text-muted);
        }
        .maint-empty {
          padding: 50px 30px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .success-icon-box {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-full);
          background: var(--success-light);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .maint-empty h3 {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          color: var(--text-main);
        }
        .maint-empty p {
          font-size: 0.88rem;
          color: var(--text-muted);
        }
        .tickets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .ticket-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ticket-card.resolved {
          opacity: 0.75;
          border-color: var(--border-subtle);
        }
        .ticket-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .cat-tag {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .ticket-title-box h4 {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-main);
        }
        .ticket-bed-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary);
          align-self: flex-start;
        }
        .ticket-desc {
          font-size: 0.82rem;
          color: var(--text-body);
          line-height: 1.4;
        }
        .ticket-meta-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.74rem;
          color: var(--text-muted);
          padding-top: 6px;
          border-top: 1px solid var(--border-subtle);
        }
        .resolution-box {
          background: var(--bg-secondary);
          padding: 10px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
        }
        .res-tag {
          font-weight: 700;
          color: var(--success);
          font-size: 0.72rem;
          display: block;
          margin-bottom: 2px;
        }
        .ticket-actions {
          margin-top: auto;
        }
        .maint-modal {
          max-width: 520px;
          width: 90%;
        }
        .form-layout {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .modal-actions-right {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }
        .static-field {
          padding: 10px 14px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          font-weight: 700;
          color: var(--text-main);
        }
      `}</style>
    </div>
  );
}
