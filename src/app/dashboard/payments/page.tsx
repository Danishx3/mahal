'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataService } from '@/lib/data-service';
import { HouseWithDetails, PaymentDue, PaymentStatus } from '@/lib/supabase/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DigitalReceipt } from '@/components/resident/DigitalReceipt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/context/AuthContext';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowRight,
  FileText,
  Printer,
  Copy,
  Info,
  Loader2,
  Home,
} from 'lucide-react';

import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function ResidentPaymentCenter() {
  const { toast } = useToast();
  const { user, profile, house: authHouse, isLoading } = useAuth();
  const [house, setHouse] = useState<HouseWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'under_review' | 'verified' | 'failed'>('all');

  // Submit payment modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<PaymentDue | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Digital Receipt modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptDue, setReceiptDue] = useState<PaymentDue | null>(null);

  const loadData = () => {
    if (!user) return;
    // 1. Direct use of authHouse from Supabase via useAuth
    let userHouse = (authHouse as HouseWithDetails | null) || null;

    if (!userHouse && authHouse?.id) {
      userHouse = DataService.getHouseById(authHouse.id) || null;
    }
    if (!userHouse) {
      userHouse = DataService.getHouseByUserId(user.id) || null;
    }
    if (!userHouse) {
      userHouse = DataService.getHouses().find((h) => h.user_id === user.id) || null;
    }

    if (userHouse) {
      if (!userHouse.family_members) userHouse.family_members = [];
      if (!userHouse.payment_dues) userHouse.payment_dues = [];

      // Ensure current billing cycle due exists (e.g. 2026-09) if not already present
      const currentMonth = '2026-09';
      const hasCurrentDue = userHouse.payment_dues.some((d) => d.billing_month === currentMonth);
      if (!hasCurrentDue) {
        DataService.createDueForCurrentMonth(userHouse.id, currentMonth, userHouse);
        const refreshed = DataService.getHouseById(userHouse.id);
        setHouse(refreshed || userHouse);
      } else {
        setHouse(userHouse);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('mahallu_data_updated', loadData);
    return () => window.removeEventListener('mahallu_data_updated', loadData);
  }, [user, authHouse]);

  if (isLoading || !house) {
    return (
      <LoadingScreen
        title="Dues & Receipts Center"
        message="Loading monthly dues, receipts & ledger balances..."
        minHeight="min-h-[60vh]"
      />
    );
  }

  // Calculate Metrics
  const verifiedDues = house.payment_dues.filter((d) => d.status === 'verified');
  const paidTotal = verifiedDues.reduce((sum, d) => sum + Number(d.amount), 0);

  const pendingDues = house.payment_dues.filter((d) => d.status === 'pending');
  const underReviewDues = house.payment_dues.filter((d) => d.status === 'under_review');
  const failedDues = house.payment_dues.filter((d) => d.status === 'failed');

  const pendingAmount = pendingDues.reduce((sum, d) => sum + Number(d.amount), 0);

  // Active Billing Cycle (e.g. Current or earliest pending due)
  const currentMonthDue =
    house.payment_dues.find((d) => d.status === 'pending') ||
    house.payment_dues.find((d) => d.status === 'under_review') ||
    house.payment_dues[house.payment_dues.length - 1];

  // Filter dues by tab
  const filteredDues = house.payment_dues.filter((d) => {
    if (activeTab === 'all') return true;
    return d.status === activeTab;
  });

  const handleOpenSubmitModal = (due: PaymentDue) => {
    setSelectedDue(due);
    setTransactionRef(due.transaction_ref || '');
    setSubmitModalOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue) return;

    if (!transactionRef.trim() || transactionRef.trim().length < 6) {
      toast('Please enter a valid UPI or Bank UTR Transaction ID (minimum 6 characters)', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const success = DataService.submitPayment(selectedDue.id, transactionRef.trim());
      setIsSubmitting(false);
      setSubmitModalOpen(false);

      if (success) {
        toast('Payment reference submitted successfully! Sent to Admin queue for verification.', 'success');
        loadData();
      } else {
        toast('Failed to record submission. Please try again.', 'error');
      }
    }, 400);
  };

  const handleOpenReceipt = (due: PaymentDue) => {
    setReceiptDue(due);
    setReceiptModalOpen(true);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('alhudamahallu@upi');
    toast('UPI VPA copied to clipboard: alhudamahallu@upi', 'success');
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Monthly Dues & Receipts Center
            </h1>
            <p className="text-xs text-slate-500">
              Track your monthly ₹100 contribution, submit UPI transaction references, and download official receipts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="gap-2 text-slate-700 bg-white">
                <Home className="h-4 w-4 text-emerald-700" />
                Household Overview
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards as Requested */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Pending Dues Amount */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending Dues Amount
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-amber-900">
                {formatCurrency(pendingAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {pendingDues.length} month(s) pending payment
              </p>
            </div>
          </div>

          {/* Card 2: Paid Total */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Paid (Reconciled)
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-emerald-800">
                {formatCurrency(paidTotal)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {verifiedDues.length} month(s) verified by Admin
              </p>
            </div>
          </div>

          {/* Card 3: Failed / Rejected Submissions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Failed / Rejected
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-rose-900">
                {failedDues.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {failedDues.length > 0 ? 'Requires re-submission of valid UTR' : 'All submissions in good standing'}
              </p>
            </div>
          </div>
        </div>

        {/* Active Billing Cycle Action Hero Card */}
        {currentMonthDue && (
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
                  <span>Current Billing Period:</span>
                  <span className="font-bold text-white uppercase">{currentMonthDue.billing_month}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Monthly Membership Due: {formatCurrency(currentMonthDue.amount)}
                </h2>
                <p className="text-xs text-emerald-100/80 max-w-xl">
                  Transfer via any UPI app (GPay, PhonePe, Paytm) to the Mahallu account, then enter your 12-digit UPI reference / UTR number below.
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <span className="text-emerald-200 font-mono">UPI ID: alhudamahallu@upi</span>
                  <button
                    onClick={handleCopyUpi}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-white"
                    title="Copy UPI ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                {currentMonthDue.status === 'pending' || currentMonthDue.status === 'failed' ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleOpenSubmitModal(currentMonthDue)}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border-none shadow-lg gap-2"
                  >
                    <CreditCard className="h-5 w-5" />
                    Submit Payment Reference
                  </Button>
                ) : currentMonthDue.status === 'under_review' ? (
                  <div className="bg-white/10 border border-white/20 px-5 py-3 rounded-2xl text-center">
                    <p className="text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Submitted & Under Review
                    </p>
                    <p className="text-[11px] text-emerald-100 mt-0.5 font-mono">
                      Ref: {currentMonthDue.transaction_ref}
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleOpenReceipt(currentMonthDue)}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border-none shadow-lg gap-2"
                  >
                    <FileText className="h-5 w-5" />
                    View & Print Receipt
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabbed Dues Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Tabs Navigation */}
          <div className="px-6 pt-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-slate-900">Dues Records & Transaction History</h2>

            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: 'All Records' },
                { id: 'pending', label: 'Pending' },
                { id: 'under_review', label: 'Under Review' },
                { id: 'verified', label: 'Paid / Verified' },
                { id: 'failed', label: 'Failed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dues Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Billing Month</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Transaction UTR</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submission / Audit</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No records found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredDues.map((due) => (
                    <tr key={due.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        {due.billing_month}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {formatCurrency(due.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {due.transaction_ref || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={due.status} size="sm">
                          {due.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {due.status === 'verified' && due.verified_at ? (
                          <span className="text-emerald-700">Verified {formatDateTime(due.verified_at)}</span>
                        ) : due.status === 'under_review' ? (
                          <span>Submitted {formatDateTime(due.submitted_at)}</span>
                        ) : due.status === 'failed' && due.rejection_reason ? (
                          <span className="text-rose-600 font-medium">
                            Reason: {due.rejection_reason}
                          </span>
                        ) : (
                          'Awaiting submission'
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {due.status === 'verified' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReceipt(due)}
                            className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Digital Receipt
                          </Button>
                        ) : due.status === 'pending' || due.status === 'failed' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenSubmitModal(due)}
                            className="gap-1.5"
                          >
                            Pay / Enter UTR
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">In Admin Queue</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Submit Payment Reference Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit Payment Reference (UTR)"
        description={`Record your transfer for billing month ${selectedDue?.billing_month}`}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
          {/* Transfer Instructions */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-emerald-900">
              <QrCode className="h-4 w-4" />
              Step 1: Pay {selectedDue ? formatCurrency(selectedDue.amount) : '₹100'}
            </p>
            <p className="text-slate-700">
              Transfer to the Mahallu Jama&apos;ath UPI account:
              <strong className="block font-mono text-emerald-900 select-all mt-0.5">
                alhudamahallu@upi
              </strong>
            </p>
          </div>

          {/* UTR Input Field */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Step 2: Enter 12-Digit UPI / Bank UTR Reference Number *
            </label>
            <input
              type="text"
              placeholder="e.g. 423987123984 or UPI/20260905/4456123"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Found in your GPay / PhonePe / Banking app payment receipt screen.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit for Verification
            </Button>
          </div>
        </form>
      </Modal>

      {/* Digital Receipt View / Print Modal */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Official Mahallu Electronic Receipt"
        maxWidth="2xl"
      >
        {receiptDue && house && (
          <DigitalReceipt
            due={receiptDue}
            house={house}
            onClose={() => setReceiptModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
