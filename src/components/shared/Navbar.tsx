'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Sparkles,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useLanguage } from '@/lib/context/LanguageContext';
import { DataService } from '@/lib/data-service';
import { Badge } from '@/components/ui/Badge';

export function Navbar() {
  const pathname = usePathname();
  const {
    user,
    profile,
    house,
    isAdmin,
    isApproved,
    isPending,
    isLoading,
    signOut,
  } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLandingPage = pathname === '/';
  const solid = scrolled || !isLandingPage;

  // Track scroll position on landing page
  useEffect(() => {
    if (!isLandingPage) {
      setScrolled(true);
      return;
    }
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLandingPage]);

  // Click outside to close user dropdown
  useEffect(() => {
    if (!userDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  // Effective house & approval state
  const effectiveHouse = house || (user ? DataService.getHouseByUserId(user.id) : null);
  const effectiveStatus = (effectiveHouse as any)?.profile?.status || profile?.status;
  const effectiveIsApproved = isApproved || effectiveStatus === 'approved';
  const effectiveIsPending = !effectiveIsApproved && (isPending || effectiveStatus === 'pending_verification');

  // Navigation Items based on Authenticated Role & Language
  const isMl = language === 'ml';

  const adminNavItems = [
    { label: isMl ? 'ഡാഷ്‌ബോർഡ്' : 'Dashboard', href: '/admin', icon: Landmark },
    { label: isMl ? 'വെരിഫിക്കേഷൻ' : 'Verification', href: '/admin/verification', icon: UserCheck },
    { label: isMl ? 'കുടുംബങ്ങൾ' : 'Houses', href: '/admin/houses', icon: Users },
    { label: isMl ? 'പേയ്‌മെന്റുകൾ' : 'Payments', href: '/admin/payments', icon: CreditCard },
    { label: isMl ? 'കുടിശ്ശികക്കാർ' : 'Defaulters', href: '/admin/defaulters', icon: AlertTriangle },
    { label: isMl ? 'സർട്ടിഫിക്കറ്റുകൾ' : 'Certificates', href: '/admin/marriage-certificates', icon: FileCheck },
    { label: isMl ? 'ലെഡ്ജർ' : 'Ledger', href: '/admin/ledger', icon: FileSpreadsheet },
  ];

  const residentNavItems =
    effectiveIsApproved || (effectiveHouse && effectiveStatus !== 'pending_verification')
      ? [
          { label: isMl ? 'കുടുംബം' : 'Household', href: '/dashboard', icon: Home },
          { label: isMl ? 'മാസവരി & രസീതുകൾ' : 'Pay Dues & Receipts', href: '/dashboard/payments', icon: CreditCard },
          { label: isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ്' : 'Marriage Certificate', href: '/dashboard/marriage-certificate', icon: FileCheck },
        ]
      : effectiveIsPending && effectiveHouse
        ? [{ label: isMl ? 'സ്റ്റാറ്റസ്' : 'Status', href: '/onboarding/pending', icon: Clock }]
        : [{ label: isMl ? 'രജിസ്ട്രേഷൻ' : 'Register', href: '/onboarding', icon: UserPlus }];

  const publicNavItems = [{ label: isMl ? 'ഹോം' : 'Home', href: '/', icon: Landmark }];

  const navItems = !user ? publicNavItems : isAdmin ? adminNavItems : residentNavItems;

  const getHomeRedirect = () => {
    if (!user) return '/';
    if (isAdmin) return '/admin';
    if (effectiveIsApproved && effectiveHouse) return '/dashboard';
    if (effectiveIsPending && effectiveHouse) return '/onboarding/pending';
    return '/onboarding';
  };

  const isItemActive = (href: string) => {
    if (href === '/' || href === '/admin' || href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const theme = {
    nav: solid
      ? 'bg-white border-b border-slate-200 shadow-sm text-slate-900'
      : 'bg-[#0a1628] border-b border-white/10 text-white',
    brandTitle: solid ? 'text-slate-900' : 'text-white',
    brandSubtitle: solid ? 'text-emerald-700' : 'text-emerald-400',
    link: solid
      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
      : 'text-slate-300 hover:text-white hover:bg-white/10',
    activeLink: solid
      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold shadow-xs'
      : 'bg-white/15 text-white border border-white/20 font-semibold shadow-inner',
    activeIcon: solid ? 'text-emerald-700' : 'text-emerald-300',
    inactiveIcon: solid ? 'text-slate-400' : 'text-slate-400',
    userBtn: solid
      ? 'border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100 text-slate-900'
      : 'border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white',
    userMuted: solid ? 'text-slate-500' : 'text-slate-400',
    mobileTrigger: solid ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-200 hover:bg-white/10',
  };

  const displayName = house?.house_name || user?.email?.split('@')[0] || (isMl ? 'എന്റെ കുടുംബം' : 'My Household');
  const avatarLetter = (displayName[0] || 'M').toUpperCase();

  return (
    <nav className={`sticky top-0 z-50 no-print transition-colors duration-200 ${theme.nav}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href={getHomeRedirect()} className="flex items-center gap-3 group cursor-pointer">
            <div className="h-10 w-10 rounded-xl overflow-hidden shadow-md shadow-emerald-700/20 group-hover:scale-105 group-hover:shadow-emerald-600/30 transition-all duration-200 ring-1 ring-emerald-600/30 bg-white flex items-center justify-center p-0.5">
              <Image
                src="/logo.jpg"
                alt="Kunjikkulam Juma Masjid Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-[10px]"
                priority
              />
            </div>
            <div className="leading-tight">
              <span className={`text-base font-bold tracking-tight block transition-colors duration-200 ${theme.brandTitle}`}>
                {isMl ? 'മഹല്ല് ജമാഅത്ത്' : "Mahallu Jama'ath"}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-widest block transition-colors duration-200 ${theme.brandSubtitle}`}>
                {isMl ? 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്' : 'Kunjikkulam Juma Masjid'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5">
            {!isLoading &&
              navItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer ${
                      active ? theme.activeLink : theme.link
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? theme.activeIcon : theme.inactiveIcon}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>

          {/* Right Section: Language Switcher + User Dropdown / Sign In */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Language Switcher Pill */}
            <button
              type="button"
              onClick={toggleLanguage}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 border cursor-pointer ${
                solid
                  ? 'border-emerald-200/80 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/70 hover:border-emerald-300'
                  : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Switch Language / ഭാഷ മാറ്റുക"
            >
              <span className={language === 'ml' ? 'font-black text-emerald-600' : 'opacity-60'}>
                മലയാളം
              </span>
              <span className="opacity-30">|</span>
              <span className={language === 'en' ? 'font-black text-emerald-600' : 'opacity-60'}>
                EN
              </span>
            </button>

            {isLoading ? (
              <div className="h-9 w-28 rounded-xl bg-slate-200/50 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  className={`flex items-center gap-2.5 p-1.5 pl-3 rounded-xl border transition-all duration-150 cursor-pointer ${theme.userBtn}`}
                  aria-expanded={userDropdownOpen}
                  aria-label="User menu"
                >
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-xs font-bold max-w-[130px] truncate">
                      {displayName}
                    </span>
                    <span className={`text-[10px] capitalize ${theme.userMuted}`}>
                      {isAdmin ? (isMl ? 'മഹല്ല് ഒഫീഷ്യൽ' : 'Mahallu Official') : (isMl ? 'റെസിഡന്റ്' : 'Resident')}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {profile && (
                    <Badge variant={isAdmin ? 'default' : profile.status} size="sm">
                      {isAdmin ? 'Admin' : profile.status.replace('_', ' ')}
                    </Badge>
                  )}

                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      userDropdownOpen ? 'rotate-180' : ''
                    } ${solid ? 'text-slate-400' : 'text-slate-300'}`}
                  />
                </button>

                {/* Floating User Menu Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl shadow-slate-950/15 border border-slate-200/90 py-2 z-50 animate-in fade-in-50 zoom-in-95 text-slate-900">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                          {avatarLetter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {house?.house_name || (isAdmin ? (isMl ? 'അഡ്മിനിസ്ട്രേഷൻ ഹബ്' : 'Administration Hub') : (isMl ? 'കുടുംബാംഗം' : 'Household Member'))}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {profile?.role || 'resident'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          {profile?.status || 'approved'}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Shortcuts */}
                    <div className="py-1.5 border-b border-slate-100">
                      {isAdmin ? (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors rounded-lg mx-1"
                        >
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>{isMl ? 'അഡ്മിൻ കൺസോൾ' : 'Admin Console'}</span>
                        </Link>
                      ) : (
                        <>
                          <Link
                            href="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors rounded-lg mx-1"
                          >
                            <Home className="h-4 w-4 text-emerald-600" />
                            <span>{isMl ? 'കുടുംബ വിവരങ്ങൾ' : 'Household Overview'}</span>
                          </Link>
                          <Link
                            href="/dashboard/payments"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors rounded-lg mx-1"
                          >
                            <CreditCard className="h-4 w-4 text-emerald-600" />
                            <span>{isMl ? 'മാസവരി & രസീതുകൾ' : 'Pay Dues & Receipts'}</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Sign Out */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          signOut();
                        }}
                        className="w-[calc(100%-8px)] flex items-center gap-3 mx-1 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 text-rose-500" />
                        <span>{isMl ? 'ലോഗ്ഔട്ട്' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-700/20 hover:shadow-emerald-700/30 transition-all duration-200 cursor-pointer"
                >
                  <span>{isMl ? 'ലോഗിൻ' : 'Sign In'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger & Lang switcher */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                solid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-white/20 bg-white/10 text-white'
              }`}
            >
              <span>{language === 'ml' ? 'മലയാളം' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${theme.mobileTrigger}`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-t px-4 pt-3 pb-5 space-y-1.5 transition-colors ${
            solid
              ? 'bg-white border-slate-200 text-slate-900 shadow-xl'
              : 'bg-[#0a1628] border-white/10 text-white'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  solid
                    ? active
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                    : active
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 ${
                    solid
                      ? active
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                      : active
                        ? 'text-emerald-300'
                        : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div
            className={`pt-3 mt-2 border-t ${
              solid ? 'border-slate-100' : 'border-white/10'
            }`}
          >
            {user ? (
              <div className="space-y-3 px-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <p className={`font-bold truncate ${solid ? 'text-slate-900' : 'text-white'}`}>
                      {displayName}
                    </p>
                    <p className={`text-[11px] truncate ${solid ? 'text-slate-500' : 'text-slate-400'}`}>
                      {user.email}
                    </p>
                  </div>
                  <Badge variant={isAdmin ? 'default' : profile?.status || 'approved'} size="sm">
                    {isAdmin ? 'Admin' : profile?.status || 'Resident'}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-rose-600 hover:bg-rose-50 font-semibold rounded-lg transition-colors border border-rose-200 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isMl ? 'ലോഗ്ഔട്ട്' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-xs font-bold py-2.5 px-4 rounded-xl bg-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/20"
              >
                {isMl ? 'ലോഗിൻ' : 'Sign In'}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}