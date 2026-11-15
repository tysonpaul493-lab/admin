import React, { createContext, useContext, useState, useEffect } from 'react';
import { OperationalAlert } from '../types';
import { api } from '../api/client';

interface AlertContextType {
  alerts: OperationalAlert[];
  unreadCount: number;
  refreshAlerts: () => Promise<void>;
  acknowledgeAlert: (id: number) => Promise<void>;
  resolveAlert: (id: number) => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);

  const refreshAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.warn('Failed to fetch alerts', e);
    }
  };

  useEffect(() => {
    refreshAlerts();
  }, []);

  const acknowledgeAlert = async (id: number) => {
    await api.acknowledgeAlert(id);
    await refreshAlerts();
  };

  const resolveAlert = async (id: number) => {
    await api.resolveAlert(id);
    await refreshAlerts();
  };

  const unreadCount = alerts.filter(a => !a.is_acknowledged && !a.is_resolved).length;

  return (
    <AlertContext.Provider value={{ alerts, unreadCount, refreshAlerts, acknowledgeAlert, resolveAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

