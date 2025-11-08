import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ServiceStatusCardProps {
  title: string;
  status: 'active' | 'inactive' | 'pending' | 'warning';
  icon: ReactNode;
  mainValue: string;
  mainValueUnit?: string;
  subValue?: string;
  onClick?: () => void;
}

export default function ServiceStatusCard({
  title,
  status,
  icon,
  mainValue,
  mainValueUnit,
  subValue,
  onClick,
}: ServiceStatusCardProps) {
  const statusDot = {
    active: 'bg-green-500',
    inactive: 'bg-red-500',
    pending: 'bg-blue-500',
    warning: 'bg-yellow-500',
  };

  const statusText = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    warning: 'Warning',
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-lg border border-neutral-200 shadow-sm p-4",
        onClick && "cursor-pointer hover:border-primary-300 transition-colors"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <div className="mt-1 flex items-center">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot[status]} mr-2`}></span>
            <span className="font-semibold text-neutral-800">{statusText[status]}</span>
          </div>
        </div>
        <div className="text-primary-600">{icon}</div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-neutral-800">
          {mainValue}
          {mainValueUnit && <span className="text-base font-medium text-neutral-500">{mainValueUnit}</span>}
        </div>
        {subValue && <p className="text-xs text-neutral-500">{subValue}</p>}
      </div>
    </div>
  );
}
