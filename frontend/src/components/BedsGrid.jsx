import React, { useState } from 'react';
import { 
  BedDouble, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Wrench, 
  Sparkle,
  Sparkles,
  Zap,
  PhoneCall,
  X,
  Info,
  ShieldAlert,
  ArrowRight,
  Wind,
  Lock,
  Lightbulb,
  Users
} from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function BedsGrid({ 
  beds, 
  loading, 
  user, 
  onSelectBed, 
  onUpdateStatus, 
  checkInDate, 
  setCheckInDate, 
  checkOutDate, 
  setCheckOutDate,
  onOpenGroupBooking,
  onRefresh
}) {
  const { t } = useLanguage();
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [activeBedModal, setActiveBedModal] = useState(null);
  const [statusDraft, setStatusDraft] = useState('');
  
  const isStaffOrOwner = user?.role === 'OWNER_ADMIN' || user?.role === 'STAFF_EMPLOYEE';

  // Group beds by floor (Floor 1: 5 beds, Floor 2: 6 beds, Floor 3: 5 beds)
  const floor1Beds = beds.filter(b => b.floor_number === 1).sort((a, b) => a.bed_number.localeCompare(b.bed_number));
  const floor2Beds = beds.filter(b => b.floor_number === 2).sort((a, b) => a.bed_number.localeCompare(b.bed_number));
  const floor3Beds = beds.filter(b => b.floor_number === 3).sort((a, b) => a.bed_number.localeCompare(b.bed_number));

  const getStatusMeta = (bed) => {
    // If date filters active
    if (checkInDate && checkOutDate) {
      if (bed.is_available_for_dates) {
        return {
          code: 'AVAILABLE',
          label: t('status_available', 'Available'),
          badgeClass: 'badge-available',
          cardClass: 'status-available',
          dotColor: 'var(--success)'
        };
      } else {
        return {
          code: 'OCCUPIED',
          label: t('status_occupied', 'Booked / Held'),
          badgeClass: 'badge-occupied',
          cardClass: 'status-occupied',
          dotColor: 'var(--occupied)'
        };
      }
    }

    switch (bed.status) {
      case 'AVAILABLE':
        return {
          code: 'AVAILABLE',
          label: t('status_available', 'Available'),
          badgeClass: 'badge-available',
          cardClass: 'status-available',
          dotColor: 'var(--success)'
        };
      case 'RESERVED':
        return {
          code: 'RESERVED',
          label: t('status_reserved', 'Reserved'),
          badgeClass: 'badge-reserved',
          cardClass: 'status-reserved',
          dotColor: 'var(--warning)'
        };
      case 'OCCUPIED':
        return {
          code: 'OCCUPIED',
          label: t('status_occupied', 'Occupied'),
          badgeClass: 'badge-occupied',
          cardClass: 'status-occupied',
          dotColor: 'var(--occupied)'
        };
      case 'CLEANING_REQUIRED':
        return {
          code: 'CLEANING',
          label: t('status_cleaning_required', 'Cleaning Needed'),
          badgeClass: 'badge-cleaning',
          cardClass: 'status-cleaning',
          dotColor: 'var(--cleaning)'
        };
      case 'CLEANING_IN_PROGRESS':
        return {
          code: 'CLEANING',
          label: t('status_cleaning_in_progress', 'Cleaning In Progress'),
          badgeClass: 'badge-cleaning',
          cardClass: 'status-cleaning',
          dotColor: 'var(--cleaning)'
        };
      case 'MAINTENANCE':
        return {
          code: 'MAINTENANCE',
          label: t('status_maintenance', 'Maintenance'),
          badgeClass: 'badge-maintenance',
          cardClass: 'status-maintenance',
          dotColor: 'var(--danger)'
        };
      default:
        return {
          code: bed.status,
          label: bed.status,
          badgeClass: '',
          cardClass: '',
          dotColor: 'var(--text-muted)'
        };
    }
  };

  const statusCounts = {
    available: beds.filter(b => b.status === 'AVAILABLE').length,
    reserved: beds.filter(b => b.status === 'RESERVED').length,
    occupied: beds.filter(b => b.status === 'OCCUPIED').length,
    cleaning: beds.filter(b => b.status.includes('CLEANING')).length,
    maintenance: beds.filter(b => b.status === 'MAINTENANCE').length,
  };

  const handleBedClick = (bed) => {
    setActiveBedModal(bed);
    setStatusDraft(bed.status);
  };

  const handleSaveBedStatus = async () => {
    if (!activeBedModal || !statusDraft) return;
    await onUpdateStatus(activeBedModal.id, statusDraft);
    setActiveBedModal(prev => prev ? { ...prev, status: statusDraft } : null);
  };

  const renderFloorMap = (floorNum, floorName, floorBeds) => {
    if (selectedFloor !== 'ALL' && selectedFloor !== String(floorNum)) return null;

    return (
      <div key={floorNum} className="floor-blueprint-section card">
        <div className="floor-blueprint-header">
          <div className="floor-title-group">
            <span className="floor-eyebrow">{t('level_label', 'Level')} 0{floorNum}</span>
            <h3>{floorName}</h3>
          </div>
          <div className="floor-meta-count" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{floorBeds.length} {t('nav_beds', 'Beds')}</span>
            <span className="dot-divider">•</span>
            <span className="floor-ready-text">
              {floorBeds.filter(b => b.status === 'AVAILABLE').length} {t('status_available', 'Available')}
            </span>
            {isStaffOrOwner && onOpenGroupBooking && (
              <button 
                type="button" 
                className="btn btn-outline-primary btn-sm" 
                style={{ fontSize: '0.76rem', padding: '2px 8px', borderRadius: '4px' }}
                onClick={() => onOpenGroupBooking(floorNum)}
                title={`Book entire Floor ${floorNum} in one action`}
              >
                <Users size={12} /> {t('book_entire_floor_btn', '+ Book Entire Floor')}
              </button>
            )}
          </div>
        </div>

        {/* Architectural Visual Bed Map */}
        <div className="floor-pods-row">
          {floorBeds.map((bed, idx) => {
            const meta = getStatusMeta(bed);
            const isAvail = (checkInDate && checkOutDate) ? bed.is_available_for_dates : (bed.status === 'AVAILABLE');

            return (
              <div
                key={bed.id}
                className={`architectural-pod ${meta.cardClass}`}
                onClick={() => handleBedClick(bed)}
                title={`Click to view Bed ${bed.bed_number} (${meta.label})`}
              >
                <div className="pod-header">
                  <span className="pod-idx">#{idx + 1}</span>
                  <span className="pod-status-dot" style={{ backgroundColor: meta.dotColor }}></span>
                </div>

                <div className="pod-center">
                  <div className="pod-symbol">
                    <BedDouble size={22} />
                  </div>
                  <strong className="pod-code">{bed.bed_number}</strong>
                </div>

                <div className="pod-footer">
                  <span className="pod-state-label">{meta.label}</span>
                  <span className="pod-price">₹{bed.base_price_inr}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="beds-module animate-fade-in">
      {/* Top Header & Hospitality Title */}
      <div className="card beds-hero-panel">
        <div className="beds-header-top">
          <div className="beds-title-section">
            <span className="badge badge-accent">16 {t('nav_beds', 'Beds')}</span>
            <h2>{t('live_availability_title', 'Live Dormitory Availability')}</h2>
            <p className="subtitle">
              {t('live_availability_subtitle', 'Real-time database availability across all 3 floors (16 beds). Select your dates to see exact rates and reserved beds.')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isStaffOrOwner && onOpenGroupBooking && (
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => onOpenGroupBooking()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Reserve entire floor or multiple floors in one click"
              >
                <Users size={14} />
                <span>{t('bulk_wedding_booking_btn', 'Bulk Floor / Wedding Booking')}</span>
              </button>
            )}

            {/* Date Filter Bar */}
            <div className="date-filter-box">
              <div className="filter-input-group">
                <span className="input-icon"><Calendar size={15} color="#C25E40" /></span>
                <div className="date-field">
                  <label>{t('check_in_date_label', 'Check-In Date')}</label>
                  <input 
                    type="date" 
                    value={checkInDate || ''} 
                    onChange={(e) => setCheckInDate(e.target.value)} 
                    className="date-input"
                  />
                </div>
              </div>

              <div className="filter-input-group">
                <span className="input-icon"><Calendar size={15} color="#C25E40" /></span>
                <div className="date-field">
                  <label>{t('check_out_date_label', 'Check-Out Date')}</label>
                  <input 
                    type="date" 
                    value={checkOutDate || ''} 
                    onChange={(e) => setCheckOutDate(e.target.value)} 
                    className="date-input"
                  />
                </div>
              </div>

              {(checkInDate || checkOutDate) && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setCheckInDate(''); setCheckOutDate(''); }}
                >
                  {t('clear_dates', 'Clear Dates')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real Status Counters Bar */}
        <div className="status-legend-bar">
          <div className="legend-chip">
            <span className="dot dot-available"></span>
            <span>{t('status_available', 'Available')}: <strong>{statusCounts.available}</strong></span>
          </div>
          <div className="legend-chip">
            <span className="dot dot-reserved"></span>
            <span>{t('status_reserved', 'Reserved')}: <strong>{statusCounts.reserved}</strong></span>
          </div>
          <div className="legend-chip">
            <span className="dot dot-occupied"></span>
            <span>{t('status_occupied', 'Occupied')}: <strong>{statusCounts.occupied}</strong></span>
          </div>
          <div className="legend-chip">
            <span className="dot dot-cleaning"></span>
            <span>{t('cleaning_label', 'Cleaning')}: <strong>{statusCounts.cleaning}</strong></span>
          </div>
          <div className="legend-chip">
            <span className="dot dot-maintenance"></span>
            <span>{t('maintenance_label', 'Maintenance')}: <strong>{statusCounts.maintenance}</strong></span>
          </div>
        </div>

        {/* Floor Navigation Buttons */}
        <div className="floor-tabs">
          <button 
            className={`floor-btn ${selectedFloor === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedFloor('ALL')}
          >
            <Layers size={14} /> {t('all_floors_label', 'All Floors (16 Beds)')}
          </button>
          <button 
            className={`floor-btn ${selectedFloor === '1' ? 'active' : ''}`}
            onClick={() => setSelectedFloor('1')}
          >
            {t('floor_1_label', 'Floor 1 (5 Beds)')}
          </button>
          <button 
            className={`floor-btn ${selectedFloor === '2' ? 'active' : ''}`}
            onClick={() => setSelectedFloor('2')}
          >
            {t('floor_2_label', 'Floor 2 (6 Beds)')}
          </button>
          <button 
            className={`floor-btn ${selectedFloor === '3' ? 'active' : ''}`}
            onClick={() => setSelectedFloor('3')}
          >
            {t('floor_3_label', 'Floor 3 (5 Beds)')}
          </button>
        </div>
      </div>

      {/* Visual Architectural Floors */}
      {loading ? (
        <div className="card loading-box">
          <p>Loading real-time bed inventory from database...</p>
        </div>
      ) : (
        <div className="floors-container">
          {renderFloorMap(1, t('floor_1_blueprint_title', 'Floor 1 — Ground Residence'), floor1Beds)}
          {renderFloorMap(2, t('floor_2_blueprint_title', 'Floor 2 — Quiet Living Wing'), floor2Beds)}
          {renderFloorMap(3, t('floor_3_blueprint_title', 'Floor 3 — Top Floor Residence'), floor3Beds)}
        </div>
      )}

      {/* Bed Operational Details Modal */}
      {activeBedModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setActiveBedModal(null)}>
          <div className="modal-card bed-drawer-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="drawer-title-group">
                <span className="badge badge-accent">{t('floor_label', 'Floor')} {activeBedModal.floor_number}</span>
                <h3>{t('bed_label', 'Bed')} {activeBedModal.bed_number}</h3>
              </div>
              <button 
                className="btn btn-ghost btn-sm modal-close-btn"
                onClick={() => setActiveBedModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Status & Pricing Banner */}
              <div className="bed-modal-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">{t('current_status_label', 'Current Status')}</span>
                  <div className="meta-value">
                    <span className={`badge ${getStatusMeta(activeBedModal).badgeClass}`}>
                      {getStatusMeta(activeBedModal).label}
                    </span>
                  </div>
                </div>

                <div className="meta-item">
                  <span className="meta-label">{t('nightly_rate_modal_label', 'Nightly Rate')}</span>
                  <div className="meta-value price-text">
                    ₹{activeBedModal.base_price_inr} <span>{t('per_night', '/ night')}</span>
                  </div>
                </div>

                <div className="meta-item">
                  <span className="meta-label">{t('bed_floor_label', 'Bed Floor')}</span>
                  <div className="meta-value">{t('floor_label', 'Floor')} {activeBedModal.floor_number}</div>
                </div>

                <div className="meta-item">
                  <span className="meta-label">{t('power_socket_label', 'Power & Socket')}</span>
                  <div className="meta-value">{t('dedicated_socket_val', 'Dedicated 230V Port')}</div>
                </div>
              </div>

              {/* Description & Bed Amenities */}
              <div className="pod-amenities-card">
                <h4>{t('bed_features_heading', 'Bed Features & Inclusions')}</h4>
                <p className="pod-desc-text">
                  {t('bed_desc_default', 'Clean single bed with orthopaedic mattress, privacy curtains, universal 230V outlet & personal LED reading lamp.')}
                </p>
                <div className="amenities-tags-row">
                  <span className="amenity-tag"><Wind size={13} /> {t('climate_ac', 'Climate AC')}</span>
                  <span className="amenity-tag"><Lock size={13} /> {t('private_locker', 'Private Key Locker')}</span>
                  <span className="amenity-tag"><Zap size={13} /> {t('fast_charging', 'Fast USB/Plug')}</span>
                  <span className="amenity-tag"><Lightbulb size={13} /> {t('reading_lamp_feature', 'Reading Light')}</span>
                </div>
              </div>

              {/* Staff / Owner Operational Status Control */}
              {isStaffOrOwner ? (
                <div className="operational-control-box">
                  <h4>{t('operational_mgmt', 'Operational Bed Status Management')}</h4>
                  <p className="control-subtext">{t('operational_sub', 'Update bed readiness immediately across all dashboards.')}</p>
                  
                  <div className="status-update-row">
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      className="form-select status-select-field"
                    >
                      <option value="AVAILABLE">{t('status_available', 'Available')}</option>
                      <option value="RESERVED">{t('status_reserved', 'Reserved')}</option>
                      <option value="OCCUPIED">{t('status_occupied', 'Occupied')}</option>
                      <option value="CLEANING_REQUIRED">{t('status_cleaning_required', 'Cleaning Required')}</option>
                      <option value="CLEANING_IN_PROGRESS">{t('status_cleaning_in_progress', 'Cleaning In Progress')}</option>
                      <option value="MAINTENANCE">{t('status_maintenance', 'Under Maintenance')}</option>
                    </select>

                    <button 
                      className="btn btn-primary"
                      onClick={handleSaveBedStatus}
                    >
                      {t('save_status', 'Save Status')}
                    </button>
                  </div>

                  <div className="operational-actions-row">
                    <button
                      className="btn btn-secondary btn-block"
                      onClick={() => {
                        setActiveBedModal(null);
                        onSelectBed(activeBedModal);
                      }}
                    >
                      <PhoneCall size={15} />
                      <span>{t('record_frontdesk_for_bed', 'Record Front Desk Booking for Bed')} {activeBedModal.bed_number}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="guest-cta-box">
                  <h4>{t('want_to_reserve_bed', 'Want to reserve Bed')} {activeBedModal.bed_number}?</h4>
                  <p>{t('book_online_or_call', 'Book online directly or call our 24/7 Front Desk.')}</p>
                  <div className="guest-btn-row">
                    <button 
                      className="btn btn-primary btn-block"
                      onClick={() => {
                        setActiveBedModal(null);
                        onSelectBed(activeBedModal);
                      }}
                    >
                      {t('book_bed_btn', 'Book Bed')} {activeBedModal.bed_number}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .beds-module {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .beds-hero-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .beds-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }
        .beds-title-section h2 {
          font-family: var(--font-serif);
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 4px;
        }
        .subtitle {
          font-size: 0.88rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .date-filter-box {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          background: var(--bg-secondary);
          padding: 8px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }
        .filter-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .input-icon {
          display: flex;
          align-items: center;
        }
        .date-field {
          display: flex;
          flex-direction: column;
        }
        .date-field label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .date-input {
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 0.85rem;
          font-weight: 600;
          outline: none;
        }
        .status-legend-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 4px;
        }
        .legend-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          color: var(--text-body);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-available { background: var(--success); }
        .dot-reserved { background: var(--warning); }
        .dot-occupied { background: var(--occupied); }
        .dot-cleaning { background: var(--cleaning); }
        .dot-maintenance { background: var(--danger); }

        .floor-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .floor-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text-muted);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          transition: var(--transition);
        }
        .floor-btn:hover {
          color: var(--text-main);
          background: #EFECE6;
        }
        .floor-btn.active {
          color: #FFFFFF;
          background: var(--primary);
          border-color: var(--primary);
        }
        .floors-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .floor-blueprint-section {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .floor-blueprint-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
        }
        .floor-title-group {
          display: flex;
          flex-direction: column;
        }
        .floor-eyebrow {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .floor-blueprint-header h3 {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .floor-meta-count {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .floor-ready-text {
          color: var(--success);
          font-weight: 700;
        }
        .dot-divider {
          color: var(--border-strong);
        }

        /* Floor Pods Row / Architectural visual blocks */
        .floor-pods-row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .architectural-pod {
          background: #FFFFFF;
          border: 1.5px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          transition: var(--transition);
          box-shadow: var(--shadow-sm);
        }
        .architectural-pod:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--primary-border);
        }
        .architectural-pod.status-available {
          border-color: var(--success-border);
          background: linear-gradient(180deg, #FFFFFF 60%, var(--success-light) 100%);
        }
        .architectural-pod.status-available:hover {
          border-color: var(--success);
        }
        .architectural-pod.status-reserved {
          border-color: var(--warning-border);
          background: linear-gradient(180deg, #FFFFFF 60%, var(--warning-light) 100%);
        }
        .architectural-pod.status-occupied {
          border-color: var(--occupied-border);
          background: linear-gradient(180deg, #FFFFFF 60%, var(--occupied-light) 100%);
        }
        .architectural-pod.status-cleaning {
          border-color: var(--cleaning-border);
          background: linear-gradient(180deg, #FFFFFF 60%, var(--cleaning-light) 100%);
        }
        .architectural-pod.status-maintenance {
          border-color: var(--danger-border);
          background: linear-gradient(180deg, #FFFFFF 60%, var(--danger-light) 100%);
        }
        .pod-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pod-idx {
          font-size: 0.72rem;
          color: var(--text-dim);
          font-weight: 700;
        }
        .pod-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .pod-center {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 0;
        }
        .pod-symbol {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-body);
        }
        .architectural-pod.status-available .pod-symbol {
          color: var(--success);
          background: var(--success-light);
        }
        .architectural-pod.status-reserved .pod-symbol {
          color: var(--warning);
          background: var(--warning-light);
        }
        .architectural-pod.status-occupied .pod-symbol {
          color: var(--occupied);
          background: var(--occupied-light);
        }
        .pod-code {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }
        .pod-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px dashed var(--border-subtle);
        }
        .pod-state-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-body);
        }
        .pod-price {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary);
        }

        /* Modal / Bed Details Drawer */
        .bed-drawer-card {
          max-width: 540px;
          width: 90%;
        }
        .drawer-title-group h3 {
          font-family: var(--font-serif);
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 2px;
        }
        .bed-modal-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          background: var(--bg-secondary);
          padding: 14px;
          border-radius: var(--radius-md);
          margin-bottom: 16px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .meta-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .meta-value {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .price-text {
          color: var(--primary);
          font-size: 1.1rem;
        }
        .price-text span {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: normal;
        }
        .pod-amenities-card {
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
          margin-bottom: 16px;
        }
        .pod-amenities-card h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 6px;
        }
        .pod-desc-text {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.45;
          margin-bottom: 10px;
        }
        .amenities-tags-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .amenity-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-body);
          background: var(--bg-secondary);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }
        .operational-control-box {
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .operational-control-box h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--primary-hover);
        }
        .control-subtext {
          font-size: 0.78rem;
          color: var(--text-body);
          margin-top: -6px;
        }
        .status-update-row {
          display: flex;
          gap: 10px;
        }
        .status-select-field {
          flex: 1;
          font-size: 0.85rem;
          background: #FFFFFF;
        }
        .guest-cta-box {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 18px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .guest-cta-box h4 {
          font-family: var(--font-serif);
          font-size: 1.1rem;
          color: var(--text-main);
        }
        .guest-cta-box p {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .loading-box {
          padding: 60px;
          text-align: center;
          color: var(--text-muted);
        }
        @media (max-width: 640px) {
          .floor-pods-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .beds-header-top {
            flex-direction: column;
            align-items: flex-start;
          }
          .date-filter-box {
            width: 100%;
          }
          .status-update-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
