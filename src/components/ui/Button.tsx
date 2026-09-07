import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs font-medium rounded-lg',
      md: 'px-4 py-2 text-sm font-medium rounded-lg',
      lg: 'px-5 py-2.5 text-base font-medium rounded-xl',
      icon: 'p-2 rounded-lg',
    };

    const variantClasses = {
      primary:
        'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm hover:shadow active:scale-[0.99] border border-emerald-800',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
      outline:
        'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs',
      destructive:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-rose-700',
      ghost: 'hover:bg-slate-100 text-slate-700',
      success:
        'bg-teal-600 hover:bg-teal-700 text-white shadow-sm border border-teal-700',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
