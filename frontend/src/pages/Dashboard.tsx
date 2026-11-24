import React, { useEffect, useState } from 'react';
import { 
  Users, UserCheck, Truck, Activity, CheckCircle, 
  XCircle, Clock, ArrowUpRight, Radio, RefreshCw,
  MapPin, Building2, PhoneCall, ShieldCheck, IndianRupee
} from 'lucide-react';
import { api } from '../api/client';
import { liveSocket } from '../api/liveSocket';
import { DashboardStats } from '../types';
import { Link } from 'react-router-dom';
import { LiveDispatchFeed } from '../components/live/LiveDispatchFeed';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard metrics', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    const unsub = liveSocket.onBookingUpdate(() => {
      loadData();
    });
    const unsubEvent = liveSocket.onEvent(() => {
      loadData();
    });
    return () => {
      clearInterval(interval);
      unsub();
      unsubEvent();
    };
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[420px] w-full">
        <div className="flex flex-col items-center gap-3 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-800 tracking-wide">Syncing Command Center</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Connecting to real-time hospital dispatch API...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderMetricValue = (metric?: { value: number | null; available: boolean }) => {
    if (!metric || !metric.available) {
      return <span className="text-slate-400 italic text-sm font-sans font-normal">--</span>;
    }
    return <span className="font-mono">{metric.value}</span>;
  };

  const m = stats.metrics;

  // Real operational cards directly derived from live DB records
  const realMetricCards = [
    {
      title: 'Emergency Revenue',
      value: <span className="font-mono text-emerald-700">{m.total_revenue?.formatted || `₹${(m.total_revenue?.value || 0).toLocaleString()}`}</span>,
      subtitle: m.today_revenue?.value ? `Today: ${m.today_revenue.formatted}` : 'Hospital emergency intake',
      icon: IndianRupee,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'Revenue',
      link: '/bookings?status=COMPLETED'
    },
    {
      title: 'Active Incidents',
      value: renderMetricValue(m.active_bookings),
      subtitle: 'Ongoing 108 emergencies',
      icon: Activity,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'Live',
      link: '/bookings'
    },
    {
      title: 'Available Responders',
      value: renderMetricValue(m.available_ambulances),
      subtitle: `${m.online_drivers?.value ?? 0} Online Paramedics`,
      icon: ShieldCheck,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      badge: 'Ready',
      link: '/tracking'
    },
    {
      title: 'In-Transit Ambulances',
      value: renderMetricValue(m.busy_ambulances),
      subtitle: 'Active en route to patient/ER',
      icon: Radio,
      color: 'bg-red-50 text-red-700 border-red-200',
      badge: 'Sirens On',
      link: '/tracking'
    },
    {
      title: 'Verified Paramedics',
      value: renderMetricValue(m.total_verified_drivers),
      subtitle: `${m.offline_drivers?.value ?? 0} Off Duty`,
      icon: UserCheck,
      color: 'bg-sky-50 text-sky-700 border-sky-200',
      badge: 'Crew',
      link: '/drivers'
    },
    {
      title: 'Completed Handover',
      value: renderMetricValue(m.completed_trips),
      subtitle: 'Delivered to ER casualty',
      icon: CheckCircle,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'Delivered',
      link: '/bookings?status=COMPLETED'
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Top Bar: Title & Telemetry Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs w-full">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-2 border-slate-200 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
            <img src="/app_logo.png" alt="All India Tamil Annai Trust Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                ஆல் இந்தியா தமிழ் அன்னை அறக்கட்டளை
              </h1>
              <span className="text-xs font-semibold font-mono px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
                Live Telemetry
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {m.online_drivers?.value ?? 0} Drivers Online
              </span>
              {(m.offline_drivers?.value || 0) > 0 && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {m.offline_drivers?.value} Offline
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-bold text-sky-600 mt-0.5 tracking-wide">
              தமிழ்நாடு அவசர ஊர்தி ஓட்டுநர் கன்சோல்
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Real-time ambulance dispatch status, citizen emergency intake, paramedic telemetry, and hospital trauma records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition border border-slate-200 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>

          <Link
            to="/bookings"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white transition shadow-sm border border-teal-600"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>View All Trips</span>
          </Link>
        </div>
      </div>

      {/* Active Incident Urgent Banner */}
      {(m.active_bookings?.value || 0) > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs w-full">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 animate-ping shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-800 font-mono">
                EMERGENCY ALERT: {m.active_bookings?.value} ACTIVE INCIDENT(S) IN PROGRESS
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Paramedics are en route. Live GPS telemetry streaming to central command.
              </p>
            </div>
          </div>
          <Link
            to="/tracking"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shrink-0 flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
          >
            <span>Monitor Live on GPS Map</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 6 Real Core Operational Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        {realMetricCards.map((card, idx) => (
          <Link
            key={idx}
            to={card.link}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500/80 hover:shadow-md transition flex flex-col justify-between group shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono truncate">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg border ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-teal-600 transition">
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                <span className="truncate">{card.subtitle}</span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 ml-1">
                  {card.badge}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Live Interceptor Real-Time Updates Feed */}
      <div className="w-full">
        <LiveDispatchFeed />
      </div>

      {/* Recent Emergency Booking Activity Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Recent Emergency Admissions & Live Runs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live intake log of real citizen requests, dispatch response, and paramedic crew
            </p>
          </div>
          <Link
            to="/bookings"
            className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1.5 bg-teal-50 px-3.5 py-1.5 rounded-xl border border-teal-200 transition w-fit"
          >
            <span>View Complete Trips Registry</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Trip Reference</th>
                <th className="py-3.5 px-4 font-bold">Triage Priority</th>
                <th className="py-3.5 px-4 font-bold">Citizen / Patient</th>
                <th className="py-3.5 px-4 font-bold">Emergency Pickup</th>
                <th className="py-3.5 px-4 font-bold">Receiving Hospital</th>
                <th className="py-3.5 px-4 font-bold">Paramedic Crew</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 text-right font-bold">Intake Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {!stats.recent_activity || stats.recent_activity.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No recent emergency admissions recorded in current shift.
                  </td>
                </tr>
              ) : (
                stats.recent_activity.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-4 font-mono font-bold text-slate-900">
                    <Link to={`/bookings?search=${b.booking_reference || b.reference}`} className="hover:text-teal-600 hover:underline">
                      {b.booking_reference || b.reference}
                    </Link>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                      b.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border border-red-200' :
                      b.severity === 'SEVERE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-teal-50 text-teal-700 border border-teal-200'
                    }`}>
                      {b.severity}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-800">{b.patient_name || b.requester_name}</div>
                    {(b.requester_phone || b.patient_phone) && b.requester_phone !== '—' && b.patient_phone !== '—' ? (
                      <a 
                        href={`tel:${b.requester_phone || b.patient_phone}`}
                        className="text-[11px] text-teal-600 hover:underline font-mono flex items-center gap-1 mt-0.5 font-medium"
                      >
                        <PhoneCall className="w-3 h-3" />
                        {b.requester_phone || b.patient_phone}
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-700 max-w-xs truncate">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate">{b.pickup_address}</span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-700 max-w-xs truncate">
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">{b.hospital ? b.hospital.name : (b.hospital_name || b.destination || 'Receiving Trauma Hospital')}</span>
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {(() => {
                      const dName = b.driver?.full_name || b.driver?.name || (b.driver_name !== 'Unassigned' ? b.driver_name : null);
                      const regNum = b.ambulance?.registration_number || (b.vehicle_plate !== 'N/A' && b.vehicle_plate !== '--' ? b.vehicle_plate : null);
                      return dName ? (
                        <div>
                          <div className="text-slate-800 font-medium">{dName}</div>
                          <div className="text-[10px] text-slate-600 font-mono font-semibold">{regNum || 'Assigned 108 Unit'}</div>
                        </div>
                      ) : (
                        <span className="text-amber-600 text-[11px] font-mono italic">Pending Crew</span>
                      );
                    })()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                      b.status === 'PATIENT_ON_BOARD' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      b.status === 'FAILED_DISPATCH' ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' :
                      b.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                      'bg-teal-50 text-teal-700 border border-teal-200'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-slate-600 font-mono text-[11px] whitespace-nowrap">
                    {(() => {
                      const timeStr = b.requested_at || b.timestamp || b.created_at || b.accepted_at;
                      if (!timeStr) return '--:--';
                      const d = new Date(timeStr);
                      return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    })()}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};