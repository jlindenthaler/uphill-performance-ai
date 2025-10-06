import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, AlertTriangle } from "lucide-react";

interface PMCStatusBadgeProps {
  fi: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PMCStatusBadge: React.FC<PMCStatusBadgeProps> = ({ 
  fi, 
  size = 'md',
  showIcon = true 
}) => {
  const getStatus = () => {
    if (fi > 25) return { label: 'Very Fresh', color: 'bg-green-500', icon: Activity };
    if (fi > 5) return { label: 'Fresh', color: 'bg-green-400', icon: Activity };
    if (fi >= -10) return { label: 'Optimal', color: 'bg-blue-500', icon: Zap };
    if (fi >= -30) return { label: 'Fatigued', color: 'bg-orange-500', icon: AlertTriangle };
    return { label: 'Very Fatigued', color: 'bg-red-500', icon: AlertTriangle };
  };

  const status = getStatus();
  const Icon = status.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <Badge 
      className={`${status.color} text-white ${sizeClasses[size]} flex items-center gap-1.5`}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{status.label}</span>
    </Badge>
  );
};
