import React, { useState, useEffect } from 'react';
import { 
  Activity, LogOut, Map, CalendarClock, Users2, Building2, UserCheck, Volume2, VolumeX, Truck,
  Radio, FileText, Bell, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { liveSocket } from '../../api/liveSocket';
import { NavLink, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMuted, setIsMuted] = useState(liveSocket.getMuted());

  useEffect(() => {
    // Reset horizontal window scroll whenever route changes
    window.scrollTo({ left: 0, top: 0 });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [location.pathname]);

  const toggleMute = () => {
    const next = !isMuted;
    liveSocket.setMuted(next);
    setIsMuted(next);
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-150 shrink-0 ${
      isActive
        ? 'bg-teal-600 text-white shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
    }`;

  return (
    <header className="bg-white/95 border-b border-slate-200 text-slate-900 sticky top-0 z-[1100] backdrop-blur-md shadow-xs w-full max-w-full overflow-hidden">
      <div className="w-full max-w-full px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2 sm:gap-3 overflow-hidden">
        {/* Left: Trust Brand & Live Command Center */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-teal-200 shadow-xs shrink-0 overflow-hidden flex items-center justify-center">
            <img src="/app_logo.png" alt="Trust Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-xs sm:text-sm lg:text-base text-slate-900 whitespace-nowrap">
                தமிழ் அனைத்து அறக்கட்டளை
              </span>
              <span className="hidden sm:inline-block text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider font-bold whitespace-nowrap">
                COMMAND CENTER
              </span>
            </div>
          </div>
        </div>

        {/* Center: Clinical Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto max-w-full shrink min-w-0">
          <NavLink to="/" end className={navItemClass} title="Command Center">
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Command Center</span>
          </NavLink>
          <NavLink to="/tracking" className={navItemClass} title="Fleet Live Map">
            <Map className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Live Map</span>
          </NavLink>
          <NavLink to="/bookings" className={navItemClass} title="Trips & Records">
            <CalendarClock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Trips</span>
          </NavLink>
          <NavLink to="/drivers" className={navItemClass} title="Paramedics">
            <Users2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Paramedics</span>
          </NavLink>
          <NavLink to="/ambulances" className={navItemClass} title="Ambulance Fleet">
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fleet</span>
          </NavLink>
          <NavLink to="/users" className={navItemClass} title="Citizens">
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Citizens</span>
          </NavLink>
          <NavLink to="/hospitals" className={navItemClass} title="Trauma Centers">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Hospitals</span>
          </NavLink>
          <NavLink to="/dispatch" className={navItemClass} title="Emergency Dispatch">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span className="hidden md:inline">Dispatch</span>
          </NavLink>
          <NavLink to="/reports" className={navItemClass} title="Reports & Revenue">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reports</span>
          </NavLink>
          <NavLink to="/alerts" className={navItemClass} title="Operational Alerts">
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Alerts</span>
          </NavLink>
          <NavLink to="/audit-logs" className={navItemClass} title="Security Audit Trail">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Audit</span>
          </NavLink>
        </nav>

        {/* Right: Audio Siren Control, User Profile & Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Siren Mute Toggle Button */}
          <button
            onClick={toggleMute}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${
              isMuted
                ? 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-200'
                : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
            }`}
            title={isMuted ? 'Unmute emergency audio siren chimes' : 'Mute emergency siren audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden lg:inline">{isMuted ? 'Muted' : 'Siren On'}</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="font-bold text-slate-800 leading-tight truncate max-w-[100px]">{user?.name || 'Administrator'}</div>
              <div className="text-[10px] text-teal-700 font-mono font-medium capitalize">{user?.role_name || 'Hospital Admin'}</div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 transition shrink-0"
            title="Terminate Administrative Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
