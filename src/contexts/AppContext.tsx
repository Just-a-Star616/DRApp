
import React, { createContext, useContext } from 'react';
import { BrandingConfig, Application, ApplicationStatus } from '../types';
import { User } from 'firebase/auth';

interface AppContextType {
  branding: BrandingConfig;
  statusSteps: { status: ApplicationStatus; title: string; description: string }[];
  application: Application | null;
  isAuthenticated: boolean;
  currentUser: User | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode, value: AppContextType }> = ({ children, value }) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
