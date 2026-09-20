'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserCheck,
  Users,
  CreditCard,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  LayoutDashboard,
  Loader2,
  Lock,
  FileCheck,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useLanguage } from '@/lib/context/LanguageContext';
import { DataService } from '@/lib/data-service';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isAdmin, isLoading } = useAuth();
  const { language } = useLanguage();
  const isMl = language === 'ml';
  const [pendingCount, setPendingCount] = useState(0);
  const [paymentsReviewCount, setPaymentsReviewCount] = useState(0);
  const [pendingCertificatesCount, setPendingCertificatesCount] = useState(0);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Close more menu on navigation
  useEffect(() => {
    setMoreMenuOpen(false);
  }, [pathname]);

  const loadCounts = async () => {
    try {
      const [pendingProfiles, pendingPayments, pendingUpdates, pendingCerts] = await Promise.all([
        DataService.getPendingProfilesAsync(),
        DataService.getPaymentsUnderReviewAsync(),
        DataService.getPendingProfileUpdatesAsync(),
        DataService.getMarriageCertificatesAsync(undefined, 'pending'),
      ]);
      setPendingCount(pendingProfiles.length + pendingUpdates.length);
      setPaymentsReviewCount(pendingPayments.length);
      setPendingCertificatesCount(pendingCerts.length);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadCounts();
    const interval = setInterval(() => {
      loadCounts();
    }, 3000);

    const handleLocalUpdate = () => {
      loadCounts();
    };

    window.addEventListener('mahallu_data_updated', handleLocalUpdate);
    window.addEventListener('mahallu_marriage_certs_updated', handleLocalUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mahallu_data_updated', handleLocalUpdate);
      window.removeEventListener('mahallu_marriage_certs_updated', handleLocalUpdate);
    };
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
        title={isMl ? 'മഹല്ല് അഡ്മിനിസ്ട്രേഷൻ' : 'Mahallu Administration'}
        message={isMl ? 'അഡ്മിൻ വിവരങ്ങൾ പരിശോധിക്കുന്നു...' : 'Verifying administrative credentials & loading console...'}
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
          <h2 className="text-xl font-bold text-slate-900">
            {isMl ? 'പ്രവേശനം നിയന്ത്രിച്ചിരിക്കുന്നു' : 'Access Restricted'}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm">
            {isMl
              ? 'മഹല്ല് അഡ്മിൻ പാനലിൽ പ്രവേശിക്കുന്നതിനുള്ള അനുമതി നിങ്ങളുടെ അക്കൗണ്ടിനില്ല.'
              : 'You do not possess the required administrator credentials to access the Mahallu administrative suite.'}
          </p>
        </div>
        <Button onClick={() => router.push(user ? '/dashboard' : '/auth/login')} variant="primary">
          {user
            ? (isMl ? 'റസിഡന്റ് പോർട്ടലിലേക്ക് മടങ്ങുക' : 'Return to Resident Portal')
            : (isMl ? 'അഡ്മിനായി പ്രവേശിക്കുക' : 'Sign In as Admin')}
        </Button>
      </div>
    );
  }

  // 4 primary daily operational tabs for mobile bottom dock
  const primaryMobileNav = [
    { label: isMl ? 'അവലോകനം' : 'Overview', href: '/admin', icon: LayoutDashboard },
    {
      label: isMl ? 'വെരിഫിക്കേഷൻ' : 'Verify',
      href: '/admin/verification',
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: isMl ? 'പേയ്‌മെന്റുകൾ' : 'Payments',
      href: '/admin/payments',
      icon: CreditCard,
      badge: paymentsReviewCount > 0 ? paymentsReviewCount : undefined,
    },
    {
      label: isMl ? 'സർട്ടിഫിക്കറ്റുകൾ' : 'Certs',
      href: '/admin/marriage-certificates',
      icon: FileCheck,
      badge: pendingCertificatesCount > 0 ? pendingCertificatesCount : undefined,
    },
  ];

  // Secondary modules housed in the "More" drawer
  const moreModules = [
    {
      label: isMl ? 'വീടുകളുടെ രജിസ്ട്രിയും സെൻസസും' : 'Houses Directory & Census',
      description: isMl ? 'കുടുംബാംഗങ്ങളുടെ വിവരങ്ങളും ഡിവിഷൻ സെൻസസും' : 'Household registry, family strength & division demographics',
      href: '/admin/houses',
      icon: Users,
    },
    {
      label: isMl ? 'വരിസംഖ്യ കുടിശ്ശിക ട്രാക്കർ' : 'Dues Defaulters Tracker',
      description: isMl ? 'അടയ്ക്കാത്ത മാസങ്ങൾ, വാട്ട്സ്ആപ്പ് ഓർമ്മപ്പെടുത്തലുകൾ' : 'Track unpaid months, send WhatsApp reminders & record payments',
      href: '/admin/defaulters',
      icon: AlertTriangle,
    },
    {
      label: isMl ? 'വരവ്-ചിലവ് ലെഡ്ജറും ഓഡിറ്റും' : 'Financial Ledger & Audit',
      description: isMl ? 'വരവുകൾ, ചിലവുകൾ, കാഷ് ഓഡിറ്റ്, സിഎസ്വി എക്സ്പോർട്ട്' : 'Credits, debits, cash reconciliation & CSV ledger export',
      href: '/admin/ledger',
      icon: FileSpreadsheet,
    },
  ];

  const isMoreActive = ['/admin/houses', '/admin/defaulters', '/admin/ledger'].includes(pathname);

  return (
    <div className="flex-1 flex flex-col bg-slate-100/70 min-h-screen">
      {/* Main Admin Page Content with Mobile Bottom Safe-Padding */}
      <div className="flex-1 pb-24 sm:pb-8">{children}</div>

      {/* Mobile Sticky Bottom Navigation Dock */}
      <nav
        aria-label="Mobile Admin Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.07)] px-2 py-1 flex items-center justify-around no-print"
      >
        {primaryMobileNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all min-h-[48px] ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? 'bg-emerald-50 text-emerald-700 scale-105' : 'text-slate-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-none">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 w-4 h-0.5 rounded-full bg-emerald-600" />
              )}
            </Link>
          );
        })}

        {/* More Button */}
        <button
          type="button"
          onClick={() => setMoreMenuOpen(!moreMenuOpen)}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all min-h-[48px] cursor-pointer ${
            isMoreActive || moreMenuOpen
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              isMoreActive || moreMenuOpen ? 'bg-emerald-50 text-emerald-700 scale-105' : 'text-slate-400'
            }`}
          >
            {moreMenuOpen ? (
              <X className="h-5 w-5 text-slate-700" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">
            {isMl ? 'മറ്റു സേവനങ്ങൾ' : 'More'}
          </span>
          {isMoreActive && (
            <span className="absolute bottom-0.5 w-4 h-0.5 rounded-full bg-emerald-600" />
          )}
        </button>
      </nav>

      {/* Slide-Up "More Modules" Sheet for Mobile */}
      {moreMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMoreMenuOpen(false)}
          />

          {/* Sheet Body */}
          <div className="relative bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isMl ? 'മഹല്ല് അഡ്മിൻ മോഡ്യൂളുകൾ' : 'Mahallu Admin Modules'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMoreMenuOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {moreModules.map((mod) => {
                const Icon = mod.icon;
                const isActive = pathname === mod.href;
                return (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    onClick={() => setMoreMenuOpen(false)}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs font-bold ${
                          isActive ? 'text-emerald-900' : 'text-slate-900'
                        }`}
                      >
                        {mod.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        {mod.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

