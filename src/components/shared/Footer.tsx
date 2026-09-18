'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Landmark,
  Lock,
  Heart,
  Home,
  CreditCard,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

export function Footer() {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();

  // Hide footer on internal admin/dashboard workspaces to preserve application screen real estate
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
    ? 'Access Portal'
    : isAdmin
      ? 'Admin Console'
      : 'Resident Dashboard';

  return (
    <footer className="relative bg-[#070f1e] text-slate-400 overflow-hidden no-print border-t border-slate-800/80">
      {/* Ambient gradient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top accent gradient divider line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-80" />

      <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        {/* Main 4-column footer body */}
        <div className="py-14 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: Brand & Identity */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-200 ring-1 ring-emerald-400/30 bg-white p-0.5">
                <Image
                  src="/logo.jpg"
                  alt="Kunjikkulam Juma Masjid Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
              <div className="leading-tight">
                <p className="font-bold text-white text-base tracking-tight group-hover:text-emerald-300 transition-colors">
                  Kunjikkulam Juma Masjid
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase">
                  Mahallu Jama&apos;ath
                </p>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              An advanced digital governance platform unifying household census, automated
              dues tracking, UPI reconciliation, and community double-entry ledger.
            </p>


          </div>

          {/* Column 2: Navigation Shortcuts */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Navigation</span>
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Portal Homepage', href: '/', icon: Home },
                { label: primaryDashboardLabel, href: primaryDashboardHref, icon: Landmark },
                { label: 'Register Household', href: '/onboarding', icon: Users },
                { label: 'Sign In / Account', href: '/auth/login', icon: ArrowRight },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors duration-150"
                  >
                    <item.icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors duration-150" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Platform Capabilities */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-teal-400" />
              <span>Platform Modules</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {[
                'Household Census Registry',
                'Monthly ₹100 Dues Tracking',
                'UPI QR Generation & Verification',
                'Double-Entry Financial Ledger',
                'Automated Defaulter Alerts',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Technology & Governance */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <span>Jurisdiction</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Serving 6 designated local divisions across Kunjikkulam Mahallu with full data privacy
              and committee oversight.
            </p>


          </div>
        </div>


      </div>
    </footer>
  );
}
