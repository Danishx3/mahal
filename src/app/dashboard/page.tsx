'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataService, ProfileUpdateRequest } from '@/lib/data-service';
import { HouseWithDetails, DIVISION_LABELS, DIVISION_LABELS_ML, Division, FamilyMember, MaritalStatus, PaymentRequestItem } from '@/lib/supabase/types';
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
import { useLanguage } from '@/lib/context/LanguageContext';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

const RELATIONSHIP_OPTIONS: { value: string; labelEn: string; labelMl: string }[] = [
  { value: 'Self', labelEn: 'Self (Head)', labelMl: 'സ്വയം (കുടുംബനാഥൻ)' },
  { value: 'Wife', labelEn: 'Wife', labelMl: 'ഭാര്യ' },
  { value: 'Husband', labelEn: 'Husband', labelMl: 'ഭർത്താവ്' },
  { value: 'Son', labelEn: 'Son', labelMl: 'മകൻ' },
  { value: 'Daughter', labelEn: 'Daughter', labelMl: 'മകൾ' },
  { value: 'Father', labelEn: 'Father', labelMl: 'പിതാവ്' },
  { value: 'Mother', labelEn: 'Mother', labelMl: 'മാതാവ്' },
  { value: 'Brother', labelEn: 'Brother', labelMl: 'സഹോദരൻ' },
  { value: 'Sister', labelEn: 'Sister', labelMl: 'സഹോദരി' },
  { value: 'Grandfather', labelEn: 'Grandfather', labelMl: 'മുത്തശ്ശൻ' },
  { value: 'Grandmother', labelEn: 'Grandmother', labelMl: 'മുത്തശ്ശി' },
  { value: 'Grandson', labelEn: 'Grandson', labelMl: 'കൊച്ചുമകൻ' },
  { value: 'Granddaughter', labelEn: 'Granddaughter', labelMl: 'കൊച്ചുമകൾ' },
  { value: 'Son-in-law', labelEn: 'Son-in-law', labelMl: 'മരുമകൻ' },
  { value: 'Daughter-in-law', labelEn: 'Daughter-in-law', labelMl: 'മരുമകൾ' },
  { value: 'Other Relative', labelEn: 'Other Relative', labelMl: 'മറ്റു ബന്ധുക്കൾ' },
];

const MARITAL_STATUS_OPTIONS: { value: MaritalStatus; labelEn: string; labelMl: string }[] = [
  { value: 'married', labelEn: 'Married', labelMl: 'വിവാഹിതൻ/വിവാഹിത' },
  { value: 'single', labelEn: 'Single', labelMl: 'അവിവാഹിതൻ/അവിവാഹിത' },
  { value: 'widowed', labelEn: 'Widowed', labelMl: 'വിധവ/വിഭാര്യൻ' },
  { value: 'divorced', labelEn: 'Divorced', labelMl: 'വിവാഹമോചിതൻ/വിവാഹമോചിത' },
];

