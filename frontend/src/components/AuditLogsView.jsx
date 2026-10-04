import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Search, 
  Clock, 
  User, 
  Terminal, 
  KeyRound, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function AuditLogsView({ logs, loading, onRefresh }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(log => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.user_email?.toLowerCase().includes(q) ||
      log.entity_type?.toLowerCase().includes(q) ||
      log.entity_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="audit-module animate-fade-in">
      <div className="card audit-header-card">
        <div>
          <span className="badge badge-accent">{t('audit_badge', 'Owner Security & Audit Trail')}</span>
          <h2>{t('audit_title', 'System Audit & Compliance Logs')}</h2>
          <p className="subtitle">
            {t('audit_sub', 'Cryptographically sealed, persistent ledger of all administrative, financial and operational events')}
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
            placeholder={t('search_placeholder', 'Filter by action, admin email, entity type...')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="card loading-card">
          <p>{t('loading', 'Reading secure audit ledger from persistent database...')}</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card loading-card">
          <p>{t('no_entries_found', 'No audit entries matching filter.')}</p>
        </div>
      ) : (
        <div className="card table-container">
          <div className="table-responsive">
            <table className="hospitality-table">
              <thead>
                <tr>
                  <th>{t('col_timestamp', 'Timestamp')}</th>
                  <th>{t('col_user', 'Operator')}</th>
                  <th>{t('col_action', 'Action')}</th>
                  <th>{t('entity', 'Entity')}</th>
                  <th>{t('ip_address', 'IP Address')}</th>
                  <th>{t('col_details', 'Telemetry Details')}</th>
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

                  return (
                    <tr key={log.id}>
                      <td>
                        <span className="log-time">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div className="user-log-cell">
                          <span className="user-email">{log.user_email}</span>
                          <span className="user-role-badge">{log.user_role}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-accent">{log.action}</span>
                      </td>
                      <td>
                        <div className="entity-cell">
                          <strong>{log.entity_type}</strong>
                          <span className="entity-id">#{log.entity_id}</span>
                        </div>
                      </td>
                      <td>
                        <code className="ip-code">{log.ip_address || '127.0.0.1'}</code>
                      </td>
                      <td>
                        <div className="json-details">
                          {parsed && typeof parsed === 'object' ? (
                            <pre>{JSON.stringify(parsed, null, 2)}</pre>
                          ) : (
                            <span>{String(log.details_json || '—')}</span>
                          )}
                        </div>
                      </td>
                    </tr>
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
          gap: 20px;
        }
        .audit-header-card {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .audit-header-card h2 {
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
        .audit-search-card {
          padding: 14px 20px;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-secondary);
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          max-width: 480px;
        }
        .search-icon {
          color: var(--text-muted);
        }
        .search-input {
          border: none;
          background: transparent;
          font-size: 0.88rem;
          color: var(--text-main);
          outline: none;
          width: 100%;
        }
        .loading-card {
          padding: 60px;
          text-align: center;
          color: var(--text-muted);
        }
        .table-container {
          padding: 0;
          overflow: hidden;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .log-time {
          font-size: 0.78rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .user-log-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .user-email {
          font-weight: 700;
          color: var(--text-main);
          font-size: 0.82rem;
        }
        .user-role-badge {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .entity-cell {
          display: flex;
          flex-direction: column;
        }
        .entity-id {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .ip-code {
          font-family: var(--font-mono);
          font-size: 0.74rem;
          color: var(--text-body);
        }
        .json-details pre {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          background: var(--bg-secondary);
          padding: 6px 10px;
          border-radius: var(--radius-xs);
          max-height: 80px;
          overflow-y: auto;
          color: var(--text-body);
        }
      `}</style>
    </div>
  );
}
