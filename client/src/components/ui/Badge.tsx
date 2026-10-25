import React from 'react';
import { clsx } from 'clsx';
import type { ComplaintStatus, ComplaintPriority, ComplaintCategory } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'status' | 'priority' | 'category';
  value?: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 border border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'in-progress': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border border-green-200',
  closed: 'bg-gray-100 text-gray-800 border border-gray-200',
  escalated: 'bg-red-100 text-red-800 border border-red-200 animate-pulse',
};

const priorityColors: Record<ComplaintPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const categoryColors: Record<ComplaintCategory, string> = {
  academic: 'bg-purple-100 text-purple-700',
  infrastructure: 'bg-amber-100 text-amber-700',
  administrative: 'bg-indigo-100 text-indigo-700',
  hostel: 'bg-teal-100 text-teal-700',
  financial: 'bg-emerald-100 text-emerald-700',
  other: 'bg-slate-100 text-slate-700',
};

export default function Badge({ children, variant = 'default', value, className }: BadgeProps) {
  let colorClass = 'bg-gray-100 text-gray-700';

  if (variant === 'status' && value) {
    colorClass = statusColors[value as ComplaintStatus] || colorClass;
  } else if (variant === 'priority' && value) {
    colorClass = priorityColors[value as ComplaintPriority] || colorClass;
  } else if (variant === 'category' && value) {
    colorClass = categoryColors[value as ComplaintCategory] || colorClass;
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        colorClass,
        className
      )}
    >
      {children}
    </span>
  );
}
