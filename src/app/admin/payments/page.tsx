'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import {
  PaymentDue,
  HouseWithDetails,
  DIVISION_LABELS,
  Division,
  PaymentRequestItem,
  PaymentRequestContribution,
  AmountRequestType,
} from '@/lib/supabase/types';
import { formatCurrency, formatDateTime, getHouseHeadName } from '@/lib/utils';
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
  User,
  HandCoins,
  PlusCircle,
  Sparkles,
  Trash2,
  Layers,
  ChevronRight,
  CheckCheck,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { DuesSettings } from '@/lib/data-service';

import { UpiQrCode } from '@/components/shared/UpiQrCode';

export default function PaymentVerificationHub() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewQueue, setReviewQueue] = useState<{ due: PaymentDue; house: HouseWithDetails }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Special Payment / Amount Requests state
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [requestContributions, setRequestContributions] = useState<PaymentRequestContribution[]>([]);
  const [houses, setHouses] = useState<HouseWithDetails[]>([]);
  const [reviewTab, setReviewTab] = useState<'all' | 'monthly' | 'requests'>('all');
  const [showCancelledRequests, setShowCancelledRequests] = useState(false);

  const visibleRequests = paymentRequests.filter(
    (r) => showCancelledRequests || r.status !== 'cancelled'
  );
  const cancelledRequestsCount = paymentRequests.filter((r) => r.status === 'cancelled').length;

  // Create Amount Request Modal
  const [createRequestModalOpen, setCreateRequestModalOpen] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState('Donation');
  const [reqCustomCategory, setReqCustomCategory] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqAmountType, setReqAmountType] = useState<AmountRequestType>('fixed');
  const [reqFixedAmount, setReqFixedAmount] = useState('500');
  const [reqMinAmount, setReqMinAmount] = useState('');
  const [reqSuggestedAmount, setReqSuggestedAmount] = useState('');
  const [reqTargetTotal, setReqTargetTotal] = useState('');
  const [reqDueDate, setReqDueDate] = useState('');

  // View contributors modal
  const [viewContributorsReq, setViewContributorsReq] = useState<PaymentRequestItem | null>(null);

  // Reject modal targets
  const [rejectType, setRejectType] = useState<'monthly' | 'request'>('monthly');
  const [selectedContribId, setSelectedContribId] = useState<string | null>(null);

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

  const loadRequests = async () => {
    try {
      const [res, hList] = await Promise.all([
        DataService.getPaymentRequestsAsync(),
        DataService.getHousesAsync(),
      ]);
      setPaymentRequests(res.requests || []);
      setRequestContributions(res.contributions || []);
      setHouses(hList || []);
    } catch (err) {
      console.warn('Failed to load payment requests', err);
    }
  };

  const loadQueue = async (manual = false) => {
    try {
      if (manual) {
        setIsRefreshing(true);
      }
      const list = await DataService.getPaymentsUnderReviewAsync();
      setReviewQueue(list);
      await loadRequests();
      if (manual) {
        toast(`Verification queue updated: ${list.length} monthly payment(s) awaiting review.`, 'info');
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
    loadRequests();

    const interval = setInterval(() => {
      loadQueue(false);
      loadRequests();
    }, 15000);

    const handleDataUpdated = () => {
      loadQueue(false);
      loadDues();
      loadRequests();
    };

    const handleRequestsUpdated = () => {
      loadRequests();
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
    window.addEventListener('mahallu_requests_updated', handleRequestsUpdated);
    window.addEventListener('mahallu_upi_updated', handleUpiUpdated);
    window.addEventListener('mahallu_dues_updated', handleDuesUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mahallu_data_updated', handleDataUpdated);
      window.removeEventListener('mahallu_requests_updated', handleRequestsUpdated);
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

  const handleCopy = (ref: string, id: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedId(id);
    toast(`Copied Transaction ID: ${ref}`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (dueId: string, houseRegNo: string) => {
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

  const handleCreateAmountRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) {
      toast('Please enter a campaign title', 'error');
      return;
    }
    const finalCategory = reqCategory === 'Other' ? (reqCustomCategory.trim() || 'Other') : reqCategory;
    if (reqAmountType === 'fixed') {
      const fixed = Number(reqFixedAmount);
      if (isNaN(fixed) || fixed <= 0) {
        toast('Please enter a valid fixed amount greater than 0', 'error');
        return;
      }
    }

    setIsCreatingRequest(true);
    try {
      await DataService.createPaymentRequestAsync({
        title: reqTitle.trim(),
        description: reqDescription.trim(),
        category: finalCategory,
        amount_type: reqAmountType,
        fixed_amount: reqAmountType === 'fixed' ? Number(reqFixedAmount) : undefined,
        min_amount: reqAmountType === 'custom' && reqMinAmount ? Number(reqMinAmount) : undefined,
        suggested_amount: reqAmountType === 'custom' && reqSuggestedAmount ? Number(reqSuggestedAmount) : undefined,
        target_total: reqTargetTotal ? Number(reqTargetTotal) : undefined,
        due_date: reqDueDate || null,
        created_by: user?.id || 'admin',
      });

      toast('Payment request successfully published to all resident profiles!', 'success');
      setCreateRequestModalOpen(false);
      setReqTitle('');
      setReqDescription('');
      setReqCategory('Donation');
      setReqCustomCategory('');
      setReqAmountType('fixed');
      setReqFixedAmount('500');
      setReqMinAmount('');
      setReqSuggestedAmount('');
      setReqTargetTotal('');
      setReqDueDate('');
      await loadRequests();
    } catch (err: any) {
      toast(err?.message || 'Failed to create payment request', 'error');
    } finally {
      setIsCreatingRequest(false);
    }
  };

  const handleToggleRequestStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'completed' : 'active';
    try {
      await DataService.updatePaymentRequestStatusAsync(id, nextStatus as any);
      toast(`Payment request status changed to ${nextStatus}`, 'success');
      await loadRequests();
    } catch (err: any) {
      toast(err?.message || 'Failed to update request status', 'error');
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment request? It will be removed from all active resident prompts, while preserving any historical payment records & receipts.')) {
      return;
    }
    try {
      const res = await DataService.deletePaymentRequestAsync(id);
      toast(res?.message || 'Payment request deleted. Historical records preserved.', 'info');
      await loadRequests();
    } catch (err: any) {
      toast(err?.message || 'Failed to delete request', 'error');
    }
  };

  const handleApproveContribution = async (contrib: PaymentRequestContribution) => {
    const req = paymentRequests.find((r) => r.id === contrib.request_id);
    const house = houses.find((h) => h.id === contrib.house_id) || null;

    try {
      await DataService.verifyRequestContributionAsync({
        contributionId: contrib.id,
        adminId: user?.id || 'admin',
        amount: contrib.amount,
        requestTitle: req?.title || 'Special Collection',
        category: req?.category || 'Special Fund',
        house,
        transactionRef: contrib.transaction_ref,
      });
      toast(`Contribution of ₹${contrib.amount} approved! Posted credit to Financial Ledger.`, 'success');
      await loadRequests();
    } catch (err: any) {
      toast(err?.message || 'Failed to approve contribution', 'error');
    }
  };

  const handleOpenReject = (type: 'monthly' | 'request', id: string) => {
    setRejectType(type);
    if (type === 'monthly') {
      setSelectedDueId(id);
      setSelectedContribId(null);
    } else {
      setSelectedContribId(id);
      setSelectedDueId(null);
    }
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      toast('Please enter a rejection reason', 'error');
      return;
    }

    setIsRejecting(true);
    try {
      if (rejectType === 'monthly') {
        if (!selectedDueId) return;
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
      } else {
        if (!selectedContribId) return;
        await DataService.rejectRequestContributionAsync(selectedContribId, trimmedReason);
        toast('Special request payment marked as rejected.', 'info');
        setRejectModalOpen(false);
        setRejectionReason('');
        await loadRequests();
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to reject payment', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  const pendingContributions = requestContributions.filter((c) => c.status === 'under_review');
  const totalPendingReviews = reviewQueue.length + pendingContributions.length;

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
              {totalPendingReviews} Under Review
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time queue of monthly dues submissions &amp; special collection drives. Reconcile UPI / UTR transaction IDs against bank records.
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
            onClick={() => setCreateRequestModalOpen(true)}
            className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
          >
            <HandCoins className="h-3.5 w-3.5" />
            Request Amount from Users
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

      {/* Special Payment Requests & Fundraising Campaigns Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-emerald-600" />
              Special Payment Requests &amp; Campaigns
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {paymentRequests.filter((r) => r.status === 'active').length} Active
            </span>
            {cancelledRequestsCount > 0 && (
              <button
                type="button"
                onClick={() => setShowCancelledRequests(!showCancelledRequests)}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer ml-1"
              >
                {showCancelledRequests ? 'Hide Deleted / Archived' : `Show Deleted / Archived (${cancelledRequestsCount})`}
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateRequestModalOpen(true)}
            className="gap-1.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 font-semibold cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
            New Amount Request
          </Button>
        </div>

        {visibleRequests.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-2">
            <div className="h-10 w-10 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HandCoins className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No Payment Requests Created Yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Broadcast collection requests to all registered households. Request fixed amounts (e.g. ₹500 for maintenance) or custom amounts (pay as you wish for charity/donations).
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateRequestModalOpen(true)}
              className="mt-2 text-xs bg-emerald-700 hover:bg-emerald-800 gap-1.5 cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Create First Payment Request
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleRequests.map((req) => {
              const reqContribs = requestContributions.filter((c) => c.request_id === req.id);
              const verifiedContribs = reqContribs.filter((c) => c.status === 'verified');
              const totalRaised = verifiedContribs.reduce((sum, c) => sum + c.amount, 0);
              const pendingReqContribs = reqContribs.filter((c) => c.status === 'under_review');
              const pct =
                req.target_total && req.target_total > 0
                  ? Math.min(100, Math.round((totalRaised / req.target_total) * 100))
                  : null;

              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
                    req.status === 'active'
                      ? 'border-slate-200 hover:border-emerald-300'
                      : 'border-slate-200/60 opacity-85 bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header badges */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {req.category}
                        </span>
                        {req.amount_type === 'fixed' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            Fixed: ₹{req.fixed_amount}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            Flexible (Pay as you wish)
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{req.title}</h3>
                      {req.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {req.description}
                        </p>
                      )}
                    </div>

                    {/* Target Progress Bar if set */}
                    {pct !== null && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                          <span>{pct}% Goal Reached</span>
                          <span>Target: ₹{req.target_total?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Stats metrics */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          Total Raised
                        </span>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          ₹{totalRaised.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          Contributors
                        </span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {verifiedContribs.length} houses
                        </span>
                      </div>
                    </div>

                    {pendingReqContribs.length > 0 && (
                      <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center justify-between">
                        <span>{pendingReqContribs.length} submission(s) pending review</span>
                        <button
                          onClick={() => setReviewTab('requests')}
                          className="text-amber-800 underline hover:text-amber-950 font-bold cursor-pointer"
                        >
                          Review &rarr;
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between gap-1.5 pt-3 mt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewContributorsReq(req)}
                      className="text-xs h-7 gap-1 px-2.5 text-slate-700 cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      Donors ({reqContribs.length})
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRequestStatus(req.id, req.status)}
                        className="text-[11px] h-7 px-2 text-slate-600 cursor-pointer"
                        title={req.status === 'active' ? 'Mark as Completed' : 'Reactivate Request'}
                      >
                        {req.status === 'active' ? 'Complete' : 'Reopen'}
                      </Button>
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Request"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reconciliation & Verification Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header & Tabs */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              Reconciliation &amp; Verification Queue
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Review transaction references submitted by residents for monthly dues and special collection drives.
            </p>
          </div>

          {/* Queue Filter Tabs */}
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setReviewTab('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                reviewTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Pending ({totalPendingReviews})
            </button>
            <button
              onClick={() => setReviewTab('monthly')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                reviewTab === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Dues ({reviewQueue.length})
            </button>
            <button
              onClick={() => setReviewTab('requests')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                reviewTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Special Requests ({pendingContributions.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Household &amp; Division</th>
                <th className="py-3.5 px-4">Payment Category / Purpose</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Transaction UTR / Ref</th>
                <th className="py-3.5 px-4">Submitted Time</th>
                <th className="py-3.5 px-6 text-right">Verification Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {((reviewTab === 'monthly' && reviewQueue.length === 0) ||
                (reviewTab === 'requests' && pendingContributions.length === 0) ||
                (reviewTab === 'all' && totalPendingReviews === 0)) ? (
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
                <>
                  {/* Monthly Dues Rows */}
                  {(reviewTab === 'all' || reviewTab === 'monthly') &&
                    reviewQueue.map(({ due, house }) => {
                      const isCopied = copiedId === due.id;
                      return (
                        <tr key={`monthly-${due.id}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="font-bold text-slate-900">{house.house_name}</div>
                            <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1 my-0.5">
                              <User className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>Head: {getHouseHeadName(house)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <span className="text-emerald-800 font-semibold">{house.mahallu_reg_no}</span>
                              <span>•</span>
                              <span>{DIVISION_LABELS[house.division as Division]}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 inline-flex items-center gap-1">
                                <Coins className="h-3 w-3 text-slate-500" />
                                Monthly Dues
                              </span>
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {due.billing_month}
                              </div>
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
                                  className="p-0.5 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
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
                                className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve &amp; Post Credit
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOpenReject('monthly', due.id)}
                                className="gap-1.5 cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {/* Special Payment Request Contribution Rows */}
                  {(reviewTab === 'all' || reviewTab === 'requests') &&
                    pendingContributions.map((contrib) => {
                      const house = houses.find((h) => h.id === contrib.house_id);
                      const req = paymentRequests.find((r) => r.id === contrib.request_id);
                      const isCopied = copiedId === contrib.id;

                      return (
                        <tr key={`req-contrib-${contrib.id}`} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="font-bold text-slate-900">
                              {house ? house.house_name : `House ID: ${contrib.house_id}`}
                            </div>
                            {house && (
                              <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1 my-0.5">
                                <User className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span>Head: {getHouseHeadName(house)}</span>
                              </div>
                            )}
                            {house && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                                <span className="text-emerald-800 font-semibold">{house.mahallu_reg_no}</span>
                                <span>•</span>
                                <span>{DIVISION_LABELS[house.division as Division]}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                                <HandCoins className="h-3 w-3 text-emerald-700" />
                                {req?.category || 'Special Fund'}
                              </span>
                              <div className="font-bold text-slate-900 text-xs line-clamp-1">
                                {req?.title || 'Special Collection'}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-black text-emerald-700 text-sm">
                              {formatCurrency(contrib.amount)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-800 font-semibold text-xs">
                              <span>{contrib.transaction_ref || 'N/A'}</span>
                              {contrib.transaction_ref && (
                                <button
                                  onClick={() => handleCopy(contrib.transaction_ref, contrib.id)}
                                  className="p-0.5 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
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
                            {formatDateTime(contrib.submitted_at)}
                          </td>

                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApproveContribution(contrib)}
                                className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve &amp; Post Credit
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOpenReject('request', contrib.id)}
                                className="gap-1.5 cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </>
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
              Confirm &amp; Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Amount Request Modal */}
      <Modal
        isOpen={createRequestModalOpen}
        onClose={() => setCreateRequestModalOpen(false)}
        title="Broadcast Payment / Amount Request"
        description="Request a fixed amount from each household or invite flexible contributions where users pay as they wish."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateAmountRequest} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fund / Collection Category *
              </label>
              <select
                value={reqCategory}
                onChange={(e) => setReqCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="Donation">Donation (General)</option>
                <option value="Mosque Renovation">Mosque Renovation</option>
                <option value="Building Fund">Building Fund</option>
                <option value="Relief Fund">Relief Fund</option>
                <option value="Maintenance">Maintenance &amp; Repairs</option>
                <option value="Education Aid">Education Aid &amp; Madrasa</option>
                <option value="Festival / Eid">Festival / Eid Collection</option>
                <option value="Other">Other (Custom Category)</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Campaign / Request Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Mosque AC Installation Fund"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* If 'Other' category selected, specify custom category */}
          {reqCategory === 'Other' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <label className="block font-bold text-amber-950 mb-1">
                Specify Custom Category Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Solar Power Installation, Ramadan Iftar Fund"
                value={reqCustomCategory}
                onChange={(e) => setReqCustomCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                required
              />
            </div>
          )}

          {/* Amount Mode Selector: Fixed vs Custom (Pay as they wish) */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              Contribution Mode *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fixed Amount Option */}
              <button
                type="button"
                onClick={() => setReqAmountType('fixed')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  reqAmountType === 'fixed'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-emerald-600" />
                    Fixed Amount per House
                  </span>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      reqAmountType === 'fixed'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {reqAmountType === 'fixed' && <Check className="h-3 w-3" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Every household is requested to pay an exact specified amount.
                </p>
              </button>

              {/* Custom / Flexible Amount Option */}
              <button
                type="button"
                onClick={() => setReqAmountType('custom')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  reqAmountType === 'custom'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <HandCoins className="h-4 w-4 text-emerald-600" />
                    Custom Amount (&quot;Pay as they wish&quot;)
                  </span>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      reqAmountType === 'custom'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {reqAmountType === 'custom' && <Check className="h-3 w-3" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Residents choose any amount they wish to give with optional suggested amounts.
                </p>
              </button>
            </div>
          </div>

          {/* Conditional Amount Fields */}
          {reqAmountType === 'fixed' ? (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800">
                Fixed Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={reqFixedAmount}
                  onChange={(e) => setReqFixedAmount(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Presets:</span>
                {[200, 500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setReqFixedAmount(String(amt))}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      reqFixedAmount === String(amt)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Suggested Amount (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1000"
                      value={reqSuggestedAmount}
                      onChange={(e) => setReqSuggestedAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Minimum Contribution (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      value={reqMinAmount}
                      onChange={(e) => setReqMinAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Residents will be able to enter any custom amount or pick quick chips (₹200, ₹500, ₹1,000, ₹2,500, ₹5,000).
              </p>
            </div>
          )}

          {/* Target Total and Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Fundraising Goal (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 250000"
                  value={reqTargetTotal}
                  onChange={(e) => setReqTargetTotal(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target End / Due Date (Optional)
              </label>
              <input
                type="date"
                value={reqDueDate}
                onChange={(e) => setReqDueDate(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description &amp; Message to Residents *
            </label>
            <textarea
              rows={3}
              value={reqDescription}
              onChange={(e) => setReqDescription(e.target.value)}
              placeholder="Explain the purpose of this collection, project details, and why residents should contribute..."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateRequestModalOpen(false)}
              disabled={isCreatingRequest}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreatingRequest}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              Publish &amp; Notify Residents
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Contributors Modal */}
      <Modal
        isOpen={viewContributorsReq !== null}
        onClose={() => setViewContributorsReq(null)}
        title={viewContributorsReq ? `${viewContributorsReq.title} - Contributors` : 'Contributors'}
        description="Complete list of household contributions submitted for this collection drive."
        maxWidth="4xl"
      >
        {viewContributorsReq && (() => {
          const reqContribs = requestContributions.filter(
            (c) => c.request_id === viewContributorsReq.id
          );
          const totalRaised = reqContribs
            .filter((c) => c.status === 'verified')
            .reduce((s, c) => s + c.amount, 0);

          return (
            <div className="space-y-4 text-xs">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Mode
                  </span>
                  <span className="font-bold text-slate-800 capitalize">
                    {viewContributorsReq.amount_type === 'fixed'
                      ? `Fixed: ₹${viewContributorsReq.fixed_amount}`
                      : 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Verified Raised
                  </span>
                  <span className="font-black text-emerald-700 text-sm">
                    ₹{totalRaised.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Submissions
                  </span>
                  <span className="font-bold text-slate-800">
                    {reqContribs.length} households
                  </span>
                </div>
              </div>

              {/* Contributors table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4">Household</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">UTR / Ref</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reqContribs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No contributions recorded yet for this request.
                        </td>
                      </tr>
                    ) : (
                      reqContribs.map((c) => {
                        const h = houses.find((house) => house.id === c.house_id);
                        return (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-900">
                                {h ? h.house_name : `House: ${c.house_id}`}
                              </div>
                              {h && (
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {h.mahallu_reg_no}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700">
                              ₹{c.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                              {c.transaction_ref}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {c.submitted_at?.slice(0, 10)}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  c.status === 'verified'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.status === 'under_review'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {c.status === 'under_review' ? 'Review' : c.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewContributorsReq(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
