import React, { useState } from 'react';
import { 
  Calendar, 
  BedDouble, 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  MessageCircle, 
  Zap, 
  Info, 
  Building2, 
  Lock, 
  Wind, 
  Star, 
  Camera, 
  ExternalLink, 
  QrCode, 
  Layers,
  Sparkles,
  CreditCard,
  User,
  Mail,
  Phone,
  FileText,
  ChevronRight,
  HelpCircle,
  Check,
  CalendarCheck
} from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function CustomerPortal({ 
  beds = [], 
  user, 
  propertyInfo,
  pricingInfo,
  reviewSettings,
  checkInDate, 
  setCheckInDate, 
  checkOutDate, 
  setCheckOutDate,
  onBookBed,
  userBookings = [],
  activeTab = 'guest-book',
  setActiveTab,
  onOpenAuth,
  onPayBooking,
  onSelectBooking
}) {
  const { t, language } = useLanguage();
  const [selectedBed, setSelectedBed] = useState(null);
  const [activeFloorFilter, setActiveFloorFilter] = useState('ALL');

  // Customer booking form state
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestNotes, setGuestNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Fallback defaults from owner settings
  const propName = propertyInfo?.property_name || t('app_title', 'Arthayog Dormitory');
  const propLogo = propertyInfo?.logo_url;
  const propDesc = (propertyInfo?.description && language === 'en')
    ? propertyInfo.description
    : t('hero_subtitle', 'A clean, quiet, and thoughtfully planned 16-bed boutique dormitory offering comfortable living right in the city center.');
  const contactPhone = propertyInfo?.contact_phone || '+91 98765 43210';
  const whatsappNumber = propertyInfo?.whatsapp_number || '+91 98765 43210';
  const propEmail = propertyInfo?.email || 'stay@arthayog.com';
  const propAddress = propertyInfo?.address || (language === 'mr' ? '१२, शांती मार्ग, बस स्थानक व मेट्रो स्टेशनजवळ, मुख्य बाजारपेठ' : language === 'hi' ? '12, शांति मार्ग, बस स्टैंड व मेट्रो स्टेशन के पास, मुख्य बाजार' : '12, Shanti Marg, City Center, Near Metro Station');
  const propLocation = propertyInfo?.location_details || (language === 'mr' ? 'शहराच्या मुख्य मध्यवर्ती भागात, मध्यवर्ती बस स्थानक व रेल्वे स्टेशनपासून अवघ्या २ मिनिटांच्या अंतरावर.' : language === 'hi' ? 'शहर के मुख्य केंद्र में, केंद्रीय बस स्टैंड व रेलवे स्टेशन से मात्र 2 मिनट की दूरी पर।' : 'Prime downtown location, 2 minutes walk from central transit terminal, food street, and commercial hub.');
  const checkInTime = propertyInfo?.check_in_time || '12:00 PM';
  const checkOutTime = propertyInfo?.check_out_time || '11:00 AM';

  const defaultFacilities = [
    t('fac_ac', "Air Conditioning in all dormitory halls"),
    t('fac_wifi', "High-Speed Wi-Fi for work & leisure"),
    t('fac_lockers', "Dedicated Private Keycard Lockers"),
    t('fac_hot_water', "24/7 Hot Water Showers"),
    t('fac_ro_water', "RO Purified Drinking Water"),
    t('fac_linens', "Daily Bed Linen Turnaround & Sanitization"),
    t('fac_security', "24/7 Security CCTV & Secure Access"),
    t('fac_sockets', "Individual Power Outlet (230V) & Reading Lamp")
  ];
  const facilities = (propertyInfo?.facilities && propertyInfo.facilities.length > 0 && language === 'en')
    ? propertyInfo.facilities
    : defaultFacilities;

  const defaultAmenities = [
    t('amen_linens', "Clean Linens, Pillows & Blanket provided"),
    t('amen_luggage', "Luggage Storage Facility"),
    t('amen_silent', "Silent Hours observed from 10:30 PM"),
    t('amen_power_backup', "Uninterrupted Power Backup Generator"),
    t('amen_dining', "Common Dining & Refreshment Lounge")
  ];
  const amenities = (propertyInfo?.amenities && propertyInfo.amenities.length > 0 && language === 'en')
    ? propertyInfo.amenities
    : defaultAmenities;

  const customerInstructions = propertyInfo?.customer_instructions && language === 'en'
    ? propertyInfo.customer_instructions
    : t('id_proof_required', 'Please bring a valid Government Photo ID (Aadhaar, Passport, or Driving License) for check-in verification.');
  const bookingInstructions = propertyInfo?.booking_instructions && language === 'en'
    ? propertyInfo.booking_instructions
    : t('select_dates_prompt', 'Check live availability, select your stay dates and preferred bed, and confirm your reservation online.');
  const cancellationPolicy = propertyInfo?.cancellation_policy && language === 'en'
    ? propertyInfo.cancellation_policy
    : t('cancellation_text', 'Free cancellation up to 24 hours prior to check-in time. For same-day assistance, please call our 24/7 front desk.');

  const getBedDescription = (bed) => {
    if (language === 'mr') {
      return t('bed_desc_default', 'स्वच्छ ऑर्थोपेडिक गादी, गोपनीयता पडदा, स्वतंत्र २३०V चार्जिंग सॉकेट आणि वैयक्तिक LED वाचन दिवा असलेला सिंगल बेड.');
    }
    if (language === 'hi') {
      return t('bed_desc_default', 'स्वच्छ ऑर्थोपेडिक गद्दे, प्राइवेसी पर्दा, अलग 230V चार्जिंग सॉकेट और व्यक्तिगत LED रीडिंग लैंप वाला सिंगल बेड।');
    }
    return (bed.description || 'Clean single bed with orthopaedic mattress, privacy curtains, universal 230V outlet & personal LED reading lamp.')
      .replace(/pod\s*bed/gi, 'dormitory bed')
      .replace(/pod/gi, 'bed');
  };

  // Default nightly price from backend
  const standardPrice = pricingInfo?.standard_price_inr || (beds[0]?.base_price_inr ?? 499.0);

  // Availability calculation from database
  const availableBeds = beds.filter(b => {
    if (checkInDate && checkOutDate) {
      return b.is_available_for_dates === true;
    }
    return b.status === 'AVAILABLE';
  });

  const reservedBeds = beds.filter(b => b.status === 'RESERVED');
  const occupiedBeds = beds.filter(b => b.status === 'OCCUPIED');

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 1;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const nights = calculateNights();
  const currentBedPrice = selectedBed ? selectedBed.base_price_inr : standardPrice;
  const totalPrice = Math.round(currentBedPrice * nights);

  // WhatsApp reservation link
  const rawWhatsAppPhone = whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappMessage = selectedBed && checkInDate && checkOutDate
    ? `Hello ${propName}, I checked Live Availability on your website and would like to reserve Bed ${selectedBed.bed_number} (Floor ${selectedBed.floor_number}) from ${checkInDate} to ${checkOutDate} (${nights} night${nights > 1 ? 's' : ''}, Total ₹${totalPrice}). Please confirm availability.`
    : `Hello ${propName}, I would like to inquire about dormitory bed availability and reserve a stay.`;
  const whatsappUrl = `https://wa.me/${rawWhatsAppPhone}?text=${encodeURIComponent(whatsappMessage)}`;

  // Filtered beds by floor
  const filteredBeds = beds.filter(b => {
    if (activeFloorFilter === 'ALL') return true;
    return b.floor_number === parseInt(activeFloorFilter, 10);
  });

  // Handle Online Booking Submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (!selectedBed) {
      setBookingError('Please select an available bed from the Live Availability map above.');
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setBookingError('Please choose your check-in and check-out dates.');
      return;
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setBookingError('Check-out date must be after check-in date.');
      return;
    }
    if (!guestName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
      setBookingError('Please provide your full name, phone number, and email.');
      return;
    }

    setSubmittingBooking(true);
    try {
      if (onBookBed) {
        await onBookBed({
          bed_id: selectedBed.id,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
          guest_email: guestEmail.trim(),
          notes: guestNotes.trim() || undefined
        });
      }
    } catch (err) {
      setBookingError(err.message || 'Failed to initiate reservation.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // ---------------- Render "My Bookings" Tab ----------------
  if (activeTab === 'guest-bookings') {
    return (
      <div className="customer-portal animate-fade-in">
        <div className="card my-bookings-header-card">
          <div className="my-bookings-left">
            <span className="badge badge-accent">{t('guest', 'Guest Portal')}</span>
            <h2>{t('my_bookings_title', 'My Reservations & Stays')}</h2>
            <p className="subtitle">{t('my_bookings_sub', 'View your confirmed bookings, payment passes & stay receipts')}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('guest-book')}>
            {t('back_to_availability', '← Back to Live Availability')}
          </button>
        </div>

        {!user ? (
          <div className="card empty-bookings-card">
            <User size={40} color="#A8A29E" />
            <h3>{t('sign_in_to_view_bookings', 'Sign In to View Your Bookings')}</h3>
            <p>{t('sign_in_to_view_desc', 'Access your past reservations, confirmed stay receipts, and fast check-in documents.')}</p>
            <button className="btn btn-primary" onClick={onOpenAuth} style={{ marginTop: '12px' }}>
              {t('sign_in_btn', 'Sign In to Your Account')}
            </button>
          </div>
        ) : userBookings.length === 0 ? (
          <div className="card empty-bookings-card">
            <BedDouble size={40} color="#A8A29E" />
            <h3>{t('no_bookings_found', 'No Bookings Found')}</h3>
            <p>{t('no_bookings_desc', 'You do not have any active or past reservations under this account.')}</p>
            <button className="btn btn-primary" onClick={() => setActiveTab('guest-book')} style={{ marginTop: '12px' }}>
              {t('explore_beds_btn', 'Explore Live Availability & Book a Bed')}
            </button>
          </div>
        ) : (
          <div className="my-bookings-list">
            {userBookings.map((b) => (
              <div key={b.id} className="card booking-pass-card">
                <div className="pass-header">
                  <div className="pass-code-group">
                    <span className="pass-lbl">{t('booking_code_label', 'Booking Reference')}</span>
                    <strong className="pass-code">{b.booking_code}</strong>
                  </div>
                  <span className={`badge badge-${b.status.toLowerCase()}`}>
                    {t(`status_${b.status.toLowerCase()}`, b.status)}
                  </span>
                </div>

                <div className="pass-grid">
                  <div className="pass-item">
                    <span className="item-lbl">{t('assigned_bed_label', 'Assigned Bed')}</span>
                    <strong className="item-val">{t('bed_label', 'Bed')} {b.bed?.bed_number || b.bed_number}</strong>
                    <span className="item-sub">{t('floor_label', 'Floor')} {b.floor_number || b.bed?.floor_number || 1}</span>
                  </div>

                  <div className="pass-item">
                    <span className="item-lbl">{t('dates_label', 'Stay Dates')}</span>
                    <strong className="item-val">{b.check_in_date}</strong>
                    <span className="item-sub">to {b.check_out_date}</span>
                  </div>

                  <div className="pass-item">
                    <span className="item-lbl">{t('amount_label', 'Amount')}</span>
                    <strong className="item-val text-primary">₹{b.total_amount}</strong>
                    <span className="item-sub">{t('paid_label', 'Paid')}: ₹{b.paid_amount || 0}</span>
                  </div>

                  <div className="pass-item">
                    <span className="item-lbl">{t('full_name_label', 'Guest Name')}</span>
                    <strong className="item-val">{b.guest_name}</strong>
                    <span className="item-sub">{b.guest_phone}</span>
                  </div>
                </div>

                <div className="pass-footer">
                  {b.status === 'PENDING_PAYMENT' && onPayBooking && (
                    <button className="btn btn-primary btn-sm" onClick={() => onPayBooking(b)}>
                      <CreditCard size={14} /> {t('complete_payment', 'Complete Payment')} (₹{b.total_amount - b.paid_amount})
                    </button>
                  )}
                  {onSelectBooking && (
                    <button className="btn btn-secondary btn-sm" onClick={() => onSelectBooking(b)}>
                      <FileText size={14} /> {t('view_details_receipt', 'View Stay Details & Receipt')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------------- Render Main Customer Accommodation Experience ----------------
  return (
    <div className="customer-portal animate-fade-in">
      {/* 1. Welcoming Hero Banner */}
      <div className="card portal-hero-card">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge badge-accent">{t('boutique_tag', 'Boutique Small-Town Dormitory')}</span>
            <span className="call-only-pill">
              <ShieldCheck size={12} /> {t('real_time_avail_pill', 'Live Real-Time Availability')}
            </span>
          </div>

          <h1 className="hero-title">{propName}</h1>
          <p className="hero-sub">{propDesc}</p>

          {/* Date Selector Bar */}
          <div className="reservation-dates-bar">
            <div className="date-input-unit">
              <label>{t('check_in_date_label', 'Check-In Date')}</label>
              <div className="date-field-inner">
                <Calendar size={16} color="#C25E40" />
                <input 
                  type="date" 
                  value={checkInDate || ''} 
                  onChange={(e) => setCheckInDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="date-input-unit">
              <label>{t('check_out_date_label', 'Check-Out Date')}</label>
              <div className="date-field-inner">
                <Calendar size={16} color="#C25E40" />
                <input 
                  type="date" 
                  value={checkOutDate || ''} 
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={checkInDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="duration-bubble">
              <span className="duration-count">{nights}</span>
              <span className="duration-lbl">{nights === 1 ? t('night_singular', 'Night') : t('night_plural', 'Nights')}</span>
            </div>

            {(checkInDate || checkOutDate) && (
              <button 
                type="button"
                className="btn btn-ghost btn-sm clear-dates-btn"
                onClick={() => { setCheckInDate(''); setCheckOutDate(''); }}
              >
                {t('clear_dates', 'Clear Dates')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Live Availability & Booking Grid */}
      <div className="portal-main-grid" id="availability-section">
        {/* Left Column: Live Availability 16-Bed Grid */}
        <div className="portal-beds-column">
          <div className="card live-avail-header-card">
            <div className="card-header-clean">
              <div className="title-box">
                <span className="badge badge-accent">{t('beds_badge', '16 Dormitory Beds')}</span>
                <h3>{t('live_availability_title', 'Live Availability')}</h3>
                <p>
                  {language === 'mr'
                    ? `${beds.length || 16} पैकी ${availableBeds.length} ${availableBeds.length === 1 ? t('bed_available_singular', 'बेड उपलब्ध आहे') : t('beds_available_text', 'बेड्स उपलब्ध आहेत')} ${checkInDate && checkOutDate ? t('for_selected_dates', 'निवडलेल्या तारखांसाठी') : t('right_now', 'सध्या')}`
                    : language === 'hi'
                      ? `${beds.length || 16} में से ${availableBeds.length} ${availableBeds.length === 1 ? t('bed_available_singular', 'बेड उपलब्ध है') : t('beds_available_text', 'बेड्स उपलब्ध हैं')} ${checkInDate && checkOutDate ? t('for_selected_dates', 'चयनित तारीखों के लिए') : t('right_now', 'वर्तमान में')}`
                      : `${availableBeds.length} of ${beds.length || 16} beds available ${checkInDate && checkOutDate ? t('for_selected_dates', 'for selected dates') : t('right_now', 'right now')}`
                  }
                </p>
              </div>

              {/* Real Database Telemetry Stats */}
              <div className="avail-mini-pills">
                <span className="avail-pill ready">
                  <span className="dot dot-available"></span>
                  <strong>{availableBeds.length}</strong> {t('status_available', 'Available')}
                </span>
                <span className="avail-pill reserved">
                  <span className="dot dot-reserved"></span>
                  <strong>{reservedBeds.length}</strong> {t('status_reserved', 'Reserved')}
                </span>
                <span className="avail-pill occupied">
                  <span className="dot dot-occupied"></span>
                  <strong>{occupiedBeds.length}</strong> {t('status_occupied', 'Occupied')}
                </span>
              </div>
            </div>

            {/* Floor Navigation Pills */}
            <div className="floor-quick-pills">
              <button 
                type="button"
                className={`quick-pill ${activeFloorFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveFloorFilter('ALL')}
              >
                {t('all_beds_label', 'All Beds')} ({beds.length || 16})
              </button>
              <button 
                type="button"
                className={`quick-pill ${activeFloorFilter === '1' ? 'active' : ''}`}
                onClick={() => setActiveFloorFilter('1')}
              >
                {t('floor_1_label', 'Floor 1 (5 Beds)')}
              </button>
              <button 
                type="button"
                className={`quick-pill ${activeFloorFilter === '2' ? 'active' : ''}`}
                onClick={() => setActiveFloorFilter('2')}
              >
                {t('floor_2_label', 'Floor 2 (6 Beds)')}
              </button>
              <button 
                type="button"
                className={`quick-pill ${activeFloorFilter === '3' ? 'active' : ''}`}
                onClick={() => setActiveFloorFilter('3')}
              >
                {t('floor_3_label', 'Floor 3 (5 Beds)')}
              </button>
            </div>
          </div>

          {/* Beds Display List */}
          <div className="beds-display-list">
            {filteredBeds.map((bed) => {
              const isSelected = selectedBed?.id === bed.id;
              const isAvail = (checkInDate && checkOutDate)
                ? (bed.is_available_for_dates === true)
                : (bed.status === 'AVAILABLE');

              return (
                <div 
                  key={bed.id}
                  className={`card guest-bed-card ${isSelected ? 'selected' : ''} ${!isAvail ? 'unavailable' : ''}`}
                  onClick={() => {
                    if (isAvail) {
                      setSelectedBed(bed);
                      setBookingError('');
                    }
                  }}
                >
                  <div className="bed-icon-box">
                    <BedDouble size={24} color={isSelected ? '#C25E40' : isAvail ? '#2D6A4F' : '#78716C'} />
                  </div>

                  <div className="bed-info">
                    <div className="bed-name-row">
                      <h4>{t('bed_label', 'Bed')} {bed.bed_number}</h4>
                      <span className="floor-pill">{t('floor_label', 'Floor')} {bed.floor_number}</span>
                      {isSelected && <span className="selected-indicator">{t('selected_indicator', '✓ Selected')}</span>}
                    </div>

                    <p className="bed-details-text">
                      {getBedDescription(bed)}
                    </p>

                    <div className="bed-amenities-row">
                      <span><Wind size={11} /> {t('bed_ac', 'AC')}</span>
                      <span><Lock size={11} /> {t('bed_locker', 'Dedicated Locker')}</span>
                      <span><Zap size={11} /> {t('bed_socket', '230V Socket')}</span>
                      <span>{t('bed_linens', 'Clean Bed Linens')}</span>
                    </div>
                  </div>

                  <div className="bed-rate-action">
                    <div className="rate-text">
                      <span className="currency">₹{bed.base_price_inr}</span>
                      <small>{t('per_night_short', '/night')}</small>
                    </div>

                    {isAvail ? (
                      <button 
                        type="button" 
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBed(bed);
                          setBookingError('');
                        }}
                      >
                        {isSelected ? t('selected_bed_btn', 'Selected') : t('select_bed_btn', 'Select Bed')}
                      </button>
                    ) : (
                      <span className="booked-label">{t('bed_unavailable_btn', 'Reserved')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Direct Booking & Checkout Card */}
        <div className="portal-sidebar-column">
          <div className="card booking-action-card sticky-card">
            <div className="contact-card-header">
              <div className="phone-icon-circle">
                <CalendarCheck size={20} color="#C25E40" />
              </div>
              <div>
                <h3>{t('booking_summary_title', 'Book Your Stay')}</h3>
                <span className="contact-badge">{t('booking_summary_sub', 'Live Guaranteed Price • Direct Reservation')}</span>
              </div>
            </div>

            {/* Selected Bed Summary Box */}
            {selectedBed ? (
              <div className="selected-bed-quote-box">
                <div className="quote-row">
                  <span>{t('assigned_bed_label', 'Selected Bed')}:</span>
                  <strong>{t('bed_label', 'Bed')} {selectedBed.bed_number} ({t('floor_label', 'Floor')} {selectedBed.floor_number})</strong>
                </div>
                {checkInDate && checkOutDate ? (
                  <div className="quote-row">
                    <span>{t('dates_label', 'Stay Dates')}:</span>
                    <span>{checkInDate} to {checkOutDate}</span>
                  </div>
                ) : (
                  <div className="quote-row text-warning">
                    <span>{t('dates_label', 'Stay Dates')}:</span>
                    <span>{t('select_dates_prompt', 'Please select check-in & check-out dates above')}</span>
                  </div>
                )}
                <div className="quote-row">
                  <span>{t('duration_label', 'Duration')}:</span>
                  <span>{nights} {nights === 1 ? t('night_singular', 'Night') : t('night_plural', 'Nights')}</span>
                </div>
                <div className="quote-row">
                  <span>{t('nightly_rate_label', 'Nightly Rate')}:</span>
                  <span>₹{selectedBed.base_price_inr} {t('per_night', '/ night')}</span>
                </div>
                <div className="quote-row total-row">
                  <span>{t('total_amount_label', 'Final Total Amount')}:</span>
                  <strong className="quote-price">₹{totalPrice}</strong>
                </div>
              </div>
            ) : (
              <div className="selection-prompt">
                <Info size={16} color="#C25E40" />
                <span>{t('select_bed_prompt', 'Select any available bed from the Live Availability list on the left to see the final price.')}</span>
              </div>
            )}

            {bookingError && (
              <div className="booking-error-banner animate-fade-in">
                <span>{bookingError}</span>
              </div>
            )}

            {/* Online Instant Reservation Form */}
            <form onSubmit={handleBookingSubmit} className="online-booking-form">
              <div className="form-group">
                <label className="form-label">{t('full_name_label', 'Full Name')} *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={t('name_placeholder', 'e.g. Ramesh Kumar')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('phone_label', 'Phone Number')} *</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder={t('phone_placeholder', '+91 98765 43210')}
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('email_label', 'Email Address')} *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder={t('email_placeholder', 'name@example.com')}
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('special_requests_label', 'Special Requests (Optional)')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={t('notes_placeholder', 'e.g. Arriving late evening')}
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-block btn-lg"
                disabled={submittingBooking || !selectedBed}
              >
                <CreditCard size={18} />
                <span>
                  {submittingBooking 
                    ? t('submitting', 'Creating Reservation...') 
                    : selectedBed 
                      ? `${t('proceed_to_payment', 'Confirm & Pay')} ₹${totalPrice}` 
                      : t('select_bed_prompt', 'Select a Bed to Reserve')}
                </span>
              </button>
            </form>

            <div className="or-divider">
              <span>{t('or_reserve_directly', 'or reserve directly with front desk')}</span>
            </div>

            {/* Direct Front Desk Actions */}
            <div className="frontdesk-action-buttons">
              <a 
                href={`tel:${contactPhone}`} 
                className="btn btn-secondary btn-block"
              >
                <PhoneCall size={16} />
                <span>{t('call_frontdesk_btn', 'Call Front Desk')}: {contactPhone}</span>
              </a>

              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-secondary btn-block whatsapp-btn"
              >
                <MessageCircle size={16} color="#16A34A" />
                <span>{t('whatsapp_quote', 'Reserve via WhatsApp')}</span>
              </a>
            </div>

            <div className="frontdesk-meta-details">
              <div className="meta-line">
                <span>{t('check_in_time_label', 'Check-in')}:</span>
                <strong>{checkInTime}</strong>
              </div>
              <div className="meta-line">
                <span>{t('check_out_time_label', 'Check-out')}:</span>
                <strong>{checkOutTime}</strong>
              </div>
              <div className="meta-line">
                <span>{t('payment_methods_accepted', 'Payment Accepted')}:</span>
                <span>{t('accepted_payment_modes', 'UPI, Cards, Netbanking & Counter Cash')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Facilities & Amenities Section (Configured by Owner) */}
      <div className="card section-card facilities-section" id="facilities">
        <div className="section-header">
          <span className="badge badge-accent">{t('facilities_included', 'Property Features')}</span>
          <h3 className="section-title">{t('facilities_heading', 'Facilities & Amenities')}</h3>
          <p className="section-sub">{t('facilities_subheading', 'Standardized comforts provided to every resident.')}</p>
        </div>

        <div className="facilities-grid">
          {facilities.map((fac, idx) => (
            <div key={idx} className="facility-item">
              <div className="facility-icon">
                <Check size={16} color="#2D6A4F" />
              </div>
              <span>{fac}</span>
            </div>
          ))}
        </div>

        <div className="amenities-sub-block">
          <h4>{t('amenities_heading', 'Room & Bed Amenities')}</h4>
          <div className="amenities-tags-list">
            {amenities.map((amen, idx) => (
              <span key={idx} className="amenity-chip">
                <Sparkles size={12} color="#C25E40" />
                {amen}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Guest Instructions & Policies Section */}
      <div className="card section-card policies-section" id="policies">
        <div className="section-header">
          <span className="badge badge-accent">{t('policies_title', 'Guidelines & Policies')}</span>
          <h3 className="section-title">{t('policies_title', 'Stay Information & Policies')}</h3>
        </div>

        <div className="policies-grid">
          <div className="policy-card">
            <h4>{t('checkin_rules_heading', 'Check-in & ID Verification')}</h4>
            <p>{customerInstructions}</p>
            <div className="time-badge-row">
              <span>{t('check_in_time_label', 'Check-in')}: <strong>{checkInTime}</strong></span>
              <span>{t('check_out_time_label', 'Check-out')}: <strong>{checkOutTime}</strong></span>
            </div>
          </div>

          <div className="policy-card">
            <h4>{t('booking_rules_heading', 'How Booking Works')}</h4>
            <p>{bookingInstructions}</p>
          </div>

          <div className="policy-card">
            <h4>{t('cancellation_label', 'Cancellation Policy')}</h4>
            <p>{cancellationPolicy}</p>
          </div>
        </div>
      </div>

      {/* 5. Location & Contact Section */}
      <div className="card section-card location-section" id="location">
        <div className="section-header">
          <span className="badge badge-accent">{t('location_heading', 'Prime City Location')}</span>
          <h3 className="section-title">{t('location_heading', 'Location & Contact')}</h3>
        </div>

        <div className="location-grid">
          <div className="location-info-box">
            <div className="loc-line">
              <MapPin size={20} color="#C25E40" />
              <div>
                <strong>{t('property_address_label', 'Address')}:</strong>
                <p>{propAddress}</p>
              </div>
            </div>

            <div className="loc-line">
              <Info size={20} color="#C25E40" />
              <div>
                <strong>{t('transit_neighborhood', 'Transit & Neighborhood')}:</strong>
                <p>{propLocation}</p>
              </div>
            </div>

            <div className="loc-line">
              <Phone size={20} color="#C25E40" />
              <div>
                <strong>{t('reception_phone_label', 'Front Desk Phone')}:</strong>
                <p><a href={`tel:${contactPhone}`}>{contactPhone}</a> {t('reception_hours_text', '(24 Hours Available)')}</p>
              </div>
            </div>

            <div className="loc-line">
              <Mail size={20} color="#C25E40" />
              <div>
                <strong>{t('official_email_label', 'Official Email')}:</strong>
                <p><a href={`mailto:${propEmail}`}>{propEmail}</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Google Review & Guest Satisfaction Card (Owner Configurable) */}
      {reviewSettings?.is_enabled && (
        <div className="card review-card-hospitality">
          <div className="review-left">
            <div className="review-badge-strip">
              <Star size={14} color="#B45309" fill="#B45309" />
              <span>{t('reviews_badge', 'Guest Satisfaction & Verified Feedback')}</span>
            </div>
            <h3>{(reviewSettings.review_title && language === 'en') ? reviewSettings.review_title : t('reviews_title', `Review ${propName} on Google`)}</h3>
            <p className="review-desc">
              {(reviewSettings.review_instructions && language === 'en') ? reviewSettings.review_instructions : t('reviews_sub', 'Scan the QR code with your smartphone camera or click below to share your experience with fellow travelers.')}
            </p>

            <div className="ratings-display-cluster">
              <div className="gold-stars">★★★★★</div>
              <div className="rating-num">
                <strong>{reviewSettings.review_rating || '4.9'}</strong> / 5.0
              </div>
              <span className="rating-verif">
                ({reviewSettings.review_count || (language === 'mr' ? '१४०+' : '140+')} {t('reviews_count', 'Verified Guest Reviews')})
              </span>
            </div>

            <div className="review-btn-box">
              <a 
                href={reviewSettings.review_url || 'https://g.page/r/arthayog-dormitory/review'}
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-secondary btn-sm"
              >
                <ExternalLink size={14} /> {t('open_google_reviews', 'Open Google Review Page')}
              </a>
            </div>
          </div>

          <div className="review-right">
            <div className="qr-mount-box">
              <span className="qr-label">{t('scan_to_review', 'Scan to Review')}</span>
              {reviewSettings.review_qr_image ? (
                <img 
                  src={reviewSettings.review_qr_image} 
                  alt="Google Review QR Code" 
                  className="qr-image"
                />
              ) : (
                <div className="qr-fallback">
                  <QrCode size={56} color="#C25E40" />
                </div>
              )}
              <div className="qr-footer-hint">
                <Camera size={12} />
                <span>{t('point_camera_hint', 'Point camera to rate stay')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .customer-portal {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Hero Card */
        .portal-hero-card {
          padding: 32px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
        }
        .hero-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .call-only-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
        }
        .hero-title {
          font-family: var(--font-serif);
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.25;
          margin-top: 6px;
        }
        .hero-sub {
          font-size: 0.95rem;
          color: var(--text-muted);
          max-width: 820px;
          line-height: 1.55;
          margin-top: 8px;
        }

        /* Date Selector Bar */
        .reservation-dates-bar {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 22px;
          background: var(--bg-secondary);
          padding: 14px 18px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }
        .date-input-unit {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .date-input-unit label {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .date-field-inner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1px solid var(--border-strong);
          padding: 6px 12px;
          border-radius: var(--radius-xs);
        }
        .date-field-inner input {
          border: none;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-main);
          outline: none;
          background: transparent;
        }
        .duration-bubble {
          display: flex;
          align-items: baseline;
          gap: 4px;
          padding: 6px 14px;
          background: #FFFFFF;
          border-radius: var(--radius-xs);
          border: 1px solid var(--border-strong);
        }
        .duration-count {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--primary);
        }
        .duration-lbl {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .clear-dates-btn {
          align-self: center;
          font-size: 0.8rem;
        }

        /* Main Grid */
        .portal-main-grid {
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: 24px;
        }
        @media (max-width: 960px) {
          .portal-main-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Beds List Column */
        .portal-beds-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .live-avail-header-card {
          padding: 20px 24px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .card-header-clean {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .title-box h3 {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 4px;
        }
        .title-box p {
          font-size: 0.84rem;
          color: var(--text-muted);
        }
        .avail-mini-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .avail-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.78rem;
        }
        .avail-pill.ready {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .avail-pill.reserved {
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
        }
        .avail-pill.occupied {
          background: #F1F5F9;
          color: #334155;
          border: 1px solid #CBD5E1;
        }
        .floor-quick-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .quick-pill {
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          font-weight: 600;
          background: var(--bg-secondary);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
          transition: var(--transition);
        }
        .quick-pill:hover {
          color: var(--text-main);
        }
        .quick-pill.active {
          background: var(--primary);
          color: #FFFFFF;
          border-color: var(--primary);
        }

        /* Beds Display List */
        .beds-display-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .guest-bed-card {
          padding: 18px 20px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: var(--transition);
        }
        .guest-bed-card:hover:not(.unavailable) {
          border-color: var(--primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        .guest-bed-card.selected {
          border-color: var(--primary);
          background: #FFFDF9;
          box-shadow: 0 0 0 1px var(--primary);
        }
        .guest-bed-card.unavailable {
          opacity: 0.6;
          background: #F9F9F8;
          cursor: not-allowed;
        }
        .bed-icon-box {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .guest-bed-card.selected .bed-icon-box {
          background: var(--primary-light);
        }
        .bed-info {
          flex: 1;
        }
        .bed-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bed-name-row h4 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .floor-pill {
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          background: var(--bg-secondary);
          color: var(--text-muted);
          font-weight: 600;
        }
        .selected-indicator {
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--primary);
        }
        .bed-details-text {
          font-size: 0.84rem;
          color: var(--text-muted);
          margin-top: 4px;
          line-height: 1.4;
        }
        .bed-amenities-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .bed-amenities-row span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .bed-rate-action {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          min-width: 110px;
        }
        .rate-text {
          text-align: right;
        }
        .currency {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--primary);
        }
        .rate-text small {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .booked-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text-dim);
          background: var(--bg-secondary);
          padding: 4px 8px;
          border-radius: var(--radius-xs);
        }

        /* Sidebar Column */
        .portal-sidebar-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .sticky-card {
          position: sticky;
          top: 85px;
        }
        .booking-action-card {
          padding: 24px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .contact-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .phone-icon-circle {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          background: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .contact-card-header h3 {
          font-family: var(--font-serif);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .contact-badge {
          font-size: 0.72rem;
          color: var(--primary);
          font-weight: 600;
        }
        .selected-bed-quote-box {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .quote-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.84rem;
          color: var(--text-body);
        }
        .quote-row.total-row {
          border-top: 1px dashed var(--border-strong);
          padding-top: 8px;
          margin-top: 2px;
          font-size: 0.95rem;
          font-weight: 700;
        }
        .quote-price {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--primary);
        }
        .selection-prompt {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: var(--bg-secondary);
          padding: 12px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .booking-error-banner {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          color: #B91C1C;
        }
        .online-booking-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .or-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-dim);
          font-size: 0.72rem;
        }
        .or-divider::before, .or-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-subtle);
        }
        .or-divider span {
          padding: 0 10px;
        }
        .frontdesk-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .whatsapp-btn {
          border-color: #86EFAC;
          color: #15803D;
        }
        .frontdesk-meta-details {
          border-top: 1px solid var(--border-subtle);
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .meta-line {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        /* Section Cards */
        .section-card {
          padding: 28px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .section-title {
          font-family: var(--font-serif);
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 4px;
        }
        .section-sub {
          font-size: 0.86rem;
          color: var(--text-muted);
        }
        .facilities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }
        .facility-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: var(--text-main);
        }
        .facility-icon {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-full);
          background: #ECFDF5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .amenities-sub-block {
          border-top: 1px solid var(--border-subtle);
          padding-top: 16px;
        }
        .amenities-sub-block h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 10px;
        }
        .amenities-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .amenity-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          color: var(--text-body);
        }
        .policies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
        }
        .policy-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          padding: 18px;
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .policy-card h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .policy-card p {
          font-size: 0.84rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .time-badge-row {
          display: flex;
          gap: 14px;
          margin-top: 6px;
          font-size: 0.78rem;
          color: var(--text-main);
        }
        .location-info-box {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .loc-line {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .loc-line strong {
          display: block;
          font-size: 0.85rem;
          color: var(--text-main);
        }
        .loc-line p {
          font-size: 0.84rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .review-card-hospitality {
          padding: 28px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }
        .review-left {
          flex: 1;
          min-width: 280px;
        }
        .review-badge-strip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #B45309;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .review-left h3 {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          color: var(--text-main);
        }
        .review-desc {
          font-size: 0.86rem;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .ratings-display-cluster {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 14px 0;
        }
        .gold-stars {
          color: #B45309;
          letter-spacing: 2px;
        }
        .rating-num {
          font-size: 1.1rem;
          color: var(--text-main);
        }
        .rating-verif {
          font-size: 0.78rem;
          color: var(--text-dim);
        }
        .qr-mount-box {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .qr-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .qr-image {
          width: 140px;
          height: 140px;
          object-fit: contain;
          border-radius: var(--radius-xs);
        }
        .qr-footer-hint {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          color: var(--text-dim);
        }

        /* My Bookings View */
        .my-bookings-header-card {
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          flex-wrap: wrap;
          gap: 16px;
        }
        .my-bookings-left h2 {
          font-family: var(--font-serif);
          font-size: 1.55rem;
          color: var(--text-main);
          margin-top: 4px;
        }
        .empty-bookings-card {
          padding: 60px 24px;
          text-align: center;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .empty-bookings-card h3 {
          font-family: var(--font-serif);
          font-size: 1.3rem;
          color: var(--text-main);
        }
        .empty-bookings-card p {
          font-size: 0.88rem;
          color: var(--text-muted);
          max-width: 440px;
        }
        .my-bookings-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .booking-pass-card {
          padding: 22px 24px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pass-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
        }
        .pass-code-group {
          display: flex;
          flex-direction: column;
        }
        .pass-lbl {
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-muted);
        }
        .pass-code {
          font-size: 1.25rem;
          color: var(--text-main);
        }
        .pass-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
        }
        .pass-item {
          display: flex;
          flex-direction: column;
        }
        .item-lbl {
          font-size: 0.72rem;
          color: var(--text-dim);
          text-transform: uppercase;
          font-weight: 600;
        }
        .item-val {
          font-size: 1rem;
          color: var(--text-main);
          margin-top: 2px;
        }
        .item-sub {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .pass-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          border-top: 1px solid var(--border-subtle);
          padding-top: 14px;
        }
      `}</style>
    </div>
  );
}
