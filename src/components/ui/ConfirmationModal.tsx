'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'destructive' | 'success' | 'warning';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  children,
}: ConfirmationModalProps) {
  const iconMap = {
    destructive: (
      <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
        <ShieldAlert className="h-5 w-5" />
      </div>
    ),
    warning: (
      <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
        <AlertTriangle className="h-5 w-5" />
      </div>
    ),
    success: (
      <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
        <CheckCircle2 className="h-5 w-5" />
      </div>
    ),
    primary: (
      <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
        <CheckCircle2 className="h-5 w-5" />
      </div>
    ),
  };

  const buttonVariantMap = {
    destructive: 'destructive' as const,
    warning: 'primary' as const,
    success: 'primary' as const,
    primary: 'primary' as const,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title=""
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Header with Icon */}
        <div className="flex items-start gap-3.5">
          {iconMap[variant]}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
            {description && (
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{description}</p>
            )}
          </div>
        </div>

        {/* Custom Details Body (if any) */}
        {children && <div className="pt-1">{children}</div>}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="min-h-[38px] px-4 text-xs font-semibold"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={buttonVariantMap[variant]}
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
            className={cn(
              'min-h-[38px] px-4 text-xs font-bold shadow-xs',
              variant === 'destructive' && 'bg-rose-600 hover:bg-rose-700 border-rose-700',
              (variant === 'success' || variant === 'primary') && 'bg-emerald-700 hover:bg-emerald-800'
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
