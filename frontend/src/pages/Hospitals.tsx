import React, { useEffect, useState } from 'react';
import { 
  Building2, Plus, Search, Phone, MapPin, 
  ShieldCheck, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { api } from '../api/client';
import { Hospital } from '../types';
import { useAuth } from '../context/AuthContext';

export const Hospitals: React.FC = () => {
  const { hasRole } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);

  // New Hospital State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [zone, setZone] = useState('');
  const [services, setServices] = useState('');

  const loadHospitals = async () => {
    try {
      const data = await api.getHospitals();
      setHospitals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) || (parsedLat === 0 && parsedLng === 0)) {
      alert('Please enter valid non-zero GPS latitude and longitude coordinates.');
      return;
    }

    const parsedServices = services.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const created = await api.addHospital({
        name,
        category: category || 'General Hospital',
        address,
        latitude: parsedLat,
        longitude: parsedLng,
        phone,
        emergency_contact: emergencyPhone,
        verified_services: parsedServices,
        specialties: parsedServices,
        verification_status: 'VERIFIED',
        service_zone: zone || undefined,
        has_live_integration: true,
      });

      setHospitals(prev => [created, ...prev]);
      setShowAddModal(false);
      setName('');
      setAddress('');
      setPhone('');
      setEmergencyPhone('');
    } catch (e: any) {
      alert(e.message || 'Failed to add hospital.');
    }
  };

  const filteredHospitals = hospitals.filter(h => {
    if (zoneFilter !== 'ALL' && h.service_zone !== zoneFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (h.name || '').toLowerCase().includes(term);
      const matchAddr = (h.address || '').toLowerCase().includes(term);
      if (!matchName && !matchAddr) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              Receiving Trauma Centers & Hospitals
            </h1>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {hospitals.length} Accredited Centers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verified emergency casualty departments, Level 1 trauma facilities, ER triage hotlines, and regional response zones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasRole(['super_admin', 'hospital_manager']) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white transition shadow-sm border border-teal-600"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trauma Center</span>
            </button>
          )}

          <button
            onClick={loadHospitals}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
            title="Refresh Facility Directory"
          >
            <RefreshCw className="w-4 h-4 text-teal-600" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs w-full">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search hospital by facility name, address, or medical specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 text-xs font-medium"
          >
            <option value="ALL">All Regional Response Zones</option>
            <option value="Central">Central Response Zone</option>
            <option value="North">North Response Zone</option>
            <option value="South">South Response Zone</option>
          </select>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 font-medium text-xs bg-white border border-slate-200 rounded-2xl">
          <RefreshCw className="w-5 h-5 mx-auto mb-2 text-teal-600 animate-spin" />
          Loading accredited trauma centers from database...
        </div>
      ) : filteredHospitals.length === 0 ? (
        <div className="py-16 text-center text-slate-400 font-medium text-xs bg-white border border-slate-200 rounded-2xl">
          <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No trauma centers found matching search filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {filteredHospitals.map(h => (
            <div
              key={h.id}
              className="bg-white border border-slate-200 hover:border-teal-400 rounded-2xl p-6 transition flex flex-col justify-between shadow-xs hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider font-semibold">
                      {h.category}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1.5 leading-snug">
                      {h.name}
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{h.verification_status}</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 my-3">
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{h.address} (Zone: {h.service_zone})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-teal-700 font-mono font-semibold">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                    <span>24/7 Triage Hotline: {h.emergency_contact}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    GPS: {h.latitude}, {h.longitude}
                  </div>
                </div>

                {/* Verified Emergency Services Badges */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5 font-bold">
                    Verified Emergency Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(h.verified_services) ? h.verified_services : typeof h.verified_services === 'string' ? (h.verified_services as string).split(',') : []).map((svc, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-50 text-slate-700 border border-slate-200"
                      >
                        {String(svc).replace(/_/g, ' ').trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Verified Facility Data</span>
                </span>
                <span>API Gateway: Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Hospital Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                Add Emergency Receiving Center
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Facility Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Government Medical College Hospital"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category:</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Physical Address:</label>
                <input
                  type="text"
                  required
                  placeholder="Street, Landmark, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Latitude:</label>
                  <input
                    type="text"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Longitude:</label>
                  <input
                    type="text"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Telephone:</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 XXXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">24/7 ER Hotline:</label>
                  <input
                    type="text"
                    required
                    placeholder="108"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-xs"
                >
                  Register Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};