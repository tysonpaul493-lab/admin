import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Booking, Driver, Ambulance } from '../types';
import { Radio, AlertTriangle, CheckCircle, Clock, Truck, ShieldAlert, ArrowRight } from 'lucide-react';

export const Dispatch: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [, setAmbulances] = useState<Ambulance[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = () => {
    api.getBookings().then(setBookings).catch(console.warn);
    api.getDrivers().then(setDrivers).catch(console.warn);
    api.getAmbulances().then(setAmbulances).catch(console.warn);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const pendingBookings = bookings.filter(b => 
    ['REQUESTED', 'FAILED_DISPATCH'].includes(b.status)
  );

  const activeDispatches = bookings.filter(b => 
    ['ACCEPTED', 'DISPATCHED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PATIENT_ON_BOARD', 'EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL'].includes(b.status)
  );

  const availableDrivers = drivers.filter(d => 
    d.online_status === 'ONLINE' && d.operational_status === 'AVAILABLE'
  );

  const handleAssign = async () => {
    if (!selectedBooking || !selectedDriverId) return;
    setIsAssigning(true);
    setActionMessage(null);
    try {
      const res = await api.assignDriver(selectedBooking.id, selectedDriverId);
      if (res && res.id) {
        setActionMessage(`Ambulance successfully dispatched to booking #${selectedBooking.booking_reference || selectedBooking.id}`);
        setSelectedBooking(null);
        setSelectedDriverId(null);
        loadData();
      }
    } catch (err: any) {
      setActionMessage(err.message || 'Dispatch assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-600 animate-pulse" />
            <h1 className="text-xl font-bold text-slate-900">Emergency Dispatch Management Console</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Real-time emergency queue routing, live fleet deployment, and regional triage.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {availableDrivers.length} Units Available
          </span>
          <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {pendingBookings.length} In Queue
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-teal-600 hover:text-teal-900 font-bold ml-2">×</button>
        </div>
      )}

      {/* Main Grid: Queue & Fleet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Emergency Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Pending Emergency Dispatches ({pendingBookings.length})
              </h2>
              <span className="text-xs text-slate-400 font-mono">Auto-refreshing</span>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-600">No pending emergency dispatches</p>
                <p className="text-xs text-slate-400 mt-0.5">All incoming triage calls have been assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((b) => {
                  const isSelected = selectedBooking?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBooking(isSelected ? null : b)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">#{b.booking_reference || b.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">
                              {b.severity || 'Critical'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{b.patient_name || b.requester_name || 'Emergency Patient'}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {b.pickup_address || `${b.pickup_latitude?.toFixed(4)}, ${b.pickup_longitude?.toFixed(4)}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                            isSelected
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Dispatches Feed */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-teal-600" />
              Active En Route Units ({activeDispatches.length})
            </h2>
            {activeDispatches.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No ambulances currently en route</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeDispatches.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-800 mr-2">#{b.booking_reference || b.id}</span>
                      <span className="font-semibold text-slate-700">{b.patient_name || b.requester_name || 'Emergency'}</span>
                      <span className="text-slate-400 ml-2">→ Driver: {b.driver?.full_name || 'Assigned'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Dispatch Action Panel & Available Drivers */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-teal-600" />
              Manual Dispatch Assignment
            </h3>

            {selectedBooking ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <p className="text-slate-500">Selected Incident:</p>
                  <p className="font-bold text-slate-900">#{selectedBooking.booking_reference || selectedBooking.id}</p>
                  <p className="text-slate-600">{selectedBooking.patient_name || selectedBooking.requester_name || 'Emergency'}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Choose Driver / Ambulance:</label>
                  <select
                    value={selectedDriverId || ''}
                    onChange={(e) => setSelectedDriverId(Number(e.target.value) || null)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Select Available Unit --</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.assigned_ambulance?.registration_number || d.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!selectedDriverId || isAssigning}
                  onClick={handleAssign}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  {isAssigning ? 'Dispatching...' : 'Confirm Emergency Dispatch'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Select an incident from the queue on the left to assign a driver.
              </p>
            )}
          </div>

          {/* Available Fleet List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Surrounding Fleet Units ({drivers.length})
            </h3>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {drivers.slice(0, 10).map((d) => (
                <div key={d.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{d.full_name}</p>
                    <p className="text-[11px] text-slate-500">{d.phone} • {d.assigned_ambulance?.vehicle_type || '108 ALS'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    d.online_status === 'ONLINE'
                      ? d.operational_status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {d.online_status === 'ONLINE' ? (d.operational_status || 'ONLINE') : 'OFFLINE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
