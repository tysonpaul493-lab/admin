import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
  Truck, Radio, Filter, RefreshCw, AlertTriangle,
  MapPin, Building2, PhoneCall
} from 'lucide-react';
import { api } from '../api/client';
import { liveSocket } from '../api/liveSocket';
import { Ambulance } from '../types';

// Custom Map Marker Icons using SVG data URIs with Hospital Color Palette
const createVehicleIcon = (status: Ambulance['operational_status'], isStale: boolean) => {
  let color = '#0d9488'; // Medical teal for available
  if (status === 'BUSY') color = '#dc2626'; // Emergency crimson for busy/active trip
  if (status === 'MAINTENANCE') color = '#f59e0b'; // Amber for maintenance
  if (isStale) color = '#94a3b8'; // Slate grey for stale

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
    <circle cx="12" cy="12" r="11" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
    <path fill="#ffffff" d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5 1.5 1.5 0 0 1 1.5-1.5 1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1-1.5 1.5m-11 0A1.5 1.5 0 0 1 5.5 17 1.5 1.5 0 0 1 7 15.5 1.5 1.5 0 0 1 8.5 17 1.5 1.5 0 0 1 7 18.5M19 8h-3V4H5a2 2 0 0 0-2 2v9h2a3 3 0 0 0 6 0h4a3 3 0 0 0 6 0h1v-4l-3-3m-3 2h2.2l1.8 2H16v-2Z"/>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: 'custom-vehicle-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const pickupIcon = L.divIcon({
  html: `<div style="background:#dc2626;border:2.5px solid #fff;border-radius:50%;width:20px;height:20px;box-shadow:0 0 12px rgba(220,38,38,0.7);animation:pulse 1.5s infinite;"></div>`,
  className: 'pickup-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const hospitalIcon = L.divIcon({
  html: `<div style="background:#0284c7;border:2.5px solid #fff;border-radius:8px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:extrabold;font-size:14px;box-shadow:0 0 12px rgba(2,132,199,0.7)">H</div>`,
  className: 'hospital-marker',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

export const LiveMap: React.FC = () => {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [simulating, setSimulating] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [selectedAmbulance, setSelectedAmbulance] = useState<Ambulance | null>(null);

  const fetchAmbulances = async () => {
    try {
      const data = await api.getLiveAmbulances();
      setAmbulances(data);
    } catch (e) {
      console.error('Failed to load tracking data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbulances();

    const unsubLocation = liveSocket.onLocationUpdate((update) => {
      setAmbulances((prev) =>
        prev.map((amb) => {
          if (amb.id === update.driverId || amb.primary_driver_id === update.driverId) {
            return {
              ...amb,
              latitude: update.lat,
              longitude: update.lng,
              heading: update.heading,
              speed_kmh: update.speed,
              seconds_since_ping: 0,
              is_gps_stale: false,
              last_gps_ping_at: new Date().toISOString(),
            };
          }
          return amb;
        })
      );
    });

    const unsubBooking = liveSocket.onBookingUpdate(() => {
      fetchAmbulances();
    });

    const interval = setInterval(() => {
      if (simulating) {
        api.simulateGpsPulse();
      }
      fetchAmbulances();
    }, 4000);

    return () => {
      clearInterval(interval);
      unsubLocation();
      unsubBooking();
    };
  }, [simulating]);

  const filteredAmbulances = ambulances.filter(a => {
    if (statusFilter !== 'ALL' && a.operational_status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && a.vehicle_type !== typeFilter) return false;
    if (zoneFilter !== 'ALL' && a.service_zone !== zoneFilter) return false;
    return true;
  });

  const staleVehicles = ambulances.filter(a => a.is_gps_stale);

  return (
    <div className="space-y-5 w-full">
      {/* Top Header & Telemetry Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              Paramedic Fleet Live GPS Map
            </h1>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
              {ambulances.length} Active Vehicles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time GPS telemetry via private Reverb channels. Sub-second positioning with stale tracking safeguards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSimulating(!simulating)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border shadow-xs ${simulating
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
              }`}
            title="Toggle Live GPS Telemetry Pulse"
          >
            <Radio className={`w-3.5 h-3.5 ${simulating ? 'animate-pulse text-teal-600' : ''}`} />
            <span>{simulating ? 'GPS Pulse: Active' : 'GPS Pulse: Standby'}</span>
          </button>

          <button
            onClick={fetchAmbulances}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
            title="Refresh GPS positions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stale GPS Data Safeguard Banner (> 60s) */}
      {staleVehicles.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-4 shadow-xs w-full">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 font-mono">
                STALE TELEMETRY SIGNAL DETECTED ({staleVehicles.length} AMBULANCE)
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                The following ambulance has ceased transmitting GPS signals for &gt; 60 seconds:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {staleVehicles.map(v => `${v.registration_number} (${Math.round((v.seconds_since_ping || 0) / 60)}m ago)`).join(', ')}
                </span>
                . Central dispatch protocol recommends calling crew immediately.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-100 px-2.5 py-1 rounded-lg text-amber-800 border border-amber-300 shrink-0 font-bold">
            SLA Protocol 4
          </span>
        </div>
      )}

      {/* Filter Bar with White Theme */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs w-full">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-slate-500 font-mono uppercase text-[11px]">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            Filters:
          </span>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 text-xs font-medium"
          >
            <option value="ALL">All Operational Statuses</option>
            <option value="AVAILABLE">Available (Medical Teal)</option>
            <option value="BUSY">Active Emergency (Red)</option>
            <option value="MAINTENANCE">Maintenance (Amber)</option>
          </select>

          {/* Vehicle Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 text-xs font-medium"
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="BLS">BLS (Basic Life Support)</option>
            <option value="ALS">ALS (Advanced Life Support)</option>
            <option value="MICU">MICU (Mobile ICU)</option>
            <option value="NEONATAL">NEONATAL (Incubator)</option>
          </select>

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 text-xs font-medium"
          >
            <option value="ALL">All Service Zones (Coimbatore)</option>
            <option value="Central">Central (Gandhipuram / Town Hall)</option>
            <option value="East">East (Peelamedu / Avinashi Rd)</option>
            <option value="West">West (RS Puram / Vadavalli)</option>
            <option value="North">North (Saibaba Colony / Thudiyalur)</option>
            <option value="South">South (Singanallur / Trichy Rd)</option>
          </select>
        </div>

        {/* Map Legend */}
        <div className="flex items-center gap-3.5 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            <span className="font-sans font-medium text-slate-700">Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            <span className="font-sans font-medium text-red-700">Active Incident</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-sans font-medium text-slate-700">Maintenance</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="font-sans font-medium text-slate-500">Stale GPS</span>
          </span>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-[520px] lg:h-[580px] max-h-[65vh] bg-slate-100 w-full isolate z-0">
        <MapContainer
          center={[11.0168, 76.9658]}
          zoom={13}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredAmbulances.map((amb) => {
            if (!amb.latitude || !amb.longitude || isNaN(amb.latitude) || isNaN(amb.longitude)) {
              return null;
            }
            const isStale = !!amb.is_gps_stale;
            const trip = amb.active_trip;

            return (
              <React.Fragment key={amb.id}>
                {/* Ambulance Marker */}
                <Marker
                  position={[amb.latitude, amb.longitude]}
                  icon={createVehicleIcon(amb.operational_status, isStale)}
                  eventHandlers={{
                    click: () => setSelectedAmbulance(amb),
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[240px] text-slate-900">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-extrabold text-sm text-slate-900 font-mono flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-teal-600" />
                          {amb.registration_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${amb.operational_status === 'AVAILABLE' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                          amb.operational_status === 'BUSY' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {amb.operational_status}
                        </span>
                      </div>

                      <div className="py-2.5 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Vehicle Type:</span>
                          <span className="font-semibold text-slate-900">{amb.vehicle_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Paramedic Crew:</span>
                          <span className="font-semibold text-slate-900">{amb.primary_driver?.name || 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Speed / Battery:</span>
                          <span className="font-mono text-teal-700">{amb.speed_kmh} km/h • {amb.battery_fuel_percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Last Telemetry:</span>
                          <span className={`font-mono text-[11px] ${isStale ? 'text-red-600 font-bold' : 'text-teal-700'}`}>
                            {isStale ? `STALE (${amb.seconds_since_ping}s ago)` : `${amb.seconds_since_ping || 0}s ago`}
                          </span>
                        </div>
                      </div>

                      {trip && (
                        <div className="pt-2 border-t border-slate-200 bg-red-50/70 -mx-2 -mb-2 p-2.5 rounded-b-xl border border-red-200">
                          <div className="text-[11px] font-bold text-red-900 flex items-center justify-between">
                            <span>RUN: {trip.booking_reference}</span>
                            <span className="text-[10px] bg-red-200 px-1.5 py-0.5 rounded text-red-800 font-mono">{trip.severity}</span>
                          </div>
                          <p className="text-[11px] text-red-700 truncate mt-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-red-600 shrink-0" />
                            {trip.hospital_name}
                          </p>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* If Ambulance has an active emergency trip, render pickup and destination markers with polyline route */}
                {trip && trip.hospital_lat && trip.hospital_lng && trip.pickup_lat && trip.pickup_lng && !isNaN(trip.pickup_lat) && !isNaN(trip.hospital_lat) && (
                  <>
                    <Marker position={[trip.pickup_lat, trip.pickup_lng]} icon={pickupIcon}>
                      <Popup className="custom-popup">
                        <div className="p-2 text-xs text-slate-900">
                          <strong className="text-red-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> Emergency Patient Scene
                          </strong>
                          <p className="text-slate-600 mt-1">{trip.pickup_address}</p>
                        </div>
                      </Popup>
                    </Marker>

                    <Marker position={[trip.hospital_lat, trip.hospital_lng]} icon={hospitalIcon}>
                      <Popup className="custom-popup">
                        <div className="p-2 text-xs text-slate-900">
                          <strong className="text-sky-700 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> Receiving Trauma Center
                          </strong>
                          <p className="text-slate-600 mt-1">{trip.hospital_name}</p>
                        </div>
                      </Popup>
                    </Marker>

                    <Polyline
                      positions={[
                        [amb.latitude, amb.longitude],
                        [trip.pickup_lat, trip.pickup_lng],
                        [trip.hospital_lat, trip.hospital_lng]
                      ]}
                      color="#dc2626"
                      dashArray="6, 8"
                      weight={3.5}
                    />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Selected Vehicle Float Card Overlay */}
        {selectedAmbulance && (
          <div className="absolute bottom-4 right-4 z-[400] w-80 max-w-[calc(100%-2rem)] bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-600" />
                  {selectedAmbulance.registration_number}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">{selectedAmbulance.operator_name}</span>
              </div>
              <button
                onClick={() => setSelectedAmbulance(null)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Paramedic in Command:</span>
                <span className="font-semibold text-slate-900">{selectedAmbulance.primary_driver?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Direct Contact:</span>
                {selectedAmbulance.primary_driver?.phone ? (
                  <a
                    href={`tel:${selectedAmbulance.primary_driver.phone}`}
                    className="font-mono text-teal-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <PhoneCall className="w-3 h-3" />
                    {selectedAmbulance.primary_driver.phone}
                  </a>
                ) : (
                  <span className="font-mono text-slate-400">N/A</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Vehicle Type:</span>
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {selectedAmbulance.vehicle_type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Live GPS Ping:</span>
                <span className={`font-mono text-[11px] ${selectedAmbulance.is_gps_stale ? 'text-red-600 font-bold' : 'text-teal-700'}`}>
                  {selectedAmbulance.seconds_since_ping}s ago {selectedAmbulance.is_gps_stale ? '⚠️ STALE' : '• LIVE'}
                </span>
              </div>
            </div>

            {selectedAmbulance.active_trip && (
              <div className="mt-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs">
                <div className="font-bold text-red-900 flex items-center justify-between">
                  <span>Incident: {selectedAmbulance.active_trip.booking_reference}</span>
                  <span className="text-[10px] font-mono bg-red-200 px-1.5 py-0.5 rounded text-red-900">{selectedAmbulance.active_trip.severity}</span>
                </div>
                <div className="text-[11px] text-red-700 truncate mt-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-red-600 shrink-0" />
                  {selectedAmbulance.active_trip.hospital_name}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};