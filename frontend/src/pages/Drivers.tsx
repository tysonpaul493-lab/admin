import React, { useEffect, useState } from 'react';
import { 
  Users2, Search, Filter, CheckCircle2, XCircle, AlertTriangle, 
  FileText, Shield, Star, Ban, Unlock, Eye, RefreshCw, Phone, Truck,
  Activity, ShieldCheck, HeartPulse, Wrench, Check
} from 'lucide-react';
import { api } from '../api/client';
import { liveSocket } from '../api/liveSocket';
import { Driver, DriverDocument } from '../types';
import { useAuth } from '../context/AuthContext';

export const Drivers: React.FC = () => {
  const { hasRole } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [onlineFilter, setOnlineFilter] = useState('ALL');

  // Drawers & Modals
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    driver: Driver;
    action: 'APPROVE' | 'REJECT' | 'REQUEST_DOCUMENTS' | 'SUSPEND' | 'REACTIVATE';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDrivers = async () => {
    try {
      const data = await api.getDrivers();
      setDrivers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();

    // Real-time synchronization
    const unsubEvent = liveSocket.onLiveEvent(() => {
      loadDrivers();
    });
    const unsubStatus = liveSocket.onStatusChange(() => {
      loadDrivers();
    });
    const unsubBooking = liveSocket.onBookingUpdate(() => {
      loadDrivers();
    });
    const interval = setInterval(loadDrivers, 5000);

    return () => {
      unsubEvent();
      unsubStatus();
      unsubBooking();
      clearInterval(interval);
    };
  }, []);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal) return;
    setActionError(null);
    setActionSuccess(null);

    const { driver, action } = decisionModal;

    try {
      if (['APPROVE', 'REJECT', 'REQUEST_DOCUMENTS'].includes(action)) {
        const updated = await api.verifyDriver(driver.id, action as any, decisionReason);
        setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
        if (selectedDriver?.id === updated.id) setSelectedDriver(updated);
        setActionSuccess(`Driver verification status updated to: ${updated.verification_status}`);
      } else if (action === 'SUSPEND' || action === 'REACTIVATE') {
        const updated = await api.toggleDriverSuspension(driver.id, action, decisionReason);
        setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
        if (selectedDriver?.id === updated.id) setSelectedDriver(updated);
        setActionSuccess(`Driver status set to: ${updated.verification_status}`);
      }
      setDecisionModal(null);
      setDecisionReason('');
    } catch (err: any) {
      setActionError(err.message || 'Operation failed.');
    }
  };

  const filteredDrivers = drivers.filter(d => {
    if (verificationFilter !== 'ALL' && d.verification_status !== verificationFilter) return false;
    if (onlineFilter !== 'ALL' && d.online_status !== onlineFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (d.full_name || (d as any).name || '').toLowerCase().includes(term);
      const matchPhone = (d.phone || '').includes(term);
      const matchLic = (d.licence_number || '').toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchLic) return false;
    }
    return true;
  });

  // Financial Revenue Calculations
  const totalFleetRevenue = drivers.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
  const activeDutyRevenue = drivers.filter(d => d.online_status === 'ONLINE').reduce((sum, d) => sum + (d.total_revenue || 0), 0);
  const avgPayout = drivers.length > 0 ? Math.round(totalFleetRevenue / drivers.length) : 0;
  const totalRuns = drivers.reduce((sum, d) => sum + (d.completed_trips_count || 0), 0);
  const onlineCount = drivers.filter(d => d.online_status === 'ONLINE').length;

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              Paramedic Crew & Fleet Operations
            </h1>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {drivers.length} Certified Crew
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry, ALS/BLS medical specifications, verified credentials, and revenue dispatch tracking.
          </p>
        </div>

        <button
          onClick={loadDrivers}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition shadow-xs self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Crew Directory</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center justify-between shadow-xs w-full">
          <span className="font-medium">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs w-full">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search paramedic by name, phone (+91), or licence ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 text-xs font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 text-xs font-medium"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="APPROVED">Approved (Verified)</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 text-xs font-medium"
          >
            <option value="ALL">All Telemetry States</option>
            <option value="ONLINE">Online ({onlineCount} Active)</option>
            <option value="OFFLINE">Offline (Off-Duty)</option>
          </select>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs w-full max-w-full">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4 font-bold">Paramedic & Profile</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Licence & Qualification</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Assigned Ambulance & Specs</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Duty Status</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Completed Runs</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Total Revenue</th>
                <th className="py-3 px-3 sm:px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 text-teal-600 animate-spin" />
                    Loading paramedics and driver records from database...
                  </td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                    <Users2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No paramedics found matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition">
                  {/* Driver Name & Photo */}
                  <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3.5">
                      {d.profile_photo_url ? (
                        <img
                          src={d.profile_photo_url}
                          alt={d.full_name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 font-bold text-sm flex items-center justify-center border border-teal-200 shadow-xs">
                          {(d.full_name || 'D').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{d.full_name}</span>
                          <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            #{d.id}
                          </span>
                        </div>
                        <a 
                          href={`tel:${d.phone}`} 
                          className="text-[11px] text-teal-700 font-mono flex items-center gap-1 mt-0.5 hover:underline font-semibold"
                        >
                          <Phone className="w-3 h-3 text-teal-600" />
                          <span>{d.phone}</span>
                        </a>
                      </div>
                    </div>
                  </td>

                  {/* Licence & Qualification */}
                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                    <div className="font-mono text-slate-800 font-bold">{d.licence_number}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Level: <span className="text-teal-700 font-semibold">{d.qualification_level}</span>
                    </div>
                  </td>

                  {/* Assigned Ambulance & Vehicle Specs */}
                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap font-mono">
                    {d.assigned_ambulance ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 inline-block shadow-xs text-xs">
                            {d.assigned_ambulance.registration_number}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            d.assigned_ambulance.vehicle_type === 'ALS' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}>
                            {d.assigned_ambulance.vehicle_type}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {d.assigned_ambulance.vehicle_model || 'Force 3350 Ambulance'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">None Assigned</span>
                    )}
                  </td>

                  {/* Online & Duty Status */}
                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${d.online_status === 'ONLINE' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                      <span className="font-mono text-[11px] text-slate-800 font-semibold">{d.online_status}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Status: <span className={d.operational_status === 'ON_TRIP' ? 'text-red-600 font-bold' : 'text-slate-600'}>{d.operational_status}</span>
                    </div>
                  </td>

                  {/* Completed Runs & Rating */}
                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap font-mono">
                    <div className="text-slate-900 font-bold">{d.completed_trips_count} runs</div>
                    <div className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span className="font-semibold">{d.average_rating}</span>
                    </div>
                  </td>

                  {/* Revenue / Earnings */}
                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap font-mono">
                    <div className="text-emerald-700 font-extrabold text-sm">
                      ₹{Number(d.total_revenue || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                      {d.completed_trips_count > 0
                        ? `₹${Math.round(Number(d.total_revenue || 0) / d.completed_trips_count).toLocaleString()} / trip avg`
                        : '—'}
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedDriver(d)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition font-semibold text-xs flex items-center gap-1 shadow-xs"
                        title="View Complete Specifications & Biomedical Equipment"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600" />
                        <span>Inspect Specs</span>
                      </button>

                      {hasRole(['super_admin', 'driver_verifier']) && (
                        <>
                          {d.verification_status === 'PENDING_REVIEW' && (
                            <button
                              onClick={() => setDecisionModal({ driver: d, action: 'APPROVE' })}
                              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-xs"
                            >
                              Approve
                            </button>
                          )}

                          {d.verification_status === 'APPROVED' && (
                            <button
                              onClick={() => setDecisionModal({ driver: d, action: 'SUSPEND' })}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs transition"
                            >
                              Suspend
                            </button>
                          )}

                          {d.verification_status === 'SUSPENDED' && (
                            <button
                              onClick={() => setDecisionModal({ driver: d, action: 'REACTIVATE' })}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold hover:bg-teal-100 transition"
                            >
                              Reactivate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fleet Revenue & Financial Performance Bar (Requested by Admin) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg shadow-xs shrink-0">
              ₹
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold flex items-center gap-2">
                <span>Fleet Revenue & Financial Performance Bar</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px]">REAL-TIME AUDIT</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Centralized financial ledger tracking gross dispatch billings, paramedic payouts, and trip revenue.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Total Gross Revenue</span>
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                ₹{totalFleetRevenue.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Active Duty Revenue</span>
              <span className="text-base font-extrabold text-teal-700 font-mono">
                ₹{activeDutyRevenue.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Avg Driver Payout</span>
              <span className="text-base font-extrabold text-slate-800 font-mono">
                ₹{avgPayout.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Completed Trips</span>
              <span className="text-base font-extrabold text-sky-700 font-mono">
                {totalRuns} runs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Full Specifications & Biomedical Equipment Inspection Drawer Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {selectedDriver.profile_photo_url ? (
                  <img
                    src={selectedDriver.profile_photo_url}
                    alt={selectedDriver.full_name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 font-bold text-lg flex items-center justify-center border border-teal-200 shadow-xs">
                    {(selectedDriver.full_name || 'D').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedDriver.full_name}</h2>
                  <span className="text-xs text-slate-500 font-mono">Licence: {selectedDriver.licence_number || '—'} {selectedDriver.qualification_level ? `• ${selectedDriver.qualification_level}` : ''}</span>
                </div>
              </div>
              <button onClick={() => setSelectedDriver(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Paramedic & Operational Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-[11px] font-mono text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  Paramedic Credentials
                </h3>
                <div><span className="text-slate-500">Contact:</span> <a href={`tel:${selectedDriver.phone}`} className="font-mono text-teal-700 font-bold ml-1 hover:underline">{selectedDriver.phone}</a></div>
                <div><span className="text-slate-500">Email:</span> <span className="text-slate-800 ml-1">{selectedDriver.email || '—'}</span></div>
                <div><span className="text-slate-500">Licence Expiry:</span> <span className="font-mono text-slate-800 ml-1">{selectedDriver.licence_expiry || '—'}</span></div>
                <div><span className="text-slate-500">Total Billed Revenue:</span> <span className="font-mono font-extrabold text-emerald-700 ml-1">₹{Number(selectedDriver.total_revenue || 0).toLocaleString()}</span></div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-[11px] font-mono text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-teal-600" />
                  Assigned Vehicle Specs
                </h3>
                <div><span className="text-slate-500">Plate Number:</span> <span className="font-mono font-bold text-slate-900 ml-1">{selectedDriver.assigned_ambulance?.registration_number || 'N/A'}</span></div>
                <div><span className="text-slate-500">Vehicle Model:</span> <span className="text-slate-800 font-semibold ml-1">{selectedDriver.assigned_ambulance?.vehicle_model || '—'}</span></div>
                <div><span className="text-slate-500">Vehicle Type:</span> <span className="font-mono font-bold text-red-700 ml-1">{selectedDriver.assigned_ambulance?.vehicle_type || '—'}</span></div>
                <div><span className="text-slate-500">Permit Number:</span> <span className="font-mono text-slate-800 ml-1">{selectedDriver.assigned_ambulance?.permit_number || '—'}</span></div>
                <div><span className="text-slate-500">Insurance Policy:</span> <span className="font-mono text-slate-800 ml-1">{selectedDriver.assigned_ambulance?.insurance_policy || 'POL-ICICI-789100'}</span></div>
              </div>
            </div>

            {/* On-Board Biomedical Equipment */}
            <div className="pt-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-mono mb-2 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                Verified On-Board Biomedical Equipment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(selectedDriver.assigned_ambulance?.equipment_list || [
                  'Defibrillator / Monitor (AED)',
                  'Transport Ventilator with PEEP',
                  'Multipara Patient Monitor (ECG/SPO2/NIBP)',
                  'Medical Suction Unit',
                  'Twin 10L High-Pressure Oxygen System'
                ]).map((equip, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-50/50 border border-teal-100 text-teal-900">
                    <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-medium text-[11px]">{equip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Checklist */}
            <div className="pt-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-mono mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                Submitted Professional Credentials
              </h3>
              <div className="space-y-2">
                {(selectedDriver.documents || []).map((doc) => (
                  <div key={doc.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{doc.document_type.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500 font-mono ml-2">({doc.document_number || 'Doc ID: #' + doc.id})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      {doc.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Action Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900">
              Confirm Action: {decisionModal.action}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Paramedic: <strong className="text-slate-800">{decisionModal.driver.full_name}</strong>
            </p>

            {actionError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleDecisionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Notes:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Credential verified against State Transport Registry"
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
