'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DataService,
} from '@/lib/data-service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [finSummary, setFinSummary] = useState<any>(null);
  const [pendingProfiles, setPendingProfiles] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [recentLedger, setRecentLedger] = useState<any[]>([]);

  const loadData = async () => {
    await DataService.syncHousesFromSupabase();
    setStats(DataService.getSystemStats());
    setFinSummary(DataService.getFinancialSummary());
    setPendingProfiles(DataService.getPendingProfiles());
    setPendingPayments(DataService.getPaymentsUnderReview());
    setRecentLedger(DataService.getLedger().slice(0, 5));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('mahallu_data_updated', loadData);
    return () => window.removeEventListener('mahallu_data_updated', loadData);
  }, []);

  if (!stats || !finSummary) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading Mahallu executive intelligence...
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
              Mahallu Administrative Console
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Overview of 250+ households across 6 divisions, financial balances, and pending actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/verification">
            <Button variant="outline" size="sm" className="gap-2">
              <UserCheck className="h-4 w-4 text-emerald-700" />
              Verifications ({pendingProfiles.length})
            </Button>
          </Link>
          <Link href="/admin/ledger">
            <Button variant="primary" size="sm" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Manage Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Houses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Houses
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
                {stats.approvedHouses} Active
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-600 font-medium">
                {stats.pendingHouses} Pending
              </span>
            </div>
          </div>
        </div>

        {/* Total Population */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Population
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
              <span>{stats.totalAbroad} NRI / Abroad</span>
              <span>•</span>
              <span>{stats.totalChildren} Minors</span>
            </div>
          </div>
        </div>

        {/* Action Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Queues
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-900">
              {pendingProfiles.length + pendingPayments.length}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="text-amber-700 font-medium">{pendingProfiles.length} Profiles</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">{pendingPayments.length} Payments</span>
            </div>
          </div>
        </div>

        {/* Treasury Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Treasury Cash Balance
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
                {formatCurrency(finSummary.totalCredit)} In
              </span>
              <span>•</span>
              <span className="text-rose-600 flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" />
                {formatCurrency(finSummary.totalDebit)} Out
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
                    {pendingProfiles.length} New House Registration(s) Awaiting Approval
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Review submitted household details and census data
                  </p>
                </div>
              </div>
              <Link href="/admin/verification">
                <Button size="sm" variant="primary" className="bg-amber-700 hover:bg-amber-800 text-xs gap-1 border-none">
                  Review
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
                    {pendingPayments.length} Monthly Dues Payment(s) Under Review
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Verify UPI/UTR transaction references & post to ledger
                  </p>
                </div>
              </div>
              <Link href="/admin/payments">
                <Button size="sm" variant="primary" className="bg-emerald-700 hover:bg-emerald-800 text-xs gap-1 border-none">
                  Verify
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
            <h2 className="text-sm font-bold text-slate-900">Division Breakdown & Population Census</h2>
          </div>
          <Link href="/admin/houses" className="text-xs font-semibold text-emerald-700 hover:underline">
            View Houses Directory &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.divisionBreakdown).map(([divKey, data]: [string, any]) => (
            <div
              key={divKey}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900">{data.label}</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {data.houses} Houses
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Population:</span>
                <strong className="text-slate-800">{data.population} residents</strong>
              </div>
              {/* Mini distribution bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${(data.houses / (stats.totalHouses || 1)) * 100 * 3.5}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Ledger Audit Table Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">Recent Financial Ledger Activity</h2>
          </div>
          <Link href="/admin/ledger" className="text-xs font-semibold text-emerald-700 hover:underline">
            Open Full Ledger &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLedger.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-6 text-slate-600">{formatDateTime(item.created_at)}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={item.type} size="sm">
                      {item.type}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{item.category}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-md truncate">{item.description}</td>
                  <td
                    className={`py-3.5 px-6 text-right font-bold ${
                      item.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {item.type === 'credit' ? '+' : '-'} {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
