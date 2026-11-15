import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Map, CalendarClock, Radio, Users2, Truck, 
  Building2, UserCheck, BarChart3, AlertOctagon, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useAlerts();

  const navigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Live Map', path: '/tracking', icon: Map },
    { name: 'Dispatch', path: '/dispatch', icon: Radio },
    { name: 'Trips', path: '/bookings', icon: CalendarClock },
    { name: 'Paramedics', path: '/drivers', icon: Users2 },
    { name: 'Ambulances', path: '/ambulances', icon: Truck },
    { name: 'Hospitals', path: '/hospitals', icon: Building2 },
    { name: 'Citizens', path: '/users', icon: UserCheck },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Alerts', path: '/alerts', icon: AlertOctagon },
    { name: 'Audit Logs', path: '/audit-logs', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      <div className="px-4 py-3 border-b border-slate-200">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
          Emergency Command
        </span>
      </div>
      <nav className="p-3 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
