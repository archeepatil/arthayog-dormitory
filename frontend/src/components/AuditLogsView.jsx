import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Search, 
  Clock, 
  User, 
  ChevronDown,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function AuditLogsView({ logs = [], loading, onRefresh }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const filteredLogs = logs.filter(log => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.user_email?.toLowerCase().includes(q) ||
      log.user_role?.toLowerCase().includes(q) ||
      log.entity_type?.toLowerCase().includes(q) ||
      log.entity_id?.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="audit-module animate-fade-in">
      <div className="card audit-header-card">
        <div>
          <span className="badge badge-accent">{t('audit_badge', 'Security & Audit Trail')}</span>
          <h2>{t('audit_title', 'System Audit & Compliance Logs')}</h2>
          <p className="subtitle">
            {t('audit_sub', 'Cryptographically verified, persistent chronological audit log of all system actions.')}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
          {t('refresh_btn', 'Refresh Ledger')}
        </button>
      </div>

      <div className="card audit-search-card">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder={t('search_placeholder', 'Filter audit events by user, role, action, or record ID...')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="card loading-card">
          <p>{t('loading', 'Loading audit records from persistent database...')}</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card loading-card">
          <p>{t('no_entries_found', 'No audit entries matching filter.')}</p>
        </div>
      ) : (
        <div className="card table-container">
          <div className="table-responsive">
            {/* Exact 5-column structure per addition of this.pdf: User | Role | Action | Affected Record | Timestamp */}
            <table className="hospitality-table audit-5col-table">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>{t('col_user', 'User')}</th>
                  <th>{t('col_role', 'Role')}</th>
                  <th>{t('col_action', 'Action')}</th>
                  <th>{t('col_record', 'Affected Record')}</th>
                  <th>{t('col_timestamp', 'Timestamp')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  let parsed = null;
                  try {
                    parsed = log.details_json ? JSON.parse(log.details_json) : null;
                  } catch (e) {
                    parsed = log.details_json;
                  }
                  const hasDetails = Boolean(parsed && Object.keys(parsed).length > 0);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`audit-row ${hasDetails ? 'clickable' : ''}`}
                        onClick={() => hasDetails && toggleExpand(log.id)}
                      >
                        {/* 1. User */}
                        <td>
                          <div className="audit-user-cell">
                            {hasDetails && (
                              <span className="expand-indicator">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                            )}
                            <span className="user-email-text" title={log.user_email}>
                              {log.user_email || 'System'}
                            </span>
                          </div>
                        </td>

                        {/* 2. Role */}
                        <td>
                          <span className="role-pill">
                            {log.user_role || 'SYSTEM'}
                          </span>
                        </td>

                        {/* 3. Action */}
                        <td>
                          <span className="action-tag">
                            {log.action}
                          </span>
                        </td>

                        {/* 4. Affected Record */}
                        <td>
                          <span className="affected-record-text">
                            {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                          </span>
                        </td>

                        {/* 5. Timestamp */}
                        <td>
                          <span className="log-timestamp-text">
                            {new Date(log.created_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable Before/After Detail Drawer */}
                      {isExpanded && (
                        <tr className="audit-detail-row">
                          <td colSpan="5">
                            <div className="audit-drawer-content">
                              <span className="drawer-title">Event Payload:</span>
                              <pre className="drawer-json">
                                {typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .audit-module {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .audit-header-card {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .audit-header-card h2 {
          font-family: var(--font-serif);
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 4px;
        }
        .subtitle {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .audit-search-card {
          padding: 12px 18px;
        }
        .search-box {
          position: relative;
          width: 100%;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          font-size: 0.84rem;
          background: var(--bg-primary);
        }
        .table-container {
          padding: 0;
          overflow: hidden;
        }
        .audit-5col-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .audit-5col-table th {
          background: var(--bg-secondary);
          color: var(--text-muted);
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-subtle);
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .audit-5col-table td {
          padding: 11px 14px;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .audit-row.clickable {
          cursor: pointer;
        }
        .audit-row:hover {
          background: #FAF8F5;
        }
        .audit-user-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .expand-indicator {
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }
        .user-email-text {
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
        .role-pill {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          background: #EAE6DF;
          color: #2D2A26;
        }
        .action-tag {
          font-family: var(--font-mono);
          font-size: 0.76rem;
          font-weight: 700;
          color: #C25E40;
          background: #FAF4EF;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #F0D5C7;
          display: inline-block;
        }
        .affected-record-text {
          font-size: 0.8rem;
          color: var(--text-body);
        }
        .log-timestamp-text {
          font-size: 0.78rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .audit-detail-row td {
          background: #F8F6F2;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .audit-drawer-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .drawer-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: #716B64;
          text-transform: uppercase;
        }
        .drawer-json {
          margin: 0;
          padding: 10px 14px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.74rem;
          color: #2D2A26;
          max-height: 200px;
          overflow-y: auto;
        }
        .loading-card {
          padding: 32px;
          text-align: center;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
