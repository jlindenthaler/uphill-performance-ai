import React from 'react';
import { NewDashboard } from './NewDashboard';

interface DashboardProps {
  onNavigate: (section: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return <NewDashboard onNavigate={onNavigate} />;
};