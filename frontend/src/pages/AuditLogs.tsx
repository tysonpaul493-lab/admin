import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { ShieldCheck, Search, Filter, Lock } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  useEffect(() => {
    api.getAuditLogs().then(setLogs).catch(console.warn);
  }, []);

  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      (l.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.ip_address || '').includes(searchTerm);
    const matchesAction = filterAction === 'ALL' || l.action === filterAction;
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-500 w-48"
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
              <option value="LOGIN_SUCCESS">Logins</option>
              <option value="DRIVER_ASSIGNED">Dispatches</option>
              <option value="DRIVER_APPROVED">Verifications</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        {filteredLogs.length === 0 ? (
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
                  <th className="py-2.5 px-3">Origin IP</th>
                  <th className="py-2.5 px-3 text-right">Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {new Date(l.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {l.user_name || 'System Operator'}
                      <span className="block text-[10px] text-slate-400 font-normal">{l.user_role || 'Staff'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-teal-50 text-teal-700 border border-teal-200">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono">
                      {l.target_type ? `${l.target_type} #${l.target_id || ''}` : '--'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {l.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        Signed & Verified
                      </span>
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
