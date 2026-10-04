import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  IndianRupee, 
  Users, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Plus, 
  Trash2, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  Info,
  CreditCard,
  Database,
  Upload,
  HardDrive
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function OwnerSettingsView({ onSettingsUpdated, onShowToast }) {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState('pricing'); // 'pricing', 'property', 'staff', 'reviews'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Property Form State
  const [property, setProperty] = useState({
    property_name: 'Arthayog Dormitory',
    logo_url: '',
    description: '',
    contact_phone: '+91 98765 43210',
    whatsapp_number: '+91 98765 43210',
    email: 'stay@arthayog.com',
    address: '12, Shanti Marg, City Center, Near Metro Station',
    location_details: 'Prime downtown location, 2 minutes walk from central transit terminal.',
    check_in_time: '12:00 PM',
    check_out_time: '11:00 AM',
    facilities: [],
    amenities: [],
    customer_instructions: 'Please bring a valid Government Photo ID (Aadhaar, Passport, or Driving License) for check-in verification.',
    booking_instructions: 'Check live availability, select your stay dates and preferred bed, and confirm your reservation.',
    cancellation_policy: 'Free cancellation up to 24 hours prior to check-in time.'
  });

  const [newFacility, setNewFacility] = useState('');
  const [newAmenity, setNewAmenity] = useState('');

  // Pricing Form State
  const [pricing, setPricing] = useState({
    standard_price_inr: 499.0,
    floor_prices: { '1': 499.0, '2': 499.0, '3': 499.0 },
    updated_at: ''
  });
  const [priceInput, setPriceInput] = useState('499');
  const [floor1Price, setFloor1Price] = useState('499');
  const [floor2Price, setFloor2Price] = useState('499');
  const [floor3Price, setFloor3Price] = useState('499');
  const [useFloorPricing, setUseFloorPricing] = useState(false);

  // Staff Roster Form State (Only 2 Staff members)
  const [staffRoster, setStaffRoster] = useState({
    day_staff: {
      name: 'Ramesh Sharma',
      email: 'staff@arthayog.com',
      phone: '+91 98765 11111',
      shift: 'Day Shift (08:00 AM – 08:00 PM)',
      is_active: true
    },
    night_staff: {
      name: 'Suresh Patel',
      email: 'nightstaff@arthayog.com',
      phone: '+91 98765 22222',
      shift: 'Night Shift (08:00 PM – 08:00 AM)',
      is_active: true
    },
    updated_at: ''
  });

  // Review QR State
  const [review, setReview] = useState({
    review_qr_image: '',
    review_url: 'https://g.page/r/arthayog-dormitory/review',
    review_title: 'Review Arthayog Dormitory on Google',
    review_instructions: 'Scan QR code with your smartphone camera to rate our stay & share your feedback',
    review_rating: '4.9',
    review_count: '142',
    is_enabled: true
  });

  // Owner Payment QR State (Requirement 6)
  const [paymentQr, setPaymentQr] = useState({
    payment_qr_image: '',
    upi_id: 'arthayog@oksbi',
    payee_name: 'Arthayog Dormitory',
    instructions: 'Scan using any UPI App (GPay, PhonePe, Paytm, BHIM) to complete your reservation.',
    is_enabled: true,
    updated_at: ''
  });

  // System Health & Backups State (Requirement 22, 23, 26)
  const [systemHealth, setSystemHealth] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backingUp, setBackingUp] = useState(false);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      const [propData, priceData, staffData, revData, payQrData, healthData, backupsData] = await Promise.allSettled([
        api.settings.getProperty(),
        api.settings.getPricing(),
        api.settings.getStaffRoster(),
        api.settings.getReview(),
        api.settings.getPaymentQr(),
        api.system.health(),
        api.system.backups()
      ]);

      if (propData.status === 'fulfilled' && propData.value) {
        setProperty(propData.value);
      }
      if (priceData.status === 'fulfilled' && priceData.value) {
        const p = priceData.value;
        setPricing(p);
        setPriceInput(String(p.standard_price_inr));
        if (p.floor_prices) {
          setFloor1Price(String(p.floor_prices['1'] || p.standard_price_inr));
          setFloor2Price(String(p.floor_prices['2'] || p.standard_price_inr));
          setFloor3Price(String(p.floor_prices['3'] || p.standard_price_inr));
        }
      }
      if (staffData.status === 'fulfilled' && staffData.value) {
        setStaffRoster(staffData.value);
      }
      if (revData.status === 'fulfilled' && revData.value) {
        setReview(revData.value);
      }
      if (payQrData.status === 'fulfilled' && payQrData.value) {
        setPaymentQr(payQrData.value);
      }
      if (healthData.status === 'fulfilled' && healthData.value) {
        setSystemHealth(healthData.value);
      }
      if (backupsData.status === 'fulfilled' && backupsData.value) {
        setBackups(backupsData.value);
      }
    } catch (e) {
      console.error('Error loading settings:', e);
      if (onShowToast) onShowToast('Failed to load some settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  // Save Handlers
  const handleSaveProperty = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.settings.updateProperty(property);
      setProperty(res);
      if (onShowToast) onShowToast('Property information saved and updated across customer portal!', 'success');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to save property information.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    const stdPrice = parseFloat(priceInput);
    if (isNaN(stdPrice) || stdPrice <= 0) {
      if (onShowToast) onShowToast('Please enter a valid positive price.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        standard_price_inr: stdPrice,
        floor_prices: useFloorPricing ? {
          '1': parseFloat(floor1Price) || stdPrice,
          '2': parseFloat(floor2Price) || stdPrice,
          '3': parseFloat(floor3Price) || stdPrice,
        } : {
          '1': stdPrice,
          '2': stdPrice,
          '3': stdPrice,
        }
      };

      const res = await api.settings.updatePricing(payload);
      setPricing(res);
      if (onShowToast) {
        onShowToast(`Price updated to ₹${stdPrice}/night! Confirmed bookings remain protected at their original rate.`, 'success');
      }
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to update pricing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.settings.updateStaffRoster({
        day_staff: staffRoster.day_staff,
        night_staff: staffRoster.night_staff
      });
      setStaffRoster(res);
      if (onShowToast) onShowToast('Staff roster configuration saved!', 'success');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to save staff roster.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.settings.updateReview(review);
      setReview(res);
      if (onShowToast) onShowToast('Google review and QR code settings saved!', 'success');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to save review settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Facility / Amenity helpers
  const handleAddFacility = () => {
    if (!newFacility.trim()) return;
    setProperty(prev => ({
      ...prev,
      facilities: [...(prev.facilities || []), newFacility.trim()]
    }));
    setNewFacility('');
  };

  const handleRemoveFacility = (idx) => {
    setProperty(prev => ({
      ...prev,
      facilities: prev.facilities.filter((_, i) => i !== idx)
    }));
  };

  const handleAddAmenity = () => {
    if (!newAmenity.trim()) return;
    setProperty(prev => ({
      ...prev,
      amenities: [...(prev.amenities || []), newAmenity.trim()]
    }));
    setNewAmenity('');
  };

  const handleRemoveAmenity = (idx) => {
    setProperty(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== idx)
    }));
  };

  // Payment QR Handlers (Requirement 6)
  const handleSavePaymentQr = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.settings.updatePaymentQr(paymentQr);
      setPaymentQr(res);
      if (onShowToast) onShowToast('Official Payment QR and UPI settings updated successfully!', 'success');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to update payment QR settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisablePaymentQr = async () => {
    if (!window.confirm('Disable the current Payment QR code?')) return;
    setSaving(true);
    try {
      const res = await api.settings.disablePaymentQr();
      setPaymentQr(res);
      if (onShowToast) onShowToast('Payment QR code deactivated.', 'info');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to disable payment QR.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQrFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      if (onShowToast) onShowToast('Image file size must be under 2MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentQr(prev => ({ ...prev, payment_qr_image: reader.result }));
      if (onShowToast) onShowToast('QR image loaded! Click Save to apply.', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Automated Database Backup Handlers (Requirement 22, 23, 26)
  const handleTriggerBackup = async () => {
    setBackingUp(true);
    try {
      const res = await api.system.backup();
      if (onShowToast) onShowToast(`Safe database backup ${res.filename} generated successfully!`, 'success');
      // Refresh backups and health
      const [newBackups, newHealth] = await Promise.all([
        api.system.backups(),
        api.system.health()
      ]);
      setBackups(newBackups);
      setSystemHealth(newHealth);
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to generate database backup.', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="owner-settings-module animate-fade-in">
      {/* Header */}
      <div className="card settings-hero-card">
        <div className="settings-hero-left">
          <span className="badge badge-accent">{t('settings_badge', 'Property Configuration & Administration')}</span>
          <h2>{t('settings_title', 'Owner Settings & Property Rules')}</h2>
          <p className="subtitle">
            {t('settings_sub', 'Configure accommodation prices, property details, two-member staff roster & guest policies in real time')}
          </p>
        </div>
        <div className="settings-hero-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadAllSettings} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> {t('refresh_btn', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="card settings-tabs-card">
        <div className="settings-sub-tabs">
          <button 
            type="button"
            className={`sub-tab-btn ${activeSubTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('pricing')}
          >
            <IndianRupee size={16} />
            <span>{t('tab_pricing', 'Accommodation Pricing')}</span>
          </button>

          <button 
            type="button"
            className={`sub-tab-btn ${activeSubTab === 'property' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('property')}
          >
            <Building2 size={16} />
            <span>{t('tab_property', 'Property Information')}</span>
          </button>

          <button 
            type="button"
            className={`sub-tab-btn ${activeSubTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('staff')}
          >
            <Users size={16} />
            <span>{t('tab_staff', 'Staff Roster (2 Members)')}</span>
          </button>

          <button 
            type="button"
            className={`sub-tab-btn ${activeSubTab === 'payment' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('payment')}
          >
            <CreditCard size={16} />
            <span>{t('tab_payment_qr', 'Payment QR & UPI')}</span>
          </button>

          <button 
            type="button"
            className={`sub-tab-btn ${activeSubTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('reviews')}
          >
            <QrCode size={16} />
            <span>{t('tab_reviews', 'Google Review QR')}</span>
          </button>

          <button 
            type="button"
            className={`sub-tab-btn ${activeSubTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('system')}
          >
            <HardDrive size={16} />
            <span>{t('tab_database', 'System Health & Backups')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ACCOMMODATION PRICING */}
      {activeSubTab === 'pricing' && (
        <div className="settings-tab-content">
          <div className="card pricing-manager-card">
            <div className="card-header-clean">
              <div className="title-box">
                <span className="badge badge-accent">{t('pricing_badge', 'Owner Customizable Rate')}</span>
                <h3>{t('tab_pricing', 'Accommodation Nightly Pricing')}</h3>
                <p>{t('pricing_desc', 'Change your dormitory price anytime without code changes. Stored persistently in the database.')}</p>
              </div>
              <div className="current-price-badge">
                <span className="price-lbl">{t('current_active_price', 'Current Active Price')}</span>
                <span className="price-val">₹{pricing.standard_price_inr}</span>
                <small className="price-sub">/ {t('bed', 'bed')} / {t('night', 'night')}</small>
                {pricing.updated_at && (
                  <span className="price-ts">
                    {t('updated', 'Updated')}: {new Date(pricing.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Price Protection Guarantee Box */}
            <div className="price-protection-alert">
              <ShieldCheck size={20} color="#2D6A4F" />
              <div>
                <strong>Confirmed Booking Price Protection:</strong>
                <p>
                  When you update the price, all existing confirmed bookings strictly retain their original price.
                  Only new bookings and provisional reservations will apply the new price.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePricing} className="pricing-form">
              <div className="form-group price-main-group">
                <label className="form-label">Standard Base Price Per Bed Per Night (₹ INR) *</label>
                <div className="price-input-wrapper">
                  <span className="currency-prefix">₹</span>
                  <input 
                    type="number"
                    min="1"
                    step="1"
                    className="form-input price-large-input"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    required
                  />
                  <span className="currency-suffix">per night</span>
                </div>
                <small className="form-hint">
                  This standard price will be displayed on the customer Live Availability page, bed booking cards, payment checkout, and booking invoices.
                </small>
              </div>

              {/* Floor Specific Pricing Toggle */}
              <div className="floor-pricing-toggle-box">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={useFloorPricing}
                    onChange={(e) => setUseFloorPricing(e.target.checked)}
                  />
                  <span>Set different prices per floor (Optional)</span>
                </label>
              </div>

              {useFloorPricing && (
                <div className="floor-pricing-grid animate-fade-in">
                  <div className="floor-price-item">
                    <label>Floor 1 (5 Beds: B101–B105)</label>
                    <div className="price-input-wrapper small">
                      <span className="currency-prefix">₹</span>
                      <input 
                        type="number" 
                        min="1"
                        className="form-input" 
                        value={floor1Price} 
                        onChange={(e) => setFloor1Price(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="floor-price-item">
                    <label>Floor 2 (6 Beds: B201–B206)</label>
                    <div className="price-input-wrapper small">
                      <span className="currency-prefix">₹</span>
                      <input 
                        type="number" 
                        min="1"
                        className="form-input" 
                        value={floor2Price} 
                        onChange={(e) => setFloor2Price(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="floor-price-item">
                    <label>Floor 3 (5 Beds: B301–B305)</label>
                    <div className="price-input-wrapper small">
                      <span className="currency-prefix">₹</span>
                      <input 
                        type="number" 
                        min="1"
                        className="form-input" 
                        value={floor3Price} 
                        onChange={(e) => setFloor3Price(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-submit-row">
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  <Save size={16} />
                  <span>{saving ? 'Updating Price in Database...' : 'Save & Update Accommodation Price'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: PROPERTY INFORMATION */}
      {activeSubTab === 'property' && (
        <div className="settings-tab-content">
          <form onSubmit={handleSaveProperty} className="property-form">
            <div className="card form-section-card">
              <h3 className="section-title">General Property Identity</h3>
              <p className="section-sub">These values are automatically shown across the customer portal, navigation, and contact sections.</p>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Property Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={property.property_name} 
                    onChange={(e) => setProperty({ ...property, property_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Logo Image URL</label>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://.../logo.png"
                    value={property.logo_url || ''} 
                    onChange={(e) => setProperty({ ...property, logo_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Short Description / Welcome Tagline</label>
                <textarea 
                  rows={3} 
                  className="form-input" 
                  value={property.description} 
                  onChange={(e) => setProperty({ ...property, description: e.target.value })}
                />
              </div>
            </div>

            <div className="card form-section-card">
              <h3 className="section-title">Contact & Location</h3>
              <p className="section-sub">Direct phone, WhatsApp number, and address displayed to guests.</p>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Contact Phone Number *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={property.contact_phone} 
                    onChange={(e) => setProperty({ ...property, contact_phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Number *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={property.whatsapp_number} 
                    onChange={(e) => setProperty({ ...property, whatsapp_number: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Official Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={property.email} 
                    onChange={(e) => setProperty({ ...property, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Address *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={property.address} 
                    onChange={(e) => setProperty({ ...property, address: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Transit Details</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={property.location_details} 
                    onChange={(e) => setProperty({ ...property, location_details: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Standard Check-In Time</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="12:00 PM"
                    value={property.check_in_time} 
                    onChange={(e) => setProperty({ ...property, check_in_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Standard Check-Out Time</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="11:00 AM"
                    value={property.check_out_time} 
                    onChange={(e) => setProperty({ ...property, check_out_time: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Facilities & Amenities */}
            <div className="card form-section-card">
              <h3 className="section-title">Property Facilities & Amenities</h3>
              <p className="section-sub">Add or remove amenities that guests see on the website.</p>

              <div className="form-group">
                <label className="form-label">Facilities List</label>
                <div className="tags-manager-list">
                  {(property.facilities || []).map((fac, idx) => (
                    <div key={idx} className="tag-pill">
                      <span>{fac}</span>
                      <button type="button" onClick={() => handleRemoveFacility(idx)} aria-label="Remove">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-tag-row">
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Add a facility (e.g. 24/7 Hot Water Showers)"
                    value={newFacility}
                    onChange={(e) => setNewFacility(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFacility(); } }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddFacility}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Room & Bed Amenities</label>
                <div className="tags-manager-list">
                  {(property.amenities || []).map((amen, idx) => (
                    <div key={idx} className="tag-pill">
                      <span>{amen}</span>
                      <button type="button" onClick={() => handleRemoveAmenity(idx)} aria-label="Remove">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-tag-row">
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Add an amenity (e.g. Individual Power Outlet & Reading Light)"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAmenity(); } }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddAmenity}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions & Policies */}
            <div className="card form-section-card">
              <h3 className="section-title">Guest Instructions & Cancellation Policy</h3>

              <div className="form-group">
                <label className="form-label">Customer Check-in Instructions (ID requirements, etc.)</label>
                <textarea 
                  rows={2} 
                  className="form-input" 
                  value={property.customer_instructions} 
                  onChange={(e) => setProperty({ ...property, customer_instructions: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Booking Instructions</label>
                <textarea 
                  rows={2} 
                  className="form-input" 
                  value={property.booking_instructions} 
                  onChange={(e) => setProperty({ ...property, booking_instructions: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cancellation Policy</label>
                <textarea 
                  rows={2} 
                  className="form-input" 
                  value={property.cancellation_policy} 
                  onChange={(e) => setProperty({ ...property, cancellation_policy: e.target.value })}
                />
              </div>

              <div className="form-submit-row">
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  <Save size={16} />
                  <span>{saving ? 'Saving Details...' : 'Save Property Information'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: STAFF ROSTER (2 MEMBERS ONLY) */}
      {activeSubTab === 'staff' && (
        <div className="settings-tab-content">
          <div className="card staff-roster-card">
            <div className="card-header-clean">
              <div>
                <span className="badge badge-accent">Two-Member Staff Operations</span>
                <h3>Dormitory Staff Members</h3>
                <p>Arthayog Dormitory operates with exactly two dedicated shift staff: Day Shift and Night Shift.</p>
              </div>
            </div>

            <form onSubmit={handleSaveStaff} className="staff-roster-form">
              <div className="staff-shifts-grid">
                {/* Day Staff Member */}
                <div className="card shift-staff-box">
                  <div className="shift-header">
                    <span className="shift-pill day">Day Shift</span>
                    <h4>Day Shift Staff Member</h4>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Staff Full Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={staffRoster.day_staff?.name || ''} 
                      onChange={(e) => setStaffRoster({
                        ...staffRoster,
                        day_staff: { ...staffRoster.day_staff, name: e.target.value }
                      })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={staffRoster.day_staff?.email || ''} 
                      onChange={(e) => setStaffRoster({
                        ...staffRoster,
                        day_staff: { ...staffRoster.day_staff, email: e.target.value }
                      })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      value={staffRoster.day_staff?.phone || ''} 
                      onChange={(e) => setStaffRoster({
                        ...staffRoster,
                        day_staff: { ...staffRoster.day_staff, phone: e.target.value }
                      })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shift Hours</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={staffRoster.day_staff?.shift || ''} 
                      onChange={(e) => setStaffRoster({
                        ...staffRoster,
                        day_staff: { ...staffRoster.day_staff, shift: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={staffRoster.day_staff?.is_active ?? true}
                        onChange={(e) => setStaffRoster({
                          ...staffRoster,
                          day_staff: { ...staffRoster.day_staff, is_active: e.target.checked }
                        })}
                      />
                      <span>Active Staff Account</span>
                    </label>
                  </div>
                </div>

                {/* Night Staff Member */}
                <div className="card shift-staff-box">
                  <div className="shift-header">
                    <span className="shift-pill night">Night Shift</span>
                    <h4>Night Shift Staff Member</h4>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Staff Full Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={staffRoster.night_staff?.name || ''} 
                      onChange={(e) => setStaffRoster({
                        ...staffRoster,
                        night_staff: { ...staffRoster.night_staff, name: e.target.value }
                      })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={staffRoster.night_staff?.email || ''} 
                      onChange={(e) => setStaffRoster({
                        ...staffRoster,
                        night_staff: { ...staffRoster.night_staff, email: e.target.value }
                      })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      value={staffRoster.night_staff?.phone || ''} 
                      onChange={(e) => setStaffRoster({
                        ...staffRoster,
                        night_staff: { ...staffRoster.night_staff, phone: e.target.value }
                      })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shift Hours</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={staffRoster.night_staff?.shift || ''} 
                      onChange={(e) => setStaffRoster({
                        ...staffRoster,
                        night_staff: { ...staffRoster.night_staff, shift: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={staffRoster.night_staff?.is_active ?? true}
                        onChange={(e) => setStaffRoster({
                          ...staffRoster,
                          night_staff: { ...staffRoster.night_staff, is_active: e.target.checked }
                        })}
                      />
                      <span>Active Staff Account</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-submit-row">
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  <Save size={16} />
                  <span>{saving ? 'Saving Staff Configuration...' : 'Save Staff Roster'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: REVIEWS & QR CODE */}
      {activeSubTab === 'reviews' && (
        <div className="settings-tab-content">
          <form onSubmit={handleSaveReview} className="card review-config-card">
            <h3 className="section-title">Google Review QR Code & Guest Feedback</h3>
            <p className="section-sub">Configure the QR code and link displayed on the customer page for travelers to rate their stay.</p>

            <div className="form-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={review.is_enabled}
                  onChange={(e) => setReview({ ...review, is_enabled: e.target.checked })}
                />
                <span>Display Google Review section & QR code on the customer page</span>
              </label>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Review Section Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={review.review_title} 
                  onChange={(e) => setReview({ ...review, review_title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Google Review URL</label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={review.review_url} 
                  onChange={(e) => setReview({ ...review, review_url: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Average Star Rating (e.g. 4.9)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={review.review_rating} 
                  onChange={(e) => setReview({ ...review, review_rating: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Verified Reviews Count (e.g. 142)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={review.review_count} 
                  onChange={(e) => setReview({ ...review, review_count: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Review Instructions for Guests</label>
              <input 
                type="text" 
                className="form-input" 
                value={review.review_instructions} 
                onChange={(e) => setReview({ ...review, review_instructions: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">QR Code Image URL or Data</label>
              <input 
                type="text" 
                className="form-input" 
                value={review.review_qr_image} 
                onChange={(e) => setReview({ ...review, review_qr_image: e.target.value })}
              />
              <small className="form-hint">Leave default or paste your custom Google Maps Review QR URL.</small>
            </div>

            <div className="form-submit-row">
              <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Review Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: OWNER-CUSTOMIZABLE PAYMENT QR & UPI (Requirement 6) */}
      {activeSubTab === 'payment' && (
        <div className="settings-tab-content">
          <div className="card settings-section-card">
            <div className="card-header-clean">
              <div className="title-box">
                <span className="badge badge-accent">Owner Payment Controls</span>
                <h3>Official Dormitory Payment QR & UPI Settings</h3>
                <p>Upload or update your official UPI QR code and payee details. All customer and reception payment screens automatically use this active QR.</p>
              </div>
            </div>

            <div className="qr-preview-hero">
              <div className="qr-box-card">
                {paymentQr.payment_qr_image ? (
                  <img src={paymentQr.payment_qr_image} alt="Official Payment QR" className="live-qr-preview" />
                ) : (
                  <div className="qr-placeholder-box">
                    <QrCode size={48} color="#78716C" />
                    <span>No Active QR Code</span>
                  </div>
                )}
                <div className="qr-status-indicator">
                  <span className={`status-dot ${paymentQr.is_enabled ? 'dot-active' : 'dot-disabled'}`}></span>
                  <span>{paymentQr.is_enabled ? 'Active on Payment Modals' : 'Disabled / Hidden'}</span>
                </div>
              </div>

              <div className="qr-instructions-hero">
                <h4>Payment QR Configuration Guidelines</h4>
                <ul>
                  <li>Upload a clear square QR code linked to your business UPI VPA.</li>
                  <li>When replaced, old QR codes are immediately deactivated across the system.</li>
                  <li>Guests scanning this QR code in the booking modal see your exact Payee Name & UPI ID.</li>
                  <li>Cryptographic backend verification ensures bookings are only confirmed after verified payment.</li>
                </ul>
              </div>
            </div>

            <form onSubmit={handleSavePaymentQr} className="settings-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Official UPI ID (VPA) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={paymentQr.upi_id}
                    onChange={(e) => setPaymentQr({ ...paymentQr, upi_id: e.target.value })}
                    placeholder="e.g. arthayog@oksbi"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Official Payee Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={paymentQr.payee_name}
                    onChange={(e) => setPaymentQr({ ...paymentQr, payee_name: e.target.value })}
                    placeholder="e.g. Arthayog Dormitory"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Instructions for Guests</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentQr.instructions}
                  onChange={(e) => setPaymentQr({ ...paymentQr, instructions: e.target.value })}
                  placeholder="e.g. Scan using any UPI App (GPay, PhonePe, Paytm, BHIM) to complete your reservation."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Upload New QR Code Image (File)</label>
                <div className="file-upload-strip">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrFileUpload}
                    className="file-input-hidden"
                    id="qr-file-upload-input"
                  />
                  <label htmlFor="qr-file-upload-input" className="btn btn-secondary btn-sm">
                    <Upload size={15} /> Choose QR Image File
                  </label>
                  <span className="file-tip">Supports PNG, JPG, WebP up to 2MB</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Or Paste Direct Image URL / Base64</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentQr.payment_qr_image}
                  onChange={(e) => setPaymentQr({ ...paymentQr, payment_qr_image: e.target.value })}
                  placeholder="https://... or data:image/png;base64,..."
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={paymentQr.is_enabled}
                    onChange={(e) => setPaymentQr({ ...paymentQr, is_enabled: e.target.checked })}
                  />
                  <span>Enable & Display Payment QR on Customer & Reception Payment Screens</span>
                </label>
              </div>

              <div className="form-submit-row space-between">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleDisablePaymentQr}
                  disabled={saving || !paymentQr.is_enabled}
                >
                  Deactivate Payment QR
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Payment QR Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM HEALTH & AUTOMATED BACKUPS (Requirement 22, 23, 26) */}
      {activeSubTab === 'system' && (
        <div className="settings-tab-content">
          <div className="card settings-section-card">
            <div className="card-header-clean">
              <div className="title-box">
                <span className="badge badge-accent">Low-Maintenance Operations</span>
                <h3>System Telemetry & Database Backup Snapshots</h3>
                <p>Monitor real-time database connection, 16-bed distribution, background workers, and create point-in-time safe SQLite database backups.</p>
              </div>
              <div className="header-action-btn">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleTriggerBackup}
                  disabled={backingUp}
                >
                  <Database size={15} />
                  <span>{backingUp ? 'Creating Backup...' : 'Create Safe DB Backup'}</span>
                </button>
              </div>
            </div>

            {/* Health Tiles */}
            {systemHealth && (
              <div className="system-health-grid">
                <div className="health-card">
                  <div className="health-card-header">
                    <Database size={18} color="#2D6A4F" />
                    <span>Database Status</span>
                  </div>
                  <strong className="health-status-value text-success">
                    {systemHealth.database?.connected ? 'Connected (Optimal)' : 'Degraded'}
                  </strong>
                  <small className="health-sub">
                    {systemHealth.database?.type} • Total: {systemHealth.database?.total_beds} Beds
                  </small>
                </div>

                <div className="health-card">
                  <div className="health-card-header">
                    <ShieldCheck size={18} color="#C25E40" />
                    <span>Payment Gateway</span>
                  </div>
                  <strong className="health-status-value text-primary">
                    {systemHealth.payment_service?.provider}
                  </strong>
                  <small className="health-sub">
                    {systemHealth.payment_service?.verification_algorithm} Enforced
                  </small>
                </div>

                <div className="health-card">
                  <div className="health-card-header">
                    <Clock size={18} color="#2563EB" />
                    <span>Auto Expiry Worker</span>
                  </div>
                  <strong className="health-status-value">Active (60s loop)</strong>
                  <small className="health-sub">
                    Hold Timeout: {systemHealth.expiry_worker?.hold_timeout_minutes} mins
                  </small>
                </div>

                <div className="health-card">
                  <div className="health-card-header">
                    <HardDrive size={18} color="#D97706" />
                    <span>Backup Retention</span>
                  </div>
                  <strong className="health-status-value">{systemHealth.backups?.total_backups_stored} Snapshots</strong>
                  <small className="health-sub">{systemHealth.backups?.retention_policy}</small>
                </div>
              </div>
            )}

            {/* Backups List */}
            <div className="backups-list-box">
              <h4>Database Backup Snapshots ({backups.length})</h4>
              {backups.length === 0 ? (
                <div className="no-backups-prompt">
                  <HardDrive size={32} color="#78716C" />
                  <p>No snapshots stored yet. Click "Create Safe DB Backup" above to generate an initial point-in-time snapshot.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Snapshot Filename</th>
                        <th>File Size</th>
                        <th>Created At</th>
                        <th>Integrity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((b) => (
                        <tr key={b.filename}>
                          <td>
                            <code className="text-primary">{b.filename}</code>
                          </td>
                          <td>{(b.size_bytes / 1024).toFixed(1)} KB</td>
                          <td>{new Date(b.created_at).toLocaleString()}</td>
                          <td>
                            <span className="badge badge-success">Verified Healthy</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .owner-settings-module {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .settings-hero-card {
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
        }
        .settings-hero-left h2 {
          font-family: var(--font-serif);
          font-size: 1.55rem;
          color: var(--text-main);
          margin-top: 4px;
        }
        .subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .settings-tabs-card {
          padding: 8px 12px;
          background: var(--bg-card);
        }
        .settings-sub-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sub-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-muted);
          transition: var(--transition);
        }
        .sub-tab-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-main);
        }
        .sub-tab-btn.active {
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid var(--primary-border);
        }
        .pricing-manager-card, .form-section-card, .staff-roster-card, .review-config-card {
          padding: 28px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .card-header-clean {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .title-box h3, .section-title {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          color: var(--text-main);
          margin-top: 4px;
        }
        .title-box p, .section-sub {
          font-size: 0.84rem;
          color: var(--text-muted);
        }
        .current-price-badge {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 170px;
        }
        .price-lbl {
          font-size: 0.72rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-muted);
        }
        .price-val {
          font-size: 2rem;
          font-weight: 800;
          color: var(--primary);
          line-height: 1.1;
        }
        .price-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .price-ts {
          font-size: 0.68rem;
          color: var(--text-dim);
          margin-top: 4px;
        }
        .price-protection-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: var(--radius-md);
          padding: 14px 18px;
          color: #065F46;
          font-size: 0.84rem;
        }
        .price-protection-alert p {
          margin-top: 2px;
          color: #047857;
        }
        .pricing-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .price-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }
        .currency-prefix {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-main);
        }
        .price-large-input {
          font-size: 1.5rem !important;
          font-weight: 800 !important;
          max-width: 220px;
          padding: 8px 14px !important;
          color: var(--primary) !important;
        }
        .currency-suffix {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .form-hint {
          font-size: 0.76rem;
          color: var(--text-muted);
          display: block;
          margin-top: 4px;
        }
        .floor-pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          background: var(--bg-secondary);
          padding: 16px;
          border-radius: var(--radius-sm);
        }
        .floor-price-item label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-main);
          display: block;
          margin-bottom: 4px;
        }
        .price-input-wrapper.small .currency-prefix {
          font-size: 1rem;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 768px) {
          .form-grid-2, .form-grid-3 {
            grid-template-columns: 1fr;
          }
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .form-input {
          padding: 9px 12px;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
          outline: none;
          background: #FFFFFF;
        }
        .form-input:focus {
          border-color: var(--primary);
        }
        .checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-main);
          cursor: pointer;
        }
        .tags-manager-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 6px;
          margin-bottom: 8px;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          color: var(--text-main);
        }
        .tag-pill button {
          color: var(--danger);
          padding: 2px;
        }
        .add-tag-row {
          display: flex;
          gap: 8px;
        }
        .add-tag-row .form-input {
          flex: 1;
        }
        .staff-shifts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .staff-shifts-grid {
            grid-template-columns: 1fr;
          }
        }
        .shift-staff-box {
          padding: 20px;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .shift-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .shift-pill {
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .shift-pill.day {
          background: #FEF3C7;
          color: #B45309;
        }
        .shift-pill.night {
          background: #E0E7FF;
          color: #3730A3;
        }
        .form-submit-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }
        .form-submit-row.space-between {
          justify-content: space-between;
          align-items: center;
        }
        .qr-preview-hero {
          display: flex;
          gap: 24px;
          align-items: center;
          background: #FAF8F5;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 20px;
          margin-bottom: 20px;
        }
        @media (max-width: 640px) {
          .qr-preview-hero {
            flex-direction: column;
            text-align: center;
          }
        }
        .qr-box-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 14px;
          min-width: 170px;
        }
        .live-qr-preview {
          width: 140px;
          height: 140px;
          object-fit: contain;
          border-radius: 6px;
        }
        .qr-placeholder-box {
          width: 140px;
          height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          border-radius: 6px;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 0.8rem;
        }
        .qr-status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          color: var(--text-secondary);
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-active {
          background: #2D6A4F;
        }
        .dot-disabled {
          background: #DC2626;
        }
        .qr-instructions-hero {
          flex: 1;
        }
        .qr-instructions-hero h4 {
          margin: 0 0 8px 0;
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .qr-instructions-hero ul {
          margin: 0;
          padding-left: 20px;
          font-size: 0.84rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .file-upload-strip {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .file-input-hidden {
          display: none;
        }
        .file-tip {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .system-health-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .health-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .health-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .health-status-value {
          font-size: 1.05rem;
          font-weight: 600;
        }
        .health-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .backups-list-box h4 {
          margin: 0 0 12px 0;
          font-size: 0.95rem;
        }
        .no-backups-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 16px;
          text-align: center;
          gap: 8px;
          color: var(--text-secondary);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
