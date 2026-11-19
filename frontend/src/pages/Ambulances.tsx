import React, { useEffect, useState } from 'react';
import { 
  Truck, Plus, Search, RefreshCw, XCircle
} from 'lucide-react';
import { api } from '../api/client';
import { Ambulance, VehicleType } from '../types';
import { useAuth } from '../context/AuthContext';

export const Ambulances: React.FC = () => {
  const { hasRole } = useAuth();
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusModalAmbulance, setStatusModalAmbulance] = useState<Ambulance | null>(null);
  const [newStatus, setNewStatus] = useState<Ambulance['operational_status']>('AVAILABLE');
  const [statusReason, setStatusReason] = useState('');

  // Add Vehicle Form State
  const [newReg, setNewReg] = useState('');
  const [newType, setNewType] = useState<VehicleType>('ALS');
  const [newOperator, setNewOperator] = useState('State Emergency Medical Services');
  const [newZone, setNewZone] = useState('Central');
  const [newFitness, setNewFitness] = useState('2027-12-31');
  const [newInsurance, setNewInsurance] = useState('2027-12-31');
  const [newPermit, setNewPermit] = useState('2027-12-31');
  const [newEquipment, setNewEquipment] = useState('biphasic_defibrillator, ventilator, oxygen, ecg');

  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await api.getAmbulances();
      setAmbulances(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const created = await api.addAmbulance({
        registration_number: newReg.toUpperCase().trim(),
        vehicle_type: newType,
        operator_name: newOperator,
        equipment_capabilities: newEquipment.split(',').map(s => s.trim()),
        verification_status: 'APPROVED',
        fitness_expiry: newFitness,
        insurance_expiry: newInsurance,
        permit_expiry: newPermit,
        operational_status: 'AVAILABLE',
        latitude: 11.0168,
        longitude: 76.9558,
        speed_kmh: 0,
        heading: 0,
        battery_fuel_percentage: 100,
        service_zone: newZone,
      });

      setAmbulances(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewReg('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to register ambulance.');
    }
  };

  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalAmbulance) return;

    try {
      const updated = await api.updateAmbulanceStatus(statusModalAmbulance.id, newStatus, statusReason);
      setAmbulances(prev => prev.map(a => a.id === updated.id ? updated : a));
      setStatusModalAmbulance(null);
      setStatusReason('');
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    }
  };

  const filteredAmbulances = ambulances.filter(a => {
    if (statusFilter !== 'ALL' && a.operational_status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && a.vehicle_type !== typeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchReg = (a.registration_number || '').toLowerCase().includes(term);
      const matchOp = (a.operator_name || '').toLowerCase().includes(term);
      if (!matchReg && !matchOp) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              Ambulance Fleet Management
            </h1>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {ambulances.length} Registered Units
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Life-support capabilities, mechanical maintenance locks, and compliance permit expiries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasRole(['super_admin', 'dispatcher']) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white transition shadow-sm border border-teal-600"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Induct New Ambulance</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
          >
            <RefreshCw className="w-4 h-4 text-teal-600" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs w-full">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search registration or operator fleet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 text-xs font-medium"
          >
            <option value="ALL">All Operational Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">On Duty (Busy)</option>
            <option value="MAINTENANCE">Under Maintenance</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500 text-xs font-medium"
          >
            <option value="ALL">All Life Support Types</option>
            <option value="BLS">BLS (Basic Life Support)</option>
            <option value="ALS">ALS (Advanced Life Support)</option>
            <option value="MICU">MICU (Mobile ICU)</option>
            <option value="NEONATAL">NEONATAL (Incubator)</option>
          </select>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-4 px-5 font-bold">Registration</th>
                <th className="py-4 px-5 font-bold">Type & Capabilities</th>
                <th className="py-4 px-5 font-bold">Operator Fleet</th>
                <th className="py-4 px-5 font-bold">Assigned Paramedic</th>
                <th className="py-4 px-5 font-bold">Compliance Expiries</th>
                <th className="py-4 px-5 font-bold">Operational Status</th>
                <th className="py-4 px-5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 text-teal-600 animate-spin" />
                    Fetching ambulance fleet records from database...
                  </td>
                </tr>
              ) : filteredAmbulances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No ambulances found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredAmbulances.map((amb) => {
                const isFitnessExpired = new Date(amb.fitness_expiry) < new Date();
                const isInsuranceExpiringSoon = new Date(amb.insurance_expiry) < new Date(Date.now() + 30 * 86400000);

                return (
                  <tr key={amb.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-5 font-mono font-bold text-slate-900">
                      <div className="text-sm">{amb.registration_number}</div>
                      <span className="text-[10px] text-slate-500 font-normal">Zone: {amb.service_zone}</span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="px-2.5 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                        {amb.vehicle_type}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-xs truncate" title={Array.isArray(amb.equipment_capabilities) ? amb.equipment_capabilities.join(', ') : String(amb.equipment_capabilities || '')}>
                        {Array.isArray(amb.equipment_capabilities) ? amb.equipment_capabilities.join(', ') : String(amb.equipment_capabilities || 'ALS Equipment Kit')}
                      </p>
                    </td>

                    <td className="py-4 px-5 text-slate-700 font-medium">
                      {amb.operator_name}
                    </td>

                    <td className="py-4 px-5">
                      {amb.primary_driver ? (
                        <div>
                          <div className="font-semibold text-slate-900">{amb.primary_driver.name || (amb.primary_driver as any).full_name}</div>
                          <div className="text-[10px] text-teal-700 font-mono font-bold">{amb.primary_driver.phone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-[11px] font-mono">
                      <div className={isFitnessExpired ? 'text-red-700 font-bold' : 'text-slate-700'}>
                        Fit: {amb.fitness_expiry} {isFitnessExpired && '⚠️ EXPIRED'}
                      </div>
                      <div className={isInsuranceExpiringSoon ? 'text-amber-700' : 'text-slate-500'}>
                        Ins: {amb.insurance_expiry}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono inline-block ${
                        amb.operational_status === 'AVAILABLE' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                        amb.operational_status === 'BUSY' ? 'bg-red-50 text-red-700 border border-red-200' :
                        amb.operational_status === 'MAINTENANCE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {amb.operational_status}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Fuel/Battery: {amb.battery_fuel_percentage}%
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      {hasRole(['super_admin', 'dispatcher']) && (
                        <button
                          onClick={() => {
                            setStatusModalAmbulance(amb);
                            setNewStatus(amb.operational_status);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition shadow-xs"
                        >
                          Change Status
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Ambulance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-600" />
                Induct New Emergency Ambulance
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Register an accredited vehicle with compliant fitness certificates into municipal dispatch.
            </p>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono mb-1">Registration Plate #</label>
                  <input
                    type="text"
                    required
                    placeholder="TN-01-AM-5500"
                    value={newReg}
                    onChange={(e) => setNewReg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono uppercase focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-mono mb-1">Vehicle Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value="BLS">BLS (Basic Life Support)</option>
                    <option value="ALS">ALS (Advanced Life Support)</option>
                    <option value="MICU">MICU (Mobile ICU)</option>
                    <option value="NEONATAL">NEONATAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-mono mb-1">Fleet Operator</label>
                <input
                  type="text"
                  required
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <label className="block text-slate-500 mb-1">Fitness Expiry</label>
                  <input
                    type="date"
                    required
                    value={newFitness}
                    onChange={(e) => setNewFitness(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    required
                    value={newInsurance}
                    onChange={(e) => setNewInsurance(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Permit Expiry</label>
                  <input
                    type="date"
                    required
                    value={newPermit}
                    onChange={(e) => setNewPermit(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-xs"
                >
                  Register Ambulance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusModalAmbulance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Update Status: {statusModalAmbulance.registration_number}
            </h2>
            <form onSubmit={handleStatusChangeSubmit} className="space-y-3.5 text-xs mt-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Operational Status:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="AVAILABLE">AVAILABLE (Ready for Dispatch)</option>
                  <option value="BUSY">BUSY (Active Incident)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Mechanical Lock)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason / Mechanical Log:</label>
                <input
                  type="text"
                  placeholder="e.g. Routine 10,000km mechanical check"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalAmbulance(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-xs"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};