const JOB_STATUS_OPTIONS: { value: string; labelEn: string; labelMl: string }[] = [
  { value: 'Employed', labelEn: 'Employed (Local)', labelMl: 'ജോലി (നാട്ടിൽ)' },
  { value: 'Business', labelEn: 'Business / Trade', labelMl: 'ബിസിനസ്സ് / വ്യാപാരം' },
  { value: 'Abroad', labelEn: 'Abroad / NRI', labelMl: 'പ്രവാസി (NRI)' },
  { value: 'Homemaker', labelEn: 'Homemaker', labelMl: 'വീട്ടമ്മ' },
  { value: 'Student', labelEn: 'Student', labelMl: 'വിദ്യാർത്ഥി' },
  { value: 'Agriculture', labelEn: 'Agriculture', labelMl: 'കൃഷി' },
  { value: 'Retired', labelEn: 'Retired', labelMl: 'വിരമിച്ചു' },
  { value: 'Unemployed', labelEn: 'Unemployed', labelMl: 'തൊഴിൽരഹിതൻ' },
  { value: 'Other', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ' },
];

const GENERAL_EDUCATION_OPTIONS: { value: string; labelEn: string; labelMl: string }[] = [
  { value: 'Below SSLC', labelEn: 'Below SSLC', labelMl: 'എസ്.എസ്.എൽ.സിക്ക് താഴെ' },
  { value: 'SSLC', labelEn: 'SSLC', labelMl: 'എസ്.എസ്.എൽ.സി (SSLC)' },
  { value: 'Plus Two', labelEn: 'Plus Two (+2)', labelMl: 'പ്ലസ് ടു (+2)' },
  { value: 'Diploma', labelEn: 'Diploma / ITI', labelMl: 'ഡിപ്ലോമ / ITI' },
  { value: 'Degree', labelEn: 'Degree / Graduate', labelMl: 'ബിരുദം (Degree)' },
  { value: 'PG', labelEn: 'Post Graduate (PG)', labelMl: 'ബിരുദാനന്തര ബിരുദം (PG)' },
  { value: 'Professional', labelEn: 'Professional', labelMl: 'പ്രൊഫഷണൽ കോഴ്സ്' },
  { value: 'Other', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ' },
];

const RELIGIOUS_EDUCATION_OPTIONS: { value: string; labelEn: string; labelMl: string }[] = [
  { value: 'Basic', labelEn: 'Basic Islamic Education', labelMl: 'പ്രാഥമിക മതവിദ്യാഭ്യാസം' },
  { value: 'Madrasa 5th', labelEn: 'Madrasa 5th Standard', labelMl: 'മദ്റസ 5-ാം ക്ലാസ്സ്' },
  { value: 'Madrasa 7th', labelEn: 'Madrasa 7th Standard', labelMl: 'മദ്റസ 7-ാം ക്ലാസ്സ്' },
  { value: 'Madrasa 10th', labelEn: 'Madrasa 10th Standard', labelMl: 'മദ്റസ 10-ാം ക്ലാസ്സ്' },
  { value: 'Madrasa +2', labelEn: 'Madrasa Secondary (+2)', labelMl: 'മദ്റസ പ്ലസ് ടു' },
  { value: 'Dars', labelEn: 'Masjid Dars Student', labelMl: 'ദർസ് വിദ്യാഭ്യാസം' },
  { value: 'Islamic Scholar', labelEn: 'Islamic Scholar / Moulavi', labelMl: 'ഇസ്ലാമിക പണ്ഡിതൻ / മൗലവി' },
  { value: 'Hafiz', labelEn: 'Hafiz-ul-Quran', labelMl: 'ഹാഫിളുൽ ഖുർആൻ' },
  { value: 'Other', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ' },
];

const getRelLabel = (val: string, isMl: boolean) => {
  const found = RELATIONSHIP_OPTIONS.find((o) => o.value.toLowerCase() === (val || '').toLowerCase());
  if (found) return isMl ? found.labelMl : found.labelEn;
  return val;
};
const getMaritalLabel = (val: string, isMl: boolean) => {
  const found = MARITAL_STATUS_OPTIONS.find((o) => o.value.toLowerCase() === (val || '').toLowerCase());
  if (found) return isMl ? found.labelMl : found.labelEn;
  return val;
};
const getJobLabel = (val: string, isMl: boolean) => {
  const found = JOB_STATUS_OPTIONS.find((o) => o.value.toLowerCase() === (val || '').toLowerCase());
  if (found) return isMl ? found.labelMl : found.labelEn;
  return val;
};
const getEduLabel = (val: string, isMl: boolean) => {
  const found = GENERAL_EDUCATION_OPTIONS.find((o) => o.value.toLowerCase() === (val || '').toLowerCase());
  if (found) return isMl ? found.labelMl : found.labelEn;
  return val;
};
const getRelEduLabel = (val: string, isMl: boolean) => {
  const found = RELIGIOUS_EDUCATION_OPTIONS.find((o) => o.value.toLowerCase() === (val || '').toLowerCase());
  if (found) return isMl ? found.labelMl : found.labelEn;
  return val;
};

export default function ResidentDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, house: authHouse, isLoading } = useAuth();
  const { language } = useLanguage();
  const isMl = language === 'ml';
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
        title={isMl ? 'റെസിഡന്റ് പോർട്ടൽ' : 'Resident Portal'}
        message={isMl ? 'കുടുംബ വിവരങ്ങളും രേഖകളും ലഭ്യമാക്കുന്നു...' : 'Loading household dashboard & dwelling records...'}
        minHeight="min-h-[60vh]"
      />
    );
  }

  if (!house) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-slate-500">
            {isMl ? 'ഈ അക്കൗണ്ടിൽ കുടുംബ വിവരങ്ങൾ കണ്ടെത്തിയില്ല.' : 'No household profile found for this account.'}
          </p>
          <Button onClick={() => router.push('/onboarding')}>
            {isMl ? 'കുടുംബ രജിസ്ട്രേഷൻ പൂർത്തിയാക്കുക' : 'Complete Onboarding'}
          </Button>
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
      toast(
        isMl
          ? 'കുടുംബത്തിൽ കുറഞ്ഞത് ഒരു അംഗമെങ്കിലും ഉണ്ടായിരിക്കണം'
          : 'At least one family member is required in the household roster',
        'error'
      );
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
      toast(isMl ? 'ഔദ്യോഗിക വീട്ടുപേര് നൽകുക' : 'Please enter your official house name', 'error');
      return;
    }
    if (!editHouseNumber.trim()) {
      setActiveEditTab('dwelling');
      toast(isMl ? 'വാർഡ് / വീട്ടുനമ്പർ നൽകുക' : 'Please enter your ward / door number', 'error');
      return;
    }
    const cleanPhone = editPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setActiveEditTab('dwelling');
      toast(isMl ? 'സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക' : 'Please enter a valid 10-digit primary phone number', 'error');
      return;
    }

    if (editMembers.length === 0) {
      setActiveEditTab('members');
      toast(isMl ? 'കുടുംബത്തിൽ കുറഞ്ഞത് ഒരു അംഗമെങ്കിലും ഉണ്ടായിരിക്കണം' : 'Household must have at least one family member', 'error');
      return;
    }

    for (let i = 0; i < editMembers.length; i++) {
      const m = editMembers[i];
      if (!m.name || m.name.trim().length < 2) {
        setActiveEditTab('members');
        toast(
          isMl
            ? `അംഗം #${i + 1}-ന്റെ പൂർണ്ണ പേര് നൽകുക`
            : `Please enter a valid full name for member #${i + 1}`,
          'error'
        );
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
      toast(isMl ? 'ഒരു കുടുംബനാഥനെ മാത്രം തിരഞ്ഞെടുക്കുക' : 'Please select only one Head of Family', 'error');
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
      toast(
        isMl
          ? 'കുടുംബ വിവരങ്ങളും സെൻസസും പരിശോധനയ്ക്കായി സമർപ്പിച്ചു! മഹല്ല് കമ്മിറ്റി പരിശോധിച്ച് അംഗീകരിക്കും.'
          : 'Household details & family census submitted to Profile Verification! Admin will review and verify.',
        'success'
      );
    } catch (err: any) {
      toast(err?.message || (isMl ? 'വിവരങ്ങൾ സമർപ്പിക്കുന്നതിൽ പരാജയപ്പെട്ടു' : 'Failed to submit profile update'), 'error');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleCancelProfileUpdate = async () => {
    if (!pendingUpdate) return;
    try {
      await DataService.cancelProfileUpdateRequestAsync(pendingUpdate.id);
      setPendingUpdate(null);
      toast(isMl ? 'തിരുത്തൽ അപേക്ഷ റദ്ദാക്കി.' : 'Profile update request cancelled.', 'info');
    } catch (err: any) {
      toast(err?.message || (isMl ? 'അപേക്ഷ റദ്ദാക്കാൻ കഴിഞ്ഞില്ല' : 'Failed to cancel update request'), 'error');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {house.house_name}
              </h1>
              <Badge variant="approved">
                {isMl ? 'അംഗീകൃത കുടുംബം' : 'Verified Household'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>{isMl ? 'മഹല്ല് രജിസ്റ്റർ നമ്പർ' : 'Mahallu Reg No'}: <strong className="text-emerald-800 font-mono">{house.mahallu_reg_no}</strong></span>
              <span>•</span>
              <span>{isMl ? 'ഡിവിഷൻ' : 'Division'}: <strong className="text-slate-800">
                {isMl ? (DIVISION_LABELS_ML[house.division as Division] || house.division) : (DIVISION_LABELS[house.division as Division] || house.division)}
              </strong></span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
            <Link href="/dashboard/marriage-certificate" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full justify-center gap-2 border-slate-200 text-xs sm:text-sm py-2.5 min-h-[44px]">
                <FileCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                <span className="truncate">{isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ്' : 'Marriage Cert'}</span>
              </Button>
            </Link>
            <Link href="/dashboard/payments" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full justify-center gap-2 text-xs sm:text-sm py-2.5 min-h-[44px]">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="truncate">{isMl ? 'മാസവരി അടയ്ക്കുക' : 'Pay Monthly Dues'}</span>
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
                  {isMl
                    ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ അംഗീകരിച്ചു, സർട്ടിഫിക്കറ്റിനായി മഹല്ല് കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക'
                    : 'Your application is accepted, contact mahal committee for certificate'}
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {isMl ? 'ദമ്പതികൾ' : 'Couple'}:{' '}
                  <strong>{marriageCerts.find((c) => c.status === 'approved').husband_name}</strong>{' '}
                  &amp;{' '}
                  <strong>{marriageCerts.find((c) => c.status === 'approved').wife_full_name}</strong>{' '}
                  • {isMl ? 'സർട്ടിഫിക്കറ്റ് റഫറൻസ്' : 'Certificate Ref'}:{' '}
                  <span className="font-mono font-bold">
                    {marriageCerts.find((c) => c.status === 'approved').certificate_number || (isMl ? 'ഔദ്യോഗിക റഫറൻസ് നൽകി' : 'Official Ref Assigned')}
                  </span>
                </p>
              </div>
            </div>

            <Link href="/dashboard/marriage-certificate" className="shrink-0 w-full sm:w-auto">
              <Button size="sm" variant="primary" className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                {isMl ? 'സർട്ടിഫിക്കറ്റ് കാണുക' : 'View Certificate'}
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
                    {isMl ? 'പ്രത്യേക പിരിവ് / ഫണ്ട്' : 'Active Payment Request'}
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">
                    {activePaymentRequests[0].category}
                  </span>
                  {activePaymentRequests[0].amount_type === 'fixed' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                      {isMl ? 'തുക' : 'Amount'}: ₹{activePaymentRequests[0].fixed_amount}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/30">
                      {isMl ? 'ഇഷ്ടമുള്ള തുക നൽകാം' : 'Pay As You Wish'}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {activePaymentRequests[0].title}
                </h3>
                <p className="text-xs text-emerald-100/80 leading-relaxed max-w-2xl">
                  {activePaymentRequests[0].description ||
                    (activePaymentRequests[0].amount_type === 'fixed'
                      ? (isMl ? `ഓരോ വീടും ₹${activePaymentRequests[0].fixed_amount} സംഭാവന നൽകാൻ മഹല്ല് കമ്മിറ്റി അഭ്യർത്ഥിക്കുന്നു.` : `The Mahallu Committee has requested an amount of ₹${activePaymentRequests[0].fixed_amount} from each household.`)
                      : (isMl ? 'ഈ പൊതുആവശ്യത്തിലേക്ക് നിങ്ങളുടെ സംഭാവനകൾ മഹല്ല് കമ്മിറ്റി സ്വാഗതം ചെയ്യുന്നു.' : 'The Mahallu Committee has invited community contributions for this cause.'))}
                </p>
              </div>
            </div>

            <Link href="/dashboard/payments" className="shrink-0 w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border-none gap-2 shadow-sm cursor-pointer py-2.5 px-4"
              >
                <span>{isMl ? 'വിവരങ്ങൾ കാണുക & അടയ്ക്കുക' : 'View & Pay Request'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Pending Dues */}
          <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {isMl ? 'അടയ്ക്കാനുള്ള മാസവരി' : 'Pending / Due'}
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(pendingAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isMl ? `${pendingDues.length} മാസത്തെ കുടിശ്ശിക / പരിശോധനയിൽ` : `${pendingDues.length} month(s) awaiting payment or review`}
              </p>
              <Link
                href="/dashboard/payments"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline min-h-[36px]"
              >
                <span>{isMl ? 'മാസവരി അടച്ച് UPI റഫറൻസ് സമർപ്പിക്കുക' : 'Pay Dues & Submit UPI Ref'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Paid Total */}
          <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {isMl ? 'ആകെ അടച്ച തുക (സ്ഥിരീകരിച്ചത്)' : 'Total Paid (Reconciled)'}
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-2xl font-extrabold text-emerald-800">
                {formatCurrency(paidTotal + specialPaidTotal)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isMl
                  ? `${verifiedDues.length} മാസവരി + ${specialPaidCount} പ്രത്യേക സംഭാവനകൾ സ്ഥിരീകരിച്ചു`
                  : `${verifiedDues.length} dues + ${specialPaidCount} special payment(s) verified`}
              </p>
              <Link
                href="/dashboard/payments"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline min-h-[36px]"
              >
                <span>{isMl ? 'രസീതുകളും ലെഡ്ജറും കാണുക' : 'View Receipts & Ledger'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Household Strength */}
          <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {isMl ? 'രജിസ്റ്റർ ചെയ്ത അംഗങ്ങൾ' : 'Registered Members'}
              </span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {house.family_members.length} {isMl ? 'അംഗങ്ങൾ' : 'Members'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {house.family_members.filter((m) => m.job_status === 'Abroad').length} {isMl ? 'പ്രവാസികൾ (NRI)' : 'abroad (NRI)'} •{' '}
                {house.family_members.filter((m) => m.age !== null && m.age < 18).length} {isMl ? 'കുട്ടികൾ' : 'children'}
              </p>
            </div>
          </div>
        </div>


        {/* House Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <Home className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                {isMl ? 'താമസസ്ഥലവും കോൺടാക്റ്റ് വിവരങ്ങളും' : 'Dwelling & Contact Records'}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditModal('dwelling')}
              className="gap-1.5 font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer self-start sm:self-auto"
            >
              <Pencil className="h-3.5 w-3.5" />
              {pendingUpdate && pendingUpdate.status === 'pending'
                ? (isMl ? 'മാറ്റങ്ങൾ തിരുത്തുക' : 'Edit / Modify Changes')
                : (isMl ? 'വിവരങ്ങൾ തിരുത്തുക' : 'Edit Details')}
            </Button>
          </div>

          {/* Pending Update Notice */}
          {pendingUpdate && pendingUpdate.status === 'pending' && (
            <div className="mx-6 mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>{isMl ? 'വിവരങ്ങളിലെ മാറ്റങ്ങൾ അഡ്മിൻ പരിശോധനയ്ക്കായി സമർപ്പിച്ചു' : 'Profile Update Submitted for Admin Verification'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                    {isMl ? 'പരിശോധനയിൽ' : 'Pending Review'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  {isMl
                    ? `സമർപ്പിച്ച തീയതി: ${formatDateTime(pendingUpdate.submitted_at)}. മഹല്ല് കമ്മിറ്റി പരിശോധിച്ച ശേഷം മാറ്റങ്ങൾ നിലവിൽ വരും.`
                    : `Submitted on ${formatDateTime(pendingUpdate.submitted_at)}. Mahallu Administration will verify your changes shortly.`}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-900 font-medium pt-1">
                  {pendingUpdate.requested_details.house_name !== house.house_name && (
                    <span>{isMl ? 'വീട്ടുപേര്' : 'House Name'}: <strong className="text-amber-950 underline decoration-amber-400">{pendingUpdate.requested_details.house_name}</strong></span>
                  )}
                  {pendingUpdate.requested_details.house_number !== house.house_number && (
                    <span>{isMl ? 'വാർഡ് / നമ്പർ' : 'Ward / Door'}: <strong className="text-amber-950 underline decoration-amber-400">{pendingUpdate.requested_details.house_number}</strong></span>
                  )}
                  {pendingUpdate.requested_details.phone !== house.phone && (
                    <span>{isMl ? 'ഫോൺ' : 'Phone'}: <strong className="text-amber-950 underline decoration-amber-400">{pendingUpdate.requested_details.phone}</strong></span>
                  )}
                  {pendingUpdate.requested_details.division !== house.division && (
                    <span>{isMl ? 'ഡിവിഷൻ' : 'Division'}: <strong className="text-amber-950 underline decoration-amber-400">
                      {isMl ? (DIVISION_LABELS_ML[pendingUpdate.requested_details.division] || pendingUpdate.requested_details.division) : (DIVISION_LABELS[pendingUpdate.requested_details.division] || pendingUpdate.requested_details.division)}
                    </strong></span>
                  )}
                  {pendingUpdate.requested_members && pendingUpdate.requested_members.length > 0 && (
                    <span>{isMl ? 'കുടുംബ സെൻസസ്' : 'Family Census'}: <strong className="text-amber-950 underline decoration-amber-400">{pendingUpdate.requested_members.length} {isMl ? 'അംഗങ്ങൾ' : 'member(s)'} ({pendingUpdate.requested_members.length !== house.family_members.length ? `${house.family_members.length} → ${pendingUpdate.requested_members.length}` : (isMl ? 'അംഗങ്ങളുടെ വിവരം പുതുക്കി' : 'roster updated')})</strong></span>
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
                  {isMl ? 'മാറ്റം വരുത്തുക' : 'Modify'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelProfileUpdate}
                  className="text-xs text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  {isMl ? 'അപേക്ഷ റദ്ദാക്കുക' : 'Cancel Request'}
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
                  <span className="font-bold block">{isMl ? 'മുൻ തിരുത്തൽ അപേക്ഷ നിരസിച്ചു' : 'Previous Edit Request Rejected'}</span>
                  <span className="text-rose-800 text-[11px]">
                    {isMl ? 'കാരണം' : 'Reason'}: <em>"{pendingUpdate.rejection_reason || (isMl ? 'വിവരങ്ങൾ സ്ഥിരീകരിക്കാൻ സാധിച്ചില്ല' : 'Information could not be verified')}"</em>. {isMl ? 'ശരിയായ വിവരങ്ങൾ ഉൾപ്പെടുത്തി വീണ്ടും സമർപ്പിക്കാം.' : 'You may edit and resubmit corrected records.'}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditModal('dwelling')}
                className="text-xs bg-white text-rose-900 border-rose-300 hover:bg-rose-100/70 shrink-0 cursor-pointer"
              >
                {isMl ? 'വീണ്ടും സമർപ്പിക്കുക' : 'Resubmit Changes'}
              </Button>
            </div>
          )}

          <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 text-xs">
            <div className="bg-slate-50/80 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-slate-100 sm:border-0 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block mb-1 text-[11px] font-medium">
                {isMl ? 'ഔദ്യോഗിക വീട്ടുപേര്' : 'Official House Name'}
              </span>
              <span className="font-bold text-sm text-slate-900">{house.house_name}</span>
            </div>

            <div className="bg-slate-50/80 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-slate-100 sm:border-0">
              <span className="text-slate-400 block mb-1 text-[11px] font-medium">
                {isMl ? 'വാർഡ് / വീട്ടുനമ്പർ' : 'Ward / Door Number'}
              </span>
              <span className="font-semibold text-slate-800">{house.house_number}</span>
            </div>

            <div className="bg-slate-50/80 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-slate-100 sm:border-0">
              <span className="text-slate-400 block mb-1 text-[11px] font-medium">
                {isMl ? 'മഹല്ല് രജിസ്റ്റർ നമ്പർ' : 'Mahallu Reg. Number'}
              </span>
              <span className="font-mono font-bold text-emerald-800 text-xs sm:text-sm">
                {house.mahallu_reg_no}
              </span>
            </div>

            <div className="bg-slate-50/80 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-slate-100 sm:border-0">
              <span className="text-slate-400 block mb-1 text-[11px] font-medium">
                {isMl ? 'രജിസ്റ്റർ ചെയ്ത ഫോൺ' : 'Registered Phone'}
              </span>
              <a
                href={`tel:${house.phone}`}
                className="font-semibold text-slate-800 hover:text-emerald-700 font-mono block"
              >
                {house.phone}
              </a>
            </div>

            <div className="bg-slate-50/80 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-slate-100 sm:border-0 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block mb-1 text-[11px] font-medium">
                {isMl ? 'മഹല്ല് ഡിവിഷൻ' : 'Mahallu Division'}
              </span>
              <span className="font-semibold text-slate-800 capitalize">
                {isMl ? (DIVISION_LABELS_ML[house.division as Division] || house.division) : (DIVISION_LABELS[house.division as Division] || house.division)}
              </span>
            </div>
          </div>
        </div>

        {/* Family Members Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                {isMl ? 'കുടുംബാംഗങ്ങളുടെ സെൻസസ്' : 'Family Members Census'} ({house.family_members.length})
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
                {pendingUpdate && pendingUpdate.status === 'pending'
                  ? (isMl ? 'അംഗങ്ങളെ തിരുത്തുക' : 'Edit / Modify Members')
                  : (isMl ? 'അംഗങ്ങളെ തിരുത്തുക' : 'Edit Members')}
              </Button>
              <button
                onClick={() => setMembersExpanded(!membersExpanded)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title={membersExpanded ? (isMl ? 'ചുരുക്കുക' : 'Collapse Census') : (isMl ? 'വിപുലീകരിക്കുക' : 'Expand Census')}
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
            <div className="bg-amber-50/80 border-b border-amber-200/80 px-5 sm:px-6 py-2.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <span>
                  {isMl
                    ? `സെൻസസ് മാറ്റങ്ങൾ സമർപ്പിച്ചു: ${pendingUpdate.requested_members.length} അംഗങ്ങളുടെ വിവരം പരിശോധനയിലാണ്.`
                    : `Census changes submitted for verification: ${pendingUpdate.requested_members.length} member(s) awaiting admin approval.`}
                </span>
              </div>
              <button
                onClick={() => handleOpenEditModal('members')}
                className="text-amber-900 font-bold underline hover:text-amber-950 cursor-pointer text-left sm:text-right"
              >
                {isMl ? 'പട്ടിക പരിശോധിക്കുക / തിരുത്തുക' : 'Review / Modify Roster'}
              </button>
            </div>
          )}

          {membersExpanded && (
            <>
              {/* Desktop View: Full Data Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-6">{isMl ? 'പേര്' : 'Name'}</th>
                      <th className="py-3 px-4">{isMl ? 'ബന്ധം' : 'Relationship'}</th>
                      <th className="py-3 px-4">{isMl ? 'വയസ്സ്' : 'Age'}</th>
                      <th className="py-3 px-4">{isMl ? 'വിവാഹാവസ്ഥ' : 'Marital Status'}</th>
                      <th className="py-3 px-4">{isMl ? 'തൊഴിൽ' : 'Occupation'}</th>
                      <th className="py-3 px-4">{isMl ? 'വിദ്യാഭ്യാസം' : 'Education'}</th>
                      <th className="py-3 px-4">{isMl ? 'മതവിദ്യാഭ്യാസം' : 'Religious Ed'}</th>
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
                                {isMl ? 'കുടുംബനാഥൻ' : 'Head'}
                              </span>
                            )}
                          </div>
                          {member.phone && (
                            <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                              {member.phone}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {getRelLabel(member.relationship, isMl)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{member.age ?? '—'}</td>
                        <td className="py-3.5 px-4 text-slate-700 capitalize">
                          {getMaritalLabel(member.marital_status, isMl)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            <Briefcase className="h-3 w-3 text-slate-400" />
                            {getJobLabel(member.job_status, isMl)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <GraduationCap className="h-3 w-3 text-slate-400" />
                            {getEduLabel(member.general_education, isMl)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <BookOpen className="h-3 w-3 text-emerald-600" />
                            {getRelEduLabel(member.religious_education, isMl)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Modern Touch-Friendly Member Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {house.family_members.map((member, idx) => (
                  <div key={member.id || idx} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                    {/* Top row: Name, Head badge, Phone */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            member.is_head_of_family
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {(member.name || 'M').trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{member.name}</span>
                            {member.is_head_of_family && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Crown className="h-3 w-3 text-amber-600" />
                                {isMl ? 'കുടുംബനാഥൻ' : 'Head'}
                              </span>
                            )}
                          </div>
                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              className="text-[11px] text-slate-500 hover:text-emerald-700 font-mono flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />
                              {member.phone}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Relationship chip */}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {getRelLabel(member.relationship, isMl)}
                      </span>
                    </div>

                    {/* Attributes Badges & Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {member.age !== null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {member.age} {isMl ? 'വയസ്സ്' : 'yrs'}
                        </span>
                      )}
                      {member.marital_status && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium capitalize">
                          {getMaritalLabel(member.marital_status, isMl)}
                        </span>
                      )}
                      {member.job_status && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                          <Briefcase className="h-3 w-3 text-blue-500" />
                          {getJobLabel(member.job_status, isMl)}
                        </span>
                      )}
                      {member.general_education && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                          <GraduationCap className="h-3 w-3 text-purple-500" />
                          {getEduLabel(member.general_education, isMl)}
                        </span>
                      )}
                      {member.religious_education && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                          <BookOpen className="h-3 w-3 text-emerald-600" />
                          {getRelEduLabel(member.religious_education, isMl)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>


      {/* Edit Household Profile & Family Census Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={isMl ? 'കുടുംബ വിവരങ്ങളും സെൻസസും തിരുത്തുക' : 'Edit Household Profile & Census'}
        description={
          isMl
            ? 'നിങ്ങളുടെ വീടിന്റെ വിവരങ്ങളും കുടുംബാംഗങ്ങളുടെ സെൻസസും അപ്‌ഡേറ്റ് ചെയ്യുക. മാറ്റങ്ങൾ മഹല്ല് കമ്മിറ്റി പരിശോധിച്ച ശേഷം അംഗീകരിക്കും.'
            : 'Update your household dwelling records and family members census. Submitted changes will be forwarded to Mahallu Admin for verification.'
        }
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmitProfileUpdate} className="space-y-4 text-xs">
          {/* Tabs Switcher */}
          <div className="flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar">
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
              <span>{isMl ? 'താമസസ്ഥലവും കോൺടാക്റ്റും' : 'Dwelling & Contact Details'}</span>
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
              <span>{isMl ? 'കുടുംബാംഗങ്ങളുടെ സെൻസസ്' : 'Family Members Census'}</span>
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
                    {isMl ? 'സ്ഥിരം മഹല്ല് രജിസ്ട്രേഷൻ നമ്പർ' : 'Permanent Mahallu Registration No'}
                  </span>
                  <span className="font-mono font-bold text-sm text-emerald-800">
                    {house.mahallu_reg_no}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                  <Lock className="h-3 w-3 text-slate-400" />
                  {isMl ? 'മഹല്ല് രേഖകളിൽ രേഖപ്പെടുത്തിയത്' : 'Locked by Mahallu'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* House Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isMl ? 'ഔദ്യോഗിക വീട്ടുപേര് *' : 'Official House Name *'}
                  </label>
                  <input
                    type="text"
                    value={editHouseName}
                    onChange={(e) => setEditHouseName(e.target.value)}
                    placeholder={isMl ? 'ഉദാ: ചെറിക്കോട് വീട്' : 'e.g. Cherickode house'}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Ward / Door Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isMl ? 'വാർഡ് / വീട്ടുനമ്പർ *' : 'Ward / Door Number *'}
                  </label>
                  <input
                    type="text"
                    value={editHouseNumber}
                    onChange={(e) => setEditHouseNumber(e.target.value)}
                    placeholder={isMl ? 'ഉദാ: വാർഡ് 3 / ഡോർ 142' : 'e.g. Ward 3 / Door 142'}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Registered Phone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isMl ? 'രജിസ്റ്റർ ചെയ്ത ഫോൺ നമ്പർ *' : 'Registered Contact Phone *'}
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder={isMl ? '10 അക്ക മൊബൈൽ നമ്പർ' : '10-digit mobile number'}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Mahallu Division */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isMl ? 'മഹല്ല് വാർഡ് / ഡിവിഷൻ *' : 'Mahallu Ward / Division *'}
                  </label>
                  <select
                    value={editDivision}
                    onChange={(e) => setEditDivision(e.target.value as Division)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  >
                    {(Object.keys(DIVISION_LABELS) as Division[]).map((key) => (
                      <option key={key} value={key}>
                        {isMl ? (DIVISION_LABELS_ML[key] || key) : DIVISION_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isMl ? 'മാറ്റങ്ങൾക്കുള്ള കാരണം / വിശദീകരണം (നിർബന്ധമില്ല)' : 'Reason or Explanation for Changes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={
                    isMl
                      ? 'ഉദാ: കുടുംബനാഥന്റെ ഫോൺ നമ്പർ പുതുക്കൽ, പഞ്ചായത്ത് രേഖ പ്രകാരമുള്ള വീട്ടുനമ്പർ...'
                      : 'e.g. Updating contact number to head of family, door number revision as per local body records...'
                  }
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
                    {isMl ? 'കുടുംബാംഗങ്ങളുടെ പട്ടിക' : 'Household Census Roster'} ({editMembers.length} {isMl ? 'അംഗങ്ങൾ' : 'Members'})
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    {isMl
                      ? 'കുടുംബാംഗങ്ങളെ ചേർക്കുകയോ തിരുത്തുകയോ ചെയ്യുക. ഒരാളെ കുടുംബനാഥനായി തിരഞ്ഞെടുക്കുക.'
                      : 'Add, remove, or edit member profiles. Designate one member as the official Head of Family.'}
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
                  {isMl ? 'അംഗത്തെ ചേർക്കുക' : 'Add Member'}
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
                            {member.name || `${isMl ? 'അംഗം' : 'Member'} #${index + 1}`}
                          </span>
                          {member.is_head_of_family ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[10px]">
                              <Crown className="h-3 w-3 text-amber-600" />
                              {isMl ? 'കുടുംബനാഥൻ' : 'Head of Family'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetHeadOfFamily(index)}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer ml-1"
                            >
                              {isMl ? 'കുടുംബനാഥനാക്കുക' : 'Make Head'}
                            </button>
                          )}
                        </div>

                        {editMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title={isMl ? 'അംഗത്തെ ഒഴിവാക്കുക' : 'Remove Member'}
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
                            {isMl ? 'പൂർണ്ണ പേര് *' : 'Full Name *'}
                          </label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => handleUpdateMember(index, 'name', e.target.value)}
                            placeholder={isMl ? 'തിരിച്ചറിയൽ രേഖയിലുള്ള പേര്' : 'Full name as per official ID'}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            required
                          />
                        </div>

                        {/* Relationship */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isMl ? 'കുടുംബനാഥനുമായുള്ള ബന്ധം *' : 'Relationship to Head *'}
                          </label>
                          <select
                            value={member.relationship}
                            onChange={(e) => handleUpdateMember(index, 'relationship', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {RELATIONSHIP_OPTIONS.map((rel) => (
                              <option key={rel.value} value={rel.value}>
                                {isMl ? rel.labelMl : rel.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Age */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isMl ? 'വയസ്സ് *' : 'Age (Years)'}
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
                            {isMl ? 'വിവാഹാവസ്ഥ *' : 'Marital Status *'}
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
                                {isMl ? ms.labelMl : ms.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Employment Status */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isMl ? 'തൊഴിൽ / ജോലി *' : 'Job / Employment *'}
                          </label>
                          <select
                            value={member.job_status}
                            onChange={(e) => handleUpdateMember(index, 'job_status', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {JOB_STATUS_OPTIONS.map((job) => (
                              <option key={job.value} value={job.value}>
                                {isMl ? job.labelMl : job.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* General Education */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isMl ? 'പൊതുവിദ്യാഭ്യാസം *' : 'General Education *'}
                          </label>
                          <select
                            value={member.general_education}
                            onChange={(e) =>
                              handleUpdateMember(index, 'general_education', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {GENERAL_EDUCATION_OPTIONS.map((edu) => (
                              <option key={edu.value} value={edu.value}>
                                {isMl ? edu.labelMl : edu.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Religious Education */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isMl ? 'മതവിദ്യാഭ്യാസം *' : 'Religious Education *'}
                          </label>
                          <select
                            value={member.religious_education}
                            onChange={(e) =>
                              handleUpdateMember(index, 'religious_education', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          >
                            {RELIGIOUS_EDUCATION_OPTIONS.map((redu) => (
                              <option key={redu.value} value={redu.value}>
                                {isMl ? redu.labelMl : redu.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Contact Phone */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isMl ? 'വ്യക്തിഗത ഫോൺ (നിർബന്ധമില്ല)' : 'Personal Phone (Optional)'}
                          </label>
                          <input
                            type="tel"
                            value={member.phone || ''}
                            onChange={(e) => handleUpdateMember(index, 'phone', e.target.value)}
                            placeholder={isMl ? '10 അക്ക മൊബൈൽ നമ്പർ' : '10-digit mobile number'}
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
                  <span>{isMl ? `കുടുംബാംഗങ്ങളെ തിരുത്തുക (${editMembers.length})` : `Edit Family Members (${editMembers.length})`}</span>
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
                  <span>{isMl ? '← താമസസ്ഥല വിവരങ്ങളിലേക്ക്' : '← Back to Dwelling Details'}</span>
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
                {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingUpdate}
                className="bg-emerald-700 hover:bg-emerald-800 gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {isMl ? 'പരിശോധനയ്ക്കായി സമർപ്പിക്കുക' : 'Submit to Profile Verification'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
