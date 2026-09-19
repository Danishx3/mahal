'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataService, ProfileUpdateRequest } from '@/lib/data-service';
import { HouseWithDetails, DIVISION_LABELS, Division, FamilyMember, MaritalStatus, PaymentRequestItem } from '@/lib/supabase/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Home,
  Users,
  CreditCard,
  Phone,
  Hash,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Crown,
  Briefcase,
  GraduationCap,
  BookOpen,
  Loader2,
  ArrowRight,
  Pencil,
  Lock,
  Send,
  Plus,
  Trash2,
  UserCheck,
  HandCoins,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

const RELATIONSHIP_OPTIONS = [
  'Self',
  'Wife',
  'Husband',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Grandson',
  'Granddaughter',
  'Son-in-law',
  'Daughter-in-law',
  'Other Relative',
];

const MARITAL_STATUS_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'divorced', label: 'Divorced' },
];

const JOB_STATUS_OPTIONS = [
  'Employed',
  'Business',
  'Abroad',
  'Homemaker',
  'Student',
  'Agriculture',
  'Retired',
  'Unemployed',
  'Other',
];

const GENERAL_EDUCATION_OPTIONS = [
  'Below SSLC',
  'SSLC',
  'Plus Two',
  'Diploma',
  'Degree',
  'PG',
  'Professional',
  'Other',
];

const RELIGIOUS_EDUCATION_OPTIONS = [
  'Basic',
  'Madrasa 5th',
  'Madrasa 7th',
  'Madrasa 10th',
  'Madrasa +2',
  'Dars',
  'Islamic Scholar',
  'Hafiz',
  'Other',
];

