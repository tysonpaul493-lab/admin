import React, { useEffect, useState } from 'react';
import { 
  CalendarClock, Search, Filter, CheckCircle2, 
  User, Truck, Building2, Eye, UserPlus, RefreshCw, XCircle, 
  FileText, Clock, Send, ShieldAlert, Navigation,
  Activity, CheckCircle, Ban, Compass, Gauge, AlertOctagon, PhoneCall
} from 'lucide-react';
import { api } from '../api/client';
import { liveSocket } from '../api/liveSocket';
import { Booking, Driver, Ambulance, BookingStatus } from '../types';
import { useAuth } from '../context/AuthContext';

export const Bookings: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Main View: LIVE trips vs HISTORY trips
  const [activeTab, setActiveTab] = useState<'LIVE' | 'HISTORY'>('LIVE');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [liveStatusFilter, setLiveStatusFilter] = useState('ALL');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED_USER' | 'CANCELLED_ADMIN'>('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Modals & Drawers
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [assignModalBooking, setAssignModalBooking] = useState<Booking | null>(null);
  const [reassignModalBooking, setReassignModalBooking] = useState<Booking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);

  // Form Inputs
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');
  const [actionReason, setActionReason] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [bData, dData, aData] = await Promise.all([
        api.getBookings(),
        api.getDrivers(),
        api.getAmbulances(),
      ]);
      setBookings(bData);
      setDrivers(dData);
      setAmbulances(aData);
    } catch (e) {
      console.error('Failed to load bookings', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = liveSocket.onBookingUpdate(() => {
      loadData();
    });
    const interval = setInterval(loadData, 6000);
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalBooking || !selectedDriverId) return;
    setActionError(null);

    try {
      const updated = await api.assignDriver(assignModalBooking.id, Number(selectedDriverId), actionReason);
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      if (selectedBooking?.id === updated.id) setSelectedBooking(updated);
      setAssignModalBooking(null);
      setSelectedDriverId('');
      setActionReason('');
    } catch (err: any) {
      setActionError(err.message || 'Driver assignment failed.');
    }
  };

  const handleReassignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalBooking || !selectedDriverId) return;
    setActionError(null);

    try {
      const updated = await api.reassignDriver(reassignModalBooking.id, Number(selectedDriverId), actionReason);
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      if (selectedBooking?.id === updated.id) setSelectedBooking(updated);
      setReassignModalBooking(null);
      setSelectedDriverId('');
      setActionReason('');
    } catch (err: any) {
      setActionError(err.message || 'Driver reassignment failed.');
    }
  };

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    setActionError(null);

    try {
      const updated = await api.cancelBooking(cancelModalBooking.id, actionReason || 'Cancelled by Central Dispatch');
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      if (selectedBooking?.id === updated.id) setSelectedBooking(updated);
      setCancelModalBooking(null);
      setActionReason('');
    } catch (err: any) {
      setActionError(err.message || 'Booking cancellation failed.');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !noteInput.trim()) return;

    try {
      const newNotes = await api.addBookingNote(selectedBooking.id, noteInput.trim(), user?.name || 'Dispatcher');
      setSelectedBooking(prev => prev ? { ...prev, operational_notes: newNotes } : null);
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, operational_notes: newNotes } : b));
      setNoteInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // Segregate LIVE Ongoing Trips vs HISTORICAL Trips
  const isFinishedStatus = (status: BookingStatus) => {
    const s = (status || '').toUpperCase();
    return ['COMPLETED', 'CANCELLED', 'FAILED_DISPATCH', 'TRIP_COMPLETED'].includes(s);
  };

  const liveBookings = bookings.filter(b => !isFinishedStatus(b.status));
  const historyBookings = bookings.filter(b => isFinishedStatus(b.status));

  const completedCount = historyBookings.filter(b => (b.status || '').toUpperCase() === 'COMPLETED' || (b.status || '').toUpperCase() === 'TRIP_COMPLETED').length;
  const cancelledUserCount = historyBookings.filter(b => (b.status || '').toUpperCase() === 'CANCELLED' && b.cancelled_by_type !== 'ADMIN').length;
  const cancelledAdminCount = historyBookings.filter(b => (b.status || '').toUpperCase() === 'CANCELLED' && b.cancelled_by_type === 'ADMIN').length;

  // Filtered dataset for Active Tab
  const displayedBookings = (activeTab === 'LIVE' ? liveBookings : historyBookings).filter(b => {
    const bStatus = (b.status || '').toUpperCase();
    if (activeTab === 'LIVE') {
      if (liveStatusFilter !== 'ALL' && bStatus !== liveStatusFilter.toUpperCase()) return false;
    } else {
      if (historyFilter === 'COMPLETED' && bStatus !== 'COMPLETED' && bStatus !== 'TRIP_COMPLETED') return false;
      if (historyFilter === 'CANCELLED_USER' && (bStatus !== 'CANCELLED' || b.cancelled_by_type === 'ADMIN')) return false;
      if (historyFilter === 'CANCELLED_ADMIN' && (bStatus !== 'CANCELLED' || b.cancelled_by_type !== 'ADMIN')) return false;
    }

    if (severityFilter !== 'ALL' && (b.severity || '').toUpperCase() !== severityFilter.toUpperCase()) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const refMatch = b.booking_reference?.toLowerCase().includes(term);
      const reqMatch = b.requester_name?.toLowerCase().includes(term) || b.requester_phone?.includes(term);
      const patMatch = b.patient_name?.toLowerCase().includes(term);
      const addrMatch = b.pickup_address?.toLowerCase().includes(term);
      const driverMatch = b.driver?.full_name?.toLowerCase().includes(term) || (b.driver as any)?.name?.toLowerCase().includes(term) || b.driver?.phone?.includes(term);
      const plateMatch = b.ambulance?.registration_number?.toLowerCase().includes(term);
      if (!refMatch && !reqMatch && !patMatch && !addrMatch && !driverMatch && !plateMatch) return false;
    }

    return true;
  });

  const eligibleDrivers = drivers.filter(d => 
    (d.verification_status?.toUpperCase() === 'APPROVED' || !d.verification_status) &&
    !bookings.some(b => b.driver_id === d.id && !isFinishedStatus(b.status))
  );

  const getStatusBadge = (status: BookingStatus, cancelledBy?: string) => {
    switch (status) {
      case 'REQUESTED':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            REQUESTED (PENDING CREW)
          </span>
        );
      case 'DISPATCHED':
      case 'ACCEPTED':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            CREW ASSIGNED & EN ROUTE
          </span>
        );
      case 'EN_ROUTE_TO_PICKUP':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            EN ROUTE TO SCENE
          </span>
        );
      case 'ARRIVED_AT_PICKUP':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            ARRIVED AT PATIENT SCENE
          </span>
        );
      case 'PATIENT_ON_BOARD':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            PATIENT ONBOARD
          </span>
        );
      case 'EN_ROUTE_TO_HOSPITAL':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            IN TRANSIT TO HOSPITAL
          </span>
        );
      case 'ARRIVED_AT_HOSPITAL':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
            AT HOSPITAL CASUALTY BAY
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            COMPLETED HANDOVER
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            {cancelledBy === 'ADMIN' ? 'CANCELLED BY DISPATCH' : 'CANCELLED BY CITIZEN'}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getWorkflowStepIndex = (status: BookingStatus) => {
    switch (status) {
      case 'REQUESTED': return 1;
      case 'DISPATCHED':
      case 'ACCEPTED':
      case 'EN_ROUTE_TO_PICKUP': return 2;
      case 'ARRIVED_AT_PICKUP': return 3;
      case 'PATIENT_ON_BOARD': return 4;
      case 'EN_ROUTE_TO_HOSPITAL':
      case 'ARRIVED_AT_HOSPITAL': return 5;
      case 'COMPLETED': return 6;
      default: return 1;
    }
  };

  const formatTimeOnly = (iso?: string | null) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatFullDate = (iso?: string | null) => {
    if (!iso) return 'Pending';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Pending';
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const computeTimeDiff = (startIso?: string | null, endIso?: string | null) => {
    if (!startIso || !endIso) return null;
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    const diffSec = Math.round((end - start) / 1000);
    if (diffSec < 60) return `${diffSec}s`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              Emergency Trips & Dispatch Records
            </h1>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
              {liveBookings.length} Active Emergencies
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive telemetry tracking, citizen emergency profiles, paramedic units, and full time status analytics.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition self-start lg:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
          <span>Refresh All Records</span>
        </button>
      </div>

      {/* 4 Metric Status Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        <div 
          onClick={() => { setActiveTab('LIVE'); setLiveStatusFilter('ALL'); }}
          className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
            activeTab === 'LIVE' 
              ? 'bg-teal-50/70 border-teal-500 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-mono">Live Active Trips</span>
            <Activity className="w-4 h-4 text-teal-600 animate-pulse" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-slate-900 mt-2">
            {liveBookings.length}
          </div>
          <span className="text-[11px] text-teal-700 font-medium mt-1">Ongoing emergency dispatches</span>
        </div>

        <div 
          onClick={() => { setActiveTab('HISTORY'); setHistoryFilter('COMPLETED'); }}
          className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
            activeTab === 'HISTORY' && historyFilter === 'COMPLETED'
              ? 'bg-emerald-50/70 border-emerald-500 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-mono">Completed Runs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-emerald-700 mt-2">
            {completedCount}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1">Patient safely delivered to ER</span>
        </div>

        <div 
          onClick={() => { setActiveTab('HISTORY'); setHistoryFilter('CANCELLED_USER'); }}
          className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
            activeTab === 'HISTORY' && historyFilter === 'CANCELLED_USER'
              ? 'bg-rose-50/70 border-rose-500 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-mono">Cancelled by User</span>
            <Ban className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-rose-700 mt-2">
            {cancelledUserCount}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1">Citizen caller self-cancelled</span>
        </div>

        <div 
          onClick={() => { setActiveTab('HISTORY'); setHistoryFilter('CANCELLED_ADMIN'); }}
          className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
            activeTab === 'HISTORY' && historyFilter === 'CANCELLED_ADMIN'
              ? 'bg-amber-50/70 border-amber-500 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-mono">Cancelled by Command</span>
            <AlertOctagon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-amber-700 mt-2">
            {cancelledAdminCount}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1">Administrative re-routing</span>
        </div>
      </div>

      {/* Main Mode Tabs Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 w-full">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
          <button
            onClick={() => setActiveTab('LIVE')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'LIVE'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>🔴 Live Ongoing Trips ({liveBookings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'HISTORY'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>📜 Complete Trip History ({historyBookings.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search citizen, phone (+91), paramedic, plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 text-xs shadow-xs"
          />
        </div>
      </div>

      {/* Sub-Filters Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs w-full">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase text-slate-500 flex items-center gap-1.5 font-bold">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            Filter By Status:
          </span>

          {activeTab === 'LIVE' ? (
            <>
              <button
                onClick={() => setLiveStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  liveStatusFilter === 'ALL' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                All Live ({liveBookings.length})
              </button>
              <button
                onClick={() => setLiveStatusFilter('REQUESTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  liveStatusFilter === 'REQUESTED' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                Needs Paramedic
              </button>
              <button
                onClick={() => setLiveStatusFilter('EN_ROUTE_TO_PICKUP')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  liveStatusFilter === 'EN_ROUTE_TO_PICKUP' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                En Route to Patient
              </button>
              <button
                onClick={() => setLiveStatusFilter('PATIENT_ON_BOARD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  liveStatusFilter === 'PATIENT_ON_BOARD' ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                Patient Onboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setHistoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  historyFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                All History ({historyBookings.length})
              </button>
              <button
                onClick={() => setHistoryFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  historyFilter === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                Completed Runs ({completedCount})
              </button>
              <button
                onClick={() => setHistoryFilter('CANCELLED_USER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  historyFilter === 'CANCELLED_USER' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                Cancelled by User ({cancelledUserCount})
              </button>
              <button
                onClick={() => setHistoryFilter('CANCELLED_ADMIN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  historyFilter === 'CANCELLED_ADMIN' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                Cancelled by Admin ({cancelledAdminCount})
              </button>
            </>
          )}
        </div>

        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
          Showing {displayedBookings.length} records
        </span>
      </div>

      {/* Main Trips Cards Grid */}
      <div className="space-y-5 w-full">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs w-full">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-teal-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Syncing emergency trip records from dispatch engine...</p>
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs w-full">
            <CalendarClock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No emergency trips found matching the selected filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try switching filters or adjusting your search keyword.</p>
          </div>
        ) : (
          displayedBookings.map((b) => {
            const stepIdx = getWorkflowStepIndex(b.status);
            const isLive = !isFinishedStatus(b.status);

            // Compute exact lifecycle interval timings
            const dispatchLatency = computeTimeDiff(b.requested_at, b.accepted_at || b.dispatched_at);
            const responseTime = computeTimeDiff(b.requested_at, b.arrived_pickup_at);
            const dwellTime = computeTimeDiff(b.arrived_pickup_at, b.patient_onboard_at);
            const handoverDuration = computeTimeDiff(b.patient_onboard_at, b.completed_at);
            const totalMissionTime = computeTimeDiff(b.requested_at, b.completed_at || b.cancelled_at);

            return (
              <div 
                key={b.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition hover:shadow-md w-full ${
                  b.status === 'REQUESTED' ? 'border-amber-400 bg-amber-50/20' :
                  isLive ? 'border-slate-200 hover:border-teal-400' : 
                  b.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50/10' : 'border-rose-200 bg-rose-50/10'
                }`}
              >
                {/* Card Header Bar */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold font-mono text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-600" />
                      {b.booking_reference}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      b.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-300' :
                      b.severity === 'SEVERE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-teal-100 text-teal-800 border border-teal-300'
                    }`}>
                      {b.severity}
                    </span>
                    {getStatusBadge(b.status, b.cancelled_by_type)}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-600 flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      {formatFullDate(b.requested_at)}
                    </span>

                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition shadow-xs"
                      title="Inspect complete citizen, paramedic, route, and full time status dossier"
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-600" />
                      <span>Full Incident Dossier</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Core Details Grid: USER vs DRIVER */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT: USER / CITIZEN DETAILS */}
                  <div className="space-y-3.5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-600" />
                        Citizen Caller & Patient Dossier
                      </span>
                      <a 
                        href={`tel:${b.requester_phone}`} 
                        className="flex items-center gap-1 text-[11px] font-mono text-teal-700 hover:underline bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-bold"
                      >
                        <PhoneCall className="w-3 h-3 text-teal-600" />
                        <span>{b.requester_phone}</span>
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Patient Name & Demographics:</span>
                        <span className="font-semibold text-slate-900">
                          {b.patient_name || 'Emergency Patient'} 
                          <span className="text-slate-500 text-[11px] ml-1 font-mono">({b.patient_age || 42} Yrs • {b.patient_gender || 'General'})</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Emergency Category / Complaint:</span>
                        <span className="font-semibold text-red-700">{b.chief_complaint || 'Urgent 108 Emergency Response'}</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-slate-500 block text-[11px] flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-red-500" />
                        Emergency Scene Pickup Address:
                      </span>
                      <p className="font-medium text-slate-800 mt-1">{b.pickup_address}</p>
                      <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                        GPS Coordinates: {b.pickup_latitude?.toFixed(4)}, {b.pickup_longitude?.toFixed(4)}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="text-slate-500 block text-[11px] flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-sky-600" />
                        Receiving Trauma Center Destination:
                      </span>
                      <p className="font-semibold text-slate-900 mt-1">{b.hospital?.name || 'Nearest Government Trauma Center'}</p>
                      <p className="text-[11px] text-slate-500">{b.hospital?.address}</p>
                    </div>
                  </div>

                  {/* RIGHT: DRIVER / PARAMEDIC & VEHICLE DETAILS */}
                  <div className="space-y-3.5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-2">
                        <Truck className="w-4 h-4 text-sky-600" />
                        Paramedic Crew & Vehicle Telemetry
                      </span>

                      {b.driver ? (
                        <a 
                          href={`tel:${b.driver.phone}`} 
                          className="flex items-center gap-1 text-[11px] font-mono text-teal-700 hover:underline bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-bold"
                        >
                          <PhoneCall className="w-3 h-3 text-teal-600" />
                          <span>{b.driver.phone}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                          CREW UNASSIGNED
                        </span>
                      )}
                    </div>

                    {b.driver ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[11px]">Paramedic in Command:</span>
                            <span className="font-semibold text-slate-900">{b.driver.full_name}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">Lic: {b.driver.licence_number}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">Ambulance Plate / Type:</span>
                            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block shadow-xs">
                              {b.ambulance?.registration_number || 'TN38CB1234'} ({b.ambulance?.vehicle_type || 'ALS'})
                            </span>
                          </div>
                        </div>

                        {/* Real-time Telemetry Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-mono flex items-center justify-center gap-1">
                              <Gauge className="w-3 h-3 text-sky-600" /> Speed
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-900 mt-0.5 block">
                              {b.ambulance?.speed_kmh?.toFixed(0) || 0} km/h
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-mono flex items-center justify-center gap-1">
                              <Compass className="w-3 h-3 text-teal-600" /> Heading
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-900 mt-0.5 block">
                              {b.ambulance?.heading?.toFixed(0) || 0}°
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-mono flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-purple-600" /> Dynamic ETA
                            </span>
                            <span className="font-mono font-bold text-xs text-purple-700 mt-0.5 block">
                              {b.eta_minutes ? `${b.eta_minutes} min` : (isLive ? '3-5 min' : 'Delivered')}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs">
                          <span className="text-slate-500 block text-[11px]">Paramedic GPS Coordinates:</span>
                          <span className="font-mono text-slate-700 text-[11px]">
                            {b.driver.current_latitude != null ? `${b.driver.current_latitude.toFixed(4)}, ${b.driver.current_longitude?.toFixed(4)}` : 'Live GPS Calibrating...'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-center text-xs text-amber-700 italic">
                        No paramedic crew assigned yet. Immediate central dispatch required.
                        <div className="mt-3">
                          <button
                            onClick={() => setAssignModalBooking(b)}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm"
                          >
                            Assign Paramedic Crew Now
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* FULL STATUS OF TIME: CHRONOMETRIC LIFECYCLE BAR */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      Full Status of Time & Lifecycle Chronometry
                    </span>
                    {totalMissionTime && (
                      <span className="text-[11px] font-mono text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200 font-semibold">
                        Total Mission Duration: <strong className="text-slate-900">{totalMissionTime}</strong>
                      </span>
                    )}
                  </div>

                  {b.status === 'CANCELLED' ? (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span className="text-xs font-bold text-rose-800">
                            TRIP CANCELLED & HALTED
                          </span>
                          <span className="text-[11px] font-mono text-slate-600">
                            at {formatTimeOnly(b.cancelled_at)}
                          </span>
                        </div>
                        <p className="text-xs text-rose-800 mt-1">
                          Reason: <span className="font-semibold text-slate-900">{b.cancellation_reason || 'Cancelled by requester'}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Initiated By: <strong className="text-slate-800">{b.cancelled_by_type === 'ADMIN' ? 'Central Administrative Command' : 'Citizen Caller (User App)'}</strong>
                        </p>
                      </div>

                      <div className="text-right font-mono text-xs text-slate-500">
                        <div>Call Placed: {formatTimeOnly(b.requested_at)}</div>
                        <div>Halted: {formatTimeOnly(b.cancelled_at)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      {/* Stage 1: Request */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">1. Call Placed</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">{formatTimeOnly(b.requested_at || (b as any).created_at)}</span>
                        <span className="text-[10px] text-teal-700 mt-1 block font-medium">Citizen SOS Triggered</span>
                      </div>

                      {/* Stage 2: Dispatched */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">2. Crew Dispatched</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">{formatTimeOnly(b.accepted_at || b.dispatched_at)}</span>
                        <span className="text-[10px] text-sky-700 mt-1 block font-medium">
                          Latency: {dispatchLatency || 'Immediate'}
                        </span>
                      </div>

                      {/* Stage 3: On-Scene */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">3. At Patient Scene</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">{formatTimeOnly(b.arrived_pickup_at)}</span>
                        <span className="text-[10px] text-cyan-700 mt-1 block font-medium">
                          Response: {responseTime || (isLive ? 'En route' : 'N/A')}
                        </span>
                      </div>

                      {/* Stage 4: Onboard */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">4. Patient Onboard</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">{formatTimeOnly(b.patient_onboard_at)}</span>
                        <span className="text-[10px] text-purple-700 mt-1 block font-medium">
                          Dwell: {dwellTime || (stepIdx >= 4 ? 'Stabilized' : 'Pending')}
                        </span>
                      </div>

                      {/* Stage 5: Handover */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">5. Hospital Handover</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">{formatTimeOnly(b.completed_at)}</span>
                        <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                          {b.status === 'COMPLETED' ? `Handover: ${handoverDuration || 'Safe'}` : 'In Transit'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Operational Actions & Live Step Bar (For Live Trips) */}
                {isLive && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {[
                        { label: '1. Call Placed', step: 1 },
                        { label: '2. Dispatched', step: 2 },
                        { label: '3. Scene Arrival', step: 3 },
                        { label: '4. Onboard', step: 4 },
                        { label: '5. In Transit', step: 5 },
                        { label: '6. Handover', step: 6 },
                      ].map((s) => {
                        const isDone = stepIdx >= s.step;
                        const isCurrent = stepIdx === s.step;
                        return (
                          <div key={s.step} className="flex items-center gap-1 text-[11px] shrink-0">
                            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                              isCurrent ? 'bg-teal-600 text-white shadow-xs animate-pulse' :
                              isDone ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                              'bg-slate-200 text-slate-500'
                            }`}>
                              {s.label}
                            </span>
                            {s.step < 6 && <span className="text-slate-400 font-bold">➔</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {b.driver ? (
                        <button
                          onClick={() => setReassignModalBooking(b)}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-xs"
                        >
                          Reassign Crew
                        </button>
                      ) : (
                        <button
                          onClick={() => setAssignModalBooking(b)}
                          className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm"
                        >
                          Dispatch Crew
                        </button>
                      )}

                      <button
                        onClick={() => setCancelModalBooking(b)}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition shadow-xs"
                      >
                        Cancel Trip
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FULL TRIP INSPECTION DOSSIER MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-teal-600" />
                  Clinical & Operational Incident Dossier: {selectedBooking.booking_reference}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete citizen intake record, paramedic telemetry audit, and chronological timeline
                </p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Timing Banner */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-slate-600 font-mono font-semibold">Triage Status:</span>
                {getStatusBadge(selectedBooking.status, selectedBooking.cancelled_by_type)}
              </div>
              <div className="text-slate-600 font-mono text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Requested: {formatFullDate(selectedBooking.requested_at)}
              </div>
            </div>

            {/* 3-Column Detailed Dossier */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* User Dossier */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-teal-700 uppercase font-mono tracking-wider text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Citizen Information
                </h3>
                <div><span className="text-slate-500">Caller:</span> <span className="text-slate-900 font-semibold">{selectedBooking.requester_name}</span></div>
                <div><span className="text-slate-500">Verified Phone:</span> <span className="text-teal-700 font-mono font-bold">{selectedBooking.requester_phone}</span></div>
                <div><span className="text-slate-500">Patient:</span> <span className="text-slate-800">{selectedBooking.patient_name} ({selectedBooking.patient_age || 42} Yrs)</span></div>
                <div><span className="text-slate-500">Complaint:</span> <span className="text-slate-800">{selectedBooking.chief_complaint}</span></div>
                <div><span className="text-slate-500">Pickup GPS:</span> <span className="text-slate-600 font-mono">{selectedBooking.pickup_latitude}, {selectedBooking.pickup_longitude}</span></div>
              </div>

              {/* Paramedic Dossier */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-sky-700 uppercase font-mono tracking-wider text-[11px] flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Paramedic Unit
                </h3>
                {selectedBooking.driver ? (
                  <>
                    <div><span className="text-slate-500">Paramedic:</span> <span className="text-slate-900 font-semibold">{selectedBooking.driver.full_name}</span></div>
                    <div><span className="text-slate-500">Phone:</span> <span className="text-teal-700 font-mono font-bold">{selectedBooking.driver.phone}</span></div>
                    <div><span className="text-slate-500">Ambulance Plate:</span> <span className="text-slate-900 font-mono font-bold">{selectedBooking.ambulance?.registration_number}</span></div>
                    <div><span className="text-slate-500">Speed / Heading:</span> <span className="text-slate-700 font-mono">{selectedBooking.ambulance?.speed_kmh || 0} km/h • {selectedBooking.ambulance?.heading || 0}°</span></div>
                    <div><span className="text-slate-500">Qualification:</span> <span className="text-slate-700 font-mono">PARAMEDIC (ALS)</span></div>
                  </>
                ) : (
                  <div className="text-amber-700 italic">No crew assigned.</div>
                )}
              </div>

              {/* Hospital Dossier */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-indigo-700 uppercase font-mono tracking-wider text-[11px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Receiving Facility
                </h3>
                <div><span className="text-slate-500">Facility:</span> <span className="text-slate-900 font-semibold">{selectedBooking.hospital?.name || (selectedBooking as any).hospital_name || (selectedBooking as any).destination || 'Designated Receiving Facility'}</span></div>
                <div><span className="text-slate-500">Address:</span> <span className="text-slate-700">{selectedBooking.hospital?.address || (selectedBooking as any).destination_address || 'Central District'}</span></div>
                <div><span className="text-slate-500">ER Hotline:</span> <span className="text-teal-700 font-mono font-bold">{selectedBooking.hospital?.emergency_contact || '108'}</span></div>
                <div><span className="text-slate-500">Trauma Level:</span> <span className="text-emerald-700 font-semibold">Level 1 24x7 Casualty</span></div>
              </div>
            </div>

            {/* Event Timeline Audit Trail */}
            <div>
              <h3 className="font-bold text-slate-900 uppercase font-mono tracking-wider text-xs mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                Audit Trail & Lifecycle Events
              </h3>
              <div className="space-y-2.5 border-l-2 border-slate-200 ml-2 pl-4 max-h-48 overflow-y-auto">
                {(selectedBooking.events || []).map((ev, i) => (
                  <div key={i} className="relative text-xs">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 border border-white" />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-slate-800">{ev.event_type}</span>
                      <span className="text-slate-500 font-mono">{new Date(ev.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Notes */}
            <div>
              <h3 className="font-bold text-slate-900 uppercase font-mono tracking-wider text-xs mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                Dispatcher Operational Notes
              </h3>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 max-h-28 overflow-y-auto whitespace-pre-wrap">
                {selectedBooking.operational_notes || 'No operational notes recorded.'}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2.5 mt-3">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Append clinical dispatch log note..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition flex items-center gap-1 text-xs shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Append Note</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manual Driver Assignment Modal */}
      {assignModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-600" />
              Manual Paramedic Dispatch
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an approved crew for emergency run{' '}
              <span className="text-slate-900 font-mono font-bold">{assignModalBooking.booking_reference}</span>.
            </p>

            {actionError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAssignDriver} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Paramedic & Vehicle:
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose Available Paramedic --</option>
                  {eligibleDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.assigned_ambulance?.registration_number || 'TN38CB1234'}) • {d.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dispatch Instructions / Reason:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nearest ALS response unit directed to scene"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalBooking(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs"
                >
                  Dispatch Ambulance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Paramedic Modal */}
      {reassignModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              Reassign Paramedic Crew
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Transfer emergency run{' '}
              <span className="text-slate-900 font-mono font-bold">{reassignModalBooking.booking_reference}</span> to another ambulance.
            </p>

            {actionError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleReassignDriver} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select New Paramedic:
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose New Available Paramedic --</option>
                  {eligibleDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.assigned_ambulance?.registration_number || 'TN38CB1234'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Transfer:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Previous unit encountered road obstruction"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalBooking(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Emergency Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-rose-300 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Cancel Emergency Dispatch
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Cancelling trip <span className="font-mono font-bold text-slate-900">{cancelModalBooking.booking_reference}</span> will immediately notify both the citizen and paramedic, stopping turn-by-turn navigation.
            </p>

            {actionError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCancelBooking} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cancellation Reason:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Caller reported patient self-transported"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition"
                >
                  Keep Active
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};