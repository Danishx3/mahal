'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Landmark,
  UserCheck,
  Users,
  CreditCard,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  LayoutDashboard,
  Loader2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { DataService } from '@/lib/data-service';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isAdmin, isLoading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [paymentsReviewCount, setPaymentsReviewCount] = useState(0);

  const loadCounts = () => {
    const pendingProfiles = DataService.getPendingProfiles();
    setPendingCount(pendingProfiles.length);

    const pendingPayments = DataService.getPaymentsUnderReview();
    setPaymentsReviewCount(pendingPayments.length);
  };

  useEffect(() => {
    loadCounts();
    window.addEventListener('mahallu_data_updated', loadCounts);
    return () => window.removeEventListener('mahallu_data_updated', loadCounts);
  }, []);

  // Role-Based Access Enforcement
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <LoadingScreen
        title="Mahallu Administration"
        message="Verifying administrative credentials & loading console..."
        minHeight="min-h-[70vh]"
      />
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            You do not possess the required administrator credentials to access the Mahallu administrative suite.
          </p>
        </div>
        <Button onClick={() => router.push(user ? '/dashboard' : '/auth/login')} variant="primary">
          {user ? 'Return to Resident Portal' : 'Sign In as Admin'}
        </Button>
      </div>
    );
  }

  const adminNav = [
    { label: 'Executive Overview', href: '/admin', icon: LayoutDashboard },
    {
      label: 'Profile Verification',
      href: '/admin/verification',
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { label: 'Houses Directory', href: '/admin/houses', icon: Users },
    {
      label: 'Payment Review',
      href: '/admin/payments',
      icon: CreditCard,
      badge: paymentsReviewCount > 0 ? paymentsReviewCount : undefined,
    },
    { label: 'Dues Defaulters', href: '/admin/defaulters', icon: AlertTriangle },
    { label: 'Financial Ledger', href: '/admin/ledger', icon: FileSpreadsheet },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-100/70 min-h-screen">
      {/* Subheader Navigation Bar for Admin Suite */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 overflow-x-auto no-print">
        <div className="max-w-7xl mx-auto flex items-center gap-2 min-w-max">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider pr-2 border-r border-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            Admin Suite
          </div>

          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
