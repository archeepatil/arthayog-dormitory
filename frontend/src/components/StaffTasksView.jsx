import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  CheckCircle2, 
  User, 
  BedDouble, 
  Calendar,
  X 
} from 'lucide-react';

export default function StaffTasksView({ 
  tasks, 
  staffList, 
  beds, 
  loading, 
  onCreateTask, 
  onUpdateTask, 
  onRefresh 
}) {
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('CLEANING');
  const [bedId, setBedId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    await onCreateTask({
      title,
      task_type: taskType,
      bed_id: bedId ? parseInt(bedId) : null,
      assigned_to_id: assignedToId ? parseInt(assignedToId) : null,
      notes: notes || undefined
    });
    setModalOpen(false);
    setTitle('');
    setNotes('');
  };

  return (
    <div className="tasks-module animate-fade-in">
      <div className="card tasks-header-card">
        <div>
          <span className="badge badge-accent">Staff Workflow</span>
          <h2>Front Desk & Housekeeping Tasks</h2>
          <p className="subtitle">
            Linen replacements, bathroom sanitization checks, drinking water refills & bed preparation
          </p>
        </div>
        <div className="tasks-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Assign New Task
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card loading-card">
          <p>Loading staff tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card empty-tasks">
          <div className="success-icon-box">
            <CheckCircle2 size={36} color="#2D6A4F" />
          </div>
          <h3>All Scheduled Operational Tasks Completed!</h3>
          <p>No open duties remaining on today's roster.</p>
        </div>
      ) : (
        <div className="card tasks-list-card">
          <div className="tasks-list">
            {tasks.map((task) => {
              const isCompleted = task.status === 'COMPLETED';

              return (
                <div 
                  key={task.id} 
                  className={`task-row ${isCompleted ? 'task-done' : ''}`}
                >
                  <div className="task-checkbox-box">
                    <input 
                      type="checkbox" 
                      checked={isCompleted}
                      onChange={(e) => {
                        onUpdateTask(task.id, {
                          status: e.target.checked ? 'COMPLETED' : 'PENDING'
                        });
                      }}
                      className="task-checkbox"
                    />
                  </div>

                  <div className="task-main-info">
                    <div className="task-header-line">
                      <span className="task-type-badge">{task.task_type.replace('_', ' ')}</span>
                      <h4 className="task-title-text">{task.title}</h4>
                      {task.bed_number && (
                        <span className="task-bed-pill">Pod {task.bed_number}</span>
                      )}
                    </div>
                    {task.notes && <p className="task-notes-text">{task.notes}</p>}
                  </div>

                  <div className="task-meta-right">
                    {task.assigned_to_name && (
                      <span className="task-staff-name">
                        <User size={13} /> {task.assigned_to_name}
                      </span>
                    )}
                    <span className="task-date">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="modal-card task-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Operational Duty Item</h3>
              <button className="btn btn-ghost btn-sm modal-close-btn" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body form-layout">
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Turnaround linen change & water refill" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="form-input" 
                  required 
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Duty Type</label>
                  <select value={taskType} onChange={e => setTaskType(e.target.value)} className="form-select">
                    <option value="CLEANING">Cleaning / Turnover</option>
                    <option value="LINEN_CHANGE">Linen Replacement</option>
                    <option value="RESTOCK">Supplies Restock</option>
                    <option value="INSPECTION">Bed Inspection</option>
                    <option value="OTHER">General Operation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Bed Pod</label>
                  <select value={bedId} onChange={e => setBedId(e.target.value)} className="form-select">
                    <option value="">General Facility</option>
                    {beds.map(b => (
                      <option key={b.id} value={b.id}>Pod {b.bed_number} (Floor {b.floor_number})</option>
                    ))}
                  </select>
                </div>
              </div>

              {staffList && staffList.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Assign To Staff Member</label>
                  <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="form-select">
                    <option value="">Unassigned (Any On-Duty Staff)</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes / Instructions</label>
                <textarea 
                  rows="3" 
                  placeholder="Detailed instructions for the attendant..." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="modal-actions-right">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .tasks-module {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .tasks-header-card {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .tasks-header-card h2 {
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
        .tasks-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .loading-card {
          padding: 60px;
          text-align: center;
          color: var(--text-muted);
        }
        .empty-tasks {
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
        .empty-tasks h3 {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          color: var(--text-main);
        }
        .empty-tasks p {
          font-size: 0.88rem;
          color: var(--text-muted);
        }
        .tasks-list-card {
          padding: 0;
          overflow: hidden;
        }
        .tasks-list {
          display: flex;
          flex-direction: column;
        }
        .task-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
          transition: var(--transition);
        }
        .task-row:hover {
          background: #FAF8F5;
        }
        .task-row.task-done {
          opacity: 0.6;
          background: var(--bg-secondary);
        }
        .task-row.task-done .task-title-text {
          text-decoration: line-through;
        }
        .task-checkbox {
          width: 18px;
          height: 18px;
          accent-color: var(--primary);
          cursor: pointer;
        }
        .task-main-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .task-header-line {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .task-type-badge {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--primary);
          background: var(--primary-light);
          padding: 2px 7px;
          border-radius: var(--radius-sm);
        }
        .task-title-text {
          font-size: 0.94rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .task-bed-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
        .task-notes-text {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .task-meta-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .task-staff-name {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          color: var(--text-body);
        }
        .task-modal {
          max-width: 500px;
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
      `}</style>
    </div>
  );
}
