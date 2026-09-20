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
  LayoutGrid,
  Globe,
  LogIn,
  LayoutDashboard,
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
  const [activeDropdown, setActiveDropdown] = useState<'menu' | 'user' | null>(null);

  const menuDropdownOpen = activeDropdown === 'menu';
  const userDropdownOpen = activeDropdown === 'user';

  const toggleMenuDropdown = () => {
    setActiveDropdown((curr) => (curr === 'menu' ? null : 'menu'));
  };

  const toggleUserDropdown = () => {
    setActiveDropdown((curr) => (curr === 'user' ? null : 'user'));
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside or press Esc to close active dropdown
  useEffect(() => {
    if (!activeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (activeDropdown === 'menu' && menuDropdownRef.current && !menuDropdownRef.current.contains(target)) {
        setActiveDropdown(null);
      }
      if (activeDropdown === 'user' && dropdownRef.current && !dropdownRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdown]);

  // Close mobile & dropdown menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  // Effective house & approval state
  const effectiveHouse = house || (user ? DataService.getHouseByUserId(user.id) : null);
  const effectiveStatus = (effectiveHouse as any)?.profile?.status || profile?.status;
  const effectiveIsApproved = isApproved || effectiveStatus === 'approved';
  const effectiveIsPending = !effectiveIsApproved && (isPending || effectiveStatus === 'pending_verification');

  // Navigation Items based on Authenticated Role & Language
  const isMl = language === 'ml';

  const adminNavItems = [
    {
      label: isMl ? 'ഡാഷ്‌ബോർഡ്' : 'Dashboard',
      sub: isMl ? 'അവലോകനം & സ്ഥിതിവിവരങ്ങൾ' : 'Overview & Statistics',
      href: '/admin',
      icon: Landmark,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: isMl ? 'വെരിഫിക്കേഷൻ' : 'Verification',
      sub: isMl ? 'കുടുംബ രജിസ്ട്രേഷൻ & പ്രൊഫൈൽ' : 'Registrations & Profile Approvals',
      href: '/admin/verification',
      icon: UserCheck,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: isMl ? 'കുടുംബങ്ങൾ' : 'Houses & Census',
      sub: isMl ? 'സെൻസസ് & അംഗങ്ങളുടെ പട്ടിക' : 'Census Directory & Members',
      href: '/admin/houses',
      icon: Users,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      label: isMl ? 'പേയ്‌മെന്റുകൾ' : 'Payments',
      sub: isMl ? 'വരിസംഖ്യ & സ്പെഷ്യൽ ഫണ്ടുകൾ' : 'Dues Verification & Campaigns',
      href: '/admin/payments',
      icon: CreditCard,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      label: isMl ? 'കുടിശ്ശികക്കാർ' : 'Defaulters',
      sub: isMl ? 'കുടിശ്ശിക ട്രാക്കിംഗ് & വാട്സാപ്പ്' : 'Overdue Tracking & Reminders',
      href: '/admin/defaulters',
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      label: isMl ? 'സർട്ടിഫിക്കറ്റുകൾ' : 'Certificates',
      sub: isMl ? 'നികാഹ് രജിസ്ട്രിയും അനുമതിയും' : 'Nikah Registry & Approvals',
      href: '/admin/marriage-certificates',
      icon: FileCheck,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      label: isMl ? 'ലെഡ്ജർ' : 'Financial Ledger',
      sub: isMl ? 'വരവ്-ചിലവ് കണക്കുകൾ & ഓഡിറ്റ്' : 'Inflow/Outflow & Cash Ledger',
      href: '/admin/ledger',
      icon: FileSpreadsheet,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  ];

  const residentNavItems =
    effectiveIsApproved || (effectiveHouse && effectiveStatus !== 'pending_verification')
      ? [
        {
          label: isMl ? 'കുടുംബം' : 'Household',
          sub: isMl ? 'കുടുംബ വിവരങ്ങളും സെൻസസും' : 'Family Details & Members',
          href: '/dashboard',
          icon: Home,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        {
          label: isMl ? 'മാസവരി & രസീതുകൾ' : 'Pay Dues & Receipts',
          sub: isMl ? 'വരിസംഖ്യ അടയ്ക്കലും രസീതുകളും' : 'Pay Monthly Dues & Receipts',
          href: '/dashboard/payments',
          icon: CreditCard,
          color: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
          label: isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ്' : 'Marriage Certificate',
          sub: isMl ? 'നികാഹ് സർട്ടിഫിക്കറ്റ് അപേക്ഷ' : 'Nikah Certificate Application',
          href: '/dashboard/marriage-certificate',
          icon: FileCheck,
          color: 'bg-purple-50 text-purple-700 border-purple-200',
        },
      ]
      : effectiveIsPending && effectiveHouse
        ? [{ label: isMl ? 'സ്റ്റാറ്റസ്' : 'Status', sub: isMl ? 'പരിശോധന പുരോഗതി' : 'Verification Status', href: '/onboarding/pending', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200' }]
        : [{ label: isMl ? 'രജിസ്ട്രേഷൻ' : 'Register', sub: isMl ? 'കുടുംബ രജിസ്ട്രേഷൻ' : 'Household Registration', href: '/onboarding', icon: UserPlus, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }];

  const publicNavItems = [{ label: isMl ? 'ഹോം' : 'Home', sub: isMl ? 'പ്രധാന പേജ്' : 'Main Page', href: '/', icon: Landmark, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }];

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

  // Floating Round Bottom Navigation for mobile visitors on public / landing pages
  const showGlobalRoundBottomNav = !pathname.startsWith('/admin') && !pathname.startsWith('/dashboard');

  const globalMobileNav = !user
    ? [
        { label: isMl ? 'ഹോം' : 'Home', href: '/', icon: Home },
        { label: isMl ? 'രജിസ്ട്രേഷൻ' : 'Register', href: '/onboarding', icon: UserPlus },
        { label: language === 'ml' ? 'English' : 'മലയാളം', icon: Globe, isAction: true, onClick: toggleLanguage },
        { label: isMl ? 'ലോഗിൻ' : 'Sign In', href: '/auth/login', icon: LogIn },
      ]
    : isAdmin
    ? [
        { label: isMl ? 'ഹോം' : 'Home', href: '/', icon: Home },
        { label: isMl ? 'അഡ്മിൻ' : 'Admin', href: '/admin', icon: Landmark },
        { label: isMl ? 'കുടുംബങ്ങൾ' : 'Houses', href: '/admin/houses', icon: Users },
        { label: isMl ? 'പേയ്‌മെന്റ്' : 'Payments', href: '/admin/payments', icon: CreditCard },
        { label: language === 'ml' ? 'English' : 'മലയാളം', icon: Globe, isAction: true, onClick: toggleLanguage },
      ]
    : [
        { label: isMl ? 'ഹോം' : 'Home', href: '/', icon: Home },
        { label: isMl ? 'ഡാഷ്‌ബോർഡ്' : 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: isMl ? 'മാസവരി' : 'Pay Dues', href: '/dashboard/payments', icon: CreditCard },
        { label: isMl ? 'സർട്ടിഫിക്കറ്റ്' : 'Certs', href: '/dashboard/marriage-certificate', icon: FileCheck },
        { label: language === 'ml' ? 'English' : 'മലയാളം', icon: Globe, isAction: true, onClick: toggleLanguage },
      ];

  return (
    <>
      <nav className={`sticky top-0 z-50 no-print transition-colors duration-200 ${theme.nav}`}>
      <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo */}
          <Link href={getHomeRedirect()} className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer shrink-0">
            <div className="h-10 w-10 rounded-xl overflow-hidden shadow-md shadow-emerald-700/20 group-hover:scale-105 group-hover:shadow-emerald-600/30 transition-all duration-200 ring-1 ring-emerald-600/30 bg-white flex items-center justify-center p-0.5 shrink-0">
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
              <span className={`${isMl ? 'text-[11px] font-medium tracking-normal' : 'text-[10px] font-semibold uppercase tracking-widest'} block transition-colors duration-200 ${theme.brandSubtitle}`}>
                {isMl ? 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്' : 'Kunjikkulam Juma Masjid'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation: Dropdown Window & Quick Dashboard Link */}
          <div className="hidden md:flex items-center gap-2.5" ref={menuDropdownRef}>
            {/* Quick Home / Dashboard Shortcut */}
            <Link
              href={getHomeRedirect()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                pathname === '/admin' || pathname === '/dashboard' || pathname === '/'
                  ? theme.activeLink
                  : theme.link
              }`}
            >
              <Landmark className="h-4 w-4" />
              <span>{isMl ? 'ഡാഷ്‌ബോർഡ്' : 'Dashboard'}</span>
            </Link>

            {/* Dropdown Window Popover Trigger */}
            <div className="relative" ref={menuDropdownRef}>
              <button
                type="button"
                onClick={toggleMenuDropdown}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs ${
                  menuDropdownOpen
                    ? (solid
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-100'
                        : 'bg-white/20 border-white text-white ring-2 ring-white/20')
                    : (solid
                        ? 'border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100 text-slate-800'
                        : 'border-white/15 hover:border-white/30 bg-white/10 hover:bg-white/20 text-white')
                }`}
                aria-expanded={menuDropdownOpen}
                aria-label="Navigation menu dropdown"
              >
                <LayoutGrid className={`h-4 w-4 ${solid ? 'text-emerald-700' : 'text-emerald-300'}`} />
                <span>
                  {isAdmin
                    ? (isMl ? 'അഡ്മിൻ സേവനങ്ങൾ' : 'Admin Services')
                    : (isMl ? 'സേവനങ്ങൾ' : 'Services')}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    menuDropdownOpen ? 'rotate-180' : ''
                  } ${solid ? 'text-slate-400' : 'text-slate-300'}`}
                />
              </button>

              {/* Floating Dropdown Window */}
              {menuDropdownOpen && (
                <div className="absolute left-0 mt-2.5 w-[330px] sm:w-[540px] rounded-2xl bg-white shadow-2xl shadow-slate-950/20 border border-slate-200/90 py-2 z-50 animate-in fade-in-50 zoom-in-95 text-slate-900 overflow-hidden">
                  {/* Dropdown Window Header */}
                  <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50/90 via-slate-50 to-teal-50/90 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">
                        {isAdmin
                          ? (isMl ? 'മഹല്ല് അഡ്മിനിസ്ട്രേഷൻ മോഡ്യൂളുകൾ' : 'Administration Modules')
                          : (isMl ? 'മഹല്ല് പോർട്ടൽ സേവനങ്ങൾ' : 'Mahallu Portal Services')}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                      {navItems.length} {isMl ? 'സേവനങ്ങൾ' : 'Modules'}
                    </span>
                  </div>

                  {/* 2-Column Grid of Modules */}
                  <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[70vh] overflow-y-auto">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = isItemActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            closeDropdowns();
                            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          }}
                          className={`group flex items-start gap-3 p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                            active
                              ? 'bg-emerald-50/90 border-emerald-300 shadow-xs ring-1 ring-emerald-400/40'
                              : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 hover:shadow-xs'
                          }`}
                        >
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                              active
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                : `${(item as any).color || 'bg-slate-100 text-slate-600 border-slate-200'}`
                            }`}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-bold truncate block ${
                                  active ? 'text-emerald-900' : 'text-slate-900 group-hover:text-emerald-800'
                                }`}
                              >
                                {item.label}
                              </span>
                              {active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                              )}
                            </div>
                            {(item as any).sub && (
                              <p className="text-[10px] text-slate-500 leading-snug line-clamp-1 mt-0.5">
                                {(item as any).sub}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Language Switcher + User Dropdown / Sign In */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-2.5 shrink-0">
            {/* Language Switcher Pill */}
            <button
              type="button"
              onClick={toggleLanguage}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 border cursor-pointer shrink-0 ${solid
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
              <div className="h-9 w-28 rounded-xl bg-slate-200/50 animate-pulse shrink-0" />
            ) : user ? (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={toggleUserDropdown}
                  className={`flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border transition-all duration-150 cursor-pointer shrink-0 ${theme.userBtn}`}
                  aria-expanded={userDropdownOpen}
                  aria-label="User menu"
                >
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-xs font-bold max-w-[85px] 2xl:max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <span className={`text-[10px] capitalize ${theme.userMuted}`}>
                      {isAdmin ? (isMl ? 'മഹല്ല് ഒഫീഷ്യൽ' : 'Mahallu Official') : (isMl ? 'റെസിഡന്റ്' : 'Resident')}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {profile && (
                    <Badge variant={isAdmin ? 'default' : profile.status} size="sm" className="hidden sm:inline-flex shrink-0">
                      {isAdmin ? 'Admin' : profile.status.replace('_', ' ')}
                    </Badge>
                  )}

                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 shrink-0 ${userDropdownOpen ? 'rotate-180' : ''
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
                          onClick={() => {
                            closeDropdowns();
                            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors rounded-lg mx-1"
                        >
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>{isMl ? 'അഡ്മിൻ കൺസോൾ' : 'Admin Console'}</span>
                        </Link>
                      ) : (
                        <>
                          <Link
                            href="/dashboard"
                            onClick={() => {
                              closeDropdowns();
                              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors rounded-lg mx-1"
                          >
                            <Home className="h-4 w-4 text-emerald-600" />
                            <span>{isMl ? 'കുടുംബ വിവരങ്ങൾ' : 'Household Overview'}</span>
                          </Link>
                          <Link
                            href="/dashboard/payments"
                            onClick={() => {
                              closeDropdowns();
                              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                            }}
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
                          closeDropdowns();
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

          {/* Mobile & Tablet Menu Trigger */}
          <div className="flex xl:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className={`sm:hidden inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${solid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-white/20 bg-white/10 text-white'
                }`}
            >
              <span>{language === 'ml' ? 'മലയാളം' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeDropdowns();
                setMobileMenuOpen((v) => !v);
              }}
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
          className={`xl:hidden border-t px-4 pt-3 pb-5 space-y-1.5 transition-colors ${solid
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
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${solid
                  ? active
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                  : active
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-slate-300 hover:bg-white/10'
                  }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 ${solid
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
            className={`pt-3 mt-2 border-t ${solid ? 'border-slate-100' : 'border-white/10'
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

    {/* Mobile Sticky Floating Round Bottom Navigation Dock (Public Pages) */}
    {showGlobalRoundBottomNav && (
      <div className="sm:hidden fixed bottom-3 inset-x-3 z-40 pointer-events-none no-print">
        <nav
          aria-label="Mobile Bottom Navigation Dock"
          className="pointer-events-auto max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.14)] rounded-full px-2 py-1.5 flex items-center justify-around"
        >
          {globalMobileNav.map((item, idx) => {
            const Icon = item.icon;
            if ((item as any).isAction) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(item as any).onClick}
                  className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-full transition-all min-h-[46px] cursor-pointer text-slate-500 hover:text-slate-800 font-medium"
                >
                  <div className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 transition-all">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9.5px] mt-0.5 font-medium tracking-tight leading-none truncate max-w-[64px]">
                    {item.label}
                  </span>
                </button>
              );
            }

            const href = (item as any).href as string;
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                }}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-full transition-all min-h-[46px] ${
                  isActive
                    ? 'text-emerald-800 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <div className="relative">
                  <div
                    className={`p-1.5 rounded-full transition-all ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs shadow-emerald-700/30 scale-105'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <span className="text-[9.5px] mt-0.5 font-medium tracking-tight leading-none truncate max-w-[64px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    )}
  </>
  );
}