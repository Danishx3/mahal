'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RefreshCw, Landmark } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { DataService } from '@/lib/data-service';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/lib/context/LanguageContext';

export default function PendingVerificationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, house, isApproved, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const isMl = language === 'ml';
  const [isChecking, setIsChecking] = useState(false);

  const effectiveHouse = house || (user ? DataService.getHouseByUserId(user.id) : null);
  const effectiveIsApproved = isApproved || profile?.status === 'approved' || (effectiveHouse as any)?.profile?.status === 'approved';

  useEffect(() => {
    if (effectiveIsApproved) {
      router.push('/dashboard');
    }
  }, [effectiveIsApproved, router]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      await refreshProfile();
      const updatedHouse = user ? DataService.getHouseByUserId(user.id) : null;
      if (profile?.status === 'approved' || updatedHouse?.profile?.status === 'approved') {
        toast(isMl ? 'അഭിനന്ദനങ്ങൾ! നിങ്ങളുടെ പ്രൊഫൈൽ അംഗീകരിച്ചു.' : 'Congratulations! Your profile has been approved.', 'success');
        router.push('/dashboard');
      } else {
        toast(
          isMl
            ? 'നിങ്ങളുടെ അപേക്ഷ നിലവിൽ മഹല്ല് അഡ്മിന്റെ പരിശോധനയിലാണ്.'
            : 'Your application is currently pending verification by the Mahallu Admin.',
          'info'
        );
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
            {isMl ? 'സ്റ്റാറ്റസ്: വെരിഫിക്കേഷൻ കാത്തിരിക്കുന്നു' : 'Status: Pending Verification'}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isMl ? 'രജിസ്ട്രേഷൻ പരിശോധനയിലാണ്' : 'Registration Under Review'}
          </h1>
        </div>

        {/* Clean Required Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-sm leading-relaxed text-left">
          <p className="font-semibold text-amber-900">
            {isMl
              ? '“നിങ്ങളുടെ കുടുംബ വിവരങ്ങൾ മഹല്ല് അഡ്മിൻ പരിശോധിച്ചുകൊണ്ടിരിക്കുകയാണ്. അംഗീകാരം ലഭിച്ച ഉടൻ പോർട്ടൽ ലഭ്യമാകുന്നതാണ്.”'
              : '“Your profile has been submitted and is currently pending verification by the Mahallu Admin. Access will be unlocked once approved.”'}
          </p>
        </div>

        {/* Helpful Explanation */}
        <div className="text-xs text-slate-500 space-y-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="font-semibold text-slate-700">
            {isMl ? 'അടുത്ത നടപടികൾ എന്തൊക്കെയാണ്?' : 'What happens next?'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>
              {isMl
                ? 'മഹല്ല് സെക്രട്ടറി നിങ്ങളുടെ കുടുംബ വിവരങ്ങളും അംഗങ്ങളുടെ പട്ടികയും പരിശോധിച്ച് ഉറപ്പുവരുത്തും.'
                : 'The Mahallu Secretary will review and verify your house and family member records.'}
            </li>
            <li>
              {isMl
                ? 'അംഗീകാരം ലഭിച്ച ശേഷം മാസവരി അടയ്ക്കാനും രസീതുകൾ ഡൗൺലോഡ് ചെയ്യാനും വിവാഹ സർട്ടിഫിക്കറ്റിന് അപേക്ഷിക്കാനും സാധിക്കും.'
                : 'Once approved, you can access your resident portal to pay monthly dues, track arrears, and download official receipts.'}
            </li>
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
            <span>{isMl ? 'സ്റ്റാറ്റസ് പരിശോധിക്കുക' : 'Check Verification Status'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
