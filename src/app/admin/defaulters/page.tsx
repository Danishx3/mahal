'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { HouseWithDetails, Division, DIVISION_LABELS } from '@/lib/supabase/types';
import { divisions } from '@/lib/schemas';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/context/AuthContext';
import {
  AlertTriangle,
  Mail,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Phone,
  MessageSquare,
  Copy,
  Check,
} from 'lucide-react';

function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  return clean;
}

function getReminderMessage(houseName: string, regNo: string, month: string, upiId = 'alhudamahallu@upi'): string {
  return `Assalamu Alaikum. This is a gentle reminder from Al-Huda Mahallu Jama'ath for ${houseName} (${regNo}) regarding monthly membership dues of ₹100 for the period ${month}. Kindly transfer via UPI to ${upiId} and submit your UTR reference on the portal. Jazakallahu Khair.`;
}

function getWhatsAppUrl(phone: string, houseName: string, regNo: string, month: string, upiId?: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const msg = getReminderMessage(houseName, regNo, month, upiId);
  if (!cleanPhone) return '';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

const ALL_MONTHS = [
  { value: '01', label: '01 - January', num: 1 },
  { value: '02', label: '02 - February', num: 2 },
  { value: '03', label: '03 - March', num: 3 },
  { value: '04', label: '04 - April', num: 4 },
  { value: '05', label: '05 - May', num: 5 },
  { value: '06', label: '06 - June', num: 6 },
  { value: '07', label: '07 - July', num: 7 },
  { value: '08', label: '08 - August', num: 8 },
  { value: '09', label: '09 - September', num: 9 },
  { value: '10', label: '10 - October', num: 10 },
  { value: '11', label: '11 - November', num: 11 },
  { value: '12', label: '12 - December', num: 12 },
];

export default function PaymentDefaultersPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Current calendar thresholds (prevent future months and years)
  const currentDate = new Date();
  const currentYearNum = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1; // 1 to 12
  const currentYearStr = String(currentYearNum);
  const currentMonthStr = String(currentMonthNum).padStart(2, '0');

  // Available past & current years only (no future years)
  const availableYears = React.useMemo(() => {
    const years: string[] = [];
    for (let y = currentYearNum; y >= currentYearNum - 3; y--) {
      years.push(String(y));
    }
    return years;
  }, [currentYearNum]);

  // Month & Year selection (defaults to current year and current month)
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonthNum, setSelectedMonthNum] = useState(currentMonthStr);
  const selectedMonth = `${selectedYear}-${selectedMonthNum}`;

  // Available months: if current year is selected, only show up to current month (no future months)
  const availableMonths = React.useMemo(() => {
    if (selectedYear === currentYearStr) {
      return ALL_MONTHS.filter((m) => m.num <= currentMonthNum);
    }
    return ALL_MONTHS;
  }, [selectedYear, currentYearStr, currentMonthNum]);

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    // If switching to current year, ensure selected month isn't in future
    if (newYear === currentYearStr && parseInt(selectedMonthNum, 10) > currentMonthNum) {
      setSelectedMonthNum(currentMonthStr);
    }
  };

  // Status & Division & Search Filters
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unpaid' | 'under_review' | 'verified'>('all');
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // All houses data for selected month & division
  const [allHousesData, setAllHousesData] = useState<{ house: HouseWithDetails; due: any }[]>([]);

  // Action states
  const [markingPaidHouseId, setMarkingPaidHouseId] = useState<string | null>(null);
  const [isBatchMarking, setIsBatchMarking] = useState(false);

  // Batch reminder modal state
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [sendingHouseEmailId, setSendingHouseEmailId] = useState<string | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<{
    configured: boolean;
    user?: string | null;
    host?: string;
    from?: string;
  } | null>(null);

  const [selectedHouseIds, setSelectedHouseIds] = useState<string[]>([]);
  const [remindedHouseIds, setRemindedHouseIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeUpiId, setActiveUpiId] = useState('alhudamahallu@upi');
  const [reminderMessage, setReminderMessage] = useState('');

  const loadHouses = async () => {
    const list = await DataService.getHouseDuesAsync(selectedMonth, selectedDivision, 'all');
    setAllHousesData(list);
    // Pre-select unpaid houses for convenience
    const unpaidIds = list
      .filter((d) => !d.due || d.due.status === 'pending' || d.due.status === 'failed')
      .map((d) => d.house.id);
    setSelectedHouseIds(unpaidIds);
  };

  useEffect(() => {
    loadHouses();
    window.addEventListener('mahallu_data_updated', loadHouses);
    return () => window.removeEventListener('mahallu_data_updated', loadHouses);
  }, [selectedMonth, selectedDivision]);

  useEffect(() => {
    fetch('/api/admin/reminders/send-email')
      .then((res) => res.json())
      .then((data) => {
        if (data.smtp) setSmtpStatus(data.smtp);
      })
      .catch(() => {});

    DataService.getUpiSettingsAsync().then((s) => {
      if (s?.upiId) setActiveUpiId(s.upiId);
    });

    const handleUpiUpdated = (e: any) => {
      if (e.detail?.upiId) setActiveUpiId(e.detail.upiId);
    };
    window.addEventListener('mahallu_upi_updated', handleUpiUpdated);
    return () => window.removeEventListener('mahallu_upi_updated', handleUpiUpdated);
  }, []);

  useEffect(() => {
    setReminderMessage(
      `Assalamu Alaikum. This is a gentle reminder from Al-Huda Mahallu Jama'ath regarding monthly membership dues of ₹100 for period ${selectedMonth}. Kindly transfer via UPI to ${activeUpiId} and submit your UTR reference on the portal. Jazakallahu Khair.`
    );
  }, [selectedMonth, activeUpiId]);

  // Derived counts
  const unpaidHouses = allHousesData.filter(
    (d) => !d.due || d.due.status === 'pending' || d.due.status === 'failed'
  );
  const underReviewHouses = allHousesData.filter((d) => d.due?.status === 'under_review');
  const verifiedHouses = allHousesData.filter((d) => d.due?.status === 'verified');

  const unpaidCount = unpaidHouses.length;
  const underReviewCount = underReviewHouses.length;
  const verifiedCount = verifiedHouses.length;
  const totalOutstanding = (unpaidCount + underReviewCount) * 100;
  const totalCollected = verifiedCount * 100;

  // Filter by selected status
  const statusFilteredList = allHousesData.filter((d) => {
    if (selectedStatus === 'unpaid') {
      return !d.due || d.due.status === 'pending' || d.due.status === 'failed';
    }
    if (selectedStatus === 'under_review') {
      return d.due?.status === 'under_review';
    }
    if (selectedStatus === 'verified') {
      return d.due?.status === 'verified';
    }
    return true; // 'all'
  });

  // Filter by search query
  const filteredList = statusFilteredList.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.house.house_name.toLowerCase().includes(q) ||
      d.house.mahallu_reg_no.toLowerCase().includes(q) ||
      d.house.house_number.toLowerCase().includes(q) ||
      d.house.phone.includes(q)
    );
  });

  // Selected unpaid defaulters for reminders
  const selectedDefaulters = filteredList.filter(
    (d) => selectedHouseIds.includes(d.house.id) && d.due?.status !== 'verified'
  );
  const selectedEmails = selectedDefaulters
    .map((d) => d.house.profile?.email || '')
    .filter(Boolean);

  const unpaidSelectedCount = filteredList.filter(
    (d) => selectedHouseIds.includes(d.house.id) && d.due?.status !== 'verified'
  ).length;

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

  // Mark a single house as paid
  const handleMarkAsPaid = async (house: HouseWithDetails) => {
    setMarkingPaidHouseId(house.id);
    try {
      const ok = await DataService.markHouseDueAsPaidAsync(
        house.id,
        selectedMonth,
        user?.id || 'admin',
        'Cash / Offline'
      );
      if (ok) {
        toast(
          `Payment for ${house.house_name} (${house.mahallu_reg_no}) marked as Paid! Credit posted to Financial Ledger.`,
          'success'
        );
        await loadHouses();
      } else {
        toast('Failed to record payment', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error recording payment', 'error');
    } finally {
      setMarkingPaidHouseId(null);
    }
  };

  // Batch mark selected unpaid houses as paid
  const handleBatchMarkAsPaid = async () => {
    const toMark = filteredList
      .filter((d) => selectedHouseIds.includes(d.house.id) && d.due?.status !== 'verified')
      .map((d) => d.house);

    if (toMark.length === 0) {
      toast('No unpaid households selected to mark as paid', 'info');
      return;
    }

    setIsBatchMarking(true);
    try {
      let count = 0;
      for (const h of toMark) {
        const ok = await DataService.markHouseDueAsPaidAsync(
          h.id,
          selectedMonth,
          user?.id || 'admin',
          'Cash / Offline'
        );
        if (ok) count++;
      }
      toast(
        `Successfully marked ${count} household(s) as Paid! Automatic credits posted to Financial Ledger.`,
        'success'
      );
      await loadHouses();
    } catch (err: any) {
      toast(err.message || 'Error marking batch payments', 'error');
    } finally {
      setIsBatchMarking(false);
    }
  };

  const handleCopySingle = (house: HouseWithDetails) => {
    const text = getReminderMessage(house.house_name, house.mahallu_reg_no, selectedMonth, activeUpiId);
    navigator.clipboard.writeText(text);
    setCopiedId(house.id);
    toast(`Copied reminder message for ${house.house_name}!`, 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendSingleEmail = async (house: HouseWithDetails) => {
    const email = house.profile?.email;
    if (!email) {
      toast('No registered email found for this household', 'error');
      return;
    }

    setSendingHouseEmailId(house.id);
    try {
      const res = await fetch('/api/admin/reminders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          customMessage: reminderMessage,
          recipients: [
            {
              houseId: house.id,
              houseName: house.house_name,
              regNo: house.mahallu_reg_no,
              email,
              amount: 100,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch email');
      }

      setRemindedHouseIds((prev) => new Set(prev).add(house.id));
      const isSim = data.results?.[0]?.simulated;
      toast(
        isSim
          ? `Automated reminder logged (Preview Mode) for ${email}`
          : `Automated reminder email sent to ${email}!`,
        'success'
      );
    } catch (err: any) {
      toast(err.message || 'Error sending email', 'error');
    } finally {
      setSendingHouseEmailId(null);
    }
  };

  const handleSendBatchAutomatedEmails = async () => {
    const recipients = selectedDefaulters
      .filter((d) => Boolean(d.house.profile?.email))
      .map((d) => ({
        houseId: d.house.id,
        houseName: d.house.house_name,
        regNo: d.house.mahallu_reg_no,
        email: d.house.profile!.email!,
        amount: 100,
      }));

    if (recipients.length === 0) {
      toast('None of the selected households have an email address', 'error');
      return;
    }

    setIsSendingEmails(true);
    try {
      const res = await fetch('/api/admin/reminders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          customMessage: reminderMessage,
          recipients,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch automated emails');
      }

      setRemindedHouseIds((prev) => {
        const next = new Set(prev);
        recipients.forEach((r) => next.add(r.houseId));
        return next;
      });

      const isSim = data.results?.some((r: any) => r.simulated);
      toast(
        isSim
          ? `Automated emails simulated/logged for ${data.sentCount} household(s)!`
          : `Automated reminder emails successfully sent to ${data.sentCount} household(s)!`,
        'success'
      );
      setReminderModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Error dispatching batch emails', 'error');
    } finally {
      setIsSendingEmails(false);
    }
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
              {unpaidCount} Outstanding
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
              {verifiedCount} Paid
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify households with unpaid monthly dues, record direct cash payments, and dispatch automated payment reminders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {unpaidSelectedCount > 0 && (
            <Button
              variant="outline"
              onClick={handleBatchMarkAsPaid}
              disabled={isBatchMarking}
              className="gap-1.5 border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {isBatchMarking ? 'Marking Paid...' : `Mark Selected as Paid (${unpaidSelectedCount})`}
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => setReminderModalOpen(true)}
            disabled={selectedDefaulters.length === 0}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
          >
            <Send className="h-4 w-4" />
            Send Reminders ({selectedDefaulters.length})
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
            {unpaidCount} Houses
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {verifiedCount} paid • {allHousesData.length} registered in {selectedMonth}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Outstanding Balance
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(totalOutstanding)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {formatCurrency(totalCollected)} collected this cycle
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Year Selector */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Month:</label>
          <select
            value={selectedMonthNum}
            onChange={(e) => setSelectedMonthNum(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto"
          >
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto"
          >
            <option value="all">All Statuses ({allHousesData.length})</option>
            <option value="unpaid">Unpaid / Defaulter ({unpaidCount})</option>
            <option value="under_review">Under Review ({underReviewCount})</option>
            <option value="verified">Paid / Verified ({verifiedCount})</option>
          </select>
        </div>

        {/* Division Selector */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Division:</label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto"
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
        <div className="relative flex-1 min-w-[220px] w-full">
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
                <th className="py-3.5 px-4 text-center">Actions / Remind</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedStatus === 'unpaid'
                          ? 'Zero Outstanding Defaulters!'
                          : selectedStatus === 'verified'
                          ? 'No Paid Records Found'
                          : selectedStatus === 'under_review'
                          ? 'No Payments Under Review'
                          : 'No Households Found'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {selectedStatus === 'unpaid'
                          ? `All registered houses have cleared their dues for month ${selectedMonth}.`
                          : `No households match the selected filters for ${selectedMonth}.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map(({ house, due }) => {
                  const isSelected = selectedHouseIds.includes(house.id);
                  const isVerified = due?.status === 'verified';
                  const isUnderReview = due?.status === 'under_review';
                  const hasReminded = remindedHouseIds.has(house.id);
                  const isMarkingThis = markingPaidHouseId === house.id;

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
                          {house.phone || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Paid
                          </span>
                        ) : isUnderReview ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                            <Clock className="h-3 w-3 text-amber-600" />
                            UTR Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-semibold border border-rose-200">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            Unpaid
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {isVerified ? (
                          <span className="text-emerald-700 font-semibold text-[11px]">₹0.00 (Cleared)</span>
                        ) : (
                          <span>₹100.00</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Option to Mark as Paid */}
                          {!isVerified ? (
                            <button
                              onClick={() => handleMarkAsPaid(house)}
                              disabled={isMarkingThis}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors shadow-xs"
                              title={`Mark dues as paid for ${house.house_name}`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {isMarkingThis ? 'Saving...' : 'Mark as Paid'}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              Paid
                            </span>
                          )}

                          {/* WhatsApp Reminder (for non-verified or friendly reminder) */}
                          {house.phone && !isVerified ? (
                            <a
                              href={getWhatsAppUrl(house.phone, house.house_name, house.mahallu_reg_no, selectedMonth, activeUpiId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                setRemindedHouseIds((prev) => new Set(prev).add(house.id))
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors font-semibold text-[11px]"
                              title="Open in WhatsApp with prefilled reminder"
                            >
                              <MessageSquare className="h-3 w-3" />
                              WhatsApp
                            </a>
                          ) : null}

                          {/* Email Reminder */}
                          {house.profile?.email && !isVerified && (
                            <button
                              onClick={() => handleSendSingleEmail(house)}
                              disabled={sendingHouseEmailId === house.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-colors font-semibold text-[11px]"
                              title={`Send automated reminder email to ${house.profile.email}`}
                            >
                              <Mail className="h-3 w-3" />
                              {sendingHouseEmailId === house.id ? 'Sending...' : 'Email'}
                            </button>
                          )}

                          {/* Copy reminder text */}
                          {!isVerified && (
                            <button
                              onClick={() => handleCopySingle(house)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                              title="Copy reminder text"
                            >
                              {copiedId === house.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}

                          {hasReminded && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Sent
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Email Reminder Modal */}
      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title="Dispatch Batch Dues Payment Reminders"
        description={`Send reminder notification to ${selectedDefaulters.length} selected unpaid household contacts for ${selectedMonth}`}
      >
        <div className="space-y-4 text-xs">
          {/* Reminder Message Template */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 text-xs">Reminder Notice Message:</label>
            <textarea
              rows={3}
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Automated Dispatch Status Banner */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Automated Email Dispatch</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-950">
                    {selectedEmails.length} Recipient(s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Sends official HTML dues reminder with UPI details directly to residents&apos; inboxes.
                </p>
              </div>
            </div>

            {smtpStatus?.configured && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                SMTP Active
              </span>
            )}
          </div>

          {/* Selected Households Clean List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Selected Unpaid Households ({selectedDefaulters.length}):
              </span>
              <span className="text-[11px] text-slate-500">
                {selectedEmails.length} with registered email
              </span>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5 divide-y divide-slate-100 border border-slate-200 rounded-xl p-2.5 bg-white">
              {selectedDefaulters.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-xs">No unpaid households selected.</p>
              ) : (
                selectedDefaulters.map(({ house }) => {
                  const hasReminded = remindedHouseIds.has(house.id);
                  return (
                    <div
                      key={house.id}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {house.house_name}{' '}
                          <span className="font-mono text-[11px] text-emerald-800">
                            ({house.mahallu_reg_no})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {house.profile?.email ? (
                            <span className="text-emerald-700 font-medium">
                              {house.profile.email}
                            </span>
                          ) : (
                            house.phone || 'No email registered'
                          )}
                        </div>
                      </div>

                      {hasReminded && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" /> Sent
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Modal Footer: Cleanly contains only Close and Send Automated Reminders */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              {remindedHouseIds.size} of {selectedDefaulters.length} marked reminded
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReminderModalOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSendBatchAutomatedEmails}
                isLoading={isSendingEmails}
                disabled={selectedEmails.length === 0}
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
              >
                <Send className="h-3.5 w-3.5" />
                Send Automated Reminders ({selectedEmails.length})
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
