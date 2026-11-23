import { Ambulance, Booking, Driver, Hospital, OperationalAlert, AuditLog, User } from '../types';

export const INITIAL_STAFF: User[] = [
  {
    id: 1,
    name: 'Super Administrator',
    email: 'admin@gmail.com',
    role: 'super_admin',
    role_name: 'Super Administrator',
    badge_number: 'HQ-ADMIN-01',
    phone: '+91 94441 10800',
    mfa_enabled: false,
    last_login_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Commander Sarah Jenkins',
    email: 'admin@ambulance.gov',
    role: 'super_admin',
    role_name: 'Super Administrator',
    badge_number: 'CMD-108-01',
    phone: '+91 94441 23456',
    mfa_enabled: false,
    last_login_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Officer David Ross',
    email: 'dispatch@ambulance.gov',
    role: 'dispatcher',
    role_name: 'Senior Dispatcher',
    badge_number: 'DSP-108-04',
    phone: '+91 98400 98765',
    mfa_enabled: false,
    last_login_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Marcus Chen',
    email: 'verifier@ambulance.gov',
    role: 'driver_verifier',
    role_name: 'Driver Verification Officer',
    badge_number: 'VER-108-09',
    phone: '+91 94441 10800',
    mfa_enabled: false,
    last_login_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Dr. Robert Vance',
    email: 'hospital@ambulance.gov',
    role: 'hospital_manager',
    role_name: 'Hospital Network Director',
    badge_number: 'MED-108-12',
    phone: '+91 97890 12345',
    mfa_enabled: false,
    last_login_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: 'Elena Rostova',
    email: 'support@ambulance.gov',
    role: 'support_staff',
    role_name: 'Customer Support Lead',
    badge_number: 'SUP-108-22',
    phone: '+91 91234 56789',
    mfa_enabled: false,
    last_login_at: new Date().toISOString(),
  }
];

export const INITIAL_AMBULANCES: Ambulance[] = [];
export const INITIAL_BOOKINGS: Booking[] = [];
export const INITIAL_DRIVERS: Driver[] = [];
export const INITIAL_HOSPITALS: Hospital[] = [];
export const INITIAL_ALERTS: OperationalAlert[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

