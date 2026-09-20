'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { DataService } from '@/lib/data-service';
import { Lock, Home, CreditCard, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, house, isAdmin, isApproved, isPending, isLoading } = useAuth();
  const [pendingDuesCount, setPendingDuesCount] = useState(0);

  // Compute effective house and approval state across both Supabase and local storage
  const effectiveHouse = house || (user ? DataService.getHouseByUserId(user.id) : null);
  const effectiveStatus = (effectiveHouse as any)?.profile?.status || profile?.status;
  const effectiveIsApproved = isApproved || effectiveStatus === 'approved';
  const effectiveIsPending = !effectiveIsApproved && (isPending || effectiveStatus === 'pending_verification');

  const checkPendingDues = () => {
    const targetHouse = effectiveHouse;
    if (targetHouse && 'payment_dues' in targetHouse && Array.isArray((targetHouse as any).payment_dues)) {
      const dues = (targetHouse as any).payment_dues as any[];
      const count = dues.filter(
        (d: any) => d.status === 'pending' || d.status === 'under_review'
      ).length;
      setPendingDuesCount(count);
    }
  };

  useEffect(() => {
    checkPendingDues();
    window.addEventListener('mahallu_data_updated', checkPendingDues);
    return () => window.removeEventListener('mahallu_data_updated', checkPendingDues);
  }, [effectiveHouse]);

  // Auth & Onboarding guard: do NOT include pathname so tab switching between /dashboard and /dashboard/payments is completely seamless
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!isAdmin) {
        // If resident
        if (!effectiveHouse) {
          router.push('/onboarding');
        } else if (effectiveStatus === 'blocked' || effectiveStatus === 'rejected') {
          router.push('/onboarding/pending');
        } else if (effectiveIsPending) {
          router.push('/onboarding/pending');
        }
      }
    }
  }, [user, isAdmin, effectiveHouse, effectiveIsApproved, effectiveIsPending, effectiveStatus, isLoading, router]);

  if (isLoading) {
    return (
      <LoadingScreen
        title="Resident Portal"
        message="Loading household dwelling & dues records..."
        minHeight="min-h-[70vh]"
      />
    );
  }

  if (!user) {
    return (
      <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Sign In Required</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            Please sign in to access your household dues, receipts, and census records.
          </p>
        </div>
        <Button onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`)}>
          Proceed to Sign In
        </Button>
      </div>
    );
  }

  const residentNav = [
    { label: 'Household Overview', shortLabel: 'Overview', href: '/dashboard', icon: Home },
    {
      label: 'Monthly Dues & Payments',
      shortLabel: 'Dues & Pay',
      href: '/dashboard/payments',
      icon: CreditCard,
      badge: pendingDuesCount > 0 ? pendingDuesCount : undefined,
    },
    {
      label: 'Marriage Certificate',
      shortLabel: 'Marriage Cert',
      href: '/dashboard/marriage-certificate',
      icon: FileCheck,
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Subheader Navigation Bar for Resident Dashboard */}
      {(effectiveIsApproved || isAdmin) && (
        <>
          {/* Desktop / Tablet Subheader */}
          <div className="hidden sm:block bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 no-print">
            <div className="max-w-7xl mx-auto flex items-center justify-between min-w-max gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider pr-3 border-r border-slate-200">
                  <Home className="h-4 w-4 text-emerald-700" />
                  Resident Portal
                </div>

                {residentNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {item.label}
                      {item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isActive ? 'bg-white text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.badge} Due
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {effectiveHouse && (
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                  <span>
                    Household: <strong className="text-slate-800">{effectiveHouse.house_name}</strong>
                  </span>
                  <span>•</span>
                  <span className="font-mono text-emerald-800 font-semibold">{effectiveHouse.mahallu_reg_no}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Sleek Top Subheader */}
          <div className="sm:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2 flex items-center justify-between no-print">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Home className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {effectiveHouse?.house_name || 'Resident Portal'}
                </p>
                {effectiveHouse?.mahallu_reg_no && (
                  <p className="text-[10px] font-mono text-emerald-700 font-medium leading-none">
                    ID: {effectiveHouse.mahallu_reg_no}
                  </p>
                )}
              </div>
            </div>

            {pendingDuesCount > 0 ? (
              <Link
                href="/dashboard/payments"
                className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full shrink-0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {pendingDuesCount} Due
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            )}
          </div>
        </>
      )}

      {/* Main Content with Mobile Bottom Padding to clear bottom navigation dock */}
      <div className="flex-1 pb-24 sm:pb-8">{children}</div>

      {/* Mobile Sticky Floating Round Bottom Navigation Dock */}
      {(effectiveIsApproved || isAdmin) && (
        <div className="sm:hidden fixed bottom-3 inset-x-3 z-40 pointer-events-none no-print">
          <nav
            aria-label="Mobile Resident Navigation"
            className="pointer-events-auto max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.14)] rounded-full px-3 py-1.5 flex items-center justify-around"
          >
            {residentNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-full transition-all min-h-[46px] ${
                    isActive
                      ? 'text-emerald-800 font-bold'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`p-1.5 rounded-full transition-all ${
                        isActive ? 'bg-emerald-700 text-white shadow-xs shadow-emerald-700/30 scale-105' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    {item.badge !== undefined && (
                      <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5 font-medium tracking-tight leading-none truncate max-w-[70px]">
                    {item.shortLabel}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

