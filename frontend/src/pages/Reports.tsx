import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { liveSocket } from '../api/liveSocket';
import { DashboardStats, Booking } from '../types';
import { FileText, Download, CheckCircle, TrendingUp, IndianRupee, Clock, Activity, RefreshCw } from 'lucide-react';

export const Reports: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sData, bData] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getBookings().catch(() => [])
      ]);
      if (sData) setStats(sData);
      if (bData) setBookings(bData);
    } catch (e) {
      console.warn('Failed to load reports data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubBooking = liveSocket.onBookingUpdate(() => {
      loadData();
    });
    const unsubEvent = liveSocket.onLiveEvent((evt) => {
      if (['TRIP_COMPLETED', 'BOOKING_CREATED', 'BOOKING_CANCELLED', 'INCIDENT'].includes(evt.type)) {
        loadData();
      }
    });
    return () => {
      unsubBooking();
      unsubEvent();
    };
  }, []);

  const completed = bookings.filter(b => ['COMPLETED', 'completed', 'trip_completed'].includes(b.status));
  const computedRevenue = completed.reduce((sum, b) => sum + Number((b as any).total_fare ?? (b as any).earnings ?? 0), 0);
  const totalRevenue = stats?.metrics?.total_revenue?.formatted || `₹${computedRevenue.toLocaleString()}`;

  const downloadJsonReport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ stats, bookings }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `liferoute_emergency_report_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  const downloadCsvReport = () => {
    const headers = ['Booking Reference', 'Patient Name', 'Phone', 'Paramedic Crew', 'Pickup Address', 'Receiving Hospital', 'Status', 'Date'];
    const rows = bookings.map(b => [
      `"${b.booking_reference || b.id}"`,
      `"${b.patient_name || b.requester_name || ''}"`,
      `"${b.requester_phone || (b as any).patient_phone || ''}"`,
      `"${b.driver?.full_name || (b.driver as any)?.name || (b as any).driver_name || 'Unassigned'}"`,
      `"${(b.pickup_address || '').replace(/"/g, '""')}"`,
      `"${(b.hospital?.name || (b as any).destination || '').replace(/"/g, '""')}"`,
      `"${b.status}"`,
      `"${b.requested_at || (b as any).created_at || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `liferoute_trips_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">Emergency Dispatch & Operational Reports</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Audit logs, 108 emergency response metrics, and hospital triage compliance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
            title="Refresh Reports"
          >
            <RefreshCw className={`w-4 h-4 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={downloadCsvReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={downloadJsonReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Emergency Revenue</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalRevenue}</p>
          <p className="text-xs text-slate-400 mt-1">Direct hospital intake & dispatches</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-teal-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Emergencies</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{completed.length || stats?.metrics?.completed_trips?.value || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Successful hospital patient handoffs</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-sky-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Response Time</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats?.metrics?.avg_response_time_seconds?.value ? `${(stats.metrics.avg_response_time_seconds.value / 60).toFixed(1)} min` : '—'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Within golden hour SLA standard</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dispatch Success Rate</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {bookings.length > 0
              ? `${((bookings.filter(b => !['CANCELLED', 'cancelled', 'failed'].includes(b.status)).length / bookings.length) * 100).toFixed(1)}%`
              : '—'}
          </p>
          <p className="text-xs text-slate-400 mt-1">First-dispatch acceptance rate</p>
        </div>
      </div>

      {/* Completed Incidents Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          Recent Completed Incidents Log ({completed.length})
        </h3>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-teal-600 animate-spin" />
            Loading incident records...
          </div>
        ) : completed.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No completed incidents recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-mono border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Patient / Case</th>
                  <th className="py-2.5 px-3">Driver Unit</th>
                  <th className="py-2.5 px-3">Pickup Location</th>
                  <th className="py-2.5 px-3">Receiving Hospital</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completed.slice(0, 15).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{b.booking_reference || b.id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{b.patient_name || b.requester_name || '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {b.driver?.full_name || (b.driver as any)?.name || (b as any).driver_name || 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{b.pickup_address || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                      {b.hospital?.name || (b as any).hospital_name || (b as any).destination || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {(b as any).total_fare != null
                        ? `₹${Number((b as any).total_fare).toLocaleString()}`
                        : ((b as any).earnings != null ? `₹${Number((b as any).earnings).toLocaleString()}` : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
