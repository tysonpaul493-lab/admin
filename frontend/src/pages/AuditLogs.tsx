import React from 'react';

export const AuditLogs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">System Audit Trail & Security Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Immutable ledger of administrative logins, dispatches, driver approvals, and trip updates.</p>
      </div>
    </div>
  );
};

