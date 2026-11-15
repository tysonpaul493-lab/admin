import React from 'react';

export const Alerts: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Operational Alerts & System Notifications</h1>
        <p className="text-sm text-slate-500 mt-1">Live critical alerts, dispatch delays, and maintenance warning feeds.</p>
      </div>
    </div>
  );
};

