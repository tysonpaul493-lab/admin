import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { MainLayout } from './components/layout/MainLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LiveMap } from './pages/LiveMap';
import { Bookings } from './pages/Bookings';
import { Dispatch } from './pages/Dispatch';
import { Drivers } from './pages/Drivers';
import { Ambulances } from './pages/Ambulances';
import { Hospitals } from './pages/Hospitals';
import { UsersPage } from './pages/Users';
import { Reports } from './pages/Reports';
import { Alerts } from './pages/Alerts';
import { AuditLogs } from './pages/AuditLogs';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AlertProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="tracking" element={<LiveMap />} />
              <Route path="dispatch" element={<Dispatch />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="trips" element={<Bookings />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="ambulances" element={<Ambulances />} />
              <Route path="hospitals" element={<Hospitals />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AlertProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;