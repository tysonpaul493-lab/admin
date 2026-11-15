import React, { useState, useEffect } from 'react';
import { 
  Search, Phone, RefreshCw, XCircle, Eye, Ban, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface PublicUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  is_verified: boolean;
  is_active: boolean;
  total_bookings: number;
  registered_at: string;
  has_active_emergency: boolean;
}

export const UsersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<PublicUser[]>([
    {
      id: 1,
      name: 'Tyson',
      phone: '+91 8428304510',
      email: 'tyson@emergency.org',
      is_verified: true,
      is_active: true,
      total_bookings: 8,
      registered_at: '2026-11-13',
      has_active_emergency: true,
    },
    {
      id: 101,
      name: 'Suresh Ramanathan',
      phone: '+91 94441 23456',
      email: 'suresh.ramanathan@gmail.com',
      is_verified: true,
      is_active: true,
      total_bookings: 3,
      registered_at: '2025-06-12',
      has_active_emergency: false,
    },
    {
      id: 102,
      name: 'Meera Chidambaram',
      phone: '+91 98400 98765',
      email: 'meera.c@yahoo.com',
      is_verified: true,
      is_active: true,
      total_bookings: 1,
      registered_at: '2026-01-20',
      has_active_emergency: false,
    },
  ]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data.map((u: any) => ({
          id: u.id,
          name: u.name || 'Emergency Caller',
          phone: u.phone || '+91 8428304510',
          email: u.email || `user_${u.id}@emergency.org`,
          is_verified: true,
          is_active: u.status !== 'SUSPENDED',
          total_bookings: u.bookings_count || 1,
          registered_at: u.created_at ? u.created_at.split('T')[0] : '2026-11-13',
          has_active_emergency: false,
        })));
      }
    } catch (err) {
      console.warn('Using local store for users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);

  const toggleUserStatus = (userId: number) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, is_active: !u.is_active };
      }
      return u;
    }));
  };

  const filteredUsers = users.filter(u => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(term);
      const matchPhone = u.phone.includes(term);
      const matchEmail = u.email.toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs w-full max-w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Registered Citizen Caller Profiles
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {users.length} Citizens
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            SIM-verified citizen mobile profiles, emergency dispatch histories, and patient account compliance.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition shadow-xs self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Citizens</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center text-xs shadow-xs w-full max-w-full">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search citizen by name, verified SIM mobile (+91), or email address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 text-xs font-medium"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs w-full max-w-full">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4 font-bold">Citizen Profile</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Verified Contact</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Active Emergency</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Total 108 Requests</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Account Status</th>
                <th className="py-3 px-3 sm:px-4 font-bold">Registration Date</th>
                <th className="py-3 px-3 sm:px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                    <div className="text-[10px] text-teal-700 font-mono mt-0.5">UID #{u.id}</div>
                  </td>

                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                    <a 
                      href={`tel:${u.phone}`}
                      className="font-mono text-teal-700 hover:underline flex items-center gap-1 font-bold text-xs"
                    >
                      <Phone className="w-3 h-3 text-teal-600" />
                      <span>{u.phone}</span>
                    </a>
                    <div className="text-[10px] text-slate-400 mt-0.5">{u.email}</div>
                  </td>

                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                    {u.has_active_emergency ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                        Active Run in Progress
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-mono">None (Standby)</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 sm:px-4 font-mono text-slate-800 font-bold whitespace-nowrap">
                    {u.total_bookings} emergencies
                  </td>

                  <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      u.is_active 
                        ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 sm:px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {u.registered_at}
                  </td>

                  <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-teal-700 border border-slate-200 font-bold transition text-xs"
                        title="Inspect full medical caller history"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className={`p-1.5 rounded-xl border transition ${
                          u.is_active 
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200' 
                            : 'text-teal-600 hover:bg-teal-50 border-teal-200'
                        }`}
                        title={u.is_active ? 'Suspend caller' : 'Reactivate caller'}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Drawer Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedUser.name}</h2>
                <span className="text-[11px] text-teal-700 font-mono">UID: {selectedUser.id}</span>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Verified Phone</span>
                <span className="font-mono font-bold text-slate-900">{selectedUser.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="text-slate-800">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Total 108 Emergency Requests</span>
                <span className="font-bold text-teal-700">{selectedUser.total_bookings}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Account Status</span>
                <span className={`font-bold uppercase ${selectedUser.is_active ? 'text-teal-700' : 'text-rose-600'}`}>
                  {selectedUser.is_active ? 'Active & Clear' : 'Suspended'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition"
            >
              Close Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
