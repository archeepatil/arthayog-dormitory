import React, { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, 
  Activity, 
  Database, 
  Server, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  Zap, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Clock,
  Cpu,
  FileCode2,
  EyeOff
} from 'lucide-react';
import { api } from '../api';

export default function DeveloperPortal({ onClose }) {
  const [pin, setPin] = useState(() => sessionStorage.getItem('arthayog_dev_pin') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pingLatency, setPingLatency] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [workerRunning, setWorkerRunning] = useState(false);
  const [workerMessage, setWorkerMessage] = useState('');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(5); // Default to live 5s monitoring
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Fetch telemetry
  const loadDiagnostics = useCallback(async (activePin, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await api.system.developerDiagnostics(activePin || pin);
      setDiagnostics(data);
      setIsAuthenticated(true);
      setLastRefreshedAt(new Date());
      if (activePin) {
        sessionStorage.setItem('arthayog_dev_pin', activePin);
      }
    } catch (err) {
      if (!isBackground) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('arthayog_dev_pin');
        setPinError('Invalid Developer Passcode. Access denied.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [pin]);

  useEffect(() => {
    if (pin) {
      loadDiagnostics(pin);
    }
  }, [pin, loadDiagnostics]);

  // Live Auto-Refresh Polling Effect
  useEffect(() => {
    if (!isAuthenticated || !pin || autoRefreshInterval <= 0) return;
    const intervalId = setInterval(() => {
      loadDiagnostics(pin, true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, pin, autoRefreshInterval, loadDiagnostics]);


  const handlePinSubmit = (e) => {
    e.preventDefault();
    setPinError('');
    if (!pinInput.trim()) {
      setPinError('Please enter the developer passcode.');
      return;
    }
    setPin(pinInput.trim());
    loadDiagnostics(pinInput.trim());
  };

  const handlePing = async () => {
    setPinging(true);
    const start = performance.now();
    try {
      await api.system.developerPing();
      const end = performance.now();
      setPingLatency(Math.round(end - start));
    } catch (err) {
      setPingLatency('Error');
    } finally {
      setPinging(false);
    }
  };

  const handleTriggerWorker = async () => {
    setWorkerRunning(true);
    setWorkerMessage('');
    try {
      const res = await api.system.triggerExpiry();
      setWorkerMessage(res.message || 'Worker pulse executed.');
      loadDiagnostics();
    } catch (err) {
      setWorkerMessage('Failed to execute worker pulse.');
    } finally {
      setWorkerRunning(false);
    }
  };

  const handleDownloadReport = () => {
    if (!diagnostics) return;
    const reportData = {
      title: "Arthayog Dormitory ERP — System Telemetry & Technical Report",
      confidentiality: "TECHNICAL ONLY — Financial Data Redacted",
      export_timestamp: new Date().toISOString(),
      report_id: diagnostics.technical_report_id,
      telemetry: diagnostics
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arthayog_Tech_Report_${diagnostics.technical_report_id || 'live'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      // 1. Try to fetch dynamically from backend API endpoint
      const pdfEndpoint = api.system.developerReportPdfUrl 
        ? api.system.developerReportPdfUrl(pin) 
        : `/api/system/developer-report-pdf?pin=${encodeURIComponent(pin || '')}`;
      
      const response = await fetch(pdfEndpoint);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Arthayog_Developer_Report_${diagnostics?.technical_report_id || 'live'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadingPdf(false);
        return;
      }
    } catch (e) {
      console.warn('API PDF fetch fallback, trying static bundle:', e);
    }

    // 2. Static PDF fallback
    try {
      const staticUrl = '/Arthayog_Dormitory_Developer_Report.pdf';
      const a = document.createElement('a');
      a.href = staticUrl;
      a.download = 'Arthayog_Dormitory_Developer_Report.pdf';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback: trigger print
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };


  // 1. PIN Lock Screen

  if (!isAuthenticated) {
    return (
      <div className="dev-gate-container animate-fade-in">
        <div className="dev-gate-card">
          <div className="dev-terminal-header">
            <Terminal size={22} color="#10B981" />
            <h3>Developer Diagnostics Console</h3>
          </div>
          <p className="dev-gate-sub">
            Internal system telemetry, background workers, and technical health inspector.
          </p>

          <div className="privacy-badge">
            <EyeOff size={14} color="#6EE7B7" />
            <span>Strict Privacy Mode: All revenue and financial metrics are withheld.</span>
          </div>

          {pinError && (
            <div className="dev-alert dev-alert-error animate-fade-in">
              <AlertCircle size={15} />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handlePinSubmit} className="dev-pin-form">
            <label>Enter Developer Passcode PIN:</label>
            <input 
              type="password" 
              className="dev-pin-input" 
              placeholder="••••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              autoFocus
            />
            <button 
              type="submit" 
              className="btn-dev-submit" 
              disabled={loading || !pinInput}
            >
              {loading ? 'Authenticating...' : 'Unlock Technical Console →'}
            </button>
          </form>

          {onClose && (
            <button className="btn-dev-exit" onClick={onClose}>
              ← Exit to Main Site
            </button>
          )}
        </div>

        <style>{`
          .dev-gate-container {
            min-height: 80vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
          }
          .dev-gate-card {
            background: #0F172A;
            color: #F8FAFC;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 32px;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .dev-terminal-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
          }
          .dev-terminal-header h3 {
            margin: 0;
            font-size: 1.25rem;
            color: #F1F5F9;
          }
          .dev-gate-sub {
            color: #94A3B8;
            font-size: 0.85rem;
            line-height: 1.4;
            margin-bottom: 16px;
          }
          .privacy-badge {
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6EE7B7;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.76rem;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
          }
          .dev-alert-error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #FCA5A5;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.82rem;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 14px;
          }
          .dev-pin-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .dev-pin-form label {
            font-size: 0.8rem;
            color: #CBD5E1;
            font-weight: 500;
          }
          .dev-pin-input {
            background: #1E293B;
            border: 1px solid #475569;
            color: #F8FAFC;
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 1.1rem;
            letter-spacing: 4px;
            outline: none;
          }
          .dev-pin-input:focus {
            border-color: #10B981;
          }
          .btn-dev-submit {
            background: #10B981;
            color: #0F172A;
            border: none;
            padding: 11px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            margin-top: 6px;
            transition: all 0.2s;
          }
          .btn-dev-submit:hover {
            background: #059669;
          }
          .btn-dev-exit {
            background: none;
            border: none;
            color: #94A3B8;
            font-size: 0.82rem;
            cursor: pointer;
            margin-top: 16px;
            display: block;
            text-align: center;
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  // 2. Full Developer Console
  const sys = diagnostics?.system;
  const dbg = diagnostics?.database_integrity;
  const op = diagnostics?.operational_capacity;
  const wrk = diagnostics?.background_workers?.booking_expiry_loop;
  const events = diagnostics?.recent_technical_events || [];

  return (
    <div className="dev-console-wrapper animate-fade-in">
      {/* Top Banner */}
      <div className="dev-top-bar">
        <div className="dev-brand-badge">
          <Terminal size={20} color="#10B981" />
          <span>Arthayog ERP • Developer Console</span>
          <span className="env-pill">{sys?.environment?.toUpperCase() || 'PROD'}</span>
        </div>

        <div className="dev-actions-right">
          <button 
            className="dev-btn dev-btn-secondary"
            onClick={handlePing}
            disabled={pinging}
            title="Measure network roundtrip latency to FastAPI backend"
          >
            <Zap size={14} />
            <span>{pinging ? 'Pinging...' : pingLatency ? `Ping: ${pingLatency}ms` : 'Ping API'}</span>
          </button>

          <button 
            className="dev-btn dev-btn-secondary"
            onClick={() => loadDiagnostics()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            className="dev-btn dev-btn-primary dev-btn-pdf"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            title="Download the official Developer Technical & Handover Report in PDF format"
          >
            <Download size={15} />
            <span>{downloadingPdf ? 'Downloading PDF...' : '📄 Download Developer Report (PDF)'}</span>
          </button>

          <button 
            className="dev-btn dev-btn-secondary"
            onClick={handleDownloadReport}
            title="Download raw technical telemetry JSON"
          >
            <FileCode2 size={14} />
            <span>JSON Telemetry</span>
          </button>

          {onClose && (
            <button className="dev-btn dev-btn-exit" onClick={onClose}>
              Exit Console
            </button>
          )}
        </div>
      </div>

      {/* Strict Privacy Notice with Quick PDF Export */}
      <div className="dev-privacy-banner">
        <div className="privacy-banner-left">
          <EyeOff size={16} color="#059669" />
          <strong>Strict Developer Privacy Enforcement:</strong>
          <span>Financial telemetry, revenue sums, room pricing, and payment values are excluded from this portal.</span>
        </div>
        <div className="privacy-banner-right">
          <button className="btn-banner-pdf" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            <Download size={13} />
            <span>{downloadingPdf ? 'Generating...' : 'Export PDF'}</span>
          </button>
          <span className="report-id-text">ID: {diagnostics?.technical_report_id}</span>
        </div>
      </div>


      {/* Grid of Telemetry Cards */}
      <div className="dev-metrics-grid">
        {/* Card 1: Server Status */}
        <div className="dev-card">
          <div className="dev-card-head">
            <Server size={18} color="#38BDF8" />
            <h4>Backend Engine</h4>
            <span className="status-dot green"></span>
          </div>
          <div className="dev-metric-main">{sys?.status || 'HEALTHY'}</div>
          <div className="dev-spec-list">
            <div><span>Environment:</span> <code>{sys?.environment}</code></div>
            <div><span>Python Version:</span> <code>{sys?.python_version}</code></div>
            <div><span>Timezone:</span> <code>{sys?.server_timezone}</code></div>
          </div>
        </div>

        {/* Card 2: Database Integrity */}
        <div className="dev-card">
          <div className="dev-card-head">
            <Database size={18} color="#A78BFA" />
            <h4>Database Integrity</h4>
            <span className="status-dot green"></span>
          </div>
          <div className="dev-metric-main">{dbg?.status || 'OPTIMAL'}</div>
          <div className="dev-spec-list">
            <div><span>Engine:</span> <code>{sys?.database_engine}</code></div>
            <div><span>Pod Beds Registered:</span> <code>{dbg?.total_pod_beds} / 16</code></div>
            <div><span>WAL Journal:</span> <code>Active & Concurrent</code></div>
          </div>
        </div>

        {/* Card 3: Background Worker */}
        <div className="dev-card">
          <div className="dev-card-head">
            <Clock size={18} color="#FBBF24" />
            <h4>15-Min Expiry Worker</h4>
            <span className="status-dot green"></span>
          </div>
          <div className="dev-metric-main">{wrk?.status || 'RUNNING'}</div>
          <div className="dev-spec-list">
            <div><span>Pulse Interval:</span> <code>{wrk?.interval_seconds}s</code></div>
            <div><span>Hold Timeout:</span> <code>{wrk?.hold_timeout_minutes} mins</code></div>
            <div><span>Last Auto-Released:</span> <code>{wrk?.last_run_released_count} beds</code></div>
          </div>
          <button 
            className="dev-btn-action" 
            onClick={handleTriggerWorker}
            disabled={workerRunning}
          >
            {workerRunning ? 'Executing Pulse...' : 'Run Expiry Pulse Now'}
          </button>
          {workerMessage && <small className="worker-msg">{workerMessage}</small>}
        </div>

        {/* Card 4: Bed Operational Breakdown (No prices) */}
        <div className="dev-card">
          <div className="dev-card-head">
            <Layers size={18} color="#34D399" />
            <h4>Bed Operations (16 Pods)</h4>
          </div>
          <div className="capacity-bars-box">
            <div className="cap-row">
              <span>Available:</span>
              <strong className="text-emerald">{op?.available || 0}</strong>
            </div>
            <div className="cap-row">
              <span>Occupied:</span>
              <strong className="text-amber">{op?.occupied || 0}</strong>
            </div>
            <div className="cap-row">
              <span>Cleaning / Prep:</span>
              <strong className="text-blue">{op?.cleaning || 0}</strong>
            </div>
            <div className="cap-row">
              <span>Maintenance:</span>
              <strong className="text-rose">{op?.maintenance || 0}</strong>
            </div>
            <div className="cap-row">
              <span>Reserved / Held:</span>
              <strong className="text-purple">{op?.reserved || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Table Row Counts & System Audit Feed */}
      <div className="dev-lower-grid">
        {/* Table Counters */}
        <div className="dev-card">
          <div className="dev-card-head">
            <FileCode2 size={18} color="#38BDF8" />
            <h4>Database Table Row Telemetry</h4>
          </div>
          <div className="table-counts-table">
            {dbg?.table_row_counts && Object.entries(dbg.table_row_counts).map(([tbl, count]) => (
              <div key={tbl} className="tbl-row">
                <span className="tbl-name"><code>{tbl}</code></span>
                <span className="tbl-count">{count} rows</span>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Event Stream */}
        <div className="dev-card">
          <div className="dev-card-head">
            <Activity size={18} color="#F472B6" />
            <h4>Technical Audit & Request Feed (Zero Financials)</h4>
          </div>
          <div className="events-stream-box">
            {events.length === 0 ? (
              <div className="empty-events">No technical events logged yet.</div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="event-item">
                  <div className="event-time-row">
                    <span className="event-action">{ev.action}</span>
                    <span className="event-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="event-details">
                    <span>Target: <code>{ev.entity_type}</code></span>
                    {ev.ip_address && <span>IP: <code>{ev.ip_address}</code></span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dev-console-wrapper {
          background: #0B1120;
          color: #F1F5F9;
          min-height: 90vh;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'JetBrains Mono', monospace;
          border-radius: 12px;
          margin: 16px 0;
          border: 1px solid #1E293B;
        }
        .dev-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          padding-bottom: 20px;
          border-bottom: 1px solid #1E293B;
        }
        .dev-brand-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.15rem;
          font-weight: 700;
        }
        .env-pill {
          background: #064E3B;
          color: #34D399;
          font-size: 0.68rem;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #059669;
        }
        .dev-actions-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dev-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .dev-btn-primary {
          background: #10B981;
          color: #0F172A;
        }
        .dev-btn-primary:hover {
          background: #059669;
        }
        .dev-btn-pdf {
          background: linear-gradient(135deg, #2563EB, #1D4ED8) !important;
          color: #FFFFFF !important;
          border: 1px solid #3B82F6 !important;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
        }
        .dev-btn-pdf:hover {
          background: linear-gradient(135deg, #1D4ED8, #1E40AF) !important;
        }
        .dev-btn-secondary {
          background: #1E293B;
          color: #F8FAFC;
          border-color: #334155;
        }
        .dev-btn-secondary:hover {
          background: #334155;
        }
        .privacy-banner-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-banner-pdf {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #059669;
          color: #FFFFFF;
          border: 1px solid #10B981;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-banner-pdf:hover {
          background: #047857;
        }

        .dev-btn-exit {
          background: transparent;
          color: #94A3B8;
          border-color: #334155;
        }
        .dev-btn-exit:hover {
          color: #F8FAFC;
          border-color: #64748B;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .dev-privacy-banner {
          background: rgba(6, 78, 59, 0.4);
          border: 1px solid #059669;
          color: #D1FAE5;
          padding: 10px 16px;
          border-radius: 8px;
          margin: 16px 0 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.82rem;
        }
        .privacy-banner-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .report-id-text {
          font-family: monospace;
          background: #064E3B;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.74rem;
        }
        .dev-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .dev-card {
          background: #111827;
          border: 1px solid #1F2937;
          border-radius: 8px;
          padding: 18px;
          display: flex;
          flex-direction: column;
        }
        .dev-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .dev-card-head h4 {
          margin: 0;
          font-size: 0.88rem;
          color: #E2E8F0;
          flex: 1;
          margin-left: 8px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .status-dot.green {
          background: #10B981;
          box-shadow: 0 0 8px #10B981;
        }
        .dev-metric-main {
          font-size: 1.5rem;
          font-weight: 800;
          color: #F8FAFC;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        .dev-spec-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.78rem;
          color: #94A3B8;
        }
        .dev-spec-list div {
          display: flex;
          justify-content: space-between;
        }
        .dev-spec-list code {
          color: #38BDF8;
          font-family: monospace;
        }
        .dev-btn-action {
          margin-top: 12px;
          background: #374151;
          border: 1px solid #4B5563;
          color: #F9FAFB;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dev-btn-action:hover {
          background: #4B5563;
        }
        .worker-msg {
          margin-top: 6px;
          color: #34D399;
          font-size: 0.74rem;
        }
        .capacity-bars-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.8rem;
        }
        .cap-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          border-bottom: 1px solid #1F2937;
        }
        .text-emerald { color: #34D399; }
        .text-amber { color: #FBBF24; }
        .text-blue { color: #60A5FA; }
        .text-rose { color: #F43F5E; }
        .text-purple { color: #C084FC; }

        .dev-lower-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .dev-lower-grid {
            grid-template-columns: 1fr;
          }
        }
        .table-counts-table {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }
        .tbl-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 10px;
          background: #1E293B;
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .tbl-name code {
          color: #38BDF8;
        }
        .tbl-count {
          color: #94A3B8;
          font-weight: 600;
        }
        .events-stream-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 380px;
          overflow-y: auto;
          margin-top: 8px;
        }
        .event-item {
          background: #1E293B;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 0.78rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .event-time-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .event-action {
          color: #F472B6;
          font-weight: 700;
          font-family: monospace;
        }
        .event-time {
          color: #64748B;
          font-size: 0.72rem;
        }
        .event-details {
          display: flex;
          gap: 12px;
          color: #94A3B8;
        }
        .event-details code {
          color: #CBD5E1;
        }
        .empty-events {
          color: #64748B;
          font-size: 0.82rem;
          text-align: center;
          padding: 24px;
        }
      `}</style>
    </div>
  );
}
