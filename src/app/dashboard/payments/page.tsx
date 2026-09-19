'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataService } from '@/lib/data-service';
import {
  HouseWithDetails,
  PaymentDue,
  PaymentStatus,
  PaymentRequestItem,
  PaymentRequestContribution,
} from '@/lib/supabase/types';
import { formatCurrency, formatDateTime, getHouseHeadName } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DigitalReceipt } from '@/components/resident/DigitalReceipt';
import { SpecialCollectionReceipt } from '@/components/resident/SpecialCollectionReceipt';
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
  HandCoins,
  Coins,
  Check,
  Sparkles,
} from 'lucide-react';

import { LoadingScreen } from '@/components/ui/LoadingAnimation';
import { UpiQrCode } from '@/components/shared/UpiQrCode';

export default function ResidentPaymentCenter() {
  const { toast } = useToast();
  const { user, profile, house: authHouse, isLoading } = useAuth();
  const [house, setHouse] = useState<HouseWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'under_review' | 'verified' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'monthly' | 'special'>('all');

  // Dynamic UPI Settings
  const [upiSettings, setUpiSettings] = useState<{
    upiId: string;
    payeeName: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  }>({
    upiId: 'kunjikkulam@upi',
    payeeName: "Kunjikkulam Juma Masjid",
  });
  const [showHeroQr, setShowHeroQr] = useState(false);

  // Special Payment Requests & Contributions state
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [contributions, setContributions] = useState<PaymentRequestContribution[]>([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<PaymentRequestItem | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribUtr, setContribUtr] = useState('');
  const [isSubmittingContrib, setIsSubmittingContrib] = useState(false);
  const [splReceiptModalOpen, setSplReceiptModalOpen] = useState(false);
  const [splReceiptContrib, setSplReceiptContrib] = useState<PaymentRequestContribution | null>(null);
  const [splReceiptReq, setSplReceiptReq] = useState<PaymentRequestItem | null>(null);

  // Active requests published by Mahallu Admin (strictly status === 'active')
  const activeRequests = paymentRequests.filter((r) => r.status === 'active');


  // Submit payment modal state (monthly dues)
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<PaymentDue | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Digital Receipt modal state (monthly dues)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptDue, setReceiptDue] = useState<PaymentDue | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Read directly from Supabase via DataService.getHouseByUserIdAsync
      let userHouse = await DataService.getHouseByUserIdAsync(user.id);
      if (!userHouse && authHouse?.id) {
        userHouse = await DataService.getHouseByIdAsync(authHouse.id);
      }
      if (!userHouse) {
        userHouse = (authHouse as HouseWithDetails | null) || null;
      }

      if (userHouse) {
        if (!userHouse.family_members) userHouse.family_members = [];
        if (!userHouse.payment_dues) userHouse.payment_dues = [];

        // Ensure all dues start from house registration date up to current month in Supabase
        const ensuredHouse = await DataService.ensureDuesForHouse(userHouse);
        const targetHouse: HouseWithDetails = {
          ...ensuredHouse,
          family_members: ensuredHouse.family_members || [],
          payment_dues: [...ensuredHouse.payment_dues],
        };

        setHouse(targetHouse);
      }

      // 2. Load dynamic Mahallu UPI configuration
      const upi = await DataService.getUpiSettingsAsync();
      if (upi && upi.upiId) {
        setUpiSettings(upi);
      }

      // 3. Load active payment requests & contributions
      const reqData = await DataService.getPaymentRequestsAsync();
      setPaymentRequests(reqData.requests || []);
      setContributions(reqData.contributions || []);
    } catch (err) {
      console.warn('loadData exception in resident payments:', err);
    }
  };

  useEffect(() => {
    loadData();
    // High-frequency sync with admin updates (status completions / verifications)
    const interval = setInterval(() => {
      loadData();
    }, 3500);

    const handleUpiUpdated = (e: any) => {
      if (e.detail && e.detail.upiId) {
        setUpiSettings(e.detail);
      }
    };

    const handleRequestsUpdated = () => {
      loadData();
    };

    window.addEventListener('mahallu_data_updated', loadData);
    window.addEventListener('mahallu_upi_updated', handleUpiUpdated);
    window.addEventListener('mahallu_requests_updated', handleRequestsUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mahallu_data_updated', loadData);
      window.removeEventListener('mahallu_upi_updated', handleUpiUpdated);
      window.removeEventListener('mahallu_requests_updated', handleRequestsUpdated);
    };
  }, [user?.id]);

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
    house.payment_dues[0];

  // User's special payment contributions
  const mySpecialContributions = contributions.filter((c) => c.house_id === house.id);
  const verifiedSpecialContribs = mySpecialContributions.filter((c) => c.status === 'verified');
  const underReviewSpecialContribs = mySpecialContributions.filter((c) => c.status === 'under_review');
  const rejectedSpecialContribs = mySpecialContributions.filter((c) => c.status === 'rejected');

  const verifiedSpecialTotal = verifiedSpecialContribs.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaidReconciled = paidTotal + verifiedSpecialTotal;
  const totalUnderReviewCount = underReviewDues.length + underReviewSpecialContribs.length;
  const totalFailedCount = failedDues.length + rejectedSpecialContribs.length;

  type UnifiedTransaction = {
    id: string;
    sourceType: 'monthly_due' | 'special_payment';
    title: string;
    subtext: string;
    categoryBadge: string;
    amount: number;
    transactionRef?: string | null;
    status: 'pending' | 'under_review' | 'verified' | 'failed';
    displayStatus: string;
    submittedAt?: string | null;
    verifiedAt?: string | null;
    rejectionReason?: string | null;
    dateForSorting: number;
    rawDue?: PaymentDue;
    rawContrib?: PaymentRequestContribution;
    rawReq?: PaymentRequestItem;
  };

  const dueTransactions: UnifiedTransaction[] = house.payment_dues.map((due) => {
    const dateStr = due.verified_at || due.submitted_at;
    const sortTime = dateStr ? new Date(dateStr).getTime() : 0;
    return {
      id: `due-${due.id}`,
      sourceType: 'monthly_due',
      title: due.billing_month,
      subtext: 'Monthly Mahallu Maintenance',
      categoryBadge: 'Monthly Due',
      amount: Number(due.amount),
      transactionRef: due.transaction_ref,
      status: due.status,
      displayStatus: due.status.replace('_', ' '),
      submittedAt: due.submitted_at,
      verifiedAt: due.verified_at,
      rejectionReason: due.rejection_reason,
      dateForSorting: sortTime,
      rawDue: due,
    };
  });

  const specialTransactions: UnifiedTransaction[] = mySpecialContributions.map((contrib) => {
    const req = paymentRequests.find((r) => r.id === contrib.request_id);
    const dateStr = contrib.verified_at || contrib.submitted_at || contrib.created_at;
    const sortTime = dateStr ? new Date(dateStr).getTime() : 0;
    const normalizedStatus: 'pending' | 'under_review' | 'verified' | 'failed' =
      contrib.status === 'rejected' ? 'failed' : (contrib.status as any);

    return {
      id: `spl-${contrib.id}`,
      sourceType: 'special_payment',
      title: req?.title || 'Special Collection',
      subtext: `Special Appeal • ${req?.category || 'Contribution'}`,
      categoryBadge: req?.category || 'Special Fund',
      amount: Number(contrib.amount),
      transactionRef: contrib.transaction_ref,
      status: normalizedStatus,
      displayStatus: contrib.status === 'rejected' ? 'Rejected' : contrib.status.replace('_', ' '),
      submittedAt: contrib.submitted_at,
      verifiedAt: contrib.verified_at,
      rejectionReason: contrib.rejection_reason,
      dateForSorting: sortTime,
      rawContrib: contrib,
      rawReq: req || {
        id: contrib.request_id,
        title: 'Special Collection',
        description: '',
        category: 'Special Fund',
        amount_type: 'custom',
        target_audience: 'all',
        status: 'completed',
        created_at: contrib.created_at,
      },
    };
  });

  // Combined and sorted: recent activity first, then unsubmitted pending dues
  const allTransactions: UnifiedTransaction[] = [...dueTransactions, ...specialTransactions].sort((a, b) => {
    if (a.dateForSorting && b.dateForSorting) {
      return b.dateForSorting - a.dateForSorting;
    }
    if (a.dateForSorting && !b.dateForSorting) return -1;
    if (!a.dateForSorting && b.dateForSorting) return 1;
    return 0;
  });

  // Filter transactions by tab and by type
  const filteredTransactions = allTransactions.filter((tx) => {
    if (typeFilter === 'monthly' && tx.sourceType !== 'monthly_due') return false;
    if (typeFilter === 'special' && tx.sourceType !== 'special_payment') return false;
    if (activeTab === 'all') return true;
    return tx.status === activeTab;
  });

  const handleOpenSubmitModal = (due: PaymentDue) => {
    setSelectedDue(due);
    setTransactionRef(due.transaction_ref || '');
    setSubmitModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue || !house) return;

    const cleanRef = transactionRef.trim();
    if (!cleanRef || cleanRef.length < 6) {
      toast('Please enter a valid UPI or Bank UTR Transaction ID (minimum 6 characters)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await DataService.submitPayment(
        selectedDue.id,
        cleanRef,
        house.id,
        selectedDue.billing_month
      );

      if (success) {
        toast(`Payment reference for ${selectedDue.billing_month} submitted successfully! Sent to Admin queue for verification.`, 'success');
        setSubmitModalOpen(false);

        // Immediate optimistic UI update
        setHouse((prev) => {
          if (!prev) return prev;
          const updatedDues = prev.payment_dues.map((d) => {
            if (d.id === selectedDue.id || d.billing_month === selectedDue.billing_month) {
              return {
                ...d,
                status: 'under_review' as const,
                transaction_ref: cleanRef,
                submitted_at: new Date().toISOString(),
                rejection_reason: null,
              };
            }
            return d;
          });
          return { ...prev, payment_dues: updatedDues };
        });

        await loadData();
      } else {
        toast('Failed to record submission. Please check transaction details and try again.', 'error');
      }
    } catch (err: any) {
      console.error('Submit payment error:', err);
      toast(err?.message || 'Failed to submit payment reference.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReceipt = (due: PaymentDue) => {
    setReceiptDue(due);
    setReceiptModalOpen(true);
  };

  const handleOpenReqModal = (req: PaymentRequestItem, existingContrib?: PaymentRequestContribution) => {
    setSelectedReq(req);
    if (existingContrib) {
      setContribAmount(String(existingContrib.amount || ''));
    } else if (req.amount_type === 'fixed') {
      setContribAmount(String(req.fixed_amount || ''));
    } else {
      // Custom / flexible amount: do NOT preselect any amount
      setContribAmount('');
    }
    setContribUtr(existingContrib?.transaction_ref || '');
    setRequestModalOpen(true);
  };

  const handleReqPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !house) return;

    const amt = Number(contribAmount);
    if (isNaN(amt) || amt <= 0) {
      toast('Please enter a valid contribution amount', 'error');
      return;
    }
    if (selectedReq.min_amount && amt < selectedReq.min_amount) {
      toast(`Minimum contribution amount is ₹${selectedReq.min_amount}`, 'error');
      return;
    }

    const cleanRef = contribUtr.trim();
    if (!cleanRef || cleanRef.length < 6) {
      toast('Please enter a valid UPI / Bank UTR Reference (minimum 6 characters)', 'error');
      return;
    }

    setIsSubmittingContrib(true);
    try {
      const contrib = await DataService.submitRequestContributionAsync({
        requestId: selectedReq.id,
        houseId: house.id,
        userId: user?.id,
        amount: amt,
        transactionRef: cleanRef,
      });

      // Optimistic update
      setContributions((prev) => {
        const filtered = prev.filter((c) => c.request_id !== selectedReq.id || c.house_id !== house.id);
        return [contrib, ...filtered];
      });

      toast(`Contribution of ₹${amt} submitted successfully for "${selectedReq.title}"! Sent to Admin queue for verification.`, 'success');
      setRequestModalOpen(false);
      setContribUtr('');
      await loadData();
    } catch (err: any) {
      toast(err?.message || 'Failed to submit contribution reference', 'error');
    } finally {
      setIsSubmittingContrib(false);
    }
  };

  const handleOpenSplReceipt = (contrib: PaymentRequestContribution, req: PaymentRequestItem) => {
    setSplReceiptContrib(contrib);
    setSplReceiptReq(req);
    setSplReceiptModalOpen(true);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiSettings.upiId);
    toast(`UPI ID copied to clipboard: ${upiSettings.upiId}`, 'success');
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
                {formatCurrency(totalPaidReconciled)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {verifiedDues.length} dues + {verifiedSpecialContribs.length} special payment(s) verified
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
                {totalFailedCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {totalFailedCount > 0 ? 'Requires re-submission of valid UTR' : 'All submissions in good standing'}
              </p>
            </div>
          </div>
        </div>

        {/* Active Billing Cycle Action Hero Card */}
        {currentMonthDue && (
          <div
            className="bg-[#064e3b] text-white rounded-3xl p-6 sm:p-8 shadow-md"
            style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)' }}
          >
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
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  <span className="text-emerald-200 font-mono font-bold">UPI ID: {upiSettings.upiId}</span>
                  <button
                    onClick={handleCopyUpi}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-white"
                    title="Copy UPI ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHeroQr(!showHeroQr)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-semibold transition-colors border border-emerald-400/30 cursor-pointer"
                  >
                    <QrCode className="h-3 w-3" />
                    {showHeroQr ? 'Hide QR Code' : 'Show QR Code'}
                  </button>
                </div>

                {showHeroQr && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md max-w-xs text-slate-900 flex justify-center">
                    <UpiQrCode
                      upiId={upiSettings.upiId}
                      payeeName={upiSettings.payeeName}
                      amount={currentMonthDue.amount}
                      note={`Monthly Dues ${currentMonthDue.billing_month} - ${house.house_name}`}
                      size={140}
                      showDetails={false}
                      showOpenAppButton={true}
                    />
                  </div>
                )}
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

        {/* Special Collections & Payment Requests from Mahallu Admin (Active Drives Only) */}
        {activeRequests.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-emerald-600" />
                  Special Collections &amp; Payment Requests
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Community fundraising drives, mosque projects, charity appeals, and specific collections requested by the administration.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 self-start sm:self-auto">
                {activeRequests.length} Active Request(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRequests.map((req) => {
                const myContrib = contributions.find(
                  (c) => c.request_id === req.id && c.house_id === house.id
                );
                const isVerified = myContrib?.status === 'verified';
                const isUnderReview = myContrib?.status === 'under_review';
                const isRejected = myContrib?.status === 'rejected';

                const allVerified = contributions.filter(
                  (c) => c.request_id === req.id && c.status === 'verified'
                );
                const totalRaised = allVerified.reduce((s, c) => s + c.amount, 0);
                const pct =
                  req.target_total && req.target_total > 0
                    ? Math.min(100, Math.round((totalRaised / req.target_total) * 100))
                    : null;

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${isVerified
                        ? 'border-emerald-300 ring-1 ring-emerald-500/20 bg-emerald-50/20'
                        : isUnderReview
                          ? 'border-amber-300 ring-1 ring-amber-500/20 bg-amber-50/10'
                          : isRejected
                            ? 'border-rose-300 ring-1 ring-rose-500/20 bg-rose-50/10'
                            : 'border-slate-200 hover:border-emerald-400'
                      }`}
                  >
                    <div className="space-y-3">
                      {/* Category & Status badges */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {req.category}
                          </span>
                          {req.amount_type === 'fixed' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              Fixed: ₹{req.fixed_amount}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Pay as you wish
                            </span>
                          )}
                        </div>

                        {req.due_date && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            Due: {req.due_date}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-bold text-slate-900 text-base tracking-tight">
                          {req.title}
                        </h3>
                        {req.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">
                            {req.description}
                          </p>
                        )}
                      </div>

                      {/* Progress if goal set */}
                      {pct !== null && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>{pct}% Collected</span>
                            <span>
                              ₹{totalRaised.toLocaleString('en-IN')} / ₹{req.target_total?.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Household Contribution Status Card */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      {isVerified ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-950">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                              <div>
                                <span className="font-bold text-xs block">
                                  Paid: {formatCurrency(myContrib.amount)}
                                </span>
                                <span className="text-[10px] text-emerald-800 font-mono block">
                                  UTR: {myContrib.transaction_ref}
                                </span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700 text-white uppercase">
                              Verified
                            </span>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSplReceipt(myContrib, req)}
                            className="w-full text-xs font-semibold border-emerald-400 text-emerald-800 hover:bg-emerald-50 gap-1.5 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View Digital Receipt
                          </Button>
                        </div>
                      ) : isUnderReview ? (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              Submitted: {formatCurrency(myContrib.amount)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                              Under Review
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">
                            UTR: {myContrib.transaction_ref}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Awaiting admin bank reconciliation.
                          </p>
                        </div>
                      ) : isRejected ? (
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-rose-900">
                                Verification Disputed / Rejected
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                                Failed
                              </span>
                            </div>
                            {myContrib.rejection_reason && (
                              <p className="text-[11px] text-rose-700 font-medium">
                                Reason: {myContrib.rejection_reason}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleOpenReqModal(req, myContrib)}
                            className="w-full text-xs font-bold gap-1.5 cursor-pointer"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Re-submit Payment Reference
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenReqModal(req)}
                          className="w-full text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-2 shadow-xs cursor-pointer py-2.5"
                        >
                          {req.amount_type === 'fixed' ? (
                            <>
                              <CreditCard className="h-4 w-4" />
                              <span>Pay ₹{req.fixed_amount} via UPI</span>
                            </>
                          ) : (
                            <>
                              <HandCoins className="h-4 w-4" />
                              <span>Contribute As You Wish</span>
                            </>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Tabbed Transaction History Table (Monthly Dues & Special Collections) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Tabs & Type Navigation */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Dues Records &amp; Transaction History</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {allTransactions.length} Total
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comprehensive record of regular monthly dues and special collection payments.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              {/* Type Filter Pills with smooth mobile swipe */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${typeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  All ({allTransactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('monthly')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${typeFilter === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Monthly Dues ({dueTransactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('special')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${typeFilter === 'special'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Special Appeals ({specialTransactions.length})
                </button>
              </div>

              {/* Status Filter Tabs with smooth mobile swipe */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'under_review', label: 'Under Review' },
                  { id: 'verified', label: 'Paid / Verified' },
                  { id: 'failed', label: 'Failed' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${activeTab === tab.id
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop View: Full Unified Transactions Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Payment / Purpose</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Transaction UTR</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submission / Audit</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No payment or transaction records found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{tx.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tx.sourceType === 'special_payment'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                          >
                            {tx.categoryBadge}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {tx.subtext}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {tx.transactionRef || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={tx.status} size="sm">
                          {tx.displayStatus}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {tx.status === 'verified' && tx.verifiedAt ? (
                          <span className="text-emerald-700 font-medium">Verified {formatDateTime(tx.verifiedAt)}</span>
                        ) : tx.status === 'under_review' ? (
                          <span>Submitted {tx.submittedAt ? formatDateTime(tx.submittedAt) : 'recently'}</span>
                        ) : tx.status === 'failed' && tx.rejectionReason ? (
                          <span className="text-rose-600 font-medium">
                            Reason: {tx.rejectionReason}
                          </span>
                        ) : tx.status === 'failed' ? (
                          <span className="text-rose-600 font-medium">Verification rejected</span>
                        ) : (
                          'Awaiting submission'
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {tx.status === 'verified' ? (
                          tx.sourceType === 'special_payment' && tx.rawContrib && tx.rawReq ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSplReceipt(tx.rawContrib!, tx.rawReq!)}
                              className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Digital Receipt
                            </Button>
                          ) : tx.rawDue ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReceipt(tx.rawDue!)}
                              className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Digital Receipt
                            </Button>
                          ) : null
                        ) : tx.status === 'pending' && tx.rawDue ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenSubmitModal(tx.rawDue!)}
                            className="gap-1.5 cursor-pointer"
                          >
                            Pay / Enter UTR
                          </Button>
                        ) : tx.status === 'failed' ? (
                          tx.sourceType === 'special_payment' && tx.rawContrib && tx.rawReq ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenReqModal(tx.rawReq!, tx.rawContrib)}
                              className="gap-1.5 cursor-pointer"
                            >
                              Re-submit UTR
                            </Button>
                          ) : tx.rawDue ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenSubmitModal(tx.rawDue!)}
                              className="gap-1.5 cursor-pointer"
                            >
                              Re-submit UTR
                            </Button>
                          ) : null
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

          {/* Mobile View: Touch-Friendly Transaction Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No payment or transaction records found in this category.
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  {/* Top row: Title, Category badge, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm">{tx.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            tx.sourceType === 'special_payment'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {tx.categoryBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{tx.subtext}</p>
                    </div>
                    <Badge variant={tx.status} size="sm">
                      {tx.displayStatus}
                    </Badge>
                  </div>

                  {/* Middle row: Amount & UTR */}
                  <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Amount</span>
                      <span className="font-extrabold text-base text-slate-900">{formatCurrency(tx.amount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Transaction UTR</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">{tx.transactionRef || '—'}</span>
                    </div>
                  </div>

                  {/* Status / Timestamp information */}
                  <div className="text-[11px]">
                    {tx.status === 'verified' && tx.verifiedAt ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Verified on {formatDateTime(tx.verifiedAt)}
                      </span>
                    ) : tx.status === 'under_review' ? (
                      <span className="text-amber-800 font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Submitted {tx.submittedAt ? formatDateTime(tx.submittedAt) : 'recently'} • Under Review
                      </span>
                    ) : tx.status === 'failed' && tx.rejectionReason ? (
                      <span className="text-rose-600 font-medium flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        Reason: {tx.rejectionReason}
                      </span>
                    ) : tx.status === 'failed' ? (
                      <span className="text-rose-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                        Verification rejected by administration
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Awaiting payment &amp; reference submission
                      </span>
                    )}
                  </div>

                  {/* Action Button: Touch-friendly min-height 42px */}
                  <div>
                    {tx.status === 'verified' ? (
                      tx.sourceType === 'special_payment' && tx.rawContrib && tx.rawReq ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSplReceipt(tx.rawContrib!, tx.rawReq!)}
                          className="w-full justify-center gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer min-h-[42px] font-semibold"
                        >
                          <FileText className="h-4 w-4" />
                          View Digital Receipt
                        </Button>
                      ) : tx.rawDue ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReceipt(tx.rawDue!)}
                          className="w-full justify-center gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer min-h-[42px] font-semibold"
                        >
                          <FileText className="h-4 w-4" />
                          View Digital Receipt
                        </Button>
                      ) : null
                    ) : tx.status === 'pending' && tx.rawDue ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenSubmitModal(tx.rawDue!)}
                        className="w-full justify-center gap-1.5 cursor-pointer min-h-[42px] font-semibold"
                      >
                        <CreditCard className="h-4 w-4" />
                        Pay Dues &amp; Enter UTR
                      </Button>
                    ) : tx.status === 'failed' ? (
                      tx.sourceType === 'special_payment' && tx.rawContrib && tx.rawReq ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenReqModal(tx.rawReq!, tx.rawContrib)}
                          className="w-full justify-center gap-1.5 cursor-pointer min-h-[42px] font-semibold"
                        >
                          <CreditCard className="h-4 w-4" />
                          Re-submit UTR Reference
                        </Button>
                      ) : tx.rawDue ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenSubmitModal(tx.rawDue!)}
                          className="w-full justify-center gap-1.5 cursor-pointer min-h-[42px] font-semibold"
                        >
                          <CreditCard className="h-4 w-4" />
                          Re-submit UTR Reference
                        </Button>
                      ) : null
                    ) : (
                      <div className="py-2.5 text-center text-xs text-amber-800 font-semibold bg-amber-50 rounded-xl border border-amber-200/80">
                        Submitted &amp; Awaiting Admin Verification
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
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
          {/* Step 1: Transfer Instructions & Live Dynamic UPI QR Code */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold flex items-center gap-1.5 text-emerald-900 text-sm">
                <QrCode className="h-4 w-4 text-emerald-800" />
                Step 1: Scan & Pay {selectedDue ? formatCurrency(selectedDue.amount) : '₹100'}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-950 uppercase tracking-wide">
                Instant UPI
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              Scan this QR code with any UPI app (Google Pay, PhonePe, Paytm, BHIM) to make the transfer.
            </p>

            {/* Dynamic Scannable QR Code */}
            <div className="py-2 flex justify-center">
              <UpiQrCode
                upiId={upiSettings.upiId}
                payeeName={upiSettings.payeeName}
                amount={selectedDue?.amount || 100}
                note={`Dues ${selectedDue?.billing_month || ''} - ${house?.house_name || ''}`}
                size={160}
                showDetails={true}
                showOpenAppButton={true}
              />
            </div>
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

      {/* Special Request Contribution & UPI Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title={selectedReq ? `Contribute: ${selectedReq.title}` : 'Special Contribution'}
        description={selectedReq?.description || 'Support this Mahallu community collection drive.'}
        maxWidth="xl"
      >
        {selectedReq && house && (
          <form onSubmit={handleReqPaymentSubmit} className="space-y-4 text-xs">
            {/* Amount Selection / Custom input */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  {selectedReq.amount_type === 'fixed'
                    ? 'Fixed Requested Amount'
                    : 'Enter Contribution Amount (Pay As You Wish)'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  {selectedReq.category}
                </span>
              </div>

              {selectedReq.amount_type === 'fixed' ? (
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-2xl font-black text-slate-900">
                    ₹{selectedReq.fixed_amount}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">per household</span>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={selectedReq.min_amount || 1}
                      step="1"
                      value={contribAmount}
                      onChange={(e) => setContribAmount(e.target.value)}
                      placeholder="Enter amount"
                      required
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-base font-extrabold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  {/* Quick preset amount chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Select:</span>
                    {[200, 500, 1000, 2500, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setContribAmount(String(amt))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${contribAmount && contribAmount === String(amt)
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  {selectedReq.min_amount && (
                    <p className="text-[11px] text-slate-500">
                      Minimum suggested contribution: ₹{selectedReq.min_amount}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Step 1: Live QR Code for the chosen amount */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900 text-xs">
                  <QrCode className="h-4 w-4 text-emerald-800" />
                  {Number(contribAmount) > 0
                    ? `Step 1: Scan & Transfer ${formatCurrency(Number(contribAmount))}`
                    : 'Step 1: Scan QR or enter amount above'}
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-950 uppercase tracking-wide">
                  Instant UPI
                </span>
              </div>

              <div className="py-2 flex justify-center">
                <UpiQrCode
                  upiId={upiSettings.upiId}
                  payeeName={upiSettings.payeeName}
                  amount={Number(contribAmount) > 0 ? Number(contribAmount) : undefined}
                  note={`${selectedReq.title.slice(0, 20)} - ${house.house_name.slice(0, 15)}`}
                  size={150}
                  showDetails={true}
                  showOpenAppButton={true}
                />
              </div>
            </div>

            {/* Step 2: 12-Digit UTR Input */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Step 2: Enter 12-Digit UPI / Bank UTR Reference Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 423987123984 or UPI/20260905/4456123"
                value={contribUtr}
                onChange={(e) => setContribUtr(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Obtained from your payment app (Google Pay, PhonePe, Paytm) confirmation screen.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequestModalOpen(false)}
                disabled={isSubmittingContrib}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingContrib}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
              >
                Submit Contribution Reference
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Special Contribution Electronic Receipt Modal */}
      <Modal
        isOpen={splReceiptModalOpen}
        onClose={() => setSplReceiptModalOpen(false)}
        title="Official Mahallu Electronic Receipt"
        maxWidth="2xl"
      >
        {splReceiptContrib && splReceiptReq && house && (
          <SpecialCollectionReceipt
            contrib={splReceiptContrib}
            request={splReceiptReq}
            house={house}
            onClose={() => setSplReceiptModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
