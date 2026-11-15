import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Booking, Driver, Ambulance } from '../types';

export const Dispatch: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    api.getBookings().then(setBookings).catch(console.warn);
    api.getDrivers().then(setDrivers).catch(console.warn);
    api.getAmbulances().then(setAmbulances).catch(console.warn);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Emergency Dispatch Management Console</h1>
        <p className="text-sm text-slate-500 mt-1">Direct manual ambulance assignment and regional incident queue.</p>
      </div>
    </div>
  );
};
