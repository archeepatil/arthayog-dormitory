import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import BedsGrid from './components/BedsGrid';
import DashboardOverview from './components/DashboardOverview';
import BookingsTable from './components/BookingsTable';
import CustomerPortal from './components/CustomerPortal';
import StaffDailyBoard from './components/StaffDailyBoard';
import InventoryView from './components/InventoryView';
import OwnerSettingsView from './components/OwnerSettingsView';
import AuditLogsView from './components/AuditLogsView';

import PhoneBookingModal from './components/PhoneBookingModal';
import CheckInModal from './components/CheckInModal';
import CheckOutModal from './components/CheckOutModal';
import PaymentModal from './components/PaymentModal';
import BookingDetailsModal from './components/BookingDetailsModal';
import GroupBookingModal from './components/GroupBookingModal';
import GroupBookingDetailsModal from './components/GroupBookingDetailsModal';
import AuthModal from './components/AuthModal';
import ReceiptModal from './components/ReceiptModal';

import { api, getUser, getToken, setUser, setToken } from './api';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [user, setCurrentUser] = useState(() => getUser());
  const [activeTab, setActiveTab] = useState(() => {
    const u = getUser();
    if (!u) return 'guest-book';
    if (u.role === 'OWNER_ADMIN') return 'dashboard';
    if (u.role === 'STAFF_EMPLOYEE') return 'staff-board';
    return 'guest-book';
  });

  // Global Data State from Real DB
  const [beds, setBeds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [pricingInfo, setPricingInfo] = useState(null);
  const [reviewSettings, setReviewSettings] = useState(null);

  // Filters & Loading
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [phoneBookingModalOpen, setPhoneBookingModalOpen] = useState(false);
  const [groupBookingModalOpen, setGroupBookingModalOpen] = useState(false);
  const [groupDetailsModalOpen, setGroupDetailsModalOpen] = useState(false);
  const [groupInitialFloor, setGroupInitialFloor] = useState(null);
  const [selectedGroupData, setSelectedGroupData] = useState(null);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const handleOpenReceipt = (booking) => {
    setReceiptBooking(booking);
    setReceiptModalOpen(true);
  };

  // Toast System
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load telemetry data from real backend APIs
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch 16 beds with date-awareness
      const bedsData = await api.beds.list({
        check_in: checkInDate || undefined,
        check_out: checkOutDate || undefined
      });
      setBeds(bedsData);

      // 2. Fetch owner-customizable property info, pricing, and reviews (Public)
      const [propRes, priceRes, revRes] = await Promise.allSettled([
        api.settings.getProperty(),
        api.settings.getPricing(),
        api.settings.getReview()
      ]);
      if (propRes.status === 'fulfilled') setPropertyInfo(propRes.value);
      if (priceRes.status === 'fulfilled') setPricingInfo(priceRes.value);
      if (revRes.status === 'fulfilled') setReviewSettings(revRes.value);

      // 3. Fetch bookings if authenticated (backend filters by user role automatically)
      if (getToken()) {
        try {
          const bookingsData = await api.bookings.list();
          setBookings(bookingsData);
        } catch (e) {
          // Ignore if unauth
        }
      }

      // 4. Role-specific telemetry for Staff & Owner
      if (user?.role === 'OWNER_ADMIN' || user?.role === 'STAFF_EMPLOYEE') {
        const [statsData, invData] = await Promise.allSettled([
          api.reports.dashboard(),
          api.inventory.list()
        ]);

        if (statsData.status === 'fulfilled') setStats(statsData.value);
        if (invData.status === 'fulfilled') setInventory(invData.value);
      }

      // 5. Owner-only deep analytics, transactions & audit
      if (user?.role === 'OWNER_ADMIN') {
        const [anData, logsData, txData] = await Promise.allSettled([
          api.reports.analytics(),
          api.audit.list(),
          api.inventory.transactions()
        ]);

        if (anData.status === 'fulfilled') setAnalytics(anData.value);
        if (logsData.status === 'fulfilled') setLogs(logsData.value);
        if (txData.status === 'fulfilled') setTransactions(txData.value);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, checkInDate, checkOutDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Strict Role Route Guard:
  // - Public/Guest: can only access 'guest-book' and 'guest-bookings'
  // - Staff: can only access 'staff-board', 'beds', 'bookings', 'calendar', 'inventory'
  // - Owner: has full access to 'dashboard', 'settings', 'audit', plus operational tabs
  useEffect(() => {
    const isOwner = user?.role === 'OWNER_ADMIN';
    const isStaff = user?.role === 'STAFF_EMPLOYEE';

    const ownerOnlyTabs = ['dashboard', 'settings', 'audit'];
    const staffAndOwnerTabs = ['staff-board', 'beds', 'bookings', 'calendar', 'inventory'];

    if (ownerOnlyTabs.includes(activeTab) && !isOwner) {
      setActiveTab(isStaff ? 'staff-board' : 'guest-book');
    } else if (staffAndOwnerTabs.includes(activeTab) && !isStaff && !isOwner) {
      setActiveTab('guest-book');
    }
  }, [user, activeTab]);

  // Auth Handlers
  const handleAuthSuccess = (loggedUser) => {
    setCurrentUser(loggedUser);
    showToast(`Welcome, ${loggedUser.full_name}!`, 'success');
    if (loggedUser.role === 'OWNER_ADMIN') setActiveTab('dashboard');
    else if (loggedUser.role === 'STAFF_EMPLOYEE') setActiveTab('staff-board');
    else setActiveTab('guest-book');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCurrentUser(null);
    setActiveTab('guest-book');
    showToast('You have been safely logged out.', 'info');
  };

  // Operational Action Handlers
  const handleUpdateBedStatus = async (bedId, newStatus) => {
    try {
      await api.beds.updateStatus(bedId, newStatus);
      showToast(`Bed status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreatePhoneBooking = async (bookingData) => {
    try {
      const res = await api.bookings.createPhone(bookingData);
      showToast(`Reservation ${res.booking_code} recorded successfully!`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleOnlineBooking = async (bookingData) => {
    try {
      const res = await api.bookings.createOnline(bookingData);
      showToast(`Booking request submitted! Your reservation #${res.booking_code} is awaiting front desk approval. Payment will be enabled once approved.`, 'info');
      loadData();
      return res;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleCheckIn = async (bookingId, checkInData) => {
    try {
      await api.bookings.checkIn(bookingId, checkInData);
      showToast('Guest checked in successfully. Bed marked OCCUPIED.', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleCheckOut = async (bookingId, checkOutData) => {
    try {
      await api.bookings.checkOut(bookingId, checkOutData);
      showToast('Guest checked out successfully.', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleCancelBooking = async (booking) => {
    const reason = window.prompt(`Enter cancellation reason for ${booking.booking_code}:`, 'Guest request');
    if (!reason) return;

    try {
      await api.bookings.cancel(booking.id, reason);
      showToast(`Reservation ${booking.booking_code} cancelled and bed released.`, 'info');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRecordInventoryTx = async (txData) => {
    try {
      await api.inventory.recordTransaction(txData);
      showToast(`Inventory updated: ${txData.change_type} recorded.`);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleTriggerExpiry = async () => {
    try {
      const res = await api.bookings.expireCheck();
      showToast(`Expiry sweep executed: ${res.expired_bookings_released} expired holds released.`);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Group Booking Handlers
  const handleOpenGroupBooking = (initialFloor = null) => {
    setGroupInitialFloor(initialFloor);
    setGroupBookingModalOpen(true);
  };

  const handleOpenGroupDetails = async (groupCode) => {
    try {
      const grp = await api.bookings.getGroup(groupCode);
      setSelectedGroupData(grp);
      setGroupDetailsModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to load group booking details.', 'error');
    }
  };

  const handleGroupBookingSuccess = (grp) => {
    setGroupBookingModalOpen(false);
    showToast(`Bulk Group Booking ${grp.group_code} created! ${grp.total_beds_assigned} beds allocated.`, 'success');
    loadData();
    setSelectedGroupData(grp);
    setGroupDetailsModalOpen(true);
  };

  // Helper for selecting bed
  const handleSelectBed = (bed) => {
    if (user?.role === 'OWNER_ADMIN' || user?.role === 'STAFF_EMPLOYEE') {
      setPhoneBookingModalOpen(true);
    } else {
      setActiveTab('guest-book');
    }
  };

  return (
    <div className="app-root">
      <Navbar 
        user={user}
        propertyInfo={propertyInfo}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenPhoneBooking={() => setPhoneBookingModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main className="main-content-layout">
        {/* 1. Owner Dashboard (STRICT OWNER ONLY) */}
        {activeTab === 'dashboard' && user?.role === 'OWNER_ADMIN' && (
          <DashboardOverview 
            stats={stats}
            analytics={analytics}
            recentBookings={bookings}
            loading={loading}
            onRefresh={loadData}
            onTriggerExpiry={handleTriggerExpiry}
            setActiveTab={setActiveTab}
            onOpenPhoneBooking={() => setPhoneBookingModalOpen(true)}
            onOpenGroupBooking={handleOpenGroupBooking}
            onOpenGroupDetails={handleOpenGroupDetails}
            onSelectBooking={(b) => { setSelectedBooking(b); setDetailsModalOpen(true); }}
          />
        )}

        {/* 2. 16 Beds Blueprint Grid (Staff & Owner only) */}
        {activeTab === 'beds' && (user?.role === 'OWNER_ADMIN' || user?.role === 'STAFF_EMPLOYEE') && (
          <BedsGrid 
            beds={beds}
            loading={loading}
            user={user}
            onSelectBed={handleSelectBed}
            onUpdateStatus={handleUpdateBedStatus}
            checkInDate={checkInDate}
            setCheckInDate={setCheckInDate}
            checkOutDate={checkOutDate}
            setCheckOutDate={setCheckOutDate}
            onOpenGroupBooking={handleOpenGroupBooking}
            onRefresh={loadData}
          />
        )}

        {/* 3. Bookings Table & Calendar View (Staff & Owner only) */}
        {(activeTab === 'bookings' || activeTab === 'calendar') && (user?.role === 'OWNER_ADMIN' || user?.role === 'STAFF_EMPLOYEE') && (
          <BookingsTable 
            bookings={bookings}
            loading={loading}
            user={user}
            beds={beds}
            initialView={activeTab === 'calendar' ? 'CALENDAR' : 'TABLE'}
            onCheckIn={(b) => { setSelectedBooking(b); setCheckInModalOpen(true); }}
            onCheckOut={(b) => { setSelectedBooking(b); setCheckOutModalOpen(true); }}
            onCancel={handleCancelBooking}
            onPay={(b) => { setSelectedBooking(b); setPaymentModalOpen(true); }}
            onSelectBooking={(b) => { setSelectedBooking(b); setDetailsModalOpen(true); }}
            onOpenPhoneBooking={() => setPhoneBookingModalOpen(true)}
            onOpenGroupBooking={handleOpenGroupBooking}
            onOpenGroupDetails={handleOpenGroupDetails}
            onOpenReceipt={handleOpenReceipt}
            onRefresh={loadData}
          />
        )}

        {/* 4. Staff Daily Board (Front Desk Duty Station Workspace - Staff and Owner) */}
        {activeTab === 'staff-board' && (user?.role === 'STAFF_EMPLOYEE' || user?.role === 'OWNER_ADMIN') && (
          <StaffDailyBoard 
            stats={stats}
            beds={beds}
            bookings={bookings}
            todayBookings={bookings}
            onOpenPhoneBooking={() => setPhoneBookingModalOpen(true)}
            onOpenGroupBooking={handleOpenGroupBooking}
            onOpenGroupDetails={handleOpenGroupDetails}
            onCheckIn={(b) => { setSelectedBooking(b); setCheckInModalOpen(true); }}
            onCheckOut={(b) => { setSelectedBooking(b); setCheckOutModalOpen(true); }}
            onSelectBooking={(b) => { setSelectedBooking(b); setDetailsModalOpen(true); }}
            setActiveTab={setActiveTab}
            onRefresh={loadData}
          />
        )}

        {/* 5. Supplies Inventory (Staff & Owner only) */}
        {activeTab === 'inventory' && (user?.role === 'STAFF_EMPLOYEE' || user?.role === 'OWNER_ADMIN') && (
          <InventoryView 
            inventory={inventory}
            transactions={transactions}
            loading={loading}
            user={user}
            onRecordTransaction={handleRecordInventoryTx}
            onRefresh={loadData}
            onShowToast={showToast}
          />
        )}

        {/* 6. Owner Central Settings & Pricing (STRICT OWNER ONLY) */}
        {activeTab === 'settings' && user?.role === 'OWNER_ADMIN' && (
          <OwnerSettingsView 
            onSettingsUpdated={loadData}
            onShowToast={showToast}
          />
        )}

        {/* 7. Audit Logs (STRICT OWNER ONLY) */}
        {activeTab === 'audit' && user?.role === 'OWNER_ADMIN' && (
          <AuditLogsView 
            logs={logs}
            loading={loading}
            onRefresh={loadData}
          />
        )}

        {/* 8. Customer Experience & My Bookings */}
        {(activeTab === 'guest-book' || activeTab === 'guest-bookings') && (
          <CustomerPortal 
            beds={beds}
            user={user}
            propertyInfo={propertyInfo}
            pricingInfo={pricingInfo}
            reviewSettings={reviewSettings}
            checkInDate={checkInDate}
            setCheckInDate={setCheckInDate}
            checkOutDate={checkOutDate}
            setCheckOutDate={setCheckOutDate}
            onBookBed={handleOnlineBooking}
            userBookings={bookings}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenAuth={() => setAuthModalOpen(true)}
            onPayBooking={(b) => { setSelectedBooking(b); setPaymentModalOpen(true); }}
            onSelectBooking={(b) => { setSelectedBooking(b); setDetailsModalOpen(true); }}
            onOpenReceipt={handleOpenReceipt}
          />
        )}
      </main>

      {/* Global Modals */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <PhoneBookingModal 
        isOpen={phoneBookingModalOpen}
        onClose={() => setPhoneBookingModalOpen(false)}
        beds={beds}
        onSubmit={handleCreatePhoneBooking}
      />

      <CheckInModal 
        isOpen={checkInModalOpen}
        onClose={() => { setCheckInModalOpen(false); setSelectedBooking(null); }}
        booking={selectedBooking}
        onSubmit={handleCheckIn}
      />

      <CheckOutModal 
        isOpen={checkOutModalOpen}
        onClose={() => { setCheckOutModalOpen(false); setSelectedBooking(null); }}
        booking={selectedBooking}
        onSubmit={handleCheckOut}
      />

      <PaymentModal 
        isOpen={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setSelectedBooking(null); }}
        booking={selectedBooking}
        onSuccess={() => { showToast('Payment successfully verified and confirmed!'); loadData(); }}
        isStaff={user?.role === 'OWNER_ADMIN' || user?.role === 'STAFF_EMPLOYEE'}
      />

      <BookingDetailsModal 
        isOpen={detailsModalOpen}
        onClose={() => { setDetailsModalOpen(false); setSelectedBooking(null); }}
        booking={selectedBooking}
        onOpenReceipt={handleOpenReceipt}
      />

      <ReceiptModal 
        isOpen={receiptModalOpen}
        onClose={() => { setReceiptModalOpen(false); setReceiptBooking(null); }}
        bookingId={receiptBooking?.id}
      />

      <GroupBookingModal 
        isOpen={groupBookingModalOpen}
        onClose={() => { setGroupBookingModalOpen(false); setGroupInitialFloor(null); }}
        onSuccess={handleGroupBookingSuccess}
        initialFloor={groupInitialFloor}
      />

      <GroupBookingDetailsModal 
        isOpen={groupDetailsModalOpen}
        onClose={() => { setGroupDetailsModalOpen(false); setSelectedGroupData(null); }}
        group={selectedGroupData}
        onRefresh={loadData}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      <style>{`
        .app-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .main-content-layout {
          max-width: 1380px;
          width: 100%;
          margin: 0 auto;
          padding: 24px 20px 80px;
          flex: 1;
        }
        @media (max-width: 600px) {
          .main-content-layout {
            padding: 16px 12px 90px;
          }
        }
      `}</style>
    </div>
  );
}
