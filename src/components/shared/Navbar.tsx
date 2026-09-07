'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Landmark,
  Home,
  CreditCard,
  UserCheck,
  ShieldCheck,
  Users,
  FileSpreadsheet,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Clock,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { DataService } from '@/lib/data-service';
import { Badge } from '@/components/ui/Badge';

export function Navbar() {
  const pathname = usePathname();
  const {
    user,
    profile,
    house,
    isAdmin,
    isResident,
    isApproved,
    isPending,
    isLoading,
    signOut,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Compute effective house and approval state across both Supabase and local storage
  const effectiveHouse = house || (user ? DataService.getHouseByUserId(user.id) : null);
  const effectiveStatus = (effectiveHouse as any)?.profile?.status || profile?.status;
  const effectiveIsApproved = isApproved || effectiveStatus === 'approved';
  const effectiveIsPending = !effectiveIsApproved && (isPending || effectiveStatus === 'pending_verification');

  // Dynamic Navigation Items based on Authenticated Role
  const adminNavItems = [
    { label: 'Dashboard', href: '/admin', icon: Landmark },
    { label: 'Verification Hub', href: '/admin/verification', icon: UserCheck },
    { label: 'Houses Directory', href: '/admin/houses', icon: Users },
    { label: 'Payment Review', href: '/admin/payments', icon: CreditCard },
    { label: 'Defaulters', href: '/admin/defaulters', icon: AlertTriangle },
    { label: 'Financial Ledger', href: '/admin/ledger', icon: FileSpreadsheet },
  ];

  const residentNavItems =
    effectiveIsApproved || (effectiveHouse && effectiveStatus !== 'pending_verification')
      ? [
          { label: 'Household Overview', href: '/dashboard', icon: Home },
          { label: 'Pay Dues & Receipts', href: '/dashboard/payments', icon: CreditCard },
        ]
      : effectiveIsPending && effectiveHouse
      ? [{ label: 'Verification Status', href: '/onboarding/pending', icon: Clock }]
      : [{ label: 'Register House', href: '/onboarding', icon: UserPlus }];

  const publicNavItems = [
    { label: 'Home', href: '/', icon: Landmark },
  ];

  const navItems = !user
    ? publicNavItems
    : isAdmin
    ? adminNavItems
    : residentNavItems;

  const getHomeRedirect = () => {
    if (!user) return '/';
    if (isAdmin) return '/admin';
    if (effectiveIsApproved && effectiveHouse) return '/dashboard';
    if (effectiveIsPending && effectiveHouse) return '/onboarding/pending';
    return '/onboarding';
  };

  const isItemActive = (href: string) => {
    if (href === '/' || href === '/admin' || href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href={getHomeRedirect()} className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-emerald-800 text-emerald-100 flex items-center justify-center shadow-xs group-hover:bg-emerald-900 transition-colors">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 tracking-tight block leading-tight">
                  Mahallu Jama&apos;ath
                </span>
                <span className="text-[11px] font-medium text-emerald-700 tracking-wide uppercase block">
                  Village Management Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {!isLoading &&
              navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
          </div>

          {/* Right Side: Auth State & User Menu */}
          <div className="hidden sm:flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-28 rounded-xl bg-slate-100 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/60 transition-all text-left cursor-pointer"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-900 max-w-[140px] truncate">
                      {house?.house_name || user.email || 'User'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium capitalize">
                      {isAdmin ? 'Mahallu Official' : 'Resident'}
                    </span>
                  </div>
                  {profile && (
                    <Badge variant={isAdmin ? 'default' : profile.status} size="sm">
                      {isAdmin ? 'Admin' : profile.status.replace('_', ' ')}
                    </Badge>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {house?.house_name || (isAdmin ? 'Mahallu Administration' : 'Resident Account')}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          Role: {profile?.role || 'resident'}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {profile?.status || 'approved'}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Shortcut */}
                    <div className="py-1 border-b border-slate-100">
                      {isAdmin ? (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          Admin Console
                        </Link>
                      ) : (
                        <>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <Home className="h-4 w-4 text-emerald-600" />
                            Household Overview
                          </Link>
                          <Link
                            href="/dashboard/payments"
                            className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <CreditCard className="h-4 w-4 text-emerald-600" />
                            Pay Dues & Receipts
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Sign Out */}
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left font-medium cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate">{user.email}</span>
                  <Badge variant={isAdmin ? 'default' : profile?.status || 'approved'} size="sm">
                    {isAdmin ? 'Admin' : profile?.status || 'Resident'}
                  </Badge>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-xs font-semibold py-2 px-4 rounded-xl bg-emerald-700 text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
