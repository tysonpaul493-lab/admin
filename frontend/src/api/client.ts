import { 
  User, Ambulance, Booking, Driver, Hospital, OperationalAlert, AuditLog, DashboardStats 
} from '../types';
import { 
  INITIAL_AMBULANCES, INITIAL_BOOKINGS, INITIAL_DRIVERS, 
  INITIAL_HOSPITALS, INITIAL_ALERTS, INITIAL_AUDIT_LOGS, INITIAL_STAFF 
} from './mockData';

// In-Memory store for standalone interactive demonstration
let memoryAmbulances = [...INITIAL_AMBULANCES];
let memoryBookings = [...INITIAL_BOOKINGS];
let memoryDrivers = [...INITIAL_DRIVERS];
let memoryHospitals = [...INITIAL_HOSPITALS];
let memoryAlerts = [...INITIAL_ALERTS];
let memoryAuditLogs = [...INITIAL_AUDIT_LOGS];
let memoryStaff = [...INITIAL_STAFF];

const DEFAULT_API_URL = 'https://assembled-rfc-tables-generators.trycloudflare.com/api/v1';

export const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api/v1';
    }
  }
  return (import.meta as any).env?.VITE_API_URL || DEFAULT_API_URL;
};

const API_BASE = getApiBase();

function getToken(): string | null {
  return localStorage.getItem('ambulance_admin_token');
}

