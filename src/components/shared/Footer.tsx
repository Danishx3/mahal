'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Heart,
  Users,
  CreditCard,
  FileText,
  MapPin,
  Mail,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useLanguage } from '@/lib/context/LanguageContext';

export function Footer() {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();
  const { language } = useLanguage();
  const isMl = language === 'ml';

  // Hide footer on internal admin/dashboard workspaces
  const hideOnPaths = ['/admin', '/dashboard'];
  const shouldHide = hideOnPaths.some((p) => pathname.startsWith(p));

  if (shouldHide) return null;

  const currentYear = new Date().getFullYear();

  const primaryDashboardHref = !user
    ? '/auth/login'
    : isAdmin
      ? '/admin'
      : '/dashboard';

  const primaryDashboardLabel = !user
    ? (isMl ? 'ലോഗിൻ ചെയ്യുക' : 'Sign In')
    : isAdmin
      ? (isMl ? 'ഭരണസമിതി പാനൽ' : 'Admin Panel')
      : (isMl ? 'കുടുംബ ഡാഷ്‌ബോർഡ്' : 'Resident Dashboard');

  return (
    <footer className="relative bg-[#070f1e] text-slate-400 overflow-hidden no-print border-t border-slate-800/80">
      {/* Ambient gradient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top accent gradient divider line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-80" />

      <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="py-12 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* Main Column: Brand & Casual "Why this app" description */}
          <div className="lg:col-span-7 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl overflow-hidden shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-200 ring-1 ring-emerald-400/30 bg-white p-0.5 flex-shrink-0">
                <Image
                  src="/logo.jpg"
                  alt="Kunjikkulam Juma Masjid Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
              <div className="leading-snug">
                <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                  {isMl ? 'കുഞ്ഞിക്കുളം മഹല്ല്' : 'Kunjikkulam Mahal'}
                </h3>
                <p className="text-[11px] text-emerald-400/90 font-medium">
                  {isMl ? 'മഹല്ല് പോർട്ടൽ' : 'Mahallu Portal'}
                </p>
              </div>
            </Link>

            {/* Casual "Why this app" card */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{isMl ? 'എന്തിനാണ് ഈ ആപ്പ്?' : 'Why this app?'}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isMl
                  ? 'പഴയതുപോലെ രജിസ്റ്ററുകളിലും രസീത് ബുക്കുകളിലും തപ്പുന്നതിന് പകരം, നമ്മുടെ മഹല്ലിലെ കുടുംബ വിവരങ്ങളും മാസവരി അടവുകളും കൂടുതൽ എളുപ്പത്തിലും സുതാര്യമായും കൈകാര്യം ചെയ്യാനാണ് ഈ ആപ്പ് ഉണ്ടാക്കിയിട്ടുള്ളത്. വീടുകളിൽ ഇരുന്നുതന്നെ മാസവരി നൽകാനും, രസീതുകൾ സൂക്ഷിക്കാനും, കണക്കുകൾ വ്യക്തമായി അറിയാനും ഇത് നമ്മെ സഹായിക്കുന്നു.'
                  : 'Instead of searching through paper registers and receipt books, this portal was built to keep our Mahallu family records, monthly dues, and accounts simple, transparent, and accessible right from home.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <span>{isMl ? 'കുഞ്ഞിക്കുളം, മാരിയാട്' : 'Kunjikkulam, Mariyad'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <a
                  href="mailto:kunjikkulammahal@gmail.com"
                  className="hover:text-emerald-300 transition-colors"
                >
                  kunjikkulammahal@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="lg:col-span-5 lg:pl-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {isMl ? 'പ്രധാന ലിങ്കുകൾ' : 'Quick Links'}
            </h4>
            <ul className="space-y-2.5 text-xs">
              {[
                {
                  label: isMl ? 'കുടുംബ രജിസ്ട്രേഷൻ' : 'Register Household',
                  href: '/onboarding',
                  icon: Users,
                },
                {
                  label: isMl ? 'മാസവരി അടവും രസീതുകളും' : 'Monthly Dues & Receipts',
                  href: user ? '/dashboard/payments' : '/auth/login',
                  icon: CreditCard,
                },
                {
                  label: isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ' : 'Marriage Certificate',
                  href: user ? '/dashboard/marriage-certificate' : '/auth/login',
                  icon: FileText,
                },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-150"
                  >
                    <item.icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors duration-150" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Link
                href={primaryDashboardHref}
                className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all duration-200"
              >
                <span>{primaryDashboardLabel}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
