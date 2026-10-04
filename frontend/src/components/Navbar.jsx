import { 
  Building2, 
  LogOut, 
  User as UserIcon, 
  PhoneCall,
  LayoutDashboard,
  BedDouble,
  ClipboardList,
  Package,
  FileText,
  Menu,
  X,
  Settings
} from 'lucide-react';
import { useLanguage, LanguageSelector } from '../i18n.jsx';

export default function Navbar({ 
  user, 
  propertyInfo,
  activeTab, 
  setActiveTab, 
  onLogout, 
  onOpenAuth, 
  onOpenPhoneBooking,
  mobileMenuOpen,
  setMobileMenuOpen 
}) {
  const { t } = useLanguage();
  const isOwner = user?.role === 'OWNER_ADMIN';
  const isStaff = user?.role === 'STAFF_EMPLOYEE';
  const isCustomer = user?.role === 'CUSTOMER_GUEST';

  const propName = propertyInfo?.property_name || 'Arthayog Dormitory';
  const contactPhone = propertyInfo?.contact_phone || '+91 98765 43210';

  // Role-based navigation: simple, practical & small-dormitory focused
  const navItems = isOwner ? [
    { id: 'dashboard', label: t('nav_dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'beds', label: t('nav_beds', '16 Beds'), icon: BedDouble },
    { id: 'bookings', label: t('nav_bookings', 'Bookings'), icon: ClipboardList },
    { id: 'inventory', label: t('nav_inventory', 'Inventory'), icon: Package },
    { id: 'settings', label: t('nav_settings', 'Settings & Pricing'), icon: Settings },
    { id: 'audit', label: t('nav_audit', 'Audit Logs'), icon: FileText },
  ] : isStaff ? [
    { id: 'staff-board', label: t('nav_daily_board', 'Daily Operations'), icon: LayoutDashboard },
    { id: 'beds', label: t('nav_beds', '16 Beds'), icon: BedDouble },
    { id: 'bookings', label: t('nav_bookings', 'Bookings'), icon: ClipboardList },
    { id: 'inventory', label: t('nav_inventory', 'Inventory'), icon: Package },
  ] : user ? [
    { id: 'guest-book', label: t('nav_live_availability', 'Live Availability'), icon: BedDouble },
    { id: 'guest-bookings', label: t('nav_my_bookings', 'My Bookings'), icon: ClipboardList },
  ] : [
    { id: 'guest-book', label: t('nav_live_availability', 'Live Availability'), icon: BedDouble },
  ];

  const handleBrandClick = () => {
    if (isOwner) setActiveTab('dashboard');
    else if (isStaff) setActiveTab('staff-board');
    else setActiveTab('guest-book');
  };

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        {/* Brand */}
        <div className="navbar-brand" onClick={handleBrandClick}>
          <div className="brand-icon-box">
            {propertyInfo?.logo_url ? (
              <img src={propertyInfo.logo_url} alt="Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            ) : (
              <Building2 size={22} color="#C25E40" />
            )}
          </div>
          <div className="brand-text">
            <div className="brand-title">
              {propName.toUpperCase()}
            </div>
            <div className="brand-sub">{t('brand_subtitle', '16-Bed Boutique Dormitory')}</div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions & Profile */}
        <div className="navbar-actions">
          {/* Visible Multilingual Selector: English | मराठी | हिंदी */}
          <LanguageSelector className="nav-lang-picker" />

          {isStaff || isOwner ? (
            <button 
              className="btn btn-primary btn-sm phone-book-quick-btn"
              onClick={onOpenPhoneBooking}
              title={t('phone_booking', 'Quick Phone / Front Desk Reservation')}
            >
              <PhoneCall size={14} />
              <span className="hide-on-mobile">{t('phone_booking', 'Phone Booking')}</span>
            </button>
          ) : (
            <a 
              href={`tel:${contactPhone}`} 
              className="btn btn-primary btn-sm phone-book-quick-btn"
              title={t('call', 'Call Front Desk to Book')}
              style={{ textDecoration: 'none' }}
            >
              <PhoneCall size={14} />
              <span className="hide-on-mobile">{t('call', 'Call')}: {contactPhone}</span>
              <span className="show-on-mobile-inline">{t('call', 'Call')}</span>
            </a>
          )}

          {user ? (
            <div className="user-profile-badge">
              <div className="user-info hide-on-mobile">
                <span className="user-name">{user.full_name}</span>
                <span className={`role-pill role-${user.role.toLowerCase()}`}>
                  {user.role === 'OWNER_ADMIN' ? t('owner_admin', 'Owner / Admin') : user.role === 'STAFF_EMPLOYEE' ? t('staff_employee', 'Front Desk Staff') : t('guest', 'Guest')}
                </span>
              </div>
              <button 
                className="btn btn-ghost btn-sm logout-btn" 
                onClick={onLogout}
                title={t('nav_sign_out', 'Log out')}
                aria-label={t('nav_sign_out', 'Log out')}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={onOpenAuth}>
              <UserIcon size={15} />
              <span>{t('nav_sign_in', 'Sign In')}</span>
            </button>
          )}

          {/* Mobile Hamburger */}
          <button 
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer animate-fade-in">
          <div className="mobile-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {(isStaff || isOwner) && (
              <button
                className="mobile-nav-item phone-highlight"
                onClick={() => {
                  onOpenPhoneBooking();
                  setMobileMenuOpen(false);
                }}
              >
                <PhoneCall size={18} />
                <span>+ Create Phone Booking</span>
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .navbar-container {
          position: sticky;
          top: 0;
          z-index: 500;
          background: #FFFFFF;
          border-bottom: 1px solid var(--border-subtle);
          box-shadow: 0 1px 3px rgba(28, 25, 23, 0.04);
        }
        .navbar-content {
          max-width: 1380px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }
        .brand-icon-box {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-title {
          font-family: var(--font-serif);
          font-weight: 700;
          font-size: 1.15rem;
          letter-spacing: 0.02em;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .brand-tag {
          font-family: var(--font-sans);
          font-size: 0.65rem;
          background: var(--primary);
          color: #ffffff;
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .brand-sub {
          font-size: 0.74rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .nav-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          transition: var(--transition);
        }
        .nav-tab-btn:hover {
          color: var(--text-main);
          background: var(--bg-secondary);
        }
        .nav-tab-btn.active {
          color: var(--primary);
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          font-weight: 700;
        }
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-profile-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 12px;
          background: var(--bg-secondary);
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }
        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.2;
        }
        .user-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .role-pill {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .role-owner_admin { color: var(--primary); }
        .role-staff_employee { color: var(--accent-gold); }
        .role-customer_guest { color: var(--text-muted); }
        .logout-btn {
          color: var(--text-muted);
          padding: 4px;
        }
        .logout-btn:hover {
          color: var(--danger);
        }
        .mobile-hamburger-btn {
          display: none;
          color: var(--text-main);
          padding: 6px;
        }
        .mobile-drawer {
          display: none;
          background: #FFFFFF;
          border-bottom: 1px solid var(--border-subtle);
          padding: 12px 16px;
          box-shadow: 0 8px 16px rgba(28, 25, 23, 0.06);
        }
        .mobile-nav-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--text-body);
          text-align: left;
        }
        .mobile-nav-item.active {
          color: var(--primary);
          background: var(--primary-light);
          font-weight: 700;
        }
        .mobile-nav-item.phone-highlight {
          color: var(--primary);
          background: var(--primary-light);
          border: 1px dashed var(--primary);
        }
        .show-on-mobile-inline {
          display: none;
        }
        @media (max-width: 1024px) {
          .desktop-nav { display: none; }
          .mobile-hamburger-btn { display: block; }
          .mobile-drawer { display: block; }
          .hide-on-mobile { display: none; }
          .show-on-mobile-inline { display: inline; }
        }
      `}</style>
    </header>
  );
}
