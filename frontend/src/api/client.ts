import { 
  User, Ambulance, Booking, Driver, Hospital, OperationalAlert, AuditLog, DashboardStats, MetricItem 
} from '../types';

export const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    if ((import.meta as any).env?.VITE_API_URL) {
      return (import.meta as any).env.VITE_API_URL;
    }
    if (window.location.protocol === 'file:') {
      return 'http://127.0.0.1:8000/api/v1';
    }
    return '/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1';
};

const API_BASE = getApiBase();

function getToken(): string | null {
  return localStorage.getItem('ambulance_admin_token');
}

async function fetchWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  // Candidate endpoints in priority order
  const targets = [
    `${API_BASE}${endpoint}`,
    `http://127.0.0.1:8000/api/v1${endpoint}`,
    `http://localhost:8000/api/v1${endpoint}`,
  ];

  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    targets.push(`http://${window.location.hostname}:8000/api/v1${endpoint}`);
  }

  for (const targetUrl of targets) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(targetUrl, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 401 || res.status === 422 || res.status === 403 || res.status === 400 || res.status === 404) {
        return res;
      }
    } catch (_) {
      // Try next candidate target
    }
  }

  throw new Error('All dispatch backend connection candidates were unreachable.');
}

export const api = {
  // Authentication: Communicates directly with Laravel Backend admins table
  async login(email: string, password: string, mfaCode?: string): Promise<{ success: boolean; token?: string; user?: User; mfa_required?: boolean; message?: string }> {
    const res = await fetchWithFallback('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password, mfa_code: mfaCode })
    });
    
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (data.token) {
        localStorage.setItem('ambulance_admin_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('ambulance_admin_user', JSON.stringify(data.user));
      }
      return data;
    }
    
    if (data.mfa_required) {
      return data;
    }
    
    throw new Error(data.message || 'Invalid administrator credentials. Access denied.');
  },

  async logout(): Promise<void> {
    try {
      const token = getToken();
      if (token) {
        await fetchWithFallback('/auth/logout', {
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
      const res = await fetchWithFallback('/dashboard/stats', {
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
      console.warn('Dashboard stats fetch failed', e);
    }

    // Return structured real empty state (No fake 1240 users or fabricated revenue)
    const zeroMetric = (val = 0, fmt = '0'): MetricItem => ({ value: val, formatted: fmt, available: true, change: 0 });
    return {
      metrics: {
        total_revenue: zeroMetric(0, '₹0'),
        today_revenue: zeroMetric(0, '₹0'),
        total_users: zeroMetric(0),
        total_verified_drivers: zeroMetric(0),
        pending_driver_verifications: zeroMetric(0),
        offline_drivers: zeroMetric(0),
        online_drivers: zeroMetric(0),
        total_registered_ambulances: zeroMetric(0),
        available_ambulances: zeroMetric(0),
        busy_ambulances: zeroMetric(0),
        maintenance_ambulances: zeroMetric(0),
        active_bookings: zeroMetric(0),
        completed_trips: zeroMetric(0),
        failed_dispatches: zeroMetric(0),
        cancelled_trips: zeroMetric(0),
        avg_response_time_seconds: zeroMetric(0, '0s'),
        avg_assignment_time_seconds: zeroMetric(0, '0s'),
      },
      hourly_trends: [],
      fleet_breakdown: [
        { name: 'Available', value: 0, color: '#10b981' },
        { name: 'On Duty (Busy)', value: 0, color: '#ef4444' },
        { name: 'Maintenance', value: 0, color: '#f59e0b' },
      ],
      recent_activity: [],
      critical_alerts: [],
    };
  },

  // Live Tracking Ambulances
  async getLiveAmbulances(): Promise<Ambulance[]> {
    try {
      const token = getToken();
      const res = await fetchWithFallback('/tracking/live', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : (json.data?.active_ambulances || json.data?.ambulances || []);
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (e) {
      console.warn('getLiveAmbulances failed', e);
    }
    return [];
  },


  // Bookings
  async getBookings(): Promise<Booking[]> {
    try {
      const token = getToken();
      const res = await fetchWithFallback('/bookings', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data?.data || json.data || json || [];
      }
    } catch (e) {
      console.warn('getBookings failed', e);
    }
    return [];
  },

  async assignDriver(bookingId: number, driverId: number, reason?: string): Promise<Booking> {
    const token = getToken();
    const res = await fetchWithFallback(`/bookings/${bookingId}/assign-driver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ driver_id: driverId, reason })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.data) {
      return json.data;
    }
    throw new Error(json.message || 'Failed to dispatch ambulance driver.');
  },

  async reassignDriver(bookingId: number, newDriverId: number, reason: string): Promise<Booking> {
    const token = getToken();
    const res = await fetchWithFallback(`/bookings/${bookingId}/assign-driver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ driver_id: newDriverId, reason })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.data) {
      return json.data;
    }
    throw new Error(json.message || 'Failed to reassign ambulance driver.');
  },

  async cancelBooking(bookingId: number, reason: string): Promise<Booking> {
    const token = getToken();
    const res = await fetchWithFallback(`/bookings/${bookingId}/cancel-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.data) {
      return json.data;
    }
    throw new Error(json.message || 'Failed to cancel emergency booking.');
  },

  async addBookingNote(bookingId: number, note: string, author?: string): Promise<string> {
    const token = getToken();
    const res = await fetchWithFallback(`/bookings/${bookingId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ note, author })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      if (typeof json.operational_notes === 'string') return json.operational_notes;
      if (json.data?.operational_notes) return json.data.operational_notes;
      return note;
    }
    throw new Error(json.message || 'Failed to add operational note to booking.');
  },

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    try {
      const token = getToken();
      const res = await fetchWithFallback('/drivers', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (e) {
      console.warn('getDrivers API call failed', e);
    }
    return [];
  },

  async verifyDriver(driverId: number, action: 'APPROVE' | 'REJECT' | 'REQUEST_DOCUMENTS', reason?: string): Promise<Driver> {
    const token = getToken();
    const res = await fetchWithFallback(`/drivers/${driverId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action, reason })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.driver) {
      return json.driver;
    }
    throw new Error(json.message || 'Driver verification decision update failed.');
  },

  async toggleDriverSuspension(driverId: number, action: 'SUSPEND' | 'REACTIVATE', reason: string): Promise<Driver> {
    const token = getToken();
    const res = await fetchWithFallback(`/drivers/${driverId}/toggle-suspension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action, reason })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.driver) {
      return json.driver;
    }
    throw new Error(json.message || 'Driver suspension toggle failed.');
  },

  // Ambulances
  async getAmbulances(): Promise<Ambulance[]> {
    try {
      const token = getToken();
      const res = await fetchWithFallback('/ambulances', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (e) {
      console.warn('getAmbulances API call failed', e);
    }
    return [];
  },

  async addAmbulance(ambulance: Omit<Ambulance, 'id'>): Promise<Ambulance> {
    const token = getToken();
    const res = await fetchWithFallback('/ambulances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(ambulance)
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ambulance) {
      return json.ambulance;
    }
    throw new Error(json.message || 'Failed to register ambulance vehicle.');
  },

  async updateAmbulanceStatus(id: number, status: Ambulance['operational_status'], reason: string): Promise<Ambulance> {
    const token = getToken();
    const res = await fetchWithFallback(`/ambulances/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, reason })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ambulance) {
      return json.ambulance;
    }
    throw new Error(json.message || 'Failed to update ambulance status.');
  },

  // Hospitals
  async getHospitals(): Promise<Hospital[]> {
    try {
      const token = getToken();
      const res = await fetchWithFallback('/hospitals', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (e) {
      console.warn('getHospitals API call failed', e);
    }
    return [];
  },

  async addHospital(hospital: Omit<Hospital, 'id'>): Promise<Hospital> {
    const token = getToken();
    const res = await fetchWithFallback('/hospitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(hospital)
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.hospital) {
      return json.hospital;
    }
    throw new Error(json.message || 'Failed to accredit hospital.');
  },

  // Registered Citizen Users
  async getUsers(): Promise<any[]> {
    try {
      const token = getToken();
      const res = await fetchWithFallback('/users', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json || [];
      }
    } catch (e) {
      console.warn('getUsers API call failed', e);
    }
    return [];
  },

  // Operational Alerts
  async getAlerts(): Promise<OperationalAlert[]> {
    try {
      const token = getToken();
      const res = await fetchWithFallback('/alerts', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (e) {
      console.warn('getAlerts API call failed', e);
    }
    return [];
  },

  async acknowledgeAlert(id: number): Promise<void> {
    const token = getToken();
    await fetchWithFallback(`/alerts/${id}/acknowledge`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
  },

  async resolveAlert(id: number): Promise<void> {
    const token = getToken();
    await fetchWithFallback(`/alerts/${id}/resolve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
  },

  async toggleUserStatus(id: number): Promise<{ status: string }> {
    const token = getToken();
    const res = await fetchWithFallback(`/users/${id}/toggle-status`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success) {
      return { status: json.status || 'ACTIVE' };
    }
    throw new Error(json.message || 'Failed to update user status.');
  },

  async broadcastAnnouncement(title: string, message: string, severity: OperationalAlert['severity']): Promise<OperationalAlert> {
    const token = getToken();
    const res = await fetchWithFallback('/alerts/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, message, severity })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.alert) {
      return json.alert;
    }
    throw new Error(json.message || 'Failed to broadcast announcement.');
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const token = getToken();
      const res = await fetchWithFallback('/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (e) {
      console.warn('getAuditLogs API call failed', e);
    }
    return [];
  }
};
