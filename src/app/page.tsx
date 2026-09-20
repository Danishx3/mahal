'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  CreditCard,
  Users,
  Home,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  MapPin,
  Lock,
  Bell,
  BarChart3,
  Globe,
} from 'lucide-react';
import { DataService } from '@/lib/data-service';
import { DIVISION_LABELS, DIVISION_LABELS_ML, Division } from '@/lib/supabase/types';
import { divisions } from '@/lib/schemas';
import { useAuth } from '@/lib/context/AuthContext';
import { useLanguage } from '@/lib/context/LanguageContext';


/* ───── Scroll-reveal Hook ───── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

export default function LandingPage() {
  const { user, house, isAdmin, isApproved, isPending } = useAuth();
  const { language } = useLanguage();
  const isMl = language === 'ml';
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    // Fast initial set from memory/cache
    const initialStats = DataService.getSystemStats();
    if (initialStats) {
      setStats(initialStats);
    }

    // Always fetch fresh from Supabase
    const loadFreshStats = async () => {
      try {
        const fresh = await DataService.getSystemStatsAsync();
        if (isMounted && fresh) {
          setStats(fresh);
        }
      } catch (err) {
        console.warn('Failed to load fresh landing page stats:', err);
      }
    };

    loadFreshStats();

    const handleUpdate = () => {
      loadFreshStats();
    };

    window.addEventListener('mahallu_data_updated', handleUpdate);
    const interval = setInterval(loadFreshStats, 4000);

    return () => {
      isMounted = false;
      window.removeEventListener('mahallu_data_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const primaryHref = !user
    ? '/auth/login'
    : isAdmin
      ? '/admin'
      : isApproved
        ? '/dashboard'
        : isPending && house
          ? '/onboarding/pending'
          : '/onboarding';

  const primaryLabel = !user
    ? (isMl ? 'റെസിഡന്റ് പോർട്ടൽ പ്രവേശിക്കുക' : 'Access Resident Portal')
    : isAdmin
      ? (isMl ? 'അഡ്മിൻ കൺസോൾ' : 'Admin Console')
      : isApproved
        ? (isMl ? 'എന്റെ കുടുംബ ഡാഷ്‌ബോർഡ്' : 'My Household Dashboard')
        : isPending
          ? (isMl ? 'അംഗീകാര സ്റ്റാറ്റസ്' : 'Verification Status')
          : (isMl ? 'കുടുംബ രജിസ്ട്രേഷൻ' : 'Register Household');

  const divisionsReveal = useReveal();

  return (
    <div className="flex-1 flex flex-col overflow-x-hidden">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-[#0a1628] text-white min-h-[92vh] flex items-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-[#0a1628] to-slate-950" />
          {/* Floating orbs */}
          <div className="absolute top-20 left-[15%] w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-32 right-[10%] w-96 h-96 bg-teal-400/8 rounded-full blur-[120px] animate-[float_10s_ease-in-out_infinite_reverse]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px]" />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 py-24 sm:py-32 w-full text-center">
          <div className="space-y-8 flex flex-col items-center">

            {/* Header Icon Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-md shadow-xl shadow-emerald-950/30">
              <div className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-emerald-400/40 bg-white p-0.5 shrink-0 shadow-md">
                <Image
                  src="/logo.jpg"
                  alt="Kunjikkulam Juma Masjid Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-[10px]"
                  priority
                />
              </div>
              <div className="text-left leading-tight">
                <span className="text-xs font-bold text-white tracking-tight block">
                  {isMl ? 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്' : 'Kunjikkulam Juma Masjid'}
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase block">
                  {isMl ? 'ഔദ്യോഗിക മഹല്ല് പോർട്ടൽ' : 'Official Mahallu Portal'}
                </span>
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
              {isMl ? (
                <>
                  <span className="text-white">ഏകോപിത മഹല്ല്</span>{' '}
                  <span className="text-emerald-400 block sm:inline font-black drop-shadow-sm">
                    അഡ്മിനിസ്ട്രേഷൻ
                  </span>
                </>
              ) : (
                <>
                  <span className="text-white">Unified Mahallu</span>{' '}
                  <span className="text-emerald-400 block sm:inline font-black drop-shadow-sm">
                    Administration
                  </span>
                </>
              )}
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed">
              {isMl
                ? 'കുടുംബ രജിസ്ട്രേഷൻ, മാസവരി ട്രാക്കിംഗ്, UPI പേയ്‌മെന്റുകൾ, ഡിജിറ്റൽ വരവ്-ചിലവ് കണക്കുകൾ എന്നിവ ഏകോപിപ്പിക്കുന്ന ആധുനിക മഹല്ല് പോർട്ടൽ.'
                : 'A comprehensive portal for household registration, membership dues tracking, UPI payment reconciliation, and double-entry financial management — built for modern village governance.'}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link href={primaryHref}>
                <button className="group relative inline-flex items-center justify-center gap-3 px-9 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-base shadow-2xl shadow-white/25 border-2 border-white transition-all duration-300 hover:-translate-y-1 hover:shadow-white/40 active:scale-95 cursor-pointer">
                  <span className="tracking-wide text-slate-950 font-black">{primaryLabel}</span>
                  <ArrowRight className="h-5 w-5 text-emerald-600 transition-transform group-hover:translate-x-1.5 stroke-[2.5]" />
                </button>
              </Link>

              {!user && (
                <Link href="/onboarding">
                  <button className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white font-bold text-base backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-lg shadow-black/20">
                    <Users className="h-5 w-5 text-emerald-300" />
                    <span>{isMl ? 'കുടുംബ രജിസ്ട്രേഷൻ' : 'Register Household'}</span>
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom wave divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 80"
            className="w-full h-auto"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z"
              fill="#f8fafc"
            />
          </svg>
        </div>
      </section>

      {/* ═══════════ DIVISIONS ═══════════ */}
      <section className="py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div
          ref={divisionsReveal.ref}
          className={`max-w-7xl mx-auto transition-all duration-700 ${divisionsReveal.visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
            }`}
        >
          {/* Section header */}
          <div className="text-center mb-14 space-y-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest border border-emerald-100">
              <MapPin className="h-3 w-3" />
              {isMl ? 'ഭൂമിശാസ്ത്രപരമായ വിഭജനം' : 'Geographical Organization'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              {isMl ? '6 അഡ്മിനിസ്ട്രേറ്റീവ് ഡിവിഷനുകൾ' : '6 Administrative Divisions'}
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              {isMl
                ? 'കാര്യക്ഷമമായ പ്രാദേശിക പ്രവർത്തനങ്ങൾക്കായി മഹല്ല് പരിധി 6 ഡിവിഷനുകളായി തിരിച്ചിരിക്കുന്നു.'
                : 'Every household is organized under a geographical division for efficient local representation and welfare management.'}
            </p>
          </div>

          {/* Division cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {divisions.map((div, i) => {
              const divStats = stats?.divisionBreakdown?.[div];
              const houseCount = divStats?.houses ?? 0;
              const popCount = divStats?.population ?? 0;
              const maxHouses = Math.max(
                ...Object.values(stats?.divisionBreakdown ?? {}).map(
                  (d: any) => d?.houses ?? 0
                ),
                1
              );
              const barPercent = Math.round((houseCount / maxHouses) * 100);

              const divLabel = isMl
                ? (DIVISION_LABELS_ML[div as Division] || div)
                : (DIVISION_LABELS[div as Division] || div);

              return (
                <div
                  key={div}
                  className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 hover:-translate-y-0.5"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-600 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-200">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">
                          {divLabel}
                        </h3>
                        <p className="text-[11px] text-slate-400">{isMl ? 'ഡിവിഷൻ' : 'Division'}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                      {houseCount}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000 ease-out"
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom stats */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{isMl ? 'ജനസംഖ്യ' : 'Population'}</span>
                    <span className="font-bold text-slate-700 tabular-nums">
                      {isMl ? `${popCount} അംഗങ്ങൾ` : `${popCount} residents`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA BANNER ═══════════ */}
      <section className="relative overflow-hidden bg-emerald-700 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />

        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            {isMl ? 'ഡിജിറ്റൽ മഹല്ലിലേക്ക് സ്വാഗതം' : 'Ready to Join the Digital Mahallu?'}
          </h2>
          <p className="text-emerald-100 text-base sm:text-lg max-w-2xl mx-auto">
            {isMl
              ? 'നിങ്ങളുടെ കുടുംബം ഇന്ന് തന്നെ രജിസ്റ്റർ ചെയ്യുക. ലളിതമായ മാസവരി അടവുകളും സുതാര്യമായ മഹല്ല് സേവനങ്ങളും നേടുക.'
              : 'Register your household today and experience seamless dues management, transparent financial records, and smart community governance.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href={primaryHref}>
              <button className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-white text-emerald-700 font-bold text-sm shadow-xl shadow-emerald-900/20 hover:shadow-emerald-900/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            {!user && (
              <Link href="/onboarding">
                <button className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 backdrop-blur-sm transition-all duration-300 cursor-pointer">
                  {isMl ? 'പുതിയ കുടുംബ രജിസ്ട്രേഷൻ' : 'Register New Household'}
                </button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ INLINE STYLES FOR ANIMATIONS ═══════════ */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