export default function ResidentDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, house: authHouse, isLoading } = useAuth();
  const [house, setHouse] = useState<HouseWithDetails | null>(null);
  const [membersExpanded, setMembersExpanded] = useState(true);
  const [activePaymentRequests, setActivePaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [specialPaidTotal, setSpecialPaidTotal] = useState(0);
  const [specialPaidCount, setSpecialPaidCount] = useState(0);
  const [marriageCerts, setMarriageCerts] = useState<any[]>([]);

  // Edit Profile / Dwelling Verification State
  const [pendingUpdate, setPendingUpdate] = useState<ProfileUpdateRequest | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<'dwelling' | 'members'>('dwelling');
  const [editHouseName, setEditHouseName] = useState('');
  const [editHouseNumber, setEditHouseNumber] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDivision, setEditDivision] = useState<Division>('alungal');
  const [editNote, setEditNote] = useState('');
  const [editMembers, setEditMembers] = useState<FamilyMember[]>([]);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      // Direct query from Supabase
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
        const ensured = DataService.ensureDuesForHouseSync(userHouse);
        const targetHouse: HouseWithDetails = {
          ...ensured,
          family_members: ensured.family_members || [],
          payment_dues: [...ensured.payment_dues],
        };

        setHouse(targetHouse);

        try {
          const update = await DataService.getProfileUpdateForHouseAsync(userHouse.id);
          setPendingUpdate(update);
        } catch {
          // Non-blocking
        }
      } else {
        setHouse(null);
      }

      // Load active payment requests (only active requests awaiting household fulfillment)
      try {
        const reqData = await DataService.getPaymentRequestsAsync();
        const activeOnly = (reqData.requests || []).filter((r) => r.status === 'active');
        const houseContributions = (reqData.contributions || []).filter((c) => c.house_id === userHouse?.id);
        const verifiedContributions = houseContributions.filter((c) => c.status === 'verified');
        const totalSplPaid = verifiedContributions.reduce((sum, c) => sum + Number(c.amount), 0);
        setSpecialPaidTotal(totalSplPaid);
        setSpecialPaidCount(verifiedContributions.length);

        const housePaidRequestIds = new Set(
          houseContributions
            .filter((c) => c.status === 'verified' || c.status === 'under_review')
            .map((c) => c.request_id)
        );
        const unfulfilledActive = activeOnly.filter((r) => !housePaidRequestIds.has(r.id));
        setActivePaymentRequests(unfulfilledActive);
        // Load marriage certificates for this household
        if (userHouse?.id) {
          try {
            const certs = await DataService.getMarriageCertificatesAsync(userHouse.id);
            setMarriageCerts(certs);
          } catch {
            // Non-blocking
          }
        }
      } catch (e) {
        console.warn('Failed to load active payment requests in dashboard:', e);
      }
    } catch (err) {
      console.warn('loadData resident dashboard error:', err);
    }
  };

  useEffect(() => {
    loadData();
    // High-frequency sync with admin updates (approval / rejection / payment status)
    const interval = setInterval(() => {
      loadData();
    }, 3500);

    const handleRequestsUpdated = () => {
      loadData();
    };

    window.addEventListener('mahallu_data_updated', loadData);
    window.addEventListener('mahallu_requests_updated', handleRequestsUpdated);
    window.addEventListener('mahallu_marriage_certs_updated', loadData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mahallu_data_updated', loadData);
      window.removeEventListener('mahallu_requests_updated', handleRequestsUpdated);
      window.removeEventListener('mahallu_marriage_certs_updated', loadData);
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <LoadingScreen
        title="Resident Portal"
        message="Loading household dashboard & dwelling records..."
        minHeight="min-h-[60vh]"
      />
    );
  }

  if (!house) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-slate-500">No household profile found for this account.</p>
          <Button onClick={() => router.push('/onboarding')}>Complete Onboarding</Button>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const verifiedDues = house.payment_dues.filter((d) => d.status === 'verified');
  const paidTotal = verifiedDues.reduce((acc, d) => acc + Number(d.amount), 0);
  const pendingDues = house.payment_dues.filter(
    (d) => d.status === 'pending' || d.status === 'under_review'
  );
  const pendingAmount = pendingDues.reduce((acc, d) => acc + Number(d.amount), 0);
  const failedDuesCount = house.payment_dues.filter((d) => d.status === 'failed').length;

  const handleOpenEditModal = (targetTab: 'dwelling' | 'members' = 'dwelling') => {
    if (!house) return;
    setActiveEditTab(targetTab);
    if (pendingUpdate && pendingUpdate.status === 'pending') {
      setEditHouseName(pendingUpdate.requested_details.house_name);
      setEditHouseNumber(pendingUpdate.requested_details.house_number);
      setEditPhone(pendingUpdate.requested_details.phone);
      setEditDivision(pendingUpdate.requested_details.division);
      setEditNote(pendingUpdate.note || '');
      if (
        pendingUpdate.requested_members &&
        Array.isArray(pendingUpdate.requested_members) &&
        pendingUpdate.requested_members.length > 0
      ) {
        setEditMembers(pendingUpdate.requested_members.map((m) => ({ ...m })));
      } else {
        setEditMembers((house.family_members || []).map((m) => ({ ...m })));
      }
    } else {
      setEditHouseName(house.house_name);
      setEditHouseNumber(house.house_number);
      setEditPhone(house.phone);
      setEditDivision(house.division);
      setEditNote('');
      setEditMembers((house.family_members || []).map((m) => ({ ...m })));
    }
    setEditModalOpen(true);
  };

  const handleAddMember = () => {
    const isFirst = editMembers.length === 0;
    const newMember: FamilyMember = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      house_id: house?.id || '',
      name: '',
      is_head_of_family: isFirst,
      relationship: isFirst ? 'Self' : 'Son',
      marital_status: 'single',
      job_status: 'Student',
      general_education: 'SSLC',
      religious_education: 'Madrasa 7th',
      age: 18,
      phone: null,
    };
    setEditMembers((prev) => [...prev, newMember]);
  };

  const handleUpdateMember = (index: number, field: keyof FamilyMember, value: any) => {
    setEditMembers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSetHeadOfFamily = (index: number) => {
    setEditMembers((prev) =>
      prev.map((m, i) => ({
        ...m,
        is_head_of_family: i === index,
        relationship:
          i === index
            ? m.relationship === 'Self'
              ? m.relationship
              : 'Self'
            : m.relationship === 'Self'
            ? 'Other Relative'
            : m.relationship,
      }))
    );
  };

  const handleRemoveMember = (index: number) => {
    if (editMembers.length <= 1) {
      toast('At least one family member is required in the household roster', 'error');
      return;
    }
    const wasHead = editMembers[index].is_head_of_family;
    const filtered = editMembers.filter((_, i) => i !== index);
    if (wasHead && filtered.length > 0) {
      filtered[0].is_head_of_family = true;
      if (filtered[0].relationship !== 'Self') filtered[0].relationship = 'Self';
    }
    setEditMembers(filtered);
  };

  const handleSubmitProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!house || !user) return;

    if (!editHouseName.trim()) {
      setActiveEditTab('dwelling');
      toast('Please enter your official house name', 'error');
      return;
    }
    if (!editHouseNumber.trim()) {
      setActiveEditTab('dwelling');
      toast('Please enter your ward / door number', 'error');
      return;
    }
    const cleanPhone = editPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setActiveEditTab('dwelling');
      toast('Please enter a valid 10-digit primary phone number', 'error');
      return;
    }

    if (editMembers.length === 0) {
      setActiveEditTab('members');
      toast('Household must have at least one family member', 'error');
      return;
    }

    for (let i = 0; i < editMembers.length; i++) {
      const m = editMembers[i];
      if (!m.name || m.name.trim().length < 2) {
        setActiveEditTab('members');
        toast(`Please enter a valid full name for member #${i + 1}`, 'error');
        return;
      }
    }

    // Ensure exactly one head
    const heads = editMembers.filter((m) => m.is_head_of_family);
    let finalMembers = [...editMembers];
    if (heads.length === 0) {
      finalMembers[0] = { ...finalMembers[0], is_head_of_family: true };
    } else if (heads.length > 1) {
      setActiveEditTab('members');
      toast('Please select only one Head of Family', 'error');
      return;
    }

    const formattedMembers: FamilyMember[] = finalMembers.map((m) => {
      const parsedAge = typeof m.age === 'number' ? m.age : Number(m.age);
      return {
        ...m,
        name: m.name.trim(),
        relationship: m.relationship || 'Relative',
        marital_status: m.marital_status || 'single',
        job_status: m.job_status || 'Other',
        general_education: m.general_education || 'SSLC',
        religious_education: m.religious_education || 'Basic',
        age: !isNaN(parsedAge) && parsedAge >= 0 ? parsedAge : null,
        phone: m.phone && m.phone.trim() !== '' ? m.phone.trim() : null,
      };
    });

    setIsSubmittingUpdate(true);
    try {
      const submitted = await DataService.submitProfileUpdateRequestAsync({
        house_id: house.id,
        user_id: user.id,
        mahallu_reg_no: house.mahallu_reg_no,
        current_details: {
          house_name: house.house_name,
          house_number: house.house_number,
          phone: house.phone,
          division: house.division,
        },
        requested_details: {
          house_name: editHouseName.trim(),
          house_number: editHouseNumber.trim(),
          phone: cleanPhone,
          division: editDivision,
        },
        current_members: house.family_members || [],
        requested_members: formattedMembers,
        note: editNote.trim() || undefined,
      });

      setPendingUpdate(submitted);
      setEditModalOpen(false);
      toast('Household details & family census submitted to Profile Verification! Admin will review and verify.', 'success');
    } catch (err: any) {
      toast(err?.message || 'Failed to submit profile update', 'error');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleCancelProfileUpdate = async () => {
    if (!pendingUpdate) return;
    try {
      await DataService.cancelProfileUpdateRequestAsync(pendingUpdate.id);
      setPendingUpdate(null);
      toast('Profile update request cancelled.', 'info');
    } catch (err: any) {
      toast(err?.message || 'Failed to cancel update request', 'error');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {house.house_name}
              </h1>
              <Badge variant="approved">Verified Household</Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>Mahallu Reg No: <strong className="text-emerald-800 font-mono">{house.mahallu_reg_no}</strong></span>
              <span>•</span>
              <span>Division: <strong className="text-slate-800">{DIVISION_LABELS[house.division]}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/marriage-certificate">
              <Button variant="outline" className="gap-2 border-slate-200">
                <FileCheck className="h-4 w-4 text-emerald-700" />
                Marriage Certificate
              </Button>
            </Link>
            <Link href="/dashboard/payments">
              <Button variant="primary" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Pay Monthly Dues
              </Button>
            </Link>
          </div>
        </div>

        {/* Approved Marriage Certificate Alert Banner */}
        {marriageCerts.find((c) => c.status === 'approved') && (
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-emerald-950">
                  Your application is accepted, contact mahal committee for certificate
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Couple:{' '}
                  <strong>{marriageCerts.find((c) => c.status === 'approved').husband_name}</strong>{' '}
                  &amp;{' '}
                  <strong>{marriageCerts.find((c) => c.status === 'approved').wife_full_name}</strong>{' '}
                  • Certificate Ref:{' '}
                  <span className="font-mono font-bold">
                    {marriageCerts.find((c) => c.status === 'approved').certificate_number || 'Official Ref Assigned'}
                  </span>
                </p>
              </div>
            </div>

            <Link href="/dashboard/marriage-certificate" className="shrink-0 w-full sm:w-auto">
              <Button size="sm" variant="primary" className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                View Certificate
              </Button>
            </Link>
          </div>
        )}

        {/* Active Payment Requests & Campaigns Banner */}
        {activePaymentRequests.length > 0 && (
          <div
            className="bg-[#064e3b] text-white p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-700/50"
            style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)' }}
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 shrink-0">
                <HandCoins className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wide">
                    Active Payment Request
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">
                    {activePaymentRequests[0].category}
                  </span>
                  {activePaymentRequests[0].amount_type === 'fixed' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                      Amount: ₹{activePaymentRequests[0].fixed_amount}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/30">
                      Pay As You Wish
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {activePaymentRequests[0].title}
                </h3>
                <p className="text-xs text-emerald-100/80 leading-relaxed max-w-2xl">
                  {activePaymentRequests[0].description ||
                    (activePaymentRequests[0].amount_type === 'fixed'
                      ? `The Mahallu Committee has requested an amount of ₹${activePaymentRequests[0].fixed_amount} from each household.`
                      : 'The Mahallu Committee has invited community contributions for this cause.')}
                </p>
              </div>
            </div>

            <Link href="/dashboard/payments" className="shrink-0 w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border-none gap-2 shadow-sm cursor-pointer py-2.5 px-4"
              >
                <span>View &amp; Pay Request</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pending Dues */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending / Due
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(pendingAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {pendingDues.length} month(s) awaiting payment or review
              </p>
              <Link
                href="/dashboard/payments"
                className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline"
              >
                <span>Pay Dues & Submit UPI Ref</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Paid Total */}
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
                {formatCurrency(paidTotal + specialPaidTotal)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {verifiedDues.length} dues + {specialPaidCount} special payment(s) verified
              </p>
              <Link
                href="/dashboard/payments"
                className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                <span>View Receipts & Ledger</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Household Strength */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Registered Members
              </span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {house.family_members.length} Members
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {house.family_members.filter((m) => m.job_status === 'Abroad').length} abroad (NRI) •{' '}
                {house.family_members.filter((m) => m.age !== null && m.age < 18).length} children
              </p>
            </div>
          </div>
        </div>

        {/* House Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <Home className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">Dwelling & Contact Records</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditModal('dwelling')}
              className="gap-1.5 font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer self-start sm:self-auto"
            >
              <Pencil className="h-3.5 w-3.5" />
              {pendingUpdate && pendingUpdate.status === 'pending' ? 'Edit / Modify Changes' : 'Edit Details'}
            </Button>
          </div>

          {/* Pending Update Notice */}
          {pendingUpdate && pendingUpdate.status === 'pending' && (
            <div className="mx-6 mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Profile Update Submitted for Admin Verification</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                    Pending Review
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Submitted on <strong>{formatDateTime(pendingUpdate.submitted_at)}</strong>. Mahallu Administration will verify your changes shortly.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-900 font-medium pt-1">
                  {pendingUpdate.requested_details.house_name !== house.house_name && (
                    <span>House Name: <strong className="text-amber-950 underline decoration-amber-400">{pendingUpdate.requested_details.house_name}</strong></span>
                  )}
                  {pendingUpdate.requested_details.house_number !== house.house_number && (
                    <span>Ward / Door: <strong className="text-amber-950 underline decoration-amber-400">{pendingUpdate.requested_details.house_number}</strong></span>
                  )}
                  {pendingUpdate.requested_details.phone !== house.phone && (
                    <span>Phone: <strong className="text-amber-950 underline decoration-amber-400">{pendingUpdate.requested_details.phone}</strong></span>
                  )}
                  {pendingUpdate.requested_details.division !== house.division && (
                    <span>Division: <strong className="text-amber-950 underline decoration-amber-400">{DIVISION_LABELS[pendingUpdate.requested_details.division]}</strong></span>
                  )}
                  {pendingUpdate.requested_members && pendingUpdate.requested_members.length > 0 && (
                    <span>Family Census: <strong className="text-amber-950 underline decoration-amber-400">{pendingUpdate.requested_members.length} member(s) ({pendingUpdate.requested_members.length !== house.family_members.length ? `${house.family_members.length} → ${pendingUpdate.requested_members.length}` : 'roster updated'})</strong></span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEditModal('dwelling')}
                  className="text-xs bg-white text-amber-950 border-amber-300 hover:bg-amber-100/70 cursor-pointer"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Modify
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelProfileUpdate}
                  className="text-xs text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  Cancel Request
                </Button>
              </div>
            </div>
          )}

          {/* Rejection Notice */}
          {pendingUpdate && pendingUpdate.status === 'rejected' && (
            <div className="mx-6 mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Previous Edit Request Rejected</span>
                  <span className="text-rose-800 text-[11px]">
                    Reason: <em>"{pendingUpdate.rejection_reason || 'Information could not be verified'}"</em>. You may edit and resubmit corrected records.
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditModal('dwelling')}
                className="text-xs bg-white text-rose-900 border-rose-300 hover:bg-rose-100/70 shrink-0 cursor-pointer"
              >
                Resubmit Changes
              </Button>
            </div>
          )}

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Official House Name</span>
              <span className="font-bold text-sm text-slate-900">{house.house_name}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Ward / Door Number</span>
              <span className="font-semibold text-slate-800">{house.house_number}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Mahallu Registration Number</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">
                {house.mahallu_reg_no}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Registered Phone</span>
              <span className="font-semibold text-slate-800">{house.phone}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Mahallu Division</span>
              <span className="font-semibold text-slate-800">
                {DIVISION_LABELS[house.division as Division] || house.division}
              </span>
            </div>
          </div>
        </div>

        {/* Family Members Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Family Members Census ({house.family_members.length})
              </h2>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditModal('members')}
                className="gap-1.5 font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer text-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                {pendingUpdate && pendingUpdate.status === 'pending' ? 'Edit / Modify Members' : 'Edit Members'}
              </Button>
              <button
                onClick={() => setMembersExpanded(!membersExpanded)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title={membersExpanded ? 'Collapse Census' : 'Expand Census'}
              >
                {membersExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Pending Members Verification Notice */}
          {pendingUpdate && pendingUpdate.status === 'pending' && pendingUpdate.requested_members && pendingUpdate.requested_members.length > 0 && (
            <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-2.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <span>
                  Census changes submitted for verification: <strong>{pendingUpdate.requested_members.length} member(s)</strong> awaiting admin approval.
                </span>
              </div>
              <button
                onClick={() => handleOpenEditModal('members')}
                className="text-amber-900 font-bold underline hover:text-amber-950 cursor-pointer text-left sm:text-right"
              >
                Review / Modify Roster
              </button>
            </div>
          )}

          {membersExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6">Name</th>
                    <th className="py-3 px-4">Relationship</th>
                    <th className="py-3 px-4">Age</th>
                    <th className="py-3 px-4">Marital Status</th>
                    <th className="py-3 px-4">Occupation</th>
                    <th className="py-3 px-4">Education</th>
                    <th className="py-3 px-4">Religious Ed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {house.family_members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {member.name}
                          {member.is_head_of_family && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Crown className="h-3 w-3" />
                              Head
                            </span>
                          )}
                        </div>
                        {member.phone && (
                          <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                            {member.phone}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{member.relationship}</td>
                      <td className="py-3.5 px-4 text-slate-700">{member.age ?? '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700 capitalize">{member.marital_status}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          {member.job_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <GraduationCap className="h-3 w-3 text-slate-400" />
                          {member.general_education}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <BookOpen className="h-3 w-3 text-emerald-600" />
                          {member.religious_education}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Household Profile & Family Census Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Household Profile & Census"
        description="Update your household dwelling records and family members census. Submitted changes will be forwarded to Mahallu Admin for verification."
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmitProfileUpdate} className="space-y-4 text-xs">
          {/* Tabs Switcher */}
          <div className="flex border-b border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => setActiveEditTab('dwelling')}
              className={`flex items-center gap-2 pb-2.5 px-3.5 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                activeEditTab === 'dwelling'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Dwelling & Contact Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditTab('members')}
              className={`flex items-center gap-2 pb-2.5 px-3.5 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                activeEditTab === 'members'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Family Members Census</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeEditTab === 'members'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {editMembers.length}
              </span>
            </button>
          </div>

          {/* Tab 1: Dwelling & Contact Records */}
          {activeEditTab === 'dwelling' && (
            <div className="space-y-4">
              {/* Permanent Mahallu Reg ID pill */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Permanent Mahallu Registration No
                  </span>
                  <span className="font-mono font-bold text-sm text-emerald-800">
                    {house.mahallu_reg_no}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                  <Lock className="h-3 w-3 text-slate-400" />
                  Locked by Mahallu
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* House Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Official House Name *
                  </label>
                  <input
                    type="text"
                    value={editHouseName}
                    onChange={(e) => setEditHouseName(e.target.value)}
                    placeholder="e.g. Cherickode house"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Ward / Door Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ward / Door Number *
                  </label>
                  <input
                    type="text"
                    value={editHouseNumber}
                    onChange={(e) => setEditHouseNumber(e.target.value)}
                    placeholder="e.g. Ward 3 / Door 142"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Registered Phone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Registered Contact Phone *
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Mahallu Division */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mahallu Ward / Division *
                  </label>
                  <select
                    value={editDivision}
                    onChange={(e) => setEditDivision(e.target.value as Division)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  >
                    {(Object.keys(DIVISION_LABELS) as Division[]).map((key) => (
                      <option key={key} value={key}>
                        {DIVISION_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason or Explanation for Changes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Updating contact number to head of family, door number revision as per local body records..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Family Members Census */}
          {activeEditTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">
                    Household Census Roster ({editMembers.length} Members)
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Add, remove, or edit member profiles. Designate one member as the official Head of Family.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMember}
                  className="gap-1.5 font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-100/60 cursor-pointer text-xs shrink-0 self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Member
                </Button>
              </div>

              {/* Scrollable Members List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {editMembers.map((member, index) => {
                  return (
                    <div
                      key={member.id || `member-${index}`}
                      className={`p-4 rounded-xl border transition-all ${
                        member.is_head_of_family
                          ? 'border-amber-300 bg-amber-50/25 shadow-2xs'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Member Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            {member.name || `Member #${index + 1}`}
                          </span>
                          {member.is_head_of_family ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[10px]">
                              <Crown className="h-3 w-3 text-amber-600" />
                              Head of Family
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetHeadOfFamily(index)}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer ml-1"
                            >
                              Make Head
                            </button>
                          )}
                        </div>

                        {editMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {/* Name */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => handleUpdateMember(index, 'name', e.target.value)}
                            placeholder="Full name as per official ID"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            required
                          />
                        </div>

                        {/* Relationship */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Relationship to Head *
                          </label>
                          <select
                            value={member.relationship}
                            onChange={(e) => handleUpdateMember(index, 'relationship', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {RELATIONSHIP_OPTIONS.map((rel) => (
                              <option key={rel} value={rel}>
                                {rel}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Age */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Age (Years)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={125}
                            value={member.age ?? ''}
                            onChange={(e) =>
                              handleUpdateMember(
                                index,
                                'age',
                                e.target.value === '' ? null : Number(e.target.value)
                              )
                            }
                            placeholder="e.g. 35"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>

                        {/* Marital Status */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Marital Status *
                          </label>
                          <select
                            value={member.marital_status}
                            onChange={(e) =>
                              handleUpdateMember(index, 'marital_status', e.target.value as MaritalStatus)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {MARITAL_STATUS_OPTIONS.map((ms) => (
                              <option key={ms.value} value={ms.value}>
                                {ms.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Employment Status */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Job / Employment *
                          </label>
                          <select
                            value={member.job_status}
                            onChange={(e) => handleUpdateMember(index, 'job_status', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {JOB_STATUS_OPTIONS.map((job) => (
                              <option key={job} value={job}>
                                {job}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* General Education */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            General Education *
                          </label>
                          <select
                            value={member.general_education}
                            onChange={(e) =>
                              handleUpdateMember(index, 'general_education', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {GENERAL_EDUCATION_OPTIONS.map((edu) => (
                              <option key={edu} value={edu}>
                                {edu}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Religious Education */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Religious Education *
                          </label>
                          <select
                            value={member.religious_education}
                            onChange={(e) =>
                              handleUpdateMember(index, 'religious_education', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {RELIGIOUS_EDUCATION_OPTIONS.map((redu) => (
                              <option key={redu} value={redu}>
                                {redu}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Contact Phone */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Personal Phone (Optional)
                          </label>
                          <input
                            type="tel"
                            value={member.phone || ''}
                            onChange={(e) => handleUpdateMember(index, 'phone', e.target.value)}
                            placeholder="10-digit mobile number"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Bottom Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div>
              {activeEditTab === 'dwelling' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveEditTab('members')}
                  className="gap-1 text-slate-700 cursor-pointer"
                >
                  <span>Edit Family Members ({editMembers.length})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveEditTab('dwelling')}
                  className="gap-1 text-slate-700 cursor-pointer"
                >
                  <span>← Back to Dwelling Details</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                disabled={isSubmittingUpdate}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingUpdate}
                className="bg-emerald-700 hover:bg-emerald-800 gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Submit to Profile Verification
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
