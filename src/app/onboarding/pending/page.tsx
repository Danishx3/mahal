'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RefreshCw, Landmark } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function PendingVerificationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, isApproved, refreshProfile } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isApproved) {
      router.push('/dashboard');
    }
  }, [isApproved, router]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      await refreshProfile();
      if (profile?.status === 'approved') {
        toast('Congratulations! Your profile has been approved.', 'success');
        router.push('/dashboard');
      } else {
        toast('Your application is currently pending verification by the Mahallu Admin.', 'info');
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-50">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 text-center space-y-6">
        {/* Animated Clock / Pending Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-700 text-white rounded-full p-1.5 shadow-sm">
            <Landmark className="w-4 h-4" />
          </div>
        </div>

        {/* Status Heading */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            Status: Pending Verification
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Registration Under Review
          </h1>
        </div>

        {/* Clean Required Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-sm leading-relaxed text-left">
          <p className="font-semibold text-amber-900">
            &ldquo;Your profile has been submitted and is currently pending verification by the Mahallu Admin. Access will be unlocked once approved.&rdquo;
          </p>
        </div>

        {/* Helpful Explanation */}
        <div className="text-xs text-slate-500 space-y-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="font-semibold text-slate-700">What happens next?</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>The Mahallu Secretary will review and verify your house and family member records.</li>
            <li>Once approved, you can access your resident portal to pay monthly dues, track arrears, and download official receipts.</li>
          </ul>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-center">
          <Button
            variant="outline"
            onClick={handleCheckStatus}
            isLoading={isChecking}
            className="w-full sm:w-auto gap-2 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Check Verification Status
          </Button>
        </div>
      </div>
    </div>
  );
}
