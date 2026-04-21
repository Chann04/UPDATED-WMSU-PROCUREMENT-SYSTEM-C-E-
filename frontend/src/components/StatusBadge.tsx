import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ShoppingCart, 
  Package, 
  PackageCheck,
  CheckSquare,
  LucideIcon
} from 'lucide-react';

interface StatusConfig {
  bg: string;
  text: string;
  icon: LucideIcon;
  label: string;
}

// Pill-shaped badges with low-opacity backgrounds
const statusConfig: Record<string, StatusConfig> = {
  Draft: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    icon: FileText,
    label: 'Draft'
  },
  Pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: Clock,
    label: 'Pending'
  },
  Approved: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: CheckCircle,
    label: 'Approved'
  },
  Rejected: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    icon: XCircle,
    label: 'Rejected'
  },
  ProcurementFailed: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    icon: XCircle,
    label: 'Procurement failed'
  },
  Procuring: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    icon: ShoppingCart,
    label: 'Procuring'
  },
  ProcurementDone: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    icon: PackageCheck,
    label: 'Procurement done'
  },
  Received: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: Package,
    label: 'Received'
  },
  Completed: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: CheckSquare,
    label: 'Completed'
  }
};

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const StatusBadge = ({ status, showIcon = true, size = 'md' }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.Draft;
  const Icon = config.icon;
  
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span 
      className={`inline-flex items-center font-medium rounded-full ${config.bg} ${config.text} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
};

// Status dot for compact displays
export const StatusDot = ({ status }: { status: string }) => {
  const dotColors: Record<string, string> = {
    Draft: 'bg-slate-400',
    Pending: 'bg-amber-500',
    Approved: 'bg-emerald-500',
    Rejected: 'bg-rose-500',
    ProcurementFailed: 'bg-rose-500',
    Procuring: 'bg-indigo-500',
    ProcurementDone: 'bg-teal-500',
    Received: 'bg-blue-500',
    Completed: 'bg-green-500'
  };

  return (
    <span className={`w-2 h-2 rounded-full ${dotColors[status] || dotColors.Draft}`} />
  );
};

export const getStatusColor = (status: string) => {
  return statusConfig[status] || statusConfig.Draft;
};

export default StatusBadge;

