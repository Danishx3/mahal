'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { HouseWithDetails, Division, DIVISION_LABELS } from '@/lib/supabase/types';
import { divisions } from '@/lib/schemas';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  AlertTriangle,
  Mail,
  Send,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  Phone,
  FileSpreadsheet,
} from 'lucide-react';

export default function PaymentDefaultersPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [defaulters, setDefaulters] = useState<{ house: HouseWithDetails; due: any }[]>([]);

  // Batch reminder modal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedHouseIds, setSelectedHouseIds] = useState<string[]>([]);

  const loadDefaulters = () => {
    const list = DataService.getDefaulters(selectedMonth, selectedDivision);
    setDefaulters(list);
    setSelectedHouseIds(list.map((d) => d.house.id));
  };

  useEffect(() => {
    loadDefaulters();
    window.addEventListener('mahallu_data_updated', loadDefaulters);
    return () => window.removeEventListener('mahallu_data_updated', loadDefaulters);
  }, [selectedMonth, selectedDivision]);

  // Filter by search query
  const filteredList = defaulters.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.house.house_name.toLowerCase().includes(q) ||
      d.house.mahallu_reg_no.toLowerCase().includes(q) ||
      d.house.house_number.toLowerCase().includes(q) ||
      d.house.phone.includes(q)
    );
  });

  const totalOutstanding = filteredList.length * 100;

  const handleToggleSelect = (houseId: string) => {
    setSelectedHouseIds((prev) =>
      prev.includes(houseId) ? prev.filter((id) => id !== houseId) : [...prev, houseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedHouseIds.length === filteredList.length) {
      setSelectedHouseIds([]);
    } else {
      setSelectedHouseIds(filteredList.map((d) => d.house.id));
    }
  };

  const handleSendBatchReminders = () => {
    if (selectedHouseIds.length === 0) {
      toast('Please select at least one household to dispatch reminder', 'error');
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setReminderModalOpen(false);
      toast(
        `Dispatched payment reminders (Email & SMS notifications) to ${selectedHouseIds.length} households!`,
        'success'
      );
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Payment Defaulters & Outstanding Dues
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 text-xs font-bold">
              {filteredList.length} Outstanding
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify households with unpaid monthly membership dues and dispatch automated batch payment reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => setReminderModalOpen(true)}
            disabled={selectedHouseIds.length === 0}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800"
          >
            <Send className="h-4 w-4" />
            Send Email / SMS Reminders ({selectedHouseIds.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Billing Month Cycle
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-emerald-700" />
            {selectedMonth}
          </div>
          <p className="text-xs text-slate-500 mt-1">Standard ₹100/mo per household</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Unpaid / Defaulter Houses
          </span>
          <div className="text-2xl font-extrabold text-rose-700 mt-2">
            {filteredList.length} Houses
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Out of approved Mahallu registered houses
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Outstanding Balance
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(totalOutstanding)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Anticipated collection deficit</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Month Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full md:w-auto"
          >
            <option value="2026-09">2026-09 (Current)</option>
            <option value="2026-08">2026-08 (Last Month)</option>
            <option value="2026-07">2026-07 (July 2026)</option>
          </select>
        </div>

        {/* Division Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Division:</label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full md:w-auto"
          >
            <option value="all">All Divisions (6)</option>
            {divisions.map((div) => (
              <option key={div} value={div}>
                {DIVISION_LABELS[div]}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search house name, reg no, ward or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Defaulters Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedHouseIds.length === filteredList.length && filteredList.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Reg No</th>
                <th className="py-3.5 px-4">House Name & Ward</th>
                <th className="py-3.5 px-4">Division</th>
                <th className="py-3.5 px-4">Primary Contact</th>
                <th className="py-3.5 px-4">Status for {selectedMonth}</th>
                <th className="py-3.5 px-4 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        Zero Outstanding Defaulters!
                      </p>
                      <p className="text-xs text-slate-400">
                        All registered houses have cleared their dues for month {selectedMonth}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map(({ house, due }) => {
                  const isSelected = selectedHouseIds.includes(house.id);
                  const isUnderReview = due?.status === 'under_review';
                  return (
                    <tr
                      key={house.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(house.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                        {house.mahallu_reg_no}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{house.house_name}</div>
                        <div className="text-[11px] text-slate-500">Ward: {house.house_number}</div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {DIVISION_LABELS[house.division as Division]}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {house.phone}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isUnderReview ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                            <Clock className="h-3 w-3" />
                            UTR Under Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-semibold border border-rose-200">
                            <AlertTriangle className="h-3 w-3" />
                            Unpaid
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        ₹100.00
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Email/SMS Reminder Modal */}
      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title="Dispatch Batch Dues Payment Reminders"
        description={`Send reminder notification to ${selectedHouseIds.length} selected household contacts for ${selectedMonth}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="font-bold text-slate-800">Preview Message Template:</p>
            <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono leading-relaxed">
              &ldquo;Assalamu Alaikum. This is a gentle reminder from Al-Huda Mahallu Jama&apos;ath regarding monthly membership dues of ₹100 for period {selectedMonth}. Kindly transfer via UPI to alhudamahallu@upi and submit your UTR reference on the portal. Jazakallahu Khair.&rdquo;
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setReminderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSendBatchReminders}
              isLoading={isSending}
              className="gap-2 bg-emerald-700 hover:bg-emerald-800"
            >
              <Send className="h-4 w-4" />
              Transmit Batch Reminders
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
