const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

export function getToken() {
  return localStorage.getItem('arthayog_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('arthayog_token', token);
  } else {
    localStorage.removeItem('arthayog_token');
  }
}

export function getUser() {
  const data = localStorage.getItem('arthayog_user');
  try {
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem('arthayog_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('arthayog_user');
  }
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (res.status === 204) {
    return null;
  }

  let data;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = data?.detail || data?.message || (typeof data === 'string' ? data : 'An error occurred');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    me: () => request('/auth/me'),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token, new_password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
    verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  },

  // Beds
  beds: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      if (params.check_in) q.set('check_in', params.check_in);
      if (params.check_out) q.set('check_out', params.check_out);
      if (params.floor) q.set('floor', params.floor);
      const str = q.toString();
      return request(`/beds${str ? `?${str}` : ''}`);
    },
    get: (id) => request(`/beds/${id}`),
    updateStatus: (id, status) => request(`/beds/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
  },

  // Bookings
  bookings: {
    createOnline: (data) => request('/bookings/online', { method: 'POST', body: JSON.stringify(data) }),
    createPhone: (data) => request('/bookings/phone', { method: 'POST', body: JSON.stringify(data) }),
    list: (params = {}) => {
      const q = new URLSearchParams();
      if (params.status) q.set('status', params.status);
      if (params.search) q.set('search', params.search);
      const str = q.toString();
      return request(`/bookings${str ? `?${str}` : ''}`);
    },
    get: (id) => request(`/bookings/${id}`),
    checkIn: (id, data) => request(`/bookings/${id}/check-in`, { method: 'POST', body: JSON.stringify(data) }),
    checkOut: (id, data) => request(`/bookings/${id}/check-out`, { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id, reason) => request(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ cancellation_reason: reason }) }),
    approve: (id, notes) => request(`/bookings/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),
    reject: (id, reason) => request(`/bookings/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason: reason }) }),
    getReceipt: (id) => request(`/bookings/${id}/receipt`),
    capturePhoto: (id, payload) => {
      const body = typeof payload === 'string' ? { photo_data: payload } : (payload?.photo_data ? payload : { photo_data: payload });
      return request(`/bookings/${id}/capture-photo`, { method: 'POST', body: JSON.stringify(body) });
    },
    getPhoto: (id) => request(`/bookings/${id}/photo`),
    deletePhoto: (id) => request(`/bookings/${id}/photo`, { method: 'DELETE' }),
    cleanupExpiredPhotos: () => request('/bookings/photos/cleanup-expired', { method: 'POST' }),
    verifyIdentity: (id, payload) => {
      const body = typeof payload === 'string'
        ? { aadhaar_number: payload }
        : { aadhaar_number: payload?.aadhaar_number || payload?.id_number || '', verification_method: payload?.verification_method || 'AADHAAR_UIDAI' };
      return request(`/bookings/${id}/verify-identity`, { method: 'POST', body: JSON.stringify(body) });
    },
    getIdentity: (id) => request(`/bookings/${id}/identity`),
    expireCheck: () => request('/bookings/expire-check', { method: 'POST' }),
    createGroup: (data) => request('/bookings/group', { method: 'POST', body: JSON.stringify(data) }),
    getGroup: (groupCode) => request(`/bookings/group/${groupCode}`),
    listActiveGroups: () => request('/bookings/groups/active'),
    modifyGroup: (groupCode, data) => request(`/bookings/group/${groupCode}`, { method: 'PUT', body: JSON.stringify(data) }),
    cancelGroup: (groupCode) => request(`/bookings/group/${groupCode}/cancel`, { method: 'POST' }),
    approveGroup: (groupCode, notes) => request(`/bookings/group/${groupCode}/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),
    rejectGroup: (groupCode, reason) => request(`/bookings/group/${groupCode}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason: reason }) }),
    checkInGroup: (groupCode) => request(`/bookings/group/${groupCode}/check-in`, { method: 'POST' }),
    checkOutGroup: (groupCode) => request(`/bookings/group/${groupCode}/check-out`, { method: 'POST' }),
  },

  // Payments
  payments: {
    createOrder: (bookingId, method = 'UPI') => request('/payments/create-order', { method: 'POST', body: JSON.stringify({ booking_id: bookingId, method }) }),
    verify: (data) => request('/payments/verify', { method: 'POST', body: JSON.stringify(data) }),
    sandboxSimulate: (orderId) => request(`/payments/sandbox-simulate?order_id=${encodeURIComponent(orderId)}`, { method: 'POST' }),
    recordCash: (data) => request('/payments/record-cash', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Cleaning
  cleaning: {
    getQueue: () => request('/cleaning/queue'),
    start: (bedId) => request(`/cleaning/${bedId}/start`, { method: 'POST' }),
    complete: (bedId) => request(`/cleaning/${bedId}/complete`, { method: 'POST' }),
  },

  // Inventory
  inventory: {
    list: () => request('/inventory'),
    create: (data) => request('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/inventory/${id}`, { method: 'DELETE' }),
    recordTransaction: (data) => request('/inventory/transaction', { method: 'POST', body: JSON.stringify(data) }),
    transactions: () => request('/inventory/transactions'),
    alerts: () => request('/inventory/alerts'),
  },

  // Maintenance
  maintenance: {
    list: (status) => request(`/maintenance${status ? `?status=${status}` : ''}`),
    create: (data) => request('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Staff Tasks
  tasks: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      if (params.status) q.set('status', params.status);
      if (params.assigned_to_me) q.set('assigned_to_me', 'true');
      const str = q.toString();
      return request(`/tasks${str ? `?${str}` : ''}`);
    },
    create: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Reports
  reports: {
    dashboard: () => request('/reports/dashboard'),
    analytics: () => request('/reports/detailed-analytics'),
  },

  // Audit Logs (Owner only)
  audit: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      if (params.action) q.set('action', params.action);
      if (params.entity_type) q.set('entity_type', params.entity_type);
      if (params.user_email) q.set('user_email', params.user_email);
      const str = q.toString();
      return request(`/audit${str ? `?${str}` : ''}`);
    }
  },

  // Staff Management (Owner only)
  staff: {
    list: () => request('/staff'),
    create: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleActive: (id) => request(`/staff/${id}/toggle-active`, { method: 'PATCH' }),
  },

  // Settings & QR Codes
  settings: {
    getProperty: () => request('/settings/property'),
    updateProperty: (data) => request('/settings/property', { method: 'PUT', body: JSON.stringify(data) }),
    getPricing: () => request('/settings/pricing'),
    updatePricing: (data) => request('/settings/pricing', { method: 'PUT', body: JSON.stringify(data) }),
    getStaffRoster: () => request('/settings/staff-roster'),
    updateStaffRoster: (data) => request('/settings/staff-roster', { method: 'PUT', body: JSON.stringify(data) }),
    getReview: () => request('/settings/review'),
    updateReview: (data) => request('/settings/review', { method: 'PUT', body: JSON.stringify(data) }),
    getPaymentQr: () => request('/settings/payment-qr'),
    updatePaymentQr: (data) => request('/settings/payment-qr', { method: 'PUT', body: JSON.stringify(data) }),
    disablePaymentQr: () => request('/settings/payment-qr', { method: 'DELETE' }),
    getPublicContact: () => request('/settings/public-contact'),
    listPhoneNumbers: () => request('/settings/phone-numbers'),
    createPhoneNumber: (data) => request('/settings/phone-numbers', { method: 'POST', body: JSON.stringify(data) }),
    updatePhoneNumber: (id, data) => request(`/settings/phone-numbers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePhoneNumber: (id) => request(`/settings/phone-numbers/${id}`, { method: 'DELETE' }),
  },

  // System Health & Backups (Owner only)
  system: {
    health: () => request('/system/health'),
    backup: () => request('/system/backup', { method: 'POST' }),
    backups: () => request('/system/backups'),
  }
};
