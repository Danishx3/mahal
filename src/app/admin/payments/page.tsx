'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { PaymentDue, HouseWithDetails, DIVISION_LABELS, Division } from '@/lib/supabase/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/context/AuthContext';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  ExternalLink,
  MapPin,
  Calendar,
  AlertCircle,
  Check,
  RefreshCw,
  QrCode,
  Settings,
  Coins,
  History,
} from 'lucide-react';
import { DuesSettings } from '@/lib/data-service';

import { UpiQrCode } from '@/components/shared/UpiQrCode';

export default function PaymentVerificationHub() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewQueue, setReviewQueue] = useState<{ due: PaymentDue; house: HouseWithDetails }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UPI Settings state
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [upiSettings, setUpiSettings] = useState<{
    upiId: string;
    payeeName: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  }>({
    upiId: 'kunjikkulam@upi',
    payeeName: "Kunjikkulam Juma Masjid",
    bankName: 'State Bank of India',
    accountNumber: '123456789012',
    ifscCode: 'SBIN0001234',
  });

  // Modal form fields
  const [formUpiId, setFormUpiId] = useState('');
  const [formPayeeName, setFormPayeeName] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formIfscCode, setFormIfscCode] = useState('');

  // Monthly Due Fee Settings state
  const [duesModalOpen, setDuesModalOpen] = useState(false);
  const [isSavingDues, setIsSavingDues] = useState(false);
  const [newDueAmount, setNewDueAmount] = useState('100');
  const [duesSettings, setDuesSettings] = useState<DuesSettings>({
    defaultAmount: 100,
    currentAmount: 100,
    history: [],
    updatedAt: new Date().toISOString(),
  });
  const [duesSchedule, setDuesSchedule] = useState({
    currentMonth: new Date().toISOString().slice(0, 7),
    currentAmount: 100,
    nextMonth: '',
    nextAmount: 100,
    isPendingChange: false,
  });

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDueId, setSelectedDueId] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const loadDues = async () => {
    try {
      const s = await DataService.getDuesSettingsAsync();
      setDuesSettings(s);
      const sched = DataService.getNextMonthSchedule();
      setDuesSchedule(sched);
      setNewDueAmount(String(sched.isPendingChange ? sched.nextAmount : sched.currentAmount));
    } catch {}
  };

  const loadUpi = async () => {
    try {
      const s = await DataService.getUpiSettingsAsync();
      if (s && s.upiId) {
        setUpiSettings(s);
        setFormUpiId(s.upiId);
        setFormPayeeName(s.payeeName);
        setFormBankName(s.bankName || '');
        setFormAccountNumber(s.accountNumber || '');
        setFormIfscCode(s.ifscCode || '');
      }
    } catch {}
  };

  const loadQueue = async (manual = false) => {
    try {
      if (manual) {
        setIsRefreshing(true);
      }
      const list = await DataService.getPaymentsUnderReviewAsync();
      setReviewQueue(list);
      if (manual) {
        toast(`Verification queue updated: ${list.length} payment(s) awaiting review.`, 'info');
      }
    } catch (err) {
      console.warn('Error syncing payments review queue from Supabase:', err);
      setReviewQueue(DataService.getPaymentsUnderReview());
    } finally {
      if (manual) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadQueue(false);
    loadUpi();
    loadDues();

    const interval = setInterval(() => {
      loadQueue(false);
    }, 15000);

    const handleDataUpdated = () => {
      loadQueue(false);
      loadDues();
    };

    const handleUpiUpdated = (e: any) => {
      if (e.detail) {
        setUpiSettings(e.detail);
      }
    };

    const handleDuesUpdated = (e: any) => {
      if (e.detail) {
        setDuesSettings(e.detail);
        const sched = DataService.getNextMonthSchedule();
        setDuesSchedule(sched);
      }
    };

    window.addEventListener('mahallu_data_updated', handleDataUpdated);
    window.addEventListener('mahallu_upi_updated', handleUpiUpdated);
    window.addEventListener('mahallu_dues_updated', handleDuesUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mahallu_data_updated', handleDataUpdated);
      window.removeEventListener('mahallu_upi_updated', handleUpiUpdated);
      window.removeEventListener('mahallu_dues_updated', handleDuesUpdated);
    };
  }, []);

  const handleSaveMonthlyDue = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newDueAmount);
    if (isNaN(val) || val <= 0) {
      toast('Please enter a valid monthly amount greater than 0', 'error');
      return;
    }

    setIsSavingDues(true);
    try {
      const updated = await DataService.saveMonthlyDueAmountAsync(val, user?.id || 'admin');
      setDuesSettings(updated);
      const sched = DataService.getNextMonthSchedule();
      setDuesSchedule(sched);
      setDuesModalOpen(false);
      toast(
        `Monthly due updated to ₹${val}! This will be collected starting from ${sched.nextMonth} onwards.`,
        'success'
      );
    } catch (err: any) {
      toast(err?.message || 'Failed to update monthly dues', 'error');
    } finally {
      setIsSavingDues(false);
    }
  };

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = formUpiId.trim().toLowerCase();
    if (!cleanId || !cleanId.includes('@')) {
      toast('Please enter a valid UPI ID containing "@" (e.g., alhudamahallu@upi)', 'error');
      return;
    }

    setIsSavingUpi(true);
    try {
      const updated = await DataService.saveUpiSettingsAsync({
        upiId: cleanId,
        payeeName: formPayeeName.trim() || "Kunjikkulam Juma Masjid",
        bankName: formBankName.trim() || undefined,
        accountNumber: formAccountNumber.trim() || undefined,
        ifscCode: formIfscCode.trim() || undefined,
      });

      setUpiSettings(updated);
      setUpiModalOpen(false);
      toast(`Mahallu UPI ID updated successfully to ${updated.upiId}!`, 'success');
    } catch (err: any) {
      toast(err?.message || 'Failed to save UPI settings', 'error');
    } finally {
      setIsSavingUpi(false);
    }
  };

  const handleCopy = (ref: string, dueId: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedId(dueId);
    toast(`Copied Transaction ID: ${ref}`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (dueId: string, houseRegNo: string) => {
    // Optimistically remove from review queue for instant UI response
    setReviewQueue((prev) => prev.filter((item) => item.due.id !== dueId && item.due.billing_month !== dueId));
    const success = await DataService.verifyPayment(dueId, user?.id);
    if (success) {
      toast(
        `Payment for ${houseRegNo} approved! Automatic credit posted to Financial Ledger.`,
        'success'
      );
      await loadQueue(false);
    } else {
      toast('Failed to verify payment', 'error');
      await loadQueue(false);
    }
  };

  const handleOpenReject = (dueId: string) => {
    setSelectedDueId(dueId);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDueId || isRejecting) return;

    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      toast('Please enter a rejection reason', 'error');
      return;
    }

    try {
      setIsRejecting(true);
      // Optimistically remove from queue immediately
      setReviewQueue((prev) => prev.filter((item) => item.due.id !== selectedDueId && item.due.billing_month !== selectedDueId));

      const success = await DataService.rejectPayment(selectedDueId, trimmedReason, user?.id);
      if (success) {
        toast('Payment marked failed. Explanation returned to resident dashboard.', 'info');
        setRejectModalOpen(false);
        setRejectionReason('');
        await loadQueue(false);
      } else {
        toast('Failed to reject payment', 'error');
        await loadQueue(false);
      }
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Payment Verification Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
              {reviewQueue.length} Under Review
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time queue of monthly dues submissions. Reconcile UPI / UTR transaction IDs against bank records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadQueue(true)}
            disabled={isRefreshing}
            className="gap-2 text-xs border-slate-200 hover:bg-slate-50 text-slate-700 font-medium shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            {isRefreshing ? 'Syncing...' : 'Sync Queue'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewDueAmount(String(duesSchedule.isPendingChange ? duesSchedule.nextAmount : duesSchedule.currentAmount));
              setDuesModalOpen(true);
            }}
            className="gap-2 text-xs bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs cursor-pointer"
          >
            <Coins className="h-3.5 w-3.5 text-emerald-700" />
            <span>Monthly Fee: ₹{duesSchedule.currentAmount}/mo</span>
            {duesSchedule.isPendingChange && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold border border-amber-300">
                ₹{duesSchedule.nextAmount} from {duesSchedule.nextMonth}
              </span>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormUpiId(upiSettings.upiId);
              setFormPayeeName(upiSettings.payeeName);
              setFormBankName(upiSettings.bankName || '');
              setFormAccountNumber(upiSettings.accountNumber || '');
              setFormIfscCode(upiSettings.ifscCode || '');
              setUpiModalOpen(true);
            }}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5" />
            Mahallu UPI Settings
          </Button>
        </div>
      </div>

      {/* Configuration Cards: UPI Receiving Account + Monthly Fee Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Mahallu UPI Account & QR Banner */}
        <div className="lg:col-span-2 bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-white/10 text-emerald-300 border border-white/10 shrink-0">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                  Official Mahallu Receiving Account
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  Active
                </span>
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-white mt-0.5 flex items-center gap-2">
                <span>{upiSettings.upiId}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(upiSettings.upiId);
                    toast(`Copied UPI ID: ${upiSettings.upiId}`, 'success');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-emerald-300 hover:text-white cursor-pointer"
                  title="Copy UPI ID"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-emerald-100/70 mt-0.5">
                Payee: <strong>{upiSettings.payeeName}</strong>
                {upiSettings.bankName && ` • ${upiSettings.bankName}`}
                {upiSettings.accountNumber && ` (A/C: ${upiSettings.accountNumber})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormUpiId(upiSettings.upiId);
                setFormPayeeName(upiSettings.payeeName);
                setFormBankName(upiSettings.bankName || '');
                setFormAccountNumber(upiSettings.accountNumber || '');
                setFormIfscCode(upiSettings.ifscCode || '');
                setUpiModalOpen(true);
              }}
              className="w-full sm:w-auto text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              Configure UPI ID & QR
            </Button>
          </div>
        </div>

        {/* Monthly Due Policy Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-emerald-700" />
                Monthly Due Rate
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Active Tier
              </span>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-slate-900">
                ₹{duesSchedule.currentAmount}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ house / month</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-0.5">
              {duesSchedule.isPendingChange ? (
                <span className="text-amber-800 font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                  Scheduled: ₹{duesSchedule.nextAmount} from {duesSchedule.nextMonth} onwards
                </span>
              ) : (
                <span className="text-slate-500">
                  Updates submitted this month apply from next month onwards
                </span>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewDueAmount(String(duesSchedule.isPendingChange ? duesSchedule.nextAmount : duesSchedule.currentAmount));
              setDuesModalOpen(true);
            }}
            className="w-full text-xs font-semibold border-slate-300 text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 gap-1.5 cursor-pointer"
          >
            <Coins className="h-3.5 w-3.5 text-emerald-700" />
            Update Monthly Fee
          </Button>
        </div>
      </div>

      {/* Verification Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Household & Division</th>
                <th className="py-3.5 px-4">Billing Month</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Transaction UTR / Ref</th>
                <th className="py-3.5 px-4">Submitted Time</th>
                <th className="py-3.5 px-6 text-right">Verification Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviewQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        Payment Queue Reconciled
                      </p>
                      <p className="text-xs text-slate-400">
                        All resident payment references have been processed and reconciled into the financial ledger.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reviewQueue.map(({ due, house }) => {
                  const isCopied = copiedId === due.id;
                  return (
                    <tr key={due.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">{house.house_name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <span className="text-emerald-800 font-semibold">{house.mahallu_reg_no}</span>
                          <span>•</span>
                          <span>{DIVISION_LABELS[house.division as Division]}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {due.billing_month}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatCurrency(due.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-800 font-semibold text-xs">
                          <span>{due.transaction_ref || 'N/A'}</span>
                          {due.transaction_ref && (
                            <button
                              onClick={() => handleCopy(due.transaction_ref!, due.id)}
                              className="p-0.5 text-slate-400 hover:text-emerald-700 transition-colors"
                              title="Copy Transaction ID"
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDateTime(due.submitted_at)}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(due.id, house.mahallu_reg_no)}
                            className="gap-1.5 bg-emerald-700 hover:bg-emerald-800"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve & Post Credit
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleOpenReject(due.id)}
                            className="gap-1.5"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
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

      {/* Reject Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Mark Payment as Failed / Rejected"
        description="Explain why this transaction could not be reconciled (e.g., UTR not found in bank statement, duplicate submission, incorrect amount)."
      >
        <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Rejection Explanation *
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Transaction reference not credited to Mahallu bank account, invalid UTR number format, or payment disputed."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!isRejecting) setRejectModalOpen(false);
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Configure Mahallu UPI ID Modal */}
      <Modal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        title="Configure Mahallu UPI & Receiving Account"
        description="Update the official UPI ID and bank details used for resident dues collection and QR codes"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveUpi} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Left Column: Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mahallu UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. alhudamahallu@upi or 9847012345@okbizaxis"
                  value={formUpiId}
                  onChange={(e) => setFormUpiId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Must include &apos;@&apos; (Google Pay, PhonePe, Paytm, BHIM VPA).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payee Organization Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kunjikkulam Juma Masjid"
                  value={formPayeeName}
                  onChange={(e) => setFormPayeeName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. State Bank of India"
                  value={formBankName}
                  onChange={(e) => setFormBankName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={formAccountNumber}
                    onChange={(e) => setFormAccountNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    IFSC Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={formIfscCode}
                    onChange={(e) => setFormIfscCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Real-time Live QR Code Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Live QR Code Preview
              </span>
              <p className="text-[11px] text-slate-400">
                This exact QR code will be generated for residents paying ₹100 dues.
              </p>

              <div className="py-2">
                <UpiQrCode
                  upiId={formUpiId.trim() || 'alhudamahallu@upi'}
                  payeeName={formPayeeName.trim() || "Kunjikkulam Juma Masjid"}
                  amount={100}
                  note="Mahallu Monthly Dues Preview"
                  size={140}
                  showDetails={false}
                  showOpenAppButton={false}
                />
              </div>

              <span className="font-mono text-xs text-emerald-900 font-bold">
                {formUpiId.trim() || 'alhudamahallu@upi'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUpiModalOpen(false)}
              disabled={isSavingUpi}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingUpi}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              Save UPI Settings
            </Button>
          </div>
        </form>
      </Modal>

      {/* Monthly Due Fee Configuration Modal */}
      <Modal
        isOpen={duesModalOpen}
        onClose={() => setDuesModalOpen(false)}
        title="Configure Monthly Household Due"
        maxWidth="md"
      >
        <form onSubmit={handleSaveMonthlyDue} className="space-y-4 text-xs">
          {/* Policy Notice Callout */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
              <span>Next-Month Collection Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              Fee updates submitted during this month (<strong>{duesSchedule.currentMonth}</strong>) will be collected starting from <strong>{duesSchedule.nextMonth} onwards</strong>.
              Dues for current and past months remain locked at their original rate.
            </p>
          </div>

          {/* Rate Comparison Box */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/60 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Current Month ({duesSchedule.currentMonth})
              </span>
              <span className="text-lg font-black text-slate-800 block mt-0.5">
                ₹{duesSchedule.currentAmount}
              </span>
              <span className="text-[10px] text-slate-400">Locked rate</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                Next Month ({duesSchedule.nextMonth})
              </span>
              <span className="text-lg font-black text-emerald-800 block mt-0.5">
                ₹{Number(newDueAmount) > 0 ? newDueAmount : duesSchedule.currentAmount}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Effective rate</span>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              New Monthly Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={newDueAmount}
                onChange={(e) => setNewDueAmount(e.target.value)}
                placeholder="e.g. 100"
                required
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            {/* Quick preset amounts */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-500 font-medium mr-1">Quick select:</span>
              {[50, 100, 150, 200, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setNewDueAmount(String(amt))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    newDueAmount === String(amt)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Standard recurring membership due assessed to every approved household.
            </p>
          </div>

          {/* Adjustment History if available */}
          {duesSettings.history && duesSettings.history.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="font-bold text-[11px] text-slate-700 mb-1.5 flex items-center gap-1">
                <History className="h-3 w-3 text-slate-400" />
                Adjustment History
              </p>
              <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-slate-600 pr-1">
                {duesSettings.history.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span>Effective: <strong>{h.effectiveFromMonth}</strong></span>
                    <span className="font-bold text-slate-900">₹{h.amount} / mo</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDuesModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingDues}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              Confirm & Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
