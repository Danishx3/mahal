'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, house, isAdmin, isApproved, isPending, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!isAdmin) {
        // If resident
        if (!house) {
          router.push('/onboarding');
        } else if (isPending || profile?.status === 'blocked' || profile?.status === 'rejected') {
          router.push('/onboarding/pending');
        }
      }
    }
  }, [user, profile, house, isAdmin, isApproved, isPending, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-xs font-semibold text-slate-500">Loading household profile...</p>
      </div>
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

  return <>{children}</>;
}
