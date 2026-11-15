export type RoleSlug = 
  | 'super_admin' 
  | 'dispatcher' 
  | 'driver_verifier' 
  | 'hospital_manager' 
  | 'support_staff';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: RoleSlug;
  role_name: string;
  badge_number?: string;
  mfa_enabled: boolean;
  last_login_at?: string;
}

export type SeverityLevel = 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'STABLE';

export type BookingStatus = 
  | 'REQUESTED'
  | 'DISPATCHED'
  | 'ACCEPTED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'PATIENT_ON_BOARD'
  | 'EN_ROUTE_TO_HOSPITAL'
  | 'ARRIVED_AT_HOSPITAL'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED_DISPATCH';

export type VehicleType = 'BLS' | 'ALS' | 'MICU' | 'NEONATAL' | 'PATIENT_TRANSPORT';

export type AmbulanceOperationalStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE' | 'DECOMMISSIONED';

export type DriverVerificationStatus = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'SUSPENDED';

export type DriverOnlineStatus = 'ONLINE' | 'OFFLINE';

export type DriverOperationalStatus = 'AVAILABLE' | 'ON_TRIP' | 'ON_BREAK' | 'MAINTENANCE_LOCK';

export interface Hospital {
  id: number;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  emergency_contact: string;
  verified_services: string[];
  specialties?: string[];
  verification_status: 'VERIFIED' | 'PENDING' | 'INACTIVE';
  service_zone: string;
  has_live_integration: boolean;
}

export interface Ambulance {
  id: number;
  registration_number: string;
  vehicle_type: VehicleType;
  operator_name: string;
  primary_driver_id?: number | null;
  equipment_capabilities: string[];
  verification_status: 'APPROVED' | 'PENDING' | 'SUSPENDED';
  fitness_expiry: string;
  insurance_expiry: string;
  permit_expiry: string;
  operational_status: AmbulanceOperationalStatus;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  last_gps_ping_at?: string;
  seconds_since_ping?: number;
  is_gps_stale?: boolean;
  battery_fuel_percentage: number;
  service_zone: string;
  primary_driver?: {
    id: number;
    name: string;
    phone: string;
    online_status: DriverOnlineStatus;
    rating?: number;
  } | null;
  active_trip?: {
    booking_id: number;
    booking_reference: string;
    severity: SeverityLevel;
    status: BookingStatus;
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    hospital_name: string;
    hospital_lat?: number;
    hospital_lng?: number;
  } | null;
}

export interface DriverDocument {
  id: number;
  driver_id: number;
  document_type: 'DRIVING_LICENCE' | 'MEDICAL_FITNESS' | 'POLICE_CLEARANCE' | 'EMT_CERTIFICATE' | 'VEHICLE_INSURANCE';
  document_number?: string;
  file_path: string;
  expiry_date?: string;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  verified_at?: string;
}

export interface Driver {
  id: number;
  user_id?: number;
  full_name: string;
  phone: string;
  email?: string;
  profile_photo_url?: string;
  licence_number: string;
  licence_expiry: string;
  qualification_level: string;
  verification_status: DriverVerificationStatus;
  online_status: DriverOnlineStatus;
  operational_status: DriverOperationalStatus;
  assigned_ambulance_id?: number | null;
  assigned_ambulance?: {
    id: number;
    registration_number: string;
    vehicle_type: string;
    vehicle_model?: string;
    vehicle_year?: number;
    operational_status?: string;
    equipment_list?: string[];
    permit_number?: string;
    insurance_policy?: string;
    insurance_expiry?: string;
  } | null;
  completed_trips_count: number;
  total_revenue?: number;
  average_rating: number;
  cancellation_rate: number;
  current_latitude?: number | null;
  current_longitude?: number | null;
  last_active_at?: string | null;
  suspension_reason?: string | null;
  documents?: DriverDocument[];
}

export interface BookingEvent {
  id: number;
  booking_id: number;
  event_type: string;
  description: string;
  actor_type: string;
  actor_name?: string;
  metadata?: any;
  created_at: string;
}

export interface Booking {
  id: number;
  booking_reference: string;
  user_id?: number;
  requester_name: string;
  requester_phone: string;
  requester_relationship?: string;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  severity: SeverityLevel;
  chief_complaint?: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  hospital_id: number;
  hospital?: Hospital;
  ambulance_id?: number | null;
  ambulance?: Ambulance | null;
  driver_id?: number | null;
  driver?: Driver | null;
  eta_minutes?: number;
  distance_km?: number;
  status: BookingStatus;
  requested_at: string;
  dispatched_at?: string;
  accepted_at?: string;
  arrived_pickup_at?: string;
  patient_onboard_at?: string;
  arrived_hospital_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  cancelled_by_type?: string;
  operational_notes?: string;
  events?: BookingEvent[];
}

export interface OperationalAlert {
  id: number;
  alert_code: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: number;
  is_acknowledged: boolean;
  acknowledged_by?: number;
  acknowledged_at?: string;
  is_resolved: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name: string;
  user_role: string;
  action: string;
  target_type: string;
  target_id: number;
  ip_address?: string;
  user_agent?: string;
  reason: string;
  created_at: string;
}

export interface MetricItem {
  value: number;
  available: boolean;
  change?: number;
}

export interface DashboardStats {
  timestamp?: string;
  metrics: {
    total_users?: MetricItem;
    total_verified_drivers?: MetricItem;
    pending_driver_verifications?: MetricItem;
    offline_drivers?: MetricItem;
    online_drivers?: MetricItem;
    total_registered_ambulances?: MetricItem;
    available_ambulances?: MetricItem;
    busy_ambulances?: MetricItem;
    maintenance_ambulances?: MetricItem;
    active_bookings?: MetricItem;
    completed_trips?: MetricItem;
    failed_dispatches?: MetricItem;
    cancelled_trips?: MetricItem;
    avg_response_time_seconds?: MetricItem;
    avg_assignment_time_seconds?: MetricItem;
    [key: string]: MetricItem | undefined;
  };
  hourly_trends?: any[];
  recent_activity?: any[];
  fleet_breakdown?: Array<{ name: string; value: number; color: string }>;
  critical_alerts?: any[];
}
