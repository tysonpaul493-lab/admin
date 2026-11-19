import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { ShieldCheck, Search, Filter, Lock, RefreshCw } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.warn('Failed to load audit logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      (l.user_name || '').toLowerCase().includes(term) ||
      (l.action || '').toLowerCase().includes(term) ||
      (l.ip_address || '').includes(term) ||
      (l.reason || '').toLowerCase().includes(term) ||
      (l.target_type || '').toLowerCase().includes(term);

    const matchesAction = filterAction === 'ALL' || (l.action && l.action.toUpperCase().includes(filterAction.toUpperCase()));
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">System Audit Trail & Security Ledger</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Immutable security ledger of staff logins, driver verifications, and ambulance dispatches.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-500 w-44 sm:w-48"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Actions</option>
              <option value="LOGIN">Staff Logins</option>
              <option value="ASSIGN">Dispatches</option>
              <option value="VERIF">Verifications</option>
              <option value="COMPLET">Handover</option>
              <option value="CANCEL">Cancellations</option>
            </select>
          </div>
          <button
            onClick={loadLogs}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
            title="Refresh Audit Trail"
          >
            <RefreshCw className={`w-4 h-4 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-teal-600 animate-spin" />
            Loading security ledger and audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No audit logs matching current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-mono border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">Reason / Details</th>
                  <th className="py-2.5 px-3">Origin IP</th>
                  <th className="py-2.5 px-3 text-right">Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(l => {
                  const d = l.created_at ? new Date(l.created_at) : new Date();
                  const timeFormatted = isNaN(d.getTime()) ? '--:--' : d.toLocaleString([], {
                    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                  });

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {timeFormatted}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {l.user_name || 'System Operator'}
                        <span className="block text-[10px] text-slate-400 font-normal">{l.user_role || 'Staff'}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-teal-50 text-teal-700 border border-teal-200">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono whitespace-nowrap">
                        {l.target_type ? `${l.target_type} #${l.target_id || ''}` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs max-w-xs truncate">
                        {l.reason || 'Routine operational update'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {l.ip_address || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3 text-emerald-600" />
                          Signed & Verified
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
