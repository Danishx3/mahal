'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { PaymentDue, HouseWithDetails, DIVISION_LABELS, Division } from '@/lib/supabase/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
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
} from 'lucide-react';

export default function PaymentVerificationHub() {
  const { toast } = useToast();
  const [reviewQueue, setReviewQueue] = useState<{ due: PaymentDue; house: HouseWithDetails }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDueId, setSelectedDueId] = useState<string | null>(null);

  const loadQueue = () => {
    const list = DataService.getPaymentsUnderReview();
    setReviewQueue(list);
  };

  useEffect(() => {
    loadQueue();
    window.addEventListener('mahallu_data_updated', loadQueue);
    return () => window.removeEventListener('mahallu_data_updated', loadQueue);
  }, []);

  const handleCopy = (ref: string, dueId: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedId(dueId);
    toast(`Copied Transaction ID: ${ref}`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = (dueId: string, houseRegNo: string) => {
    const success = DataService.verifyPayment(dueId);
    if (success) {
      toast(
        `Payment for ${houseRegNo} approved! Automatic credit posted to Financial Ledger.`,
        'success'
      );
      loadQueue();
    } else {
      toast('Failed to verify payment', 'error');
    }
  };

  const handleOpenReject = (dueId: string) => {
    setSelectedDueId(dueId);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDueId) return;

    if (!rejectionReason.trim()) {
      toast('Please enter a rejection reason', 'error');
      return;
    }

    const success = DataService.rejectPayment(selectedDueId, rejectionReason.trim());
    if (success) {
      toast('Payment marked failed. Explanation returned to resident dashboard.', 'info');
      setRejectModalOpen(false);
      loadQueue();
    } else {
      toast('Failed to reject payment', 'error');
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
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
