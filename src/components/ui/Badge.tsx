import React from 'react';
import { cn } from '@/lib/utils';
import { ProfileStatus, PaymentStatus, TransactionType } from '@/lib/supabase/types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?:
    | ProfileStatus
    | PaymentStatus
    | TransactionType
    | 'default'
    | 'secondary'
    | 'outline'
    | 'success'
    | 'warning'
    | 'danger';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  children,
  variant = 'default',
  className,
  size = 'md',
}: BadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'approved':
      case 'verified':
      case 'credit':
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';

      case 'pending':
      case 'pending_verification':
      case 'under_review':
      case 'warning':
        return 'bg-amber-50 text-amber-700 border border-amber-200';

      case 'rejected':
      case 'failed':
      case 'blocked':
      case 'debit':
      case 'danger':
        return 'bg-rose-50 text-rose-700 border border-rose-200';

      case 'secondary':
        return 'bg-slate-100 text-slate-700 border border-slate-200';

      case 'outline':
        return 'bg-transparent text-slate-700 border border-slate-300';

      default:
        return 'bg-emerald-700 text-white';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full capitalize transition-colors',
        sizeClasses[size],
        getVariantStyles(),
        className
      )}
    >
      {variant === 'verified' || variant === 'approved' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      ) : variant === 'pending' || variant === 'pending_verification' || variant === 'under_review' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      ) : variant === 'failed' || variant === 'blocked' || variant === 'rejected' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      ) : null}
      {children || variant.replace('_', ' ')}
    </span>
  );
}
