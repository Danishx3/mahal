'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { FinancialLedger, TransactionType } from '@/lib/supabase/types';
import { ledgerEntrySchema, LedgerEntryInput } from '@/lib/schemas';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Building2,
  Plus,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export default function FinancialLedgerPage() {
  const { toast } = useToast();
  const [ledger, setLedger] = useState<FinancialLedger[]>([]);
  const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, balance: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Manual Transaction Entry Modal
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<TransactionType>('credit');
  const [category, setCategory] = useState('Donation');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLedger = async () => {
    const list = await DataService.getLedgerAsync();
    setLedger(list);
    const sum = await DataService.getFinancialSummaryAsync();
    setSummary(sum);
  };

  useEffect(() => {
    loadLedger();
    window.addEventListener('mahallu_data_updated', loadLedger);
    return () => window.removeEventListener('mahallu_data_updated', loadLedger);
  }, []);

  // Filtered entries
  const filteredLedger = ledger.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.amount.toString().includes(q)
      );
    }
    return true;
  });

  const categories = Array.from(new Set(ledger.map((item) => item.category)));

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast('Please enter a valid positive amount', 'error');
      return;
    }
    if (!description.trim()) {
      toast('Please provide a detailed description', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await DataService.addLedgerEntryAsync({
        type: entryType,
        category,
        amount: numAmount,
        description: description.trim(),
      });
      setEntryModalOpen(false);
      setAmount('');
      setDescription('');
      toast(`Recorded manual ${entryType} transaction of ${formatCurrency(numAmount)}!`, 'success');
      await loadLedger();
    } catch {
      toast('Failed to record transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount (INR)', 'Description', 'Due ID'];
    const rows = filteredLedger.map((item) => [
      `"${new Date(item.created_at).toISOString()}"`,
      `"${item.type}"`,
      `"${item.category}"`,
      item.amount,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${item.payment_due_id || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mahallu_financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Financial ledger exported to CSV successfully', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Mahallu Financial Accounts & Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Double-entry bookkeeping audit of all monthly membership dues, public donations, and community expenditures.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setEntryModalOpen(true)}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Record Transaction
          </Button>
        </div>
      </div>

      {/* 3 Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Inflow (Credits) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Inflow (Credits)
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-emerald-800">
              {formatCurrency(summary.totalCredit)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Monthly dues collections & public donations
            </p>
          </div>
        </div>

        {/* Total Outflow (Debits) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Outflow (Debits)
            </span>
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-700">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-rose-700">
              {formatCurrency(summary.totalDebit)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Mosque power, sound repair, aid & maintenance
            </p>
          </div>
        </div>

        {/* Current Cash/Bank Balance */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-6 rounded-3xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Treasury Cash Balance
            </span>
            <div className="p-2.5 rounded-2xl bg-white/10 text-emerald-300">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {formatCurrency(summary.balance)}
            </div>
            <p className="text-xs text-emerald-200/80 mt-1">
              Reconciled across bank & cash accounts
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Type Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setTypeFilter('credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              typeFilter === 'credit' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Credits Only
          </button>
          <button
            onClick={() => setTypeFilter('debit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              typeFilter === 'debit' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Debits Only
          </button>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full md:w-auto"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search description, category, or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Ledger Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description / Reference</th>
                <th className="py-3.5 px-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No ledger transactions matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 text-slate-600 whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={item.type} size="sm">
                        {item.type}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.category}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-lg">
                      {item.description}
                    </td>

                    <td
                      className={`py-3.5 px-6 text-right font-extrabold text-sm whitespace-nowrap ${
                        item.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {item.type === 'credit' ? '+' : '-'} {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Transaction Entry Drawer / Modal */}
      <Modal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        title="Post Manual Transaction Entry"
        description="Record offline donations, cash dues, or mosque operational expenditures into the ledger."
      >
        <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
          {/* Credit vs Debit Toggle */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Transaction Nature *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEntryType('credit');
                  if (category === 'Electricity' || category === 'Maintenance') setCategory('Donation');
                }}
                className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  entryType === 'credit'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-100'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                Credit (Income / Inflow)
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryType('debit');
                  if (category === 'House Monthly Due' || category === 'Donation') setCategory('Maintenance');
                }}
                className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  entryType === 'debit'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-100'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-rose-600" />
                Debit (Expense / Outflow)
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              {entryType === 'credit' ? (
                <>
                  <option value="Donation">Public / Well-wisher Donation</option>
                  <option value="House Monthly Due">House Monthly Due (Offline Cash)</option>
                  <option value="Madrasa Collection">Madrasa Education Fund</option>
                  <option value="Friday Collection">Friday Jumua Collection</option>
                  <option value="Sponsorship">Special Ward Sponsorship</option>
                </>
              ) : (
                <>
                  <option value="Maintenance">Mosque / Madrasa Maintenance</option>
                  <option value="Electricity">KSEB Electricity & Water</option>
                  <option value="Relief Aid">Medical & Relief Financial Aid</option>
                  <option value="Salaries">Staff / Imam / Muazzin Stipend</option>
                  <option value="Sound System">Azaan Speaker & Sound Repair</option>
                  <option value="Cleaning">Sanitation & Hygiene Supplies</option>
                </>
              )}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Amount (INR ₹) *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none font-bold"
              required
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Audit Description & Purpose *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Offline cash contribution by sponsor or Invoice #489 paid for minaret repair"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEntryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Post to Ledger
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
