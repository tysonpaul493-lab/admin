import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';

export const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-5 bg-slate-50">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
