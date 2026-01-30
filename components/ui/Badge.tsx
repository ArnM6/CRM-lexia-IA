
import React from 'react';
import { cn } from '../../lib/utils';
import { Priority, CompanyType } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
}

export const Badge: React.FC<BadgeProps> = ({ children, className, variant = 'default' }) => {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
  };

  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)}>
      {children}
    </div>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const colors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-orange-100 text-orange-700 border-orange-200",
    low: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", colors[priority])}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

export const TypeBadge: React.FC<{ type: CompanyType }> = ({ type }) => {
  const colors = {
    'PME': "bg-blue-100 text-blue-700 border-blue-200",
    'GE/ETI': "bg-purple-100 text-purple-700 border-purple-200",
    'Public Services': "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", colors[type] || colors['PME'])}>
      {type}
    </span>
  );
};

export const UrgencyBadge: React.FC<{ lastContactDate: string }> = ({ lastContactDate }) => {
  const date = new Date(lastContactDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let label = "À jour";
  let colorClass = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";

  if (diffDays > 30) {
    label = "Critique (+30j)";
    colorClass = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  } else if (diffDays > 14) {
    label = "Retard (+14j)";
    colorClass = "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
  }

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", colorClass)}>
      {label}
    </span>
  );
};
