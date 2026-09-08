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
} from 'lucide-react';

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
    upiId: 'alhudamahallu@upi',
    payeeName: "Al-Huda Mahallu Jama'ath",
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

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDueId, setSelectedDueId] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

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

    const interval = setInterval(() => {
      loadQueue(false);
    }, 15000);

    const handleDataUpdated = () => {
      loadQueue(false);
    };

    const handleUpiUpdated = (e: any) => {
      if (e.detail) {
        setUpiSettings(e.detail);
      }
    };

    window.addEventListener('mahallu_data_updated', handleDataUpdated);
    window.addEventListener('mahallu_upi_updated', handleUpiUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mahallu_data_updated', handleDataUpdated);
      window.removeEventListener('mahallu_upi_updated', handleUpiUpdated);
    };
  }, []);

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
        payeeName: formPayeeName.trim() || "Al-Huda Mahallu Jama'ath",
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
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
          >
            <QrCode className="h-3.5 w-3.5" />
            Mahallu UPI Settings
          </Button>
        </div>
      </div>

      {/* Active Mahallu UPI Account & QR Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                className="p-1 hover:bg-white/10 rounded transition-colors text-emerald-300 hover:text-white"
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
            className="w-full sm:w-auto text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            Configure UPI ID & QR
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
                  placeholder="e.g. Al-Huda Mahallu Jama'ath"
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
                  payeeName={formPayeeName.trim() || "Al-Huda Mahallu Jama'ath"}
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
    </div>
  );
}