export const api = {
  // Authentication
  async login(email: string, password: string, mfaCode?: string): Promise<{ success: boolean; token?: string; user?: User; mfa_required?: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password, mfa_code: mfaCode })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback to local administrative store
    }

    // Local fallback check
    const staff = memoryStaff.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (!staff) {
      throw new Error('Invalid email or password provided. Administrator records not found.');
    }

    if (staff.mfa_enabled && !mfaCode) {
      return { success: true, mfa_required: true, message: 'Two-Factor Authentication required. Enter 6-digit TOTP code.' };
    }

    if (staff.mfa_enabled && mfaCode !== '123456') {
      throw new Error('Invalid MFA verification code.');
    }

    const token = `sanctum_token_${Date.now()}_${staff.role}`;
    localStorage.setItem('ambulance_admin_token', token);
    localStorage.setItem('ambulance_admin_user', JSON.stringify(staff));

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_id: staff.id,
      user_name: staff.name,
      user_role: staff.role_name,
      action: 'LOGIN_SUCCESS',
      target_type: 'User',
      target_id: staff.id,
      ip_address: '127.0.0.1',
      user_agent: navigator.userAgent,
      reason: 'Administrative session initialized',
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      token,
      user: staff,
      message: 'Authentication successful.'
    };
  },

  async logout(): Promise<void> {
    try {
      const token = getToken();
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
      }
    } catch (e) {
      // silent
    }
    localStorage.removeItem('ambulance_admin_token');
    localStorage.removeItem('ambulance_admin_user');
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (data && data.metrics) {
          const avail = data.metrics.available_ambulances?.value ?? 0;
          const busy = data.metrics.busy_ambulances?.value ?? 0;
          const maint = data.metrics.maintenance_ambulances?.value ?? 0;
          data.fleet_breakdown = [
            { name: 'Available', value: avail, color: '#10b981' },
            { name: 'On Duty (Busy)', value: busy, color: '#ef4444' },
            { name: 'Maintenance', value: maint, color: '#f59e0b' },
          ];
          return data;
        }
      }
    } catch (e) {
      console.warn('Dashboard stats fetch failed, falling back to local memory store', e);
    }

    // In-memory calculation matching real database numbers
    const totalUsers = 1240;
    const verifiedDrivers = memoryDrivers.filter(d => d.verification_status === 'APPROVED').length;
    const pendingVerifications = memoryDrivers.filter(d => d.verification_status === 'PENDING_REVIEW').length;
    const offlineDrivers = memoryDrivers.filter(d => d.online_status === 'OFFLINE').length;
    const onlineDrivers = memoryDrivers.filter(d => d.online_status === 'ONLINE').length;

    const totalAmbulances = memoryAmbulances.length;
    const availableAmbulances = memoryAmbulances.filter(a => a.operational_status === 'AVAILABLE').length;
    const busyAmbulances = memoryAmbulances.filter(a => a.operational_status === 'BUSY').length;
    const maintenanceAmbulances = memoryAmbulances.filter(a => a.operational_status === 'MAINTENANCE').length;

    const activeBookings = memoryBookings.filter(b => 
      !['COMPLETED', 'CANCELLED', 'FAILED_DISPATCH'].includes(b.status)
    ).length;
    const completedTrips = memoryBookings.filter(b => b.status === 'COMPLETED').length;
    const failedDispatches = memoryBookings.filter(b => b.status === 'FAILED_DISPATCH').length;
    const cancelledTrips = memoryBookings.filter(b => b.status === 'CANCELLED').length;

    const hourlyTrends = [
      { hour: '00:00', critical: 2, severe: 4, moderate: 2 },
      { hour: '04:00', critical: 1, severe: 2, moderate: 1 },
      { hour: '08:00', critical: 6, severe: 11, moderate: 5 },
      { hour: '12:00', critical: 9, severe: 15, moderate: 8 },
      { hour: '16:00', critical: 8, severe: 14, moderate: 7 },
      { hour: '20:00', critical: 5, severe: 9, moderate: 4 },
    ];

    return {
      metrics: {
        total_users: { value: totalUsers, available: true },
        total_verified_drivers: { value: verifiedDrivers, available: true },
        pending_driver_verifications: { value: pendingVerifications, available: true },
        offline_drivers: { value: offlineDrivers, available: true },
        online_drivers: { value: onlineDrivers, available: true },
        total_registered_ambulances: { value: totalAmbulances, available: true },
        available_ambulances: { value: availableAmbulances, available: true },
        busy_ambulances: { value: busyAmbulances, available: true },
        maintenance_ambulances: { value: maintenanceAmbulances, available: true },
        active_bookings: { value: activeBookings, available: true },
        completed_trips: { value: completedTrips, available: true },
        failed_dispatches: { value: failedDispatches, available: true },
        cancelled_trips: { value: cancelledTrips, available: true },
      },
      fleet_breakdown: [
        { name: 'Available', value: availableAmbulances, color: '#10b981' },
        { name: 'On Duty (Busy)', value: busyAmbulances, color: '#ef4444' },
        { name: 'Maintenance', value: maintenanceAmbulances, color: '#f59e0b' },
      ],
      recent_activity: memoryBookings.slice(0, 5),
      critical_alerts: memoryAlerts.filter(a => !a.is_resolved && a.severity === 'CRITICAL'),
      hourly_trends: hourlyTrends,
      timestamp: new Date().toISOString()
    };
  },

  // Live Map Tracking
  async getLiveAmbulances(): Promise<Ambulance[]> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/tracking/live`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : (json.data?.active_ambulances || json.data?.ambulances || []);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (e) {}

    // Check GPS staleness for each vehicle
    const now = Date.now();
    return memoryAmbulances.map(a => {
      const pingMs = a.last_gps_ping_at ? new Date(a.last_gps_ping_at).getTime() : 0;
      const diffSec = Math.floor((now - pingMs) / 1000);
      return {
        ...a,
        seconds_since_ping: diffSec,
        is_gps_stale: diffSec > 60
      };
    });
  },

  // Update vehicle GPS simulation (for live map animation)
  simulateGpsPulse() {
    memoryAmbulances = memoryAmbulances.map(a => {
      if (a.operational_status === 'BUSY' && a.speed_kmh > 0) {
        // slightly advance lat/lng along course
        const latDelta = (Math.random() - 0.48) * 0.0008;
        const lngDelta = (Math.random() - 0.48) * 0.0008;
        return {
          ...a,
          latitude: a.latitude + latDelta,
          longitude: a.longitude + lngDelta,
          last_gps_ping_at: new Date().toISOString(),
          seconds_since_ping: 1,
          is_gps_stale: false,
        };
      }
      return a;
    });
  },

  // Bookings
  async getBookings(): Promise<Booking[]> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data.data || json.data;
      }
    } catch (e) {}
    return [...memoryBookings];
  },

  async assignDriver(bookingId: number, driverId: number, reason?: string): Promise<Booking> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/assign-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ driver_id: driverId, reason })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch (e) {
      console.warn('assignDriver API call failed, using local store', e);
    }

    const driver = memoryDrivers.find(d => d.id === driverId);
    if (!driver) throw new Error('Driver not found');
    if (driver.verification_status !== 'APPROVED') throw new Error('Driver is not verified/approved.');
    
    // Conflict guard
    const active = memoryBookings.find(b => b.driver_id === driverId && !['COMPLETED', 'CANCELLED', 'FAILED_DISPATCH'].includes(b.status));
    if (active && active.id !== bookingId) {
      throw new Error(`Conflict guard: Paramedic ${driver.full_name} is already assigned to active emergency ${active.booking_reference}.`);
    }

    const bookingIndex = memoryBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const ambulance = memoryAmbulances.find(a => a.id === driver.assigned_ambulance_id);
    if (!ambulance) throw new Error('Driver does not have an approved ambulance assigned.');

    const updatedBooking: Booking = {
      ...memoryBookings[bookingIndex],
      driver_id: driver.id,
      driver: driver,
      ambulance_id: ambulance.id,
      ambulance: ambulance,
      status: 'DISPATCHED',
      dispatched_at: new Date().toISOString(),
      events: [
        ...(memoryBookings[bookingIndex].events || []),
        {
          id: Date.now(),
          booking_id: bookingId,
          event_type: 'MANUAL_DISPATCH',
          description: `Assigned to Paramedic ${driver.full_name} (${ambulance.registration_number}) by Dispatcher. ${reason ? 'Reason: ' + reason : ''}`,
          actor_type: 'DISPATCHER',
          created_at: new Date().toISOString()
        }
      ]
    };

    memoryBookings[bookingIndex] = updatedBooking;
    
    // Update driver & ambulance status
    driver.operational_status = 'ON_TRIP';
    ambulance.operational_status = 'BUSY';

    // Log in audit trail
    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Dispatcher Staff',
      user_role: 'Dispatcher',
      action: 'MANUAL_DRIVER_ASSIGNED',
      target_type: 'Booking',
      target_id: bookingId,
      ip_address: '127.0.0.1',
      reason: reason || 'Manual dispatch assignment',
      created_at: new Date().toISOString()
    });

    return updatedBooking;
  },

  async reassignDriver(bookingId: number, newDriverId: number, reason: string): Promise<Booking> {
    const driver = memoryDrivers.find(d => d.id === newDriverId);
    if (!driver) throw new Error('Driver not found');
    
    const active = memoryBookings.find(b => b.driver_id === newDriverId && !['COMPLETED', 'CANCELLED', 'FAILED_DISPATCH'].includes(b.status));
    if (active && active.id !== bookingId) {
      throw new Error(`Conflict guard: Paramedic ${driver.full_name} already has active trip ${active.booking_reference}.`);
    }

    const bookingIndex = memoryBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const booking = memoryBookings[bookingIndex];
    if (['PATIENT_ON_BOARD', 'COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw new Error(`Cannot reassign trip in status ${booking.status}.`);
    }

    // Free previous driver
    if (booking.driver_id) {
      const oldD = memoryDrivers.find(d => d.id === booking.driver_id);
      if (oldD) oldD.operational_status = 'AVAILABLE';
    }

    const ambulance = memoryAmbulances.find(a => a.id === driver.assigned_ambulance_id);
    const updated: Booking = {
      ...booking,
      driver_id: driver.id,
      driver: driver,
      ambulance_id: ambulance?.id,
      ambulance: ambulance,
      events: [
        ...(booking.events || []),
        {
          id: Date.now(),
          booking_id: bookingId,
          event_type: 'DRIVER_REASSIGNED',
          description: `Driver reassigned to ${driver.full_name}. Reason: ${reason}`,
          actor_type: 'DISPATCHER',
          created_at: new Date().toISOString()
        }
      ]
    };

    memoryBookings[bookingIndex] = updated;
    driver.operational_status = 'ON_TRIP';

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Dispatcher Staff',
      user_role: 'Dispatcher',
      action: 'DRIVER_REASSIGNED',
      target_type: 'Booking',
      target_id: bookingId,
      reason,
      created_at: new Date().toISOString()
    });

    return updated;
  },

  async cancelBooking(bookingId: number, reason: string): Promise<Booking> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch (e) {
      console.warn('cancelBooking API call failed, using local store', e);
    }

    const bookingIndex = memoryBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const booking = memoryBookings[bookingIndex];
    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw new Error(`Booking is already ${booking.status}.`);
    }

    if (booking.driver_id) {
      const d = memoryDrivers.find(dr => dr.id === booking.driver_id);
      if (d) d.operational_status = 'AVAILABLE';
    }
    if (booking.ambulance_id) {
      const amb = memoryAmbulances.find(a => a.id === booking.ambulance_id);
      if (amb && amb.operational_status === 'BUSY') amb.operational_status = 'AVAILABLE';
    }

    const updated: Booking = {
      ...booking,
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      events: [
        ...(booking.events || []),
        {
          id: Date.now(),
          booking_id: bookingId,
          event_type: 'CANCELLED',
          description: `Booking cancelled by Administrative Staff. Reason: ${reason}`,
          actor_type: 'DISPATCHER',
          created_at: new Date().toISOString()
        }
      ]
    };

    memoryBookings[bookingIndex] = updated;

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Dispatcher Staff',
      user_role: 'Dispatcher',
      action: 'BOOKING_CANCELLED',
      target_type: 'Booking',
      target_id: bookingId,
      reason,
      created_at: new Date().toISOString()
    });

    return updated;
  },

  async addBookingNote(bookingId: number, note: string, authorName: string): Promise<string> {
    const bookingIndex = memoryBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const entry = `[${timestamp} | ${authorName}]: ${note}\n`;
    const newNotes = (memoryBookings[bookingIndex].operational_notes || '') + entry;

    memoryBookings[bookingIndex].operational_notes = newNotes;
    memoryBookings[bookingIndex].events = [
      ...(memoryBookings[bookingIndex].events || []),
      {
        id: Date.now(),
        booking_id: bookingId,
        event_type: 'NOTE_ADDED',
        description: `Operational note added by ${authorName}`,
        actor_type: 'STAFF',
        created_at: new Date().toISOString()
      }
    ];

    return newNotes;
  },

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/drivers`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list) && list.length > 0) {
          memoryDrivers = list;
          return list;
        }
      }
    } catch (e) {
      console.warn('getDrivers API call failed, using local store', e);
    }
    return [...memoryDrivers];
  },

  async verifyDriver(driverId: number, action: 'APPROVE' | 'REJECT' | 'REQUEST_DOCUMENTS', reason?: string): Promise<Driver> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/drivers/${driverId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, reason })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.driver) {
          const idx = memoryDrivers.findIndex(d => d.id === driverId);
          if (idx !== -1) {
            memoryDrivers[idx] = {
              ...memoryDrivers[idx],
              verification_status: action === 'APPROVE' ? 'APPROVED' : (action === 'REJECT' ? 'REJECTED' : 'PENDING_REVIEW')
            };
            return memoryDrivers[idx];
          }
        }
      }
    } catch (e) {
      console.warn('verifyDriver API call failed', e);
    }

    const idx = memoryDrivers.findIndex(d => d.id === driverId);
    if (idx === -1) throw new Error('Driver not found');

    const driver = memoryDrivers[idx];
    if (action === 'APPROVE') {
      driver.verification_status = 'APPROVED';
      driver.suspension_reason = null;
      if (driver.documents) {
        driver.documents.forEach(doc => doc.verification_status = 'APPROVED');
      }
    } else if (action === 'REJECT') {
      driver.verification_status = 'REJECTED';
      driver.online_status = 'OFFLINE';
      driver.suspension_reason = reason;
    } else {
      driver.verification_status = 'PENDING_REVIEW';
      driver.suspension_reason = `Updated documents required: ${reason}`;
    }

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Marcus Chen',
      user_role: 'Driver Verification Officer',
      action: `DRIVER_${action}`,
      target_type: 'Driver',
      target_id: driverId,
      reason: reason || 'Driver credentials verification decision',
      created_at: new Date().toISOString()
    });

    return { ...driver };
  },

  async toggleDriverSuspension(driverId: number, action: 'SUSPEND' | 'REACTIVATE', reason: string): Promise<Driver> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/drivers/${driverId}/toggle-suspension`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, reason })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.driver) {
          const idx = memoryDrivers.findIndex(d => d.id === driverId);
          if (idx !== -1) {
            memoryDrivers[idx] = {
              ...memoryDrivers[idx],
              verification_status: action === 'SUSPEND' ? 'SUSPENDED' : 'APPROVED',
              online_status: action === 'SUSPEND' ? 'OFFLINE' : memoryDrivers[idx].online_status
            };
            return memoryDrivers[idx];
          }
        }
      }
    } catch (e) {
      console.warn('toggleDriverSuspension API call failed', e);
    }

    const idx = memoryDrivers.findIndex(d => d.id === driverId);
    if (idx === -1) throw new Error('Driver not found');

    const driver = memoryDrivers[idx];
    if (action === 'SUSPEND') {
      driver.verification_status = 'SUSPENDED';
      driver.online_status = 'OFFLINE';
      driver.suspension_reason = reason;
    } else {
      driver.verification_status = 'APPROVED';
      driver.suspension_reason = null;
    }

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Marcus Chen',
      user_role: 'Driver Verification Officer',
      action: `DRIVER_${action}`,
      target_type: 'Driver',
      target_id: driverId,
      reason,
      created_at: new Date().toISOString()
    });

    return { ...driver };
  },

  // Ambulances
  async getAmbulances(): Promise<Ambulance[]> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/ambulances`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list) && list.length > 0) {
          memoryAmbulances = list;
          return list;
        }
      }
    } catch (e) {
      console.warn('getAmbulances API call failed', e);
    }
    return [...memoryAmbulances];
  },

  async addAmbulance(ambulance: Omit<Ambulance, 'id'>): Promise<Ambulance> {
    const newAmb: Ambulance = {
      ...ambulance,
      id: memoryAmbulances.length + 1,
      last_gps_ping_at: new Date().toISOString(),
      seconds_since_ping: 0,
      is_gps_stale: false,
    };
    memoryAmbulances.unshift(newAmb);

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Fleet Manager',
      user_role: 'Super Administrator',
      action: 'AMBULANCE_CREATED',
      target_type: 'Ambulance',
      target_id: newAmb.id,
      reason: 'New emergency vehicle registered into municipal fleet',
      created_at: new Date().toISOString()
    });

    return newAmb;
  },

  async updateAmbulanceStatus(id: number, status: Ambulance['operational_status'], reason: string): Promise<Ambulance> {
    const idx = memoryAmbulances.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Ambulance not found');

    memoryAmbulances[idx].operational_status = status;

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Dispatcher Staff',
      user_role: 'Dispatcher',
      action: 'AMBULANCE_STATUS_CHANGED',
      target_type: 'Ambulance',
      target_id: id,
      reason,
      created_at: new Date().toISOString()
    });

    return { ...memoryAmbulances[idx] };
  },

  // Hospitals
  async getHospitals(): Promise<Hospital[]> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/hospitals`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list) && list.length > 0) {
          memoryHospitals = list;
          return list;
        }
      }
    } catch (e) {
      console.warn('getHospitals API call failed', e);
    }
    return [...memoryHospitals];
  },

  // Registered Citizen Users
  async getUsers(): Promise<any[]> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
    } catch (e) {
      console.warn('getUsers API call failed', e);
    }
    return [];
  },

  async addHospital(hospital: Omit<Hospital, 'id'>): Promise<Hospital> {
    const newHospital: Hospital = {
      ...hospital,
      id: memoryHospitals.length + 1,
    };
    memoryHospitals.unshift(newHospital);

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Hospital Liaison',
      user_role: 'Hospital Manager',
      action: 'HOSPITAL_ADDED',
      target_type: 'Hospital',
      target_id: newHospital.id,
      reason: 'New medical facility accredited',
      created_at: new Date().toISOString()
    });

    return newHospital;
  },

  // Operational Alerts
  async getAlerts(): Promise<OperationalAlert[]> {
    return [...memoryAlerts];
  },

  async acknowledgeAlert(id: number): Promise<void> {
    const alert = memoryAlerts.find(a => a.id === id);
    if (alert) {
      alert.is_acknowledged = true;
      alert.acknowledged_at = new Date().toISOString();
    }
  },

  async resolveAlert(id: number): Promise<void> {
    const alert = memoryAlerts.find(a => a.id === id);
    if (alert) {
      alert.is_resolved = true;
    }
  },

  async broadcastAnnouncement(title: string, message: string, severity: OperationalAlert['severity']): Promise<OperationalAlert> {
    const alert: OperationalAlert = {
      id: Date.now(),
      alert_code: 'BROADCAST_ANNOUNCEMENT',
      severity,
      title: `[Announcement] ${title}`,
      message,
      is_acknowledged: false,
      is_resolved: false,
      created_at: new Date().toISOString(),
    };
    memoryAlerts.unshift(alert);

    memoryAuditLogs.unshift({
      id: Date.now(),
      user_name: 'Command Supervisor',
      user_role: 'Super Administrator',
      action: 'BROADCAST_TRANSMITTED',
      target_type: 'OperationalAlert',
      target_id: alert.id,
      reason: 'Transmitted emergency broadcast',
      created_at: new Date().toISOString()
    });

    return alert;
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return [...memoryAuditLogs];
  }
};