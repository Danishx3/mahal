'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DataService,
} from '@/lib/data-service';
import { formatCurrency, formatDateTime, getHouseHeadName } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/lib/context/LanguageContext';
import { DIVISION_LABELS, DIVISION_LABELS_ML, Division } from '@/lib/supabase/types';
import {
  Users,
  Home,
  UserCheck,
  CreditCard,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Clock,
  ShieldCheck,
  MapPin,
  User,
  FileCheck,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { language } = useLanguage();
  const isMl = language === 'ml';

  const [stats, setStats] = useState<any>(null);
  const [finSummary, setFinSummary] = useState<any>(null);
  const [pendingProfiles, setPendingProfiles] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [pendingCerts, setPendingCerts] = useState<any[]>([]);
  const [recentLedger, setRecentLedger] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);

  const loadData = async () => {
    const [statsData, finData, profiles, payments, ledger, housesList, certs] = await Promise.all([
      DataService.getSystemStatsAsync(),
      DataService.getFinancialSummaryAsync(),
      DataService.getPendingProfilesAsync(),
      DataService.getPaymentsUnderReviewAsync(),
      DataService.getLedgerAsync(),
      DataService.getHousesAsync(),
      DataService.getMarriageCertificatesAsync(undefined, 'pending'),
    ]);
    setStats(statsData);
    setFinSummary(finData);
    setPendingProfiles(profiles);
    setPendingPayments(payments);
    setPendingCerts(certs);
    setRecentLedger(ledger.slice(0, 5));
    setHouses(housesList);
  };

  const getHeadForLedgerItem = (item: any): string | null => {
    if (item.payment_due_id) {
      const h = houses.find((x) => x.payment_dues?.some((d: any) => d.id === item.payment_due_id));
      if (h) return getHouseHeadName(h);
    }
    if (item.description) {
      const headMatch = item.description.match(/Head:\s*([^|\n\r]+)/i);
      if (headMatch) return headMatch[1].trim();
      const regMatch = item.description.match(/(MHL-[A-Z0-9-]+|KL-[A-Z0-9-]+)/i);
      if (regMatch) {
        const h = houses.find((x) => x.mahallu_reg_no?.toUpperCase() === regMatch[1].toUpperCase());
        if (h) return getHouseHeadName(h);
      }
    }
    return null;
  };

  useEffect(() => {
    loadData();
    window.addEventListener('mahallu_data_updated', loadData);
    window.addEventListener('mahallu_marriage_certs_updated', loadData);
    return () => {
      window.removeEventListener('mahallu_data_updated', loadData);
      window.removeEventListener('mahallu_marriage_certs_updated', loadData);
    };
  }, []);

  if (!stats || !finSummary) {
    return (
      <div className="p-8 text-center text-slate-500">
        {isMl ? 'വിവരങ്ങൾ ലഭ്യമാക്കുന്നു...' : 'Loading Mahallu executive intelligence...'}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Executive Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isMl ? 'മഹല്ല് അഡ്മിനിസ്ട്രേറ്റീവ് കൺസോൾ' : 'Mahallu Administrative Console'}
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {isMl
              ? 'ഡിവിഷനുകളിലെ കുടുംബങ്ങൾ, സാമ്പത്തിക നീക്കിയിരിപ്പ്, അവലോകനങ്ങൾ, എന്നിവയുടെ തത്സമയ വിവരങ്ങൾ.'
              : 'Overview of 250+ households across 6 divisions, financial balances, and pending actions.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Link href="/admin/verification" className="w-full">
            <Button variant="outline" size="sm" className="w-full justify-center gap-1.5 min-h-[40px] text-xs">
              <UserCheck className="h-4 w-4 text-emerald-700" />
              <span className="truncate">
                {isMl ? `വെരിഫിക്കേഷൻ (${pendingProfiles.length})` : `Verify (${pendingProfiles.length})`}
              </span>
            </Button>
          </Link>
          <Link href="/admin/marriage-certificates" className="w-full">
            <Button variant="outline" size="sm" className="w-full justify-center gap-1.5 border-emerald-300 bg-emerald-50/50 text-emerald-800 min-h-[40px] text-xs">
              <FileCheck className="h-4 w-4 text-emerald-700" />
              <span className="truncate">
                {isMl ? `സർട്ടിഫിക്കറ്റുകൾ (${pendingCerts.length})` : `Certs (${pendingCerts.length})`}
              </span>
            </Button>
          </Link>
          <Link href="/admin/ledger" className="w-full">
            <Button variant="primary" size="sm" className="w-full justify-center gap-1.5 min-h-[40px] text-xs">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="truncate">{isMl ? 'ലെഡ്ജർ' : 'Ledger'}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Total Houses */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isMl ? 'ആകെ വീടുകൾ' : 'Total Houses'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Home className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              {stats.totalHouses}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-emerald-700 font-medium">
                {stats.approvedHouses} {isMl ? 'സജീവം' : 'Active'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-600 font-medium">
                {stats.pendingHouses} {isMl ? 'പരിശോധനയിൽ' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Population */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isMl ? 'ആകെ ജനസംഖ്യ' : 'Total Population'}
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              {stats.totalPopulation}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{stats.totalAbroad} {isMl ? 'പ്രവാസികൾ' : 'NRI / Abroad'}</span>
              <span>•</span>
              <span>{stats.totalChildren} {isMl ? 'കുട്ടികൾ' : 'Minors'}</span>
            </div>
          </div>
        </div>

        {/* Action Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isMl ? 'തീർപ്പുകൽപ്പിക്കാത്തവ' : 'Pending Queues'}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-900">
              {pendingProfiles.length + pendingPayments.length + pendingCerts.length}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{pendingProfiles.length} {isMl ? 'പ്രൊഫൈലുകൾ' : 'Profiles'}</span>
              <span>•</span>
              <span>{pendingPayments.length} {isMl ? 'പേയ്‌മെന്റുകൾ' : 'Payments'}</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">{pendingCerts.length} {isMl ? 'സർട്ടിഫിക്കറ്റുകൾ' : 'Certificates'}</span>
            </div>
          </div>
        </div>

        {/* Treasury Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isMl ? 'ഖജനാവ് നീക്കിയിരിപ്പ്' : 'Treasury Cash Balance'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-800">
              {formatCurrency(finSummary.balance)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                {formatCurrency(finSummary.totalCredit)} {isMl ? 'വരവ്' : 'In'}
              </span>
              <span>•</span>
              <span className="text-rose-600 flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" />
                {formatCurrency(finSummary.totalDebit)} {isMl ? 'ചിലവ്' : 'Out'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Banners if Queues are Non-Empty */}
      {(pendingProfiles.length > 0 || pendingPayments.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingProfiles.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-200/60 text-amber-900">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    {isMl
                      ? `${pendingProfiles.length} പുതിയ കുടുംബ രജിസ്ട്രേഷൻ(കൾ) അംഗീകാരത്തിനായി കാത്തിരിക്കുന്നു`
                      : `${pendingProfiles.length} New House Registration(s) Awaiting Approval`}
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {isMl
                      ? 'കുടുംബാംഗങ്ങളുടെ വിവരങ്ങളും സെൻസസും പരിശോധിച്ച് അംഗീകരിക്കുക'
                      : 'Review submitted household details and census data'}
                  </p>
                </div>
              </div>
              <Link href="/admin/verification">
                <Button size="sm" variant="primary" className="bg-amber-700 hover:bg-amber-800 text-xs gap-1 border-none">
                  {isMl ? 'പരിശോധിക്കുക' : 'Review'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {pendingPayments.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-200/60 text-emerald-900">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    {isMl
                      ? `${pendingPayments.length} മാസവരി പേയ്‌മെന്റ്(കൾ) പരിശോധനയിലാണ്`
                      : `${pendingPayments.length} Monthly Dues Payment(s) Under Review`}
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    {isMl
                      ? 'UPI/UTR ട്രാൻസാക്ഷൻ റഫറൻസ് പരിശോധിച്ച് ലെഡ്ജറിലേക്ക് ചേർക്കുക'
                      : 'Verify UPI/UTR transaction references & post to ledger'}
                  </p>
                </div>
              </div>
              <Link href="/admin/payments">
                <Button size="sm" variant="primary" className="bg-emerald-700 hover:bg-emerald-800 text-xs gap-1 border-none">
                  {isMl ? 'പരിശോധിക്കുക' : 'Verify'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 6 Divisions Distribution Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              {isMl ? 'ഡിവിഷൻ തിരിച്ചുള്ള വിവരങ്ങളും ജനസംഖ്യാ സെൻസസും' : 'Division Breakdown & Population Census'}
            </h2>
          </div>
          <Link href="/admin/houses" className="text-xs font-semibold text-emerald-700 hover:underline">
            {isMl ? 'വീടുകളുടെ പട്ടിക കാണുക →' : 'View Houses Directory →'}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.divisionBreakdown).map(([divKey, data]: [string, any]) => {
            const divLabel = isMl ? (DIVISION_LABELS_ML[divKey as Division] || data.label) : data.label;
            return (
              <div
                key={divKey}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900">{divLabel}</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {data.houses} {isMl ? 'വീടുകൾ' : 'Houses'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{isMl ? 'ജനസംഖ്യ:' : 'Population:'}</span>
                  <strong className="text-slate-800">
                    {data.population} {isMl ? 'നിവാസികൾ' : 'residents'}
                  </strong>
                </div>
                {/* Mini distribution bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${(data.houses / (stats.totalHouses || 1)) * 100 * 3.5}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Ledger Audit Table Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              {isMl ? 'സമീപകാല വരവ്-ചിലവ് ഇടപാടുകൾ' : 'Recent Financial Ledger Activity'}
            </h2>
          </div>
          <Link href="/admin/ledger" className="text-xs font-semibold text-emerald-700 hover:underline">
            {isMl ? 'മുഴുവൻ ലെഡ്ജർ കാണുക →' : 'Open Full Ledger →'}
          </Link>
        </div>

        {/* Desktop View: Full Audit Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">{isMl ? 'തീയതി' : 'Date'}</th>
                <th className="py-3 px-4">{isMl ? 'തരം' : 'Type'}</th>
                <th className="py-3 px-4">{isMl ? 'വിവരണം' : 'Description'}</th>
                <th className="py-3 px-6 text-right">{isMl ? 'തുക' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLedger.map((item) => {
                const isCredit = item.type === 'credit';
                const typeLabel = isMl ? (isCredit ? 'വരവ്' : 'ചിലവ്') : item.type;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 text-slate-600">{formatDateTime(item.created_at)}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={item.type} size="sm">
                        {typeLabel}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-md">
                      <div className="truncate">{item.description}</div>
                      {(() => {
                        const headName = getHeadForLedgerItem(item);
                        if (headName && headName !== '—') {
                          return (
                            <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>{isMl ? `കുടുംബനാഥൻ: ${headName}` : `Head: ${headName}`}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td
                      className={`py-3.5 px-6 text-right font-bold ${
                        isCredit ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isCredit ? '+' : '-'} {formatCurrency(item.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Touch-Friendly Ledger Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {recentLedger.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              {isMl ? 'സമീപകാല വരവ്-ചിലവ് രേഖകൾ ലഭ്യമല്ല.' : 'No recent ledger activity recorded.'}
            </div>
          ) : (
            recentLedger.map((item) => {
              const headName = getHeadForLedgerItem(item);
              const isCredit = item.type === 'credit';
              const typeLabel = isMl ? (isCredit ? 'വരവ്' : 'ചിലവ്') : item.type;
              return (
                <div key={item.id} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={item.type} size="sm">
                          {typeLabel}
                        </Badge>
                        <span className="text-xs text-slate-400 font-medium">
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 mt-1 leading-snug">
                        {item.description}
                      </p>
                      {headName && headName !== '—' && (
                        <p className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{isMl ? `കുടുംബനാഥൻ: ${headName}` : `Head: ${headName}`}</span>
                        </p>
                      )}
                    </div>

                    <div
                      className={`font-black text-sm shrink-0 ${
                        isCredit ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isCredit ? '+' : '-'} {formatCurrency(item.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


