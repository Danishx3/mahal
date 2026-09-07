'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Landmark,
  ShieldCheck,
  CreditCard,
  Users,
  Home,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  MapPin,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataService } from '@/lib/data-service';
import { DIVISION_LABELS, Division } from '@/lib/supabase/types';
import { divisions } from '@/lib/schemas';
import { useAuth } from '@/lib/context/AuthContext';

export default function LandingPage() {
  const { user, isAdmin, isApproved } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    setStats(DataService.getSystemStats());
    const handleUpdate = () => setStats(DataService.getSystemStats());
    window.addEventListener('mahallu_data_updated', handleUpdate);
    return () => window.removeEventListener('mahallu_data_updated', handleUpdate);
  }, []);

  const totalHouses = stats?.totalHouses ?? 0;
  const totalPopulation = stats?.totalPopulation ?? 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        {/* Subtle decorative glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Digital Governance for Al-Huda Mahallu Jama&apos;ath</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Empowering Households With Unified Mahallu Administration
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A secure full-stack portal combining household census registries, monthly membership dues tracking, UPI transaction reconciliation, and double-entry financial ledger accounting.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href={!user ? '/auth/login' : isAdmin ? '/admin' : isApproved ? '/dashboard' : '/onboarding/pending'}>
              <Button
                variant="primary"
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border-none shadow-xl gap-2 px-6 cursor-pointer"
              >
                <Home className="h-5 w-5" />
                {!user ? 'Access Resident Portal' : isAdmin ? 'Admin Console' : 'My Household Dashboard'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/onboarding">
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md font-semibold gap-2 px-6 cursor-pointer"
              >
                <Users className="h-5 w-5 text-emerald-400" />
                Register New Household
              </Button>
            </Link>
          </div>

          {/* Key Metrics Counter Strip */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-xs text-emerald-400 block font-medium">Registered Houses</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{totalHouses}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Across 6 divisions</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-xs text-emerald-400 block font-medium">Census Population</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{totalPopulation}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Recorded residents</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-xs text-emerald-400 block font-medium">Monthly Due</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">₹100</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Per household/mo</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-xs text-emerald-400 block font-medium">Data Security</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">100% RLS</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">PostgreSQL isolation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Split Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Role-Based Architecture
            </h2>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              Two Integrated Experiences, One Unified Platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Resident Card */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-8 flex flex-col justify-between space-y-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center">
                  <Home className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Resident Self-Service Portal</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Allows house owners to complete structured multi-step onboarding, register all family members, track monthly ₹100 dues, submit UPI references, and print official receipts.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Multi-step house and dynamic family member census form
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Pending verification security guard screen
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Instant UPI UTR submission against active billing cycles
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Official electronic print & download receipts with digital seal
                  </li>
                </ul>
              </div>

              <Link href="/dashboard" className="w-full">
                <Button variant="outline" className="w-full justify-between">
                  <span>Enter Resident Portal</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Admin Card */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-8 flex flex-col justify-between space-y-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Mahallu Administration Suite</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Equips the President, Secretary, and Committee with complete oversight across 250+ houses, payment verification queues, defaulter alerts, and transparent ledger accounting.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Household profile verification queue with complete census audit
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Real-time payment verification queue with 1-click copy UTR
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Automatic credit posting to financial ledger upon verification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Defaulters tracking with batch reminder transmission & CSV export
                  </li>
                </ul>
              </div>

              <Link href="/admin" className="w-full">
                <Button variant="primary" className="w-full justify-between bg-slate-900 hover:bg-slate-800">
                  <span>Enter Admin Suite</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Six Divisions Explorer */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Geographical Organization
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">
              6 Local Administrative Divisions
            </p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Every house belongs to a designated division for organized representation and local welfare.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {divisions.map((div) => {
              const divStats = stats?.divisionBreakdown?.[div];
              const houseCount = divStats?.houses ?? 0;
              const popCount = divStats?.population ?? 0;
              return (
                <div
                  key={div}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-700" />
                      <span className="font-bold text-sm text-slate-900">
                        {DIVISION_LABELS[div as Division]}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold font-mono">
                      {houseCount} Houses
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>Census Count:</span>
                    <span className="font-bold text-slate-800">{popCount} Residents</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-200">Al-Huda Mahallu Jama&apos;ath Federation</p>
              <p className="text-[11px] text-slate-500">
                Village Governance & Electronic Ledger System • Built with Next.js & Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/auth/login" className="hover:text-white transition-colors">
              Access Portal
            </Link>
            <span>•</span>
            <Link href="/onboarding" className="hover:text-white transition-colors">
              Register House
            </Link>
            <span>•</span>
            <span className="text-emerald-500 font-medium">PostgreSQL RLS Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
