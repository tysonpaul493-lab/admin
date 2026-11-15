import React from 'react';

export const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Emergency Dispatch & Operational Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Audit logs, response time metrics, and hospital handoff compliance.</p>
      </div>
    </div>
  );
};

