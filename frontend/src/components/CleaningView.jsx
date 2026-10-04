import React from 'react';
import { 
  Sparkle, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  BedDouble, 
  User, 
  Check, 
  Play 
} from 'lucide-react';

export default function CleaningView({ 
  cleaningQueue, 
  loading, 
  onStartCleaning, 
  onCompleteCleaning, 
  onRefresh 
}) {
  return (
    <div className="cleaning-view animate-fade-in">
      <div className="card cleaning-header-card">
        <div>
          <span className="badge badge-accent">Operational Housekeeping</span>
          <h2>Bed Turnaround & Cleaning Queue</h2>
          <p className="subtitle">
            Turnaround Workflow: Checked Out → Cleaning Required → Cleaning In Progress → Available
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
          Refresh Queue
        </button>
      </div>

      {loading ? (
        <div className="card loading-card">
          <p>Loading cleaning queue...</p>
        </div>
      ) : cleaningQueue.length === 0 ? (
        <div className="card clean-empty-state">
          <div className="success-icon-box">
            <CheckCircle2 size={36} color="#2D6A4F" />
          </div>
          <h3>All 16 Dormitory Beds Are Clean & Ready!</h3>
          <p>No beds currently require turnover sanitation.</p>
        </div>
      ) : (
        <div className="cleaning-cards-grid">
          {cleaningQueue.map((item) => {
            const isInProgress = item.status === 'CLEANING_IN_PROGRESS';

            return (
              <div 
                key={item.id} 
                className={`card cleaning-card ${isInProgress ? 'in-progress' : 'required'}`}
              >
                <div className="clean-card-top">
                  <div className="bed-info">
                    <BedDouble size={20} color={isInProgress ? '#B45309' : '#C25E40'} />
                    <span className="bed-name">Pod {item.bed_number}</span>
                    <span className="badge badge-accent">Floor {item.floor_number}</span>
                  </div>
                  <span className={`badge ${isInProgress ? 'badge-cleaning' : 'badge-pending'}`}>
                    {isInProgress ? 'In Progress' : 'Needs Cleaning'}
                  </span>
                </div>

                <div className="clean-meta">
                  {item.started_at ? (
                    <div className="meta-line">
                      <Clock size={14} />
                      <span>Started: {new Date(item.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ) : (
                    <div className="meta-line">
                      <Clock size={14} />
                      <span>Queued: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}

                  {item.staff_name && (
                    <div className="meta-line">
                      <User size={14} />
                      <span>Attendant: <strong>{item.staff_name}</strong></span>
                    </div>
                  )}

                  {item.notes && (
                    <p className="clean-notes">{item.notes}</p>
                  )}
                </div>

                <div className="clean-actions">
                  {!isInProgress ? (
                    <button 
                      className="btn btn-secondary btn-block"
                      onClick={() => onStartCleaning(item.bed_id)}
                    >
                      <Play size={14} /> Start Cleaning
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary btn-block"
                      onClick={() => onCompleteCleaning(item.bed_id)}
                    >
                      <Check size={14} /> Complete & Mark Ready
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .cleaning-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .cleaning-header-card {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .cleaning-header-card h2 {
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
        .loading-card {
          padding: 60px;
          text-align: center;
          color: var(--text-muted);
        }
        .clean-empty-state {
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
        .clean-empty-state h3 {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          color: var(--text-main);
        }
        .clean-empty-state p {
          font-size: 0.88rem;
          color: var(--text-muted);
        }
        .cleaning-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .cleaning-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border-top: 3px solid var(--cleaning);
        }
        .cleaning-card.in-progress {
          border-top-color: var(--accent-gold);
        }
        .clean-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bed-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bed-name {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-main);
        }
        .clean-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-body);
        }
        .meta-line {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
        }
        .clean-notes {
          background: var(--bg-secondary);
          padding: 8px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          color: var(--text-body);
        }
        .clean-actions {
          margin-top: auto;
          padding-top: 8px;
        }
      `}</style>
    </div>
  );
}
