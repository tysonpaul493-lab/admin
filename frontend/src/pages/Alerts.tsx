import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { liveSocket } from '../api/liveSocket';
import { OperationalAlert } from '../types';
import { Bell, CheckCircle, ShieldAlert, Filter, RefreshCw, Send, Plus, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Alerts: React.FC = () => {
  const { hasRole } = useAuth();
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNRESOLVED' | 'CRITICAL'>('ALL');

  // Broadcast Announcement State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementSeverity, setAnnouncementSeverity] = useState<OperationalAlert['severity']>('CRITICAL');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const loadAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.warn('Failed to load alerts', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const unsubEvent = liveSocket.onLiveEvent(() => {
      loadAlerts();
    });
    const interval = setInterval(loadAlerts, 10000);
    return () => {
      unsubEvent();
      clearInterval(interval);
    };
  }, []);

  const handleResolve = async (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: true } : a));
    try {
      await api.resolveAlert(id);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMsg.trim()) return;
    setIsBroadcasting(true);
    try {
      const created = await api.broadcastAnnouncement(
        announcementTitle.trim(),
        announcementMsg.trim(),
        announcementSeverity
      );
      setAlerts(prev => [created, ...prev]);
      setShowBroadcastModal(false);
      setAnnouncementTitle('');
      setAnnouncementMsg('');
    } catch (err: any) {
      alert(err.message || 'Broadcast failed.');
    } finally {
      setIsBroadcasting(false);
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
        <div className="flex flex-wrap items-center gap-3">
          {hasRole(['super_admin', 'dispatcher']) && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Broadcast Alert
            </button>
          )}

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

          <button
            onClick={loadAlerts}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
            title="Refresh Alerts"
          >
            <RefreshCw className={`w-4 h-4 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-teal-600 animate-spin" />
            Loading live operational alerts...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-600">All alerts clear</p>
            <p className="text-xs text-slate-400 mt-0.5">No unresolved critical incidents or telemetry faults.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(a => {
              const d = a.created_at ? new Date(a.created_at) : new Date();
              const timeStr = isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    a.is_resolved
                      ? 'border-slate-200 bg-slate-50/40 opacity-70'
                      : a.severity === 'CRITICAL'
                      ? 'border-rose-200 bg-rose-50/50'
                      : a.severity === 'WARNING'
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-slate-200 bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${
                      a.is_resolved ? 'bg-slate-100 text-slate-500' :
                      a.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.is_resolved ? 'bg-slate-200 text-slate-700' :
                          a.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                        }`}>
                          {a.is_resolved ? 'RESOLVED' : a.severity}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {timeStr}
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
              );
            })}
          </div>
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-600" />
                Broadcast Central Dispatch Alert
              </h2>
              <button onClick={() => setShowBroadcastModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Severity Level:</label>
                <select
                  value={announcementSeverity}
                  onChange={(e) => setAnnouncementSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="CRITICAL">CRITICAL (Emergency Priority)</option>
                  <option value="WARNING">WARNING (Operational Caution)</option>
                  <option value="INFO">INFO (Advisory Protocol)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Alert Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mass Casualty Protocol - Avinashi Highway"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Transmission Message:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter detailed dispatch notice transmitted across all units..."
                  value={announcementMsg}
                  onChange={(e) => setAnnouncementMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isBroadcasting ? 'Broadcasting...' : 'Broadcast Transmission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
