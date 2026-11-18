import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { OperationalAlert } from '../types';
import { Bell, CheckCircle, ShieldAlert, Filter } from 'lucide-react';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNRESOLVED' | 'CRITICAL'>('ALL');

  const loadAlerts = () => {
    api.getAlerts().then(setAlerts).catch(console.warn);
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: number) => {
    try {
      await api.resolveAlert(id);
      loadAlerts();
    } catch (e) {
      console.warn(e);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'UNRESOLVED') return !a.is_resolved;
    if (filter === 'CRITICAL') return a.severity === 'CRITICAL' && !a.is_resolved;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">Operational Alerts & Critical Feeds</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Live critical ambulance telemetry warnings, dispatch delays, and system alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Alerts</option>
            <option value="UNRESOLVED">Active / Unresolved</option>
            <option value="CRITICAL">Critical Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-600">All alerts clear</p>
            <p className="text-xs text-slate-400 mt-0.5">No unresolved critical incidents or telemetry faults.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(a => (
              <div
                key={a.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  a.severity === 'CRITICAL'
                    ? 'border-rose-200 bg-rose-50/50'
                    : a.severity === 'WARNING'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-slate-200 bg-slate-50/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    a.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        a.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {a.severity}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1">{a.message || a.title}</p>
                    {a.reference_type && (
                      <p className="text-xs text-slate-500 mt-0.5">Reference: {a.reference_type} #{a.reference_id || ''}</p>
                    )}
                  </div>
                </div>

                {!a.is_resolved && (
                  <button
                    onClick={() => handleResolve(a.id)}
                    className="self-end sm:self-auto px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-xs"
                  >
                    Resolve Alert
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
