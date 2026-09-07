'use client';

import React from 'react';
import { Landmark } from 'lucide-react';

interface LoadingScreenProps {
  title?: string;
  message?: string;
  fullPage?: boolean;
  minHeight?: string;
}

export function LoadingScreen({
  title = "Mahallu Jama'ath",
  message = 'Loading records & synchronizing portal...',
  fullPage = false,
  minHeight = 'min-h-[60vh]',
}: LoadingScreenProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center select-none ${
        fullPage ? 'fixed inset-0 z-50 bg-slate-50/90 backdrop-blur-md min-h-screen' : `flex-1 ${minHeight}`
      }`}
    >
      {/* Central Ambient Glow Backdrop */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Pulsing blurred ambient glow */}
        <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 blur-2xl animate-pulse-glow" />

        {/* Outer Orbit Ring with Gradient Spinner */}
        <div className="relative w-20 h-20 rounded-full flex items-center justify-center">
          <svg className="w-full h-full animate-spin text-emerald-600" viewBox="0 0 100 100">
            <circle
              className="text-slate-200"
              strokeWidth="5"
              stroke="currentColor"
              fill="transparent"
              r="42"
              cx="50"
              cy="50"
            />
            <circle
              className="text-emerald-600"
              strokeWidth="5"
              strokeDasharray="264"
              strokeDashoffset="180"
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="42"
              cx="50"
              cy="50"
            />
          </svg>

          {/* Inner Counter-Pulse Ring */}
          <div className="absolute inset-2 rounded-full border border-emerald-400/40 animate-ping opacity-25" />

          {/* Center Brand Icon Emblem */}
          <div className="absolute inset-3 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Landmark className="h-6 w-6 text-emerald-100" />
          </div>
        </div>
      </div>

      {/* Brand Title & Subtitle */}
      <div className="space-y-1.5 max-w-sm">
        <div className="flex items-center justify-center gap-1.5">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <span className="flex items-center gap-0.5 ml-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-wave-1" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-wave-2" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-wave-3" />
          </span>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          {message}
        </p>
      </div>

      {/* Indeterminate Shimmer Progress Bar */}
      <div className="mt-6 w-44 h-1.5 rounded-full bg-slate-200/80 overflow-hidden relative shadow-inner">
        <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 rounded-full animate-shimmer-slide shadow-sm" />
      </div>

      <span className="mt-3 text-[10px] font-mono tracking-widest uppercase text-emerald-800/60 font-semibold">
        Secure Portal
      </span>
    </div>
  );
}

export function LoadingSpinner({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-slate-200 border-t-emerald-600 animate-spin`}
      />
    </div>
  );
}
