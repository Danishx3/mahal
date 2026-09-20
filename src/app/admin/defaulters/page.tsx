'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '@/lib/data-service';
import { HouseWithDetails, Division, DIVISION_LABELS, DIVISION_LABELS_ML, PaymentRequestItem, PaymentRequestContribution } from '@/lib/supabase/types';
import { divisions } from '@/lib/schemas';
import { formatCurrency, getHouseHeadName } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/context/AuthContext';
import { useLanguage } from '@/lib/context/LanguageContext';
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
  User,
  Sparkles,
  Layers,
} from 'lucide-react';

function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  return clean;
}

function getMonthlyReminderMessage(
  houseName: string,
  regNo: string,
  month: string,
  upiId = 'kunjikkulam@upi',
  amount?: number,
  headName?: string,
  isMl = true
): string {
  const dueAmt = amount ?? DataService.getMonthlyDueAmount(month);
  const recipient = headName && headName !== '—' ? `${headName} (${houseName} - ${regNo})` : `${houseName} (${regNo})`;
  if (isMl) {
    return `അസ്സലാമു അലൈക്കും ${recipient},\n\nകുഞ്ഞിക്കുളം ജുമാ മസ്ജിദിൽ നിന്നുള്ള അറിയിപ്പാണ്. ${month} മാസത്തെ പ്രതിമാസ വരിസംഖ്യ (₹${dueAmt}) ഇതുവരെ അടച്ചിട്ടില്ലെന്ന് കാണുന്നു. ദയവായി താഴെ പറയുന്ന മഹല്ല് യുപിഐ (UPI) ഐഡിയിലേക്ക് തുക അയച്ച ശേഷം ട്രാൻസാക്ഷൻ യുടിആർ (UTR) നമ്പർ പോർട്ടലിൽ രേഖപ്പെടുത്തുമല്ലോ.\n\nയുപിഐ ഐഡി: ${upiId}\nതുക: ₹${dueAmt}\n\nജസാക്കല്ലാഹു ഖൈർ.`;
  }
  return `Assalamu Alaikum ${recipient}. This is a gentle reminder from Kunjikkulam Juma Masjid regarding monthly membership dues of ₹${dueAmt} for the period ${month}. Kindly transfer via UPI to ${upiId} and submit your UTR reference on the portal. Jazakallahu Khair.`;
}

function getSpecialReminderMessage(
  houseName: string,
  regNo: string,
  campaignTitle: string,
  fixedAmount?: number,
  upiId = 'kunjikkulam@upi',
  headName?: string,
  isMl = true
): string {
  const recipient = headName && headName !== '—' ? `${headName} (${houseName} - ${regNo})` : `${houseName} (${regNo})`;
  const amtText = fixedAmount ? ` (തുക: ₹${fixedAmount})` : '';
  if (isMl) {
    return `അസ്സലാമു അലൈക്കും ${recipient},\n\nകുഞ്ഞിക്കുളം ജുമാ മസ്ജിദിൽ നിന്നുള്ള അറിയിപ്പാണ്. "${campaignTitle}" പ്രത്യേക ശേഖരണത്തിലേക്ക്${amtText} താങ്കളുടെ വിഹിതം ദയവായി താഴെ പറയുന്ന യുപിഐ ഐഡിയിലേക്ക് അയച്ച് പോർട്ടലിൽ രേഖപ്പെടുത്തണമെന്ന് ഓർമ്മിപ്പിക്കുന്നു.\n\nയുപിഐ ഐഡി: ${upiId}\n${fixedAmount ? `തുക: ₹${fixedAmount}\n` : ''}\nജസാക്കല്ലാഹു ഖൈർ.`;
  }
  const amtTextEn = fixedAmount ? ` of ₹${fixedAmount}` : '';
  return `Assalamu Alaikum ${recipient}. This is a gentle reminder from Kunjikkulam Juma Masjid regarding the collection for "${campaignTitle}"${amtTextEn}. Kindly transfer via UPI to ${upiId} and submit your UTR reference on the portal. Jazakallahu Khair.`;
}

function getCombinedReminderMessage(
  houseName: string,
  regNo: string,
  duesSummary: string,
  upiId = 'kunjikkulam@upi',
  headName?: string,
  isMl = true
): string {
  const recipient = headName && headName !== '—' ? `${headName} (${houseName} - ${regNo})` : `${houseName} (${regNo})`;
  if (isMl) {
    return `അസ്സലാമു അലൈക്കും ${recipient},\n\nകുഞ്ഞിക്കുളം ജുമാ മസ്ജിദിൽ നിന്നുള്ള അറിയിപ്പാണ്. താങ്കളുടെ കുടിശ്ശിക വിവരങ്ങൾ (${duesSummary}) ദയവായി പരിശോധിച്ച് താഴെ പറയുന്ന യുപിഐ ഐഡിയിലേക്ക് അയച്ച് പോർട്ടലിൽ രേഖപ്പെടുത്തണമെന്ന് അഭ്യർത്ഥിക്കുന്നു.\n\nയുപിഐ ഐഡി: ${upiId}\n\nജസാക്കല്ലാഹു ഖൈർ.`;
  }
  return `Assalamu Alaikum ${recipient}. This is a gentle reminder from Kunjikkulam Juma Masjid regarding outstanding dues (${duesSummary}). Kindly transfer via UPI to ${upiId} and submit your UTR reference on the portal. Jazakallahu Khair.`;
}

function getMonthlyWhatsAppUrl(
  phone: string,
  houseName: string,
  regNo: string,
  month: string,
  upiId?: string,
  amount?: number,
  headName?: string,
  isMl = true
): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const msg = getMonthlyReminderMessage(houseName, regNo, month, upiId, amount, headName, isMl);
  if (!cleanPhone) return '';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

function getSpecialWhatsAppUrl(
  phone: string,
  houseName: string,
  regNo: string,
  campaignTitle: string,
  fixedAmount?: number,
  upiId?: string,
  headName?: string,
  isMl = true
): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const msg = getSpecialReminderMessage(houseName, regNo, campaignTitle, fixedAmount, upiId, headName, isMl);
  if (!cleanPhone) return '';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

const ALL_MONTHS = [
  { value: '01', label: '01 - ജനുവരി (Jan)', num: 1 },
  { value: '02', label: '02 - ഫെബ്രുവരി (Feb)', num: 2 },
  { value: '03', label: '03 - മാർച്ച് (Mar)', num: 3 },
  { value: '04', label: '04 - ഏപ്രിൽ (Apr)', num: 4 },
  { value: '05', label: '05 - മെയ് (May)', num: 5 },
  { value: '06', label: '06 - ജൂൺ (Jun)', num: 6 },
  { value: '07', label: '07 - ജൂലൈ (Jul)', num: 7 },
  { value: '08', label: '08 - ആഗസ്റ്റ് (Aug)', num: 8 },
  { value: '09', label: '09 - സെപ്റ്റംബർ (Sep)', num: 9 },
  { value: '10', label: '10 - ഒക്ടോബർ (Oct)', num: 10 },
  { value: '11', label: '11 - നവംബർ (Nov)', num: 11 },
  { value: '12', label: '12 - ഡിസംബർ (Dec)', num: 12 },
];

export default function PaymentDefaultersPage() {
  const { language } = useLanguage();
  const isMl = language === 'ml';
  const getDivName = (div: string) => isMl ? (DIVISION_LABELS_ML[div as Division] || div) : (DIVISION_LABELS[div as Division] || div);
  const { toast } = useToast();
  const { user } = useAuth();

  // Active Category View: 'monthly' | 'special' | 'combined'
  const [activeTab, setActiveTab] = useState<'monthly' | 'special' | 'combined'>('monthly');

  // Calendar thresholds (prevent future months and years)
  const currentDate = new Date();
  const currentYearNum = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentYearStr = String(currentYearNum);
  const currentMonthStr = String(currentMonthNum).padStart(2, '0');

  const availableYears = useMemo(() => {
    const years: string[] = [];
    for (let y = currentYearNum; y >= currentYearNum - 3; y--) {
      years.push(String(y));
    }
    return years;
  }, [currentYearNum]);

  // Monthly Dues State
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonthNum, setSelectedMonthNum] = useState(currentMonthStr);
  const selectedMonth = `${selectedYear}-${selectedMonthNum}`;

  const availableMonths = useMemo(() => {
    if (selectedYear === currentYearStr) {
      return ALL_MONTHS.filter((m) => m.num <= currentMonthNum);
    }
    return ALL_MONTHS;
  }, [selectedYear, currentYearStr, currentMonthNum]);

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    if (newYear === currentYearStr && parseInt(selectedMonthNum, 10) > currentMonthNum) {
      setSelectedMonthNum(currentMonthStr);
    }
  };

  // Status & Division & Search Filters
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unpaid' | 'under_review'>('all');
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data Stores
  const [allHousesData, setAllHousesData] = useState<{ house: HouseWithDetails; due: any }[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [specialContributions, setSpecialContributions] = useState<PaymentRequestContribution[]>([]);
  const [allHouses, setAllHouses] = useState<HouseWithDetails[]>([]);

  // Special Payment Campaigns Filter
  const [selectedRequestId, setSelectedRequestId] = useState<string>('all');
  const [showArchivedCampaigns, setShowArchivedCampaigns] = useState(false);

  // Dynamic UPI ID (fetched from payment settings)
  const [activeUpiId, setActiveUpiId] = useState<string>('kunjikkulam@upi');

  // Single and Batch Monthly Mark as Paid
  const [confirmHouse, setConfirmHouse] = useState<HouseWithDetails | null>(null);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [isConfirmingPaid, setIsConfirmingPaid] = useState(false);
  const [isBatchMarking, setIsBatchMarking] = useState(false);

  // Single and Batch Special Mark as Paid
  const [confirmSpecialTarget, setConfirmSpecialTarget] = useState<{
    house: HouseWithDetails;
    request: PaymentRequestItem;
    existingContribId?: string;
  } | null>(null);
  const [specialPayAmount, setSpecialPayAmount] = useState<number>(0);
  const [isConfirmingSpecialPaid, setIsConfirmingSpecialPaid] = useState(false);
  const [batchConfirmSpecialOpen, setBatchConfirmSpecialOpen] = useState(false);
  const [isBatchMarkingSpecial, setIsBatchMarkingSpecial] = useState(false);

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
  const [reminderMessage, setReminderMessage] = useState('');

  // 1. Data Loader
  const loadData = async () => {
    try {
      const [duesList, reqData, housesList, upi] = await Promise.all([
        DataService.getHouseDuesAsync(selectedMonth, selectedDivision, 'all'),
        DataService.getPaymentRequestsAsync(),
        DataService.getHousesAsync(),
        DataService.getUpiSettingsAsync(),
      ]);

      setAllHousesData(duesList || []);
      setPaymentRequests(reqData.requests || []);
      setSpecialContributions(reqData.contributions || []);
      setAllHouses(housesList || []);

      if (upi?.upiId) {
        setActiveUpiId(upi.upiId);
      }
    } catch (err) {
      console.warn('Error fetching defaulters data:', err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('mahallu_data_updated', loadData);
    window.addEventListener('mahallu_requests_updated', loadData);
    return () => {
      window.removeEventListener('mahallu_data_updated', loadData);
      window.removeEventListener('mahallu_requests_updated', loadData);
    };
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

  // Update default reminder message when tab, month, or campaign changes
  useEffect(() => {
    if (activeTab === 'monthly') {
      const dueAmount = DataService.getMonthlyDueAmount(selectedMonth);
      setReminderMessage(
        isMl
          ? `അസ്സലാമു അലൈക്കും. കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദിൽ നിന്നുള്ള അറിയിപ്പാണ്. ${selectedMonth} മാസത്തെ പ്രതിമാസ വരിസംഖ്യ (₹${dueAmount}) ദയവായി മഹല്ല് യുപിഐ ഐഡിയിലേക്ക് (${activeUpiId}) അയച്ച് പോർട്ടലിൽ യുടിആർ രേഖപ്പെടുത്തുമല്ലോ. ജസാക്കല്ലാഹു ഖൈർ.`
          : `Assalamu Alaikum. This is a gentle reminder from Kunjikkulam Juma Masjid regarding monthly membership dues of ₹${dueAmount} for period ${selectedMonth}. Kindly transfer via UPI to ${activeUpiId} and submit your UTR reference on the portal. Jazakallahu Khair.`
      );
    } else if (activeTab === 'special') {
      const req = paymentRequests.find((r) => r.id === selectedRequestId);
      const title = req ? req.title : (isMl ? 'പ്രത്യേക പിരിവ്' : 'Special Appeal');
      const amtStr = req?.fixed_amount ? ` (തുക: ₹${req.fixed_amount})` : '';
      const amtStrEn = req?.fixed_amount ? ` of ₹${req.fixed_amount}` : '';
      setReminderMessage(
        isMl
          ? `അസ്സലാമു അലൈക്കും. കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദിൽ നിന്നുള്ള അറിയിപ്പാണ്. "${title}" പ്രത്യേക ശേഖരണത്തിലേക്ക്${amtStr} താങ്കളുടെ വിഹിതം ദയവായി യുപിഐ ഐഡിയിലേക്ക് (${activeUpiId}) അയച്ച് പോർട്ടലിൽ രേഖപ്പെടുത്തണമെന്ന് അഭ്യർത്ഥിക്കുന്നു. ജസാക്കല്ലാഹു ഖൈർ.`
          : `Assalamu Alaikum. This is a gentle reminder from Kunjikkulam Juma Masjid regarding the collection for "${title}"${amtStrEn}. Kindly transfer via UPI to ${activeUpiId} and submit your UTR reference on the portal. Jazakallahu Khair.`
      );
    } else {
      setReminderMessage(
        isMl
          ? `അസ്സലാമു അലൈക്കും. കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദിൽ നിന്നുള്ള അറിയിപ്പാണ്. താങ്കളുടെ കുടിശ്ശിക വിവരങ്ങൾ പരിശോധിച്ച് ദയവായി യുപിഐ ഐഡിയിലേക്ക് (${activeUpiId}) അയച്ച് പോർട്ടലിൽ രേഖപ്പെടുത്തണമെന്ന് ഓർമ്മിപ്പിക്കുന്നു. ജസാക്കല്ലാഹു ഖൈർ.`
          : `Assalamu Alaikum. This is a gentle reminder from Kunjikkulam Juma Masjid regarding your outstanding dues. Kindly transfer via UPI to ${activeUpiId} and submit your reference on the portal. Jazakallahu Khair.`
      );
    }
  }, [activeTab, selectedMonth, selectedRequestId, activeUpiId, paymentRequests, isMl]);

  // Available Special Campaigns: If no active requests, show all so past/test drives remain accessible
  const activeSpecialCount = useMemo(
    () => paymentRequests.filter((r) => r.status === 'active').length,
    [paymentRequests]
  );

  const visibleSpecialRequests = useMemo(() => {
    if (showArchivedCampaigns || activeSpecialCount === 0) {
      return paymentRequests;
    }
    return paymentRequests.filter((r) => r.status !== 'cancelled');
  }, [paymentRequests, showArchivedCampaigns, activeSpecialCount]);

  // Selected Special Campaign object
  const currentSpecialReq = useMemo(() => {
    if (selectedRequestId === 'all') return null;
    return visibleSpecialRequests.find((r) => r.id === selectedRequestId) || null;
  }, [selectedRequestId, visibleSpecialRequests]);

  // --------------------------------------------------------------------------
  // MONTHLY DUES LIST & DERIVATIONS
  // --------------------------------------------------------------------------
  const monthlyRate = DataService.getMonthlyDueAmount(selectedMonth);
  const monthlyUnpaidHouses = allHousesData.filter(
    (d) => !d.due || d.due.status === 'pending' || d.due.status === 'failed'
  );
  const monthlyUnderReviewHouses = allHousesData.filter((d) => d.due?.status === 'under_review');
  const monthlyVerifiedHouses = allHousesData.filter((d) => d.due?.status === 'verified');

  const monthlyUnpaidCount = monthlyUnpaidHouses.length;
  const monthlyUnderReviewCount = monthlyUnderReviewHouses.length;
  const monthlyVerifiedCount = monthlyVerifiedHouses.length;

  const monthlyTotalOutstanding = allHousesData
    .filter((d) => !d.due || d.due.status !== 'verified')
    .reduce((sum, d) => sum + (d.due?.amount ?? monthlyRate), 0);

  const monthlyTotalCollected = allHousesData
    .filter((d) => d.due?.status === 'verified')
    .reduce((sum, d) => sum + (d.due?.amount ?? monthlyRate), 0);

  // Filtered Monthly Defaulters (PAID payments are strictly excluded)
  const filteredMonthlyList = useMemo(() => {
    return allHousesData.filter((d) => {
      // Exclude paid houses completely
      if (d.due?.status === 'verified') return false;

      if (selectedStatus === 'unpaid') {
        if (d.due && d.due.status !== 'pending' && d.due.status !== 'failed') return false;
      }
      if (selectedStatus === 'under_review') {
        if (d.due?.status !== 'under_review') return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const headName = getHouseHeadName(d.house).toLowerCase();
      return (
        d.house.house_name.toLowerCase().includes(q) ||
        d.house.mahallu_reg_no.toLowerCase().includes(q) ||
        d.house.house_number.toLowerCase().includes(q) ||
        d.house.phone.includes(q) ||
        headName.includes(q)
      );
    });
  }, [allHousesData, selectedStatus, searchQuery]);

  // Helper to find pending special dues for a given house
  const getHousePendingSpecialDues = (houseId: string) => {
    return visibleSpecialRequests.filter((req) => {
      const isPaid = specialContributions.some(
        (c) => c.request_id === req.id && c.house_id === houseId && c.status === 'verified'
      );
      return !isPaid;
    });
  };

  // --------------------------------------------------------------------------
  // SPECIAL PAYMENT DUES: LIST & DERIVATIONS (Just show due houses, strictly exclude paid)
  // --------------------------------------------------------------------------
  interface SpecialDefaulterItem {
    house: HouseWithDetails;
    request: PaymentRequestItem;
    status: 'unpaid' | 'under_review';
    pendingContrib?: PaymentRequestContribution;
    allDueRequests?: PaymentRequestItem[];
  }

  const specialDefaultersList: SpecialDefaulterItem[] = useMemo(() => {
    if (visibleSpecialRequests.length === 0) return [];

    const items: SpecialDefaulterItem[] = [];

    allHouses.forEach((house) => {
      // Division filter
      if (selectedDivision !== 'all' && house.division !== selectedDivision) return;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const headName = getHouseHeadName(house).toLowerCase();
        const matches =
          house.house_name.toLowerCase().includes(q) ||
          house.mahallu_reg_no.toLowerCase().includes(q) ||
          house.house_number.toLowerCase().includes(q) ||
          house.phone.includes(q) ||
          headName.includes(q);
        if (!matches) return;
      }

      if (currentSpecialReq) {
        // Specific campaign selected:
        // 1. Is this house verified/paid for this campaign?
        const isPaid = specialContributions.some(
          (c) => c.request_id === currentSpecialReq.id && c.house_id === house.id && c.status === 'verified'
        );
        // STRICT RULE: Paid payments must not be shown in due defaulters!
        if (isPaid) return;

        // 2. Has house submitted UTR pending review?
        const pendingContrib = specialContributions.find(
          (c) => c.request_id === currentSpecialReq.id && c.house_id === house.id && c.status === 'under_review'
        );

        const status: 'unpaid' | 'under_review' = pendingContrib ? 'under_review' : 'unpaid';

        // Status filter
        if (selectedStatus === 'unpaid' && status !== 'unpaid') return;
        if (selectedStatus === 'under_review' && status !== 'under_review') return;

        items.push({
          house,
          request: currentSpecialReq,
          status,
          pendingContrib,
        });
      } else {
        // "All Special Campaigns" selected:
        // Find all campaigns where this house has NOT paid
        const unpaidForCampaigns = visibleSpecialRequests.filter((req) => {
          const isPaid = specialContributions.some(
            (c) => c.request_id === req.id && c.house_id === house.id && c.status === 'verified'
          );
          return !isPaid;
        });

        // If house has paid all campaigns, exclude from due list!
        if (unpaidForCampaigns.length === 0) return;

        // Check if any contribution is under review
        const hasUnderReview = unpaidForCampaigns.some((req) =>
          specialContributions.some(
            (c) => c.request_id === req.id && c.house_id === house.id && c.status === 'under_review'
          )
        );

        const status: 'unpaid' | 'under_review' = hasUnderReview ? 'under_review' : 'unpaid';

        if (selectedStatus === 'unpaid' && status !== 'unpaid') return;
        if (selectedStatus === 'under_review' && status !== 'under_review') return;

        items.push({
          house,
          request: unpaidForCampaigns[0],
          status,
          allDueRequests: unpaidForCampaigns,
        });
      }
    });

    return items;
  }, [
    allHouses,
    visibleSpecialRequests,
    currentSpecialReq,
    specialContributions,
    selectedDivision,
    searchQuery,
    selectedStatus,
  ]);

  // Special Dues Summary Counts
  const specialDueCount = specialDefaultersList.length;
  const specialPaidCount = useMemo(() => {
    if (currentSpecialReq) {
      return specialContributions.filter(
        (c) => c.request_id === currentSpecialReq.id && c.status === 'verified'
      ).length;
    }
    return specialContributions.filter((c) => c.status === 'verified').length;
  }, [specialContributions, currentSpecialReq]);

  const specialUnderReviewCount = specialDefaultersList.filter((d) => d.status === 'under_review').length;

  // --------------------------------------------------------------------------
  // COMBINED OVERVIEW: HOUSES WITH ANY OUTSTANDING DUES
  // --------------------------------------------------------------------------
  interface CombinedDefaulterItem {
    house: HouseWithDetails;
    monthlyDueStatus: 'paid' | 'unpaid' | 'under_review';
    monthlyDueAmount: number;
    unpaidSpecialDues: PaymentRequestItem[];
  }

  const combinedDefaultersList: CombinedDefaulterItem[] = useMemo(() => {
    const items: CombinedDefaulterItem[] = [];

    allHouses.forEach((house) => {
      if (selectedDivision !== 'all' && house.division !== selectedDivision) return;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const headName = getHouseHeadName(house).toLowerCase();
        const matches =
          house.house_name.toLowerCase().includes(q) ||
          house.mahallu_reg_no.toLowerCase().includes(q) ||
          house.house_number.toLowerCase().includes(q) ||
          house.phone.includes(q) ||
          headName.includes(q);
        if (!matches) return;
      }

      // Check Monthly Due Status for selectedMonth
      const monthlyRecord = allHousesData.find((d) => d.house.id === house.id);
      let monthlyDueStatus: 'paid' | 'unpaid' | 'under_review' = 'unpaid';
      let monthlyDueAmount = monthlyRate;

      if (monthlyRecord?.due) {
        if (monthlyRecord.due.status === 'verified') monthlyDueStatus = 'paid';
        else if (monthlyRecord.due.status === 'under_review') monthlyDueStatus = 'under_review';
        else monthlyDueStatus = 'unpaid';
        monthlyDueAmount = monthlyRecord.due.amount ?? monthlyRate;
      }

      // Check Special Dues
      const unpaidSpecialDues = visibleSpecialRequests.filter((req) => {
        const isPaid = specialContributions.some(
          (c) => c.request_id === req.id && c.house_id === house.id && c.status === 'verified'
        );
        return !isPaid;
      });

      // Include house if it owes either monthly or special dues
      if (monthlyDueStatus !== 'paid' || unpaidSpecialDues.length > 0) {
        items.push({
          house,
          monthlyDueStatus,
          monthlyDueAmount: monthlyDueStatus === 'paid' ? 0 : monthlyDueAmount,
          unpaidSpecialDues,
        });
      }
    });

    return items;
  }, [allHouses, allHousesData, visibleSpecialRequests, specialContributions, selectedDivision, searchQuery, monthlyRate]);

  const handleToggleSelect = (houseId: string) => {
    setSelectedHouseIds((prev) =>
      prev.includes(houseId) ? prev.filter((id) => id !== houseId) : [...prev, houseId]
    );
  };

  const handleSelectAll = () => {
    const currentListIds =
      activeTab === 'monthly'
        ? filteredMonthlyList.map((d) => d.house.id)
        : activeTab === 'special'
        ? specialDefaultersList.map((d) => d.house.id)
        : combinedDefaultersList.map((d) => d.house.id);

    if (selectedHouseIds.length === currentListIds.length && currentListIds.length > 0) {
      setSelectedHouseIds([]);
    } else {
      setSelectedHouseIds(currentListIds);
    }
  };

  // Selected emails
  const selectedEmailRecipients = useMemo(() => {
    const list =
      activeTab === 'monthly'
        ? filteredMonthlyList.filter((d) => selectedHouseIds.includes(d.house.id)).map((d) => d.house)
        : activeTab === 'special'
        ? specialDefaultersList.filter((d) => selectedHouseIds.includes(d.house.id)).map((d) => d.house)
        : combinedDefaultersList.filter((d) => selectedHouseIds.includes(d.house.id)).map((d) => d.house);

    return list.filter((h) => Boolean(h.profile?.email));
  }, [activeTab, selectedHouseIds, filteredMonthlyList, specialDefaultersList, combinedDefaultersList]);

  // --------------------------------------------------------------------------
  // MONTHLY: MARK AS PAID ACTIONS
  // --------------------------------------------------------------------------
  const handleConfirmMarkAsPaid = async () => {
    if (!confirmHouse) return;
    setIsConfirmingPaid(true);
    try {
      const ok = await DataService.markHouseDueAsPaidAsync(
        confirmHouse.id,
        selectedMonth,
        user?.id || 'admin',
        'Cash / Offline'
      );
      if (ok) {
        toast(
          `Payment for ${confirmHouse.house_name} (${confirmHouse.mahallu_reg_no}) marked as Paid! Credit posted to Financial Ledger.`,
          'success'
        );
        setConfirmHouse(null);
        await loadData();
      } else {
        toast('Failed to record payment', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error recording payment', 'error');
    } finally {
      setIsConfirmingPaid(false);
    }
  };

  const handleConfirmBatchMarkAsPaid = async () => {
    const toMark = filteredMonthlyList
      .filter((d) => selectedHouseIds.includes(d.house.id))
      .map((d) => d.house);

    if (toMark.length === 0) {
      toast('No unpaid households selected', 'info');
      setBatchConfirmOpen(false);
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
      setBatchConfirmOpen(false);
      setSelectedHouseIds([]);
      await loadData();
    } catch (err: any) {
      toast(err.message || 'Error marking batch payments', 'error');
    } finally {
      setIsBatchMarking(false);
    }
  };

  // --------------------------------------------------------------------------
  // SPECIAL COLLECTIONS: MARK AS PAID ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenSpecialMarkPaidModal = (
    house: HouseWithDetails,
    request: PaymentRequestItem,
    existingContribId?: string
  ) => {
    setConfirmSpecialTarget({ house, request, existingContribId });
    setSpecialPayAmount(request.fixed_amount || 200);
  };

  const handleConfirmSpecialMarkAsPaid = async () => {
    if (!confirmSpecialTarget) return;
    setIsConfirmingSpecialPaid(true);
    try {
      await DataService.markSpecialContributionAsPaidAsync({
        requestId: confirmSpecialTarget.request.id,
        houseId: confirmSpecialTarget.house.id,
        amount: Number(specialPayAmount) || confirmSpecialTarget.request.fixed_amount || 200,
        adminId: user?.id || 'admin',
        requestTitle: confirmSpecialTarget.request.title,
        category: confirmSpecialTarget.request.category,
        paymentMethod: 'Cash / Offline',
        house: confirmSpecialTarget.house,
        existingContributionId: confirmSpecialTarget.existingContribId,
      });

      toast(
        `Special collection payment for ${confirmSpecialTarget.house.house_name} (${confirmSpecialTarget.request.title}) marked as Paid! Credit posted to Financial Ledger.`,
        'success'
      );
      setConfirmSpecialTarget(null);
      await loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to mark special payment as paid', 'error');
    } finally {
      setIsConfirmingSpecialPaid(false);
    }
  };

  const handleConfirmBatchSpecialMarkAsPaid = async () => {
    if (!currentSpecialReq) {
      toast('Please select a specific campaign to perform batch payment confirmation', 'error');
      setBatchConfirmSpecialOpen(false);
      return;
    }

    const selectedSpecialDefaulters = specialDefaultersList.filter((d) =>
      selectedHouseIds.includes(d.house.id)
    );

    if (selectedSpecialDefaulters.length === 0) {
      toast('No due households selected', 'info');
      setBatchConfirmSpecialOpen(false);
      return;
    }

    setIsBatchMarkingSpecial(true);
    try {
      let count = 0;
      for (const item of selectedSpecialDefaulters) {
        await DataService.markSpecialContributionAsPaidAsync({
          requestId: currentSpecialReq.id,
          houseId: item.house.id,
          amount: currentSpecialReq.fixed_amount || 200,
          adminId: user?.id || 'admin',
          requestTitle: currentSpecialReq.title,
          category: currentSpecialReq.category,
          paymentMethod: 'Cash / Offline',
          house: item.house,
          existingContributionId: item.pendingContrib?.id,
        });
        count++;
      }

      toast(
        `Successfully marked ${count} household(s) as Paid for "${currentSpecialReq.title}"! Automatic credits posted to Financial Ledger.`,
        'success'
      );
      setBatchConfirmSpecialOpen(false);
      setSelectedHouseIds([]);
      await loadData();
    } catch (err: any) {
      toast(err.message || 'Error processing batch special payments', 'error');
    } finally {
      setIsBatchMarkingSpecial(false);
    }
  };

  // --------------------------------------------------------------------------
  // DISPATCH REMINDERS (EMAIL & COPY)
  // --------------------------------------------------------------------------
  const handleCopySingle = (house: HouseWithDetails, customMsg?: string) => {
    const headName = getHouseHeadName(house);
    const text =
      customMsg ||
      (activeTab === 'special'
        ? getSpecialReminderMessage(
            house.house_name,
            house.mahallu_reg_no,
            currentSpecialReq?.title || 'Special Collection',
            currentSpecialReq?.fixed_amount,
            activeUpiId,
            headName
          )
        : getMonthlyReminderMessage(house.house_name, house.mahallu_reg_no, selectedMonth, activeUpiId, undefined, headName));

    navigator.clipboard.writeText(text);
    setCopiedId(house.id);
    toast(`Copied reminder message for ${house.house_name}!`, 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendSingleEmail = async (house: HouseWithDetails, campaignTitle?: string, amount?: number) => {
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
          month: campaignTitle ? `Special: ${campaignTitle}` : selectedMonth,
          customMessage: reminderMessage,
          upiId: activeUpiId,
          recipients: [
            {
              houseId: house.id,
              houseName: house.house_name,
              regNo: house.mahallu_reg_no,
              email,
              amount: amount ?? monthlyRate,
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
    if (selectedEmailRecipients.length === 0) {
      toast('None of the selected households have an email address', 'error');
      return;
    }

    setIsSendingEmails(true);
    try {
      const campaignName = activeTab === 'special' ? currentSpecialReq?.title || 'Special Collection' : selectedMonth;
      const res = await fetch('/api/admin/reminders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: activeTab === 'special' ? `Special: ${campaignName}` : selectedMonth,
          customMessage: reminderMessage,
          upiId: activeUpiId,
          recipients: selectedEmailRecipients.map((h) => ({
            houseId: h.id,
            houseName: h.house_name,
            regNo: h.mahallu_reg_no,
            email: h.profile!.email!,
            amount: activeTab === 'special' ? currentSpecialReq?.fixed_amount || 200 : monthlyRate,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch automated emails');
      }

      setRemindedHouseIds((prev) => {
        const next = new Set(prev);
        selectedEmailRecipients.forEach((r) => next.add(r.id));
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isMl ? 'കുടിശ്ശികക്കാരും അടയ്ക്കാനുള്ള പേയ്‌മെന്റുകളും' : 'Payment Defaulters & Outstanding Dues'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 text-xs font-bold">
              {activeTab === 'monthly'
                ? (isMl ? `${monthlyUnpaidCount} മാസവരി കുടിശ്ശിക` : `${monthlyUnpaidCount} Monthly Due`)
                : activeTab === 'special'
                ? (isMl ? `${specialDueCount} പ്രത്യേക പിരിവ് കുടിശ്ശിക` : `${specialDueCount} Special Due`)
                : (isMl ? `${combinedDefaultersList.length} ആകെ കുടിശ്ശിക` : `${combinedDefaultersList.length} Total Due`)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isMl
              ? 'കുടിശ്ശികയുള്ള വീടുകൾ കണ്ടെത്തുക, നേരിട്ട് ക്യാഷ് വാങ്ങി രേഖപ്പെടുത്തുക, വാട്സാപ്പ് / ഇമെയിൽ വഴി ഓർമ്മപ്പെടുത്തലുകൾ അയക്കുക.'
              : 'Identify due households, record direct cash payments to the financial ledger, and dispatch automated payment reminders.'}
          </p>
        </div>

        {/* Global Batch Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedHouseIds.length > 0 && activeTab === 'monthly' && (
            <Button
              variant="outline"
              onClick={() => setBatchConfirmOpen(true)}
              disabled={isBatchMarking}
              className="gap-1.5 border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {isBatchMarking
                ? (isMl ? 'പ്രോസസ്സ് ചെയ്യുന്നു...' : 'Processing...')
                : (isMl ? `തിരഞ്ഞെടുത്തവ അടച്ചതായി രേഖപ്പെടുത്തുക (${selectedHouseIds.length})` : `Mark Selected as Paid (${selectedHouseIds.length})`)}
            </Button>
          )}

          {selectedHouseIds.length > 0 && activeTab === 'special' && currentSpecialReq && (
            <Button
              variant="outline"
              onClick={() => setBatchConfirmSpecialOpen(true)}
              disabled={isBatchMarkingSpecial}
              className="gap-1.5 border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {isBatchMarkingSpecial
                ? (isMl ? 'പ്രോസസ്സ് ചെയ്യുന്നു...' : 'Processing...')
                : (isMl ? `തിരഞ്ഞെടുത്തവ അടച്ചതായി രേഖപ്പെടുത്തുക (${selectedHouseIds.length})` : `Mark Selected as Paid (${selectedHouseIds.length})`)}
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => setReminderModalOpen(true)}
            disabled={selectedHouseIds.length === 0}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
          >
            <Send className="h-4 w-4" />
            {isMl ? `ഓർമ്മപ്പെടുത്തൽ അയക്കുക (${selectedHouseIds.length})` : `Send Reminders (${selectedHouseIds.length})`}
          </Button>
        </div>
      </div>

      {/* Segmented View Switcher: Monthly Membership Dues vs Special Payment Dues vs Combined */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit">
        <button
          onClick={() => {
            setActiveTab('monthly');
            setSelectedHouseIds([]);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'monthly'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Calendar className="h-4 w-4 text-emerald-600" />
          <span>{isMl ? 'പ്രതിമാസ വരിസംഖ്യ' : 'Monthly Membership Dues'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
            {monthlyUnpaidCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('special');
            setSelectedHouseIds([]);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'special'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>{isMl ? 'പ്രത്യേക പിരിവുകൾ' : 'Special Payment Dues'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
            {specialDueCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('combined');
            setSelectedHouseIds([]);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'combined'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Layers className="h-4 w-4 text-slate-600" />
          <span>{isMl ? 'ആകെ കുടിശ്ശിക വിവരങ്ങൾ' : 'Combined Overview'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800">
            {combinedDefaultersList.length}
          </span>
        </button>
      </div>

      {/* KPI Cards: Dynamic by active tab */}
      {activeTab === 'monthly' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'ബില്ലിംഗ് മാസം' : 'Billing Month Cycle'}
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-emerald-700" />
              {selectedMonth}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isMl ? `നിരക്ക്: ${formatCurrency(monthlyRate)}/മാസം ഒരു വീടിന്` : `Tier: ${formatCurrency(monthlyRate)}/mo per household`}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'വരിസംഖ്യ അടയ്ക്കാത്ത വീടുകൾ' : 'Unpaid / Defaulter Houses'}
            </span>
            <div className="text-2xl font-extrabold text-rose-700 mt-2">
              {monthlyUnpaidCount} {isMl ? 'വീടുകൾ' : 'Houses'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isMl
                ? `${monthlyVerifiedCount} പേർ അടച്ചു • ആകെ ${allHousesData.length} വീടുകൾ`
                : `${monthlyVerifiedCount} paid • ${allHousesData.length} registered in ${selectedMonth}`}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'ആകെ കുടിശ്ശിക തുക' : 'Total Outstanding Balance'}
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              {formatCurrency(monthlyTotalOutstanding)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isMl
                ? `ഈ മാസം പിരിഞ്ഞ തുക: ${formatCurrency(monthlyTotalCollected)}`
                : `${formatCurrency(monthlyTotalCollected)} collected this cycle`}
            </p>
          </div>
        </div>
      ) : activeTab === 'special' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'പ്രത്യേക കാമ്പയിൻ' : 'Special Campaign Drive'}
            </span>
            <div className="text-xl font-extrabold text-slate-900 mt-2 truncate flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="truncate">{currentSpecialReq ? currentSpecialReq.title : (isMl ? 'എല്ലാ പ്രത്യേക പിരിവുകളും' : 'All Special Drives')}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentSpecialReq
                ? (isMl ? `ഇനം: ${currentSpecialReq.category}${currentSpecialReq.fixed_amount ? ` • ₹${currentSpecialReq.fixed_amount}/വീട്` : ''}` : `Category: ${currentSpecialReq.category}${currentSpecialReq.fixed_amount ? ` • ₹${currentSpecialReq.fixed_amount}/house` : ''}`)
                : (isMl ? `${visibleSpecialRequests.length} കാമ്പയിനുകൾ` : `${visibleSpecialRequests.length} drives active/listed`)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'നൽകാനുള്ള വീടുകൾ' : 'Due / Defaulter Houses'}
            </span>
            <div className="text-2xl font-extrabold text-rose-700 mt-2">
              {specialDueCount} {isMl ? 'വീടുകൾ' : 'Houses Due'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isMl
                ? `${specialPaidCount} പേർ നൽകി • ആകെ ${allHouses.length} വീടുകൾ`
                : `${specialPaidCount} cleared / paid • ${allHouses.length} registered households`}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'ശേഖരണ നില' : 'Collections Status'}
            </span>
            <div className="text-2xl font-extrabold text-emerald-700 mt-2">
              {specialPaidCount} {isMl ? 'സ്ഥിരീകരിച്ചു' : 'Verified'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isMl
                ? `${specialUnderReviewCount} പേയ്‌മെന്റുകൾ യുടിആർ പരിശോധനയിലാണ്`
                : `${specialUnderReviewCount} currently under UTR review`}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'ആകെ കുടിശ്ശികയുള്ള വീടുകൾ' : 'Total Defaulter Households'}
            </span>
            <div className="text-2xl font-extrabold text-rose-700 mt-2">
              {combinedDefaultersList.length} {isMl ? 'വീടുകൾ' : 'Houses'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isMl ? 'മാസവരിയോ പ്രത്യേക പിരിവോ അടയ്ക്കാനുള്ളവർ' : 'Have monthly dues or special dues pending'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'നിലവിലെ ബില്ലിംഗ് മാസം' : 'Current Billing Month'}
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              {selectedMonth}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isMl ? `പ്രതിമാസ വരിസംഖ്യ നിരക്ക്: ₹${monthlyRate}` : `Monthly membership baseline: ₹${monthlyRate}`}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isMl ? 'സന്ദേശങ്ങൾക്കുള്ള യുപിഐ' : 'Active UPI for Reminders'}
            </span>
            <div className="text-lg font-mono font-bold text-emerald-800 mt-2 truncate">
              {activeUpiId}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isMl ? 'പേയ്‌മെന്റ് ക്രമീകരണങ്ങളിൽ നിശ്ചയിച്ചത്' : 'Configured in payment settings'}
            </p>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Monthly view specific controls */}
        {activeTab === 'monthly' && (
          <>
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-600 shrink-0">{isMl ? 'വർഷം:' : 'Year:'}</label>
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
              <label className="text-xs font-semibold text-slate-600 shrink-0">{isMl ? 'മാസം:' : 'Month:'}</label>
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
          </>
        )}

        {/* Special view specific controls */}
        {activeTab === 'special' && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto flex-1 max-w-sm">
            <label className="text-xs font-semibold text-slate-600 shrink-0">{isMl ? 'കാമ്പയിൻ:' : 'Campaign:'}</label>
            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none truncate"
            >
              <option value="all">{isMl ? `എല്ലാ പ്രത്യേക പിരിവുകളും (${visibleSpecialRequests.length})` : `All Special Drives (${visibleSpecialRequests.length})`}</option>
              {visibleSpecialRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} {r.fixed_amount ? `(₹${r.fixed_amount})` : ''} • {r.category}
                  {r.status === 'cancelled' ? (isMl ? ' (ആർക്കൈവ് ചെയ്തു)' : ' (Archived)') : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">{isMl ? 'നില:' : 'Status:'}</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto"
          >
            <option value="all">{isMl ? 'എല്ലാ കുടിശ്ശിക വീടുകളും' : 'All Due Houses'}</option>
            <option value="unpaid">{isMl ? 'അടയ്ക്കാത്തവർ മാത്രം' : 'Unpaid Only'}</option>
            <option value="under_review">{isMl ? 'പരിശോധനയിലുള്ളവർ മാത്രം' : 'Under Review Only'}</option>
          </select>
        </div>

        {/* Division Selector */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">{isMl ? 'ഡിവിഷൻ:' : 'Division:'}</label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto"
          >
            <option value="all">{isMl ? 'എല്ലാ ഡിവിഷനുകളും (6)' : 'All Divisions (6)'}</option>
            {divisions.map((div) => (
              <option key={div} value={div}>
                {getDivName(div)}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] w-full">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isMl ? 'വീടിന്റെ പേര്, നമ്പർ, വാർഡ്, നാഥൻ, ഫോൺ എന്നിവ തിരയുക...' : 'Search house name, reg no, ward, head or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* VIEW 1: MONTHLY MEMBERSHIP DUES TABLE */}
      {/* -------------------------------------------------------------------------- */}
      {activeTab === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedHouseIds.length === filteredMonthlyList.length &&
                        filteredMonthlyList.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">{isMl ? 'രജി. നമ്പർ' : 'Reg No'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'വീടും വാർഡും' : 'House & Ward'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'കുടുംബനാഥൻ' : 'Head of Family'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'ഡിവിഷൻ' : 'Division'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'ഫോൺ നമ്പർ' : 'Primary Contact'}</th>
                  <th className="py-3.5 px-4">{isMl ? `${selectedMonth} ലെ നില` : `Status for ${selectedMonth}`}</th>
                  <th className="py-3.5 px-4 text-right">{isMl ? 'കുടിശ്ശിക' : 'Outstanding'}</th>
                  <th className="py-3.5 px-4 text-center">{isMl ? 'നടപടികൾ / ഓർമ്മപ്പെടുത്തൽ' : 'Actions / Remind'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMonthlyList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedStatus === 'under_review'
                            ? (isMl ? 'പരിശോധനയിലുള്ള പേയ്‌മെന്റുകൾ ഇല്ല' : 'No Payments Under Review')
                            : (isMl ? 'കുടിശ്ശികകൾ ഒന്നുമില്ല!' : 'Zero Outstanding Defaulters!')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {selectedStatus === 'under_review'
                            ? (isMl ? `${selectedMonth} മാസത്തിൽ UTR പരിശോധന കാത്തിരിക്കുന്ന വീടുകളൊന്നുമില്ല.` : `No households currently have pending UTR verification for month ${selectedMonth}.`)
                            : (isMl ? `${selectedMonth} മാസത്തെ എല്ലാ വരിസംഖ്യകളും വീടുകൾ അടച്ചുതീർത്തിരിക്കുന്നു!` : `All registered houses have cleared their dues for month ${selectedMonth}!`)}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMonthlyList.map(({ house, due }) => {
                    const isSelected = selectedHouseIds.includes(house.id);
                    const isUnderReview = due?.status === 'under_review';
                    const hasReminded = remindedHouseIds.has(house.id);
                    const pendingSpecial = getHousePendingSpecialDues(house.id);

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
                          <div className="text-[11px] text-slate-500">{isMl ? 'വാർഡ്:' : 'Ward:'} {house.house_number}</div>
                          {pendingSpecial.length > 0 && (
                            <button
                              onClick={() => {
                                setActiveTab('special');
                                setSelectedRequestId(pendingSpecial[0].id);
                              }}
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                              title={isMl ? 'പ്രത്യേക പിരിവ് വിവരങ്ങൾ കാണുക' : 'Click to view special due details'}
                            >
                              <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                              {isMl ? 'പ്രത്യേക പിരിവും കുടിശ്ശികയുണ്ട്:' : 'Also owes Special:'} {pendingSpecial[0].title}
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <span>{getHouseHeadName(house)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{isMl ? 'കുടുംബനാഥൻ' : 'Head of House'}</div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {getDivName(house.division as Division)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-800 font-mono">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {house.phone || 'N/A'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isUnderReview ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                              <Clock className="h-3 w-3 text-amber-600" />
                              {isMl ? 'UTR പരിശോധനയിൽ' : 'UTR Review'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-semibold border border-rose-200">
                              <AlertTriangle className="h-3 w-3 text-rose-600" />
                              {isMl ? 'അടച്ചിട്ടില്ല' : 'Unpaid'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                          <span>{formatCurrency(due?.amount ?? monthlyRate)}</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Mark as Paid */}
                            <button
                              onClick={() => setConfirmHouse(house)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors shadow-xs cursor-pointer"
                              title={`${house.house_name} ${isMl ? '- അടച്ചതായി രേഖപ്പെടുത്തുക' : 'Mark dues as paid'}`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {isMl ? 'അടച്ചു' : 'Mark as Paid'}
                            </button>

                            {/* WhatsApp Reminder */}
                            {house.phone ? (
                              <a
                                href={getMonthlyWhatsAppUrl(
                                  house.phone,
                                  house.house_name,
                                  house.mahallu_reg_no,
                                  selectedMonth,
                                  activeUpiId,
                                  undefined,
                                  getHouseHeadName(house)
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  setRemindedHouseIds((prev) => new Set(prev).add(house.id))
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors font-semibold text-[11px]"
                                title={isMl ? 'വാട്ട്‌സ്ആപ്പിൽ ഓർമ്മപ്പെടുത്തൽ തുറക്കുക' : 'Open in WhatsApp with prefilled reminder'}
                              >
                                <MessageSquare className="h-3 w-3" />
                                WhatsApp
                              </a>
                            ) : null}

                            {/* Email Reminder */}
                            {house.profile?.email && (
                              <button
                                onClick={() => handleSendSingleEmail(house)}
                                disabled={sendingHouseEmailId === house.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-colors font-semibold text-[11px] cursor-pointer"
                                title={`${house.profile.email} ലേക്ക് ഓർമ്മപ്പെടുത്തൽ ഇമെയിൽ അയക്കുക`}
                              >
                                <Mail className="h-3 w-3" />
                                {sendingHouseEmailId === house.id ? (isMl ? 'അയക്കുന്നു...' : 'Sending...') : (isMl ? 'ഇമെയിൽ' : 'Email')}
                              </button>
                            )}

                            {/* Copy reminder text */}
                            <button
                              onClick={() => handleCopySingle(house)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              title={isMl ? 'സന്ദേശം കോപ്പി ചെയ്യുക' : 'Copy reminder text'}
                            >
                              {copiedId === house.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {hasReminded && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <CheckCircle2 className="h-2.5 w-2.5" /> {isMl ? 'അയച്ചു' : 'Sent'}
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
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* VIEW 2: SPECIAL PAYMENT DUES TABLE (Just show due houses, strictly exclude paid) */}
      {/* -------------------------------------------------------------------------- */}
      {activeTab === 'special' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedHouseIds.length === specialDefaultersList.length &&
                        specialDefaultersList.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">{isMl ? 'രജി. നമ്പർ' : 'Reg No'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'വീടും വാർഡും' : 'House & Ward'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'കുടുംബനാഥൻ' : 'Head of Family'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'ഡിവിഷൻ' : 'Division'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'ഫോൺ നമ്പർ' : 'Primary Contact'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'കുടിശ്ശിക കാമ്പയിൻ / പിരിവ്' : 'Due Campaign / Appeal'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'നില' : 'Status'}</th>
                  <th className="py-3.5 px-4 text-center">{isMl ? 'നടപടികൾ / ഓർമ്മപ്പെടുത്തൽ' : 'Actions / Remind'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {specialDefaultersList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedStatus === 'under_review'
                            ? (isMl ? 'പരിശോധനയിലുള്ള പേയ്‌മെന്റുകൾ ഇല്ല' : 'No Payments Under Review')
                            : (isMl ? 'പ്രത്യേക പിരിവ് കുടിശ്ശികകൾ ഒന്നുമില്ല!' : 'All Clear! Zero Special Dues Pending')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {currentSpecialReq
                            ? (isMl ? `"${currentSpecialReq.title}" കാമ്പയിനിലേക്ക് എല്ലാ വീടുകളും വിഹിതം പൂർത്തിയാക്കിയിരിക്കുന്നു!` : `All registered households have completed contributions for "${currentSpecialReq.title}"!`)
                            : (isMl ? 'തിരഞ്ഞെടുത്ത ഫിൽട്ടറിൽ പ്രത്യേക പിരിവ് കുടിശ്ശികകളൊന്നും കണ്ടെത്താനായില്ല.' : 'No pending special payment dues found for the selected criteria.')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  specialDefaultersList.map(({ house, request, status, pendingContrib, allDueRequests }) => {
                    const isSelected = selectedHouseIds.includes(house.id);
                    const isUnderReview = status === 'under_review';
                    const hasReminded = remindedHouseIds.has(house.id);

                    return (
                      <tr
                        key={`${house.id}-${request.id}`}
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
                          <div className="text-[11px] text-slate-500">{isMl ? 'വാർഡ്:' : 'Ward:'} {house.house_number}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <span>{getHouseHeadName(house)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{isMl ? 'കുടുംബനാഥൻ' : 'Head of House'}</div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {getDivName(house.division as Division)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-800 font-mono">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {house.phone || 'N/A'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {allDueRequests && allDueRequests.length > 1 ? (
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-900">
                                {allDueRequests.length} {isMl ? 'പിരിവുകൾ ബാക്കി:' : 'Pending Drives:'}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {allDueRequests.map((r) => (
                                  <span
                                    key={r.id}
                                    className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium"
                                  >
                                    {r.title} {r.fixed_amount ? `(₹${r.fixed_amount})` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span>{request.title}</span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {request.category}
                                {request.fixed_amount ? ` • ₹${request.fixed_amount}` : ''}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isUnderReview ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                                <Clock className="h-3 w-3 text-amber-600" />
                                {isMl ? 'UTR പരിശോധനയിൽ' : 'UTR Review'}
                              </span>
                              {pendingContrib?.transaction_ref && (
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {isMl ? 'റഫറൻസ്:' : 'Ref:'} {pendingContrib.transaction_ref}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-semibold border border-rose-200">
                              <AlertTriangle className="h-3 w-3 text-rose-600" />
                              {isMl ? 'അടച്ചിട്ടില്ല' : 'Unpaid'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Mark as Paid button */}
                            <button
                              onClick={() =>
                                handleOpenSpecialMarkPaidModal(
                                  house,
                                  request,
                                  pendingContrib?.id
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors shadow-xs cursor-pointer"
                              title={`${house.house_name} - ${isMl ? 'അടച്ചതായി രേഖപ്പെടുത്തുക' : 'Record cash/offline payment'}`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {isMl ? 'അടച്ചു' : 'Mark as Paid'}
                            </button>

                            {/* WhatsApp reminder */}
                            {house.phone ? (
                              <a
                                href={getSpecialWhatsAppUrl(
                                  house.phone,
                                  house.house_name,
                                  house.mahallu_reg_no,
                                  request.title,
                                  request.fixed_amount,
                                  activeUpiId,
                                  getHouseHeadName(house)
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  setRemindedHouseIds((prev) => new Set(prev).add(house.id))
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors font-semibold text-[11px]"
                                title={isMl ? 'വാട്ട്‌സ്ആപ്പിൽ ഓർമ്മപ്പെടുത്തൽ തുറക്കുക' : 'Open in WhatsApp with prefilled special collection reminder'}
                              >
                                <MessageSquare className="h-3 w-3" />
                                WhatsApp
                              </a>
                            ) : null}

                            {/* Email reminder */}
                            {house.profile?.email && (
                              <button
                                onClick={() =>
                                  handleSendSingleEmail(
                                    house,
                                    request.title,
                                    request.fixed_amount || 200
                                  )
                                }
                                disabled={sendingHouseEmailId === house.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-colors font-semibold text-[11px] cursor-pointer"
                                title={`${house.profile.email} ലേക്ക് ഓർമ്മപ്പെടുത്തൽ ഇമെയിൽ അയക്കുക`}
                              >
                                <Mail className="h-3 w-3" />
                                {sendingHouseEmailId === house.id ? (isMl ? 'അയക്കുന്നു...' : 'Sending...') : (isMl ? 'ഇമെയിൽ' : 'Email')}
                              </button>
                            )}

                            {/* Copy button */}
                            <button
                              onClick={() => handleCopySingle(house)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              title={isMl ? 'സന്ദേശം കോപ്പി ചെയ്യുക' : 'Copy reminder text'}
                            >
                              {copiedId === house.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {hasReminded && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <CheckCircle2 className="h-2.5 w-2.5" /> {isMl ? 'അയച്ചു' : 'Sent'}
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
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* VIEW 3: COMBINED OVERVIEW TABLE (Houses with any unpaid dues) */}
      {/* -------------------------------------------------------------------------- */}
      {activeTab === 'combined' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedHouseIds.length === combinedDefaultersList.length &&
                        combinedDefaultersList.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">{isMl ? 'രജി. നമ്പർ' : 'Reg No'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'വീടും വാർഡും' : 'House & Ward'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'കുടുംബനാഥൻ' : 'Head of Family'}</th>
                  <th className="py-3.5 px-4">{isMl ? 'ഡിവിഷൻ' : 'Division'}</th>
                  <th className="py-3.5 px-4">{isMl ? `പ്രതിമാസ നില (${selectedMonth})` : `Monthly Status (${selectedMonth})`}</th>
                  <th className="py-3.5 px-4">{isMl ? 'ബാക്കിയുള്ള പ്രത്യേക പിരിവുകൾ' : 'Special Dues Pending'}</th>
                  <th className="py-3.5 px-4 text-center">{isMl ? 'യോജിപ്പിച്ച ഓർമ്മപ്പെടുത്തൽ' : 'Combined Remind'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedDefaultersList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {isMl ? 'എല്ലാ വീടുകളും കുടിശ്ശിക രഹിതം!' : 'All Households in Good Standing!'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {isMl ? 'ഒരു വീട്ടിലും പ്രതിമാസ വരിസംഖ്യയോ പ്രത്യേക പിരിവോ കുടിശ്ശികയായിട്ടില്ല.' : 'No households have outstanding monthly dues or unpaid special collections.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  combinedDefaultersList.map(({ house, monthlyDueStatus, monthlyDueAmount, unpaidSpecialDues }) => {
                    const isSelected = selectedHouseIds.includes(house.id);
                    const headName = getHouseHeadName(house);

                    // Build summary of dues for reminder message
                    const duesItems: string[] = [];
                    if (monthlyDueStatus !== 'paid') {
                      duesItems.push(isMl ? `പ്രതിമാസ വരിസംഖ്യ (${selectedMonth}): ₹${monthlyDueAmount}` : `Monthly Dues (${selectedMonth}): ₹${monthlyDueAmount}`);
                    }
                    if (unpaidSpecialDues.length > 0) {
                      const splText = unpaidSpecialDues
                        .map((s) => `${s.title}${s.fixed_amount ? ` ₹${s.fixed_amount}` : ''}`)
                        .join(', ');
                      duesItems.push(isMl ? `പ്രത്യേക പിരിവുകൾ: ${splText}` : `Special Drives: ${splText}`);
                    }
                    const duesSummary = duesItems.join(' | ');

                    const whatsappUrl = house.phone
                      ? `https://wa.me/${cleanPhoneNumber(house.phone)}?text=${encodeURIComponent(
                          getCombinedReminderMessage(
                            house.house_name,
                            house.mahallu_reg_no,
                            duesSummary,
                            activeUpiId,
                            headName
                          )
                        )}`
                      : '';

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
                          <div className="text-[11px] text-slate-500">{isMl ? 'വാർഡ്:' : 'Ward:'} {house.house_number}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <span>{headName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{isMl ? 'കുടുംബനാഥൻ' : 'Head of House'}</div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {getDivName(house.division as Division)}
                        </td>

                        <td className="py-3.5 px-4">
                          {monthlyDueStatus === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              {isMl ? 'അടച്ചു' : 'Paid'}
                            </span>
                          ) : monthlyDueStatus === 'under_review' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                              <Clock className="h-3 w-3 text-amber-600" />
                              {isMl ? 'UTR പരിശോധനയിൽ' : 'UTR Review'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-semibold border border-rose-200">
                              <AlertTriangle className="h-3 w-3 text-rose-600" />
                              {isMl ? 'അടച്ചിട്ടില്ല' : 'Unpaid'} (₹{monthlyDueAmount})
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {unpaidSpecialDues.length === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              {isMl ? 'മുഴുവൻ അടച്ചു' : 'All Cleared'}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {unpaidSpecialDues.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setActiveTab('special');
                                    setSelectedRequestId(s.id);
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                  {s.title} {s.fixed_amount ? `(₹${s.fixed_amount})` : ''}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {house.phone ? (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors font-semibold text-[11px]"
                                title={isMl ? 'എല്ലാ കുടിശ്ശികകളും ചേർത്തുള്ള വാട്ട്‌സ്ആപ്പ് ഓർമ്മപ്പെടുത്തൽ' : 'Open WhatsApp reminder with all pending dues summarized'}
                              >
                                <MessageSquare className="h-3 w-3" />
                                WhatsApp
                              </a>
                            ) : null}

                            <button
                              onClick={() =>
                                handleCopySingle(
                                  house,
                                  getCombinedReminderMessage(
                                    house.house_name,
                                    house.mahallu_reg_no,
                                    duesSummary,
                                    activeUpiId,
                                    headName
                                  )
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              title={isMl ? 'സന്ദേശം കോപ്പി ചെയ്യുക' : 'Copy combined reminder'}
                            >
                              {copiedId === house.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
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
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 1: BATCH EMAIL REMINDER */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title={isMl ? 'ഡ്യൂസ് പേയ്‌മെന്റ് ഓർമ്മപ്പെടുത്തലുകൾ അയക്കുക' : 'Dispatch Batch Dues Payment Reminders'}
        description={isMl ? `തിരഞ്ഞെടുത്ത ${selectedHouseIds.length} വീടുകളിലേക്ക് ഓർമ്മപ്പെടുത്തൽ സന്ദേശം അയക്കുക` : `Send reminder notification to ${selectedHouseIds.length} selected household(s)`}
      >
        <div className="space-y-4 text-xs">
          {/* Active UPI ID Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600">{isMl ? 'സ്വീകരിക്കുന്ന UPI ID:' : 'Active Receiving UPI ID:'}</span>
            <span className="font-mono font-bold text-emerald-800">{activeUpiId}</span>
          </div>

          {/* Reminder Message Template */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 text-xs">{isMl ? 'ഓർമ്മപ്പെടുത്തൽ സന്ദേശം:' : 'Reminder Notice Message:'}</label>
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
                  <span>{isMl ? 'ഓട്ടോമേറ്റഡ് ഇമെയിൽ അയക്കൽ' : 'Automated Email Dispatch'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-950">
                    {selectedEmailRecipients.length} {isMl ? 'സ്വീകർത്താക്കൾ' : 'Recipient(s)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isMl ? 'UPI വിവരങ്ങളടങ്ങിയ ഔദ്യോഗിക പേയ്‌മെന്റ് ഓർമ്മപ്പെടുത്തൽ ഇമെയിൽ വഴി നേരിട്ട് അയക്കുന്നു.' : 'Sends official HTML dues reminder with UPI details directly to residents\' inboxes.'}
                </p>
              </div>
            </div>

            {smtpStatus?.configured && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {isMl ? 'SMTP സജീവം' : 'SMTP Active'}
              </span>
            )}
          </div>

          {/* Selected Households Clean List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isMl ? `തിരഞ്ഞെടുത്ത കുടിശ്ശിക വീടുകൾ (${selectedHouseIds.length}):` : `Selected Due Households (${selectedHouseIds.length}):`}
              </span>
              <span className="text-[11px] text-slate-500">
                {selectedEmailRecipients.length} {isMl ? 'പേർക്ക് ഇമെയിൽ ഉണ്ട്' : 'with registered email'}
              </span>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5 divide-y divide-slate-100 border border-slate-200 rounded-xl p-2.5 bg-white">
              {selectedHouseIds.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-xs">{isMl ? 'വീടുകളൊന്നും തിരഞ്ഞെടുത്തിട്ടില്ല.' : 'No households selected.'}</p>
              ) : (
                selectedEmailRecipients.map((house) => {
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
                        <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                          <User className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{isMl ? 'നാഥൻ:' : 'Head:'} {getHouseHeadName(house)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {house.profile?.email}
                        </div>
                      </div>

                      {hasReminded && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" /> {isMl ? 'അയച്ചു' : 'Sent'}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReminderModalOpen(false)}
            >
              {isMl ? 'റദ്ദാക്കുക' : 'Close'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSendBatchAutomatedEmails}
              isLoading={isSendingEmails}
              disabled={selectedEmailRecipients.length === 0}
              className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
            >
              <Send className="h-3.5 w-3.5" />
              {isMl ? `ഓർമ്മപ്പെടുത്തൽ ഇമെയിലുകൾ അയക്കുക (${selectedEmailRecipients.length})` : `Send Automated Reminders (${selectedEmailRecipients.length})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 2: CONFIRM SINGLE MONTHLY MARK AS PAID */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(confirmHouse)}
        onClose={() => {
          if (!isConfirmingPaid) setConfirmHouse(null);
        }}
        title={isMl ? 'പ്രതിമാസ വരിസംഖ്യ അടച്ചതായി രേഖപ്പെടുത്തുക' : 'Confirm Mark as Paid - Monthly Dues'}
        description={isMl ? `${confirmHouse?.house_name || ''} നൽകിയ തുക സ്ഥിരീകരിച്ച് രേഖപ്പെടുത്തുക` : `Record verified offline/cash payment for ${confirmHouse?.house_name || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'വീട്' : 'Household'}</span>
              <span className="font-bold text-slate-900">{confirmHouse?.house_name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'കുടുംബനാഥൻ' : 'Head of Family'}</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-700" />
                {getHouseHeadName(confirmHouse)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'മഹല്ല് രജി. നമ്പർ' : 'Mahallu Reg No'}</span>
              <span className="font-mono font-bold text-emerald-800">{confirmHouse?.mahallu_reg_no}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'മാസം' : 'Billing Period'}</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                {selectedMonth}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'പേയ്‌മെന്റ് രീതി' : 'Payment Mode'}</span>
              <span className="font-semibold text-slate-800">{isMl ? 'ക്യാഷ് / നേരിട്ടുള്ള പിരിവ്' : 'Cash / Direct Collection'}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-700 font-bold">{isMl ? 'ആകെ തുക' : 'Total Amount'}</span>
              <span className="text-base font-extrabold text-emerald-800">₹{monthlyRate}.00</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              {isMl
                ? <>ഈ പേയ്‌മെന്റ് സ്ഥിരീകരിക്കുന്നതോടെ <strong>{selectedMonth}</strong> മാസത്തെ കുടിശ്ശിക തീർന്നതായി അടയാളപ്പെടുത്തുകയും മഹല്ല് വരവ് ചിലവ് രജിസ്റ്ററിൽ <strong>₹{monthlyRate}.00</strong> വരവായി രേഖപ്പെടുത്തുകയും ചെയ്യും.</>
                : <>Confirming this payment will mark the dues for <strong>{selectedMonth}</strong> as verified and automatically post a credit of <strong>₹{monthlyRate}.00</strong> to the Mahallu Financial Ledger.</>}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmHouse(null)}
              disabled={isConfirmingPaid}
            >
              {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmMarkAsPaid}
              isLoading={isConfirmingPaid}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isMl ? 'സ്ഥിരീകരിച്ച് അടച്ചതായി രേഖപ്പെടുത്തുക' : 'Confirm & Mark as Paid'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 3: CONFIRM BATCH MONTHLY MARK AS PAID */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={batchConfirmOpen}
        onClose={() => {
          if (!isBatchMarking) setBatchConfirmOpen(false);
        }}
        title={isMl ? 'കൂട്ടമായി അടച്ചതായി രേഖപ്പെടുത്തുക - പ്രതിമാസ വരിസംഖ്യ' : 'Confirm Batch Mark as Paid - Monthly Dues'}
        description={isMl ? `തിരഞ്ഞെടുത്ത ${selectedHouseIds.length} വീടുകളുടെ തുക അടച്ചതായി രേഖപ്പെടുത്തുക` : `Record verified offline payments for ${selectedHouseIds.length} selected household(s)`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'തിരഞ്ഞെടുത്ത വീടുകൾ' : 'Selected Households'}</span>
              <span className="font-bold text-slate-900">{selectedHouseIds.length} {isMl ? 'വീടുകൾ' : 'Houses'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'മാസം' : 'Billing Period'}</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                {selectedMonth}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'ഒരു വീടിന്റെ നിരക്ക്' : 'Amount per House'}</span>
              <span className="font-medium text-slate-800">₹{monthlyRate}.00</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-700 font-bold">{isMl ? 'രേഖപ്പെടുത്തുന്ന ആകെ തുക' : 'Total Collection to Credit'}</span>
              <span className="text-base font-extrabold text-emerald-800">
                {formatCurrency(selectedHouseIds.length * monthlyRate)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              {isMl
                ? <>തിരഞ്ഞെടുത്ത {selectedHouseIds.length} വീടുകളുടെ വരിസംഖ്യ അടച്ചതായി അടയാളപ്പെടുത്തുകയും {formatCurrency(selectedHouseIds.length * monthlyRate)} വരവ് ചിലവ് രജിസ്റ്ററിലേക്ക് ക്രെഡിറ്റ് ചെയ്യുകയും ചെയ്യും.</>
                : <>This will mark all {selectedHouseIds.length} selected household dues as verified and post {selectedHouseIds.length} credit entries ({formatCurrency(selectedHouseIds.length * monthlyRate)}) to the Financial Ledger.</>}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBatchConfirmOpen(false)}
              disabled={isBatchMarking}
            >
              {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmBatchMarkAsPaid}
              isLoading={isBatchMarking}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isMl ? `എല്ലാം അടച്ചതായി രേഖപ്പെടുത്തുക (${selectedHouseIds.length})` : `Confirm All as Paid (${selectedHouseIds.length})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 4: CONFIRM SPECIAL PAYMENT MARK AS PAID */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(confirmSpecialTarget)}
        onClose={() => {
          if (!isConfirmingSpecialPaid) setConfirmSpecialTarget(null);
        }}
        title={isMl ? 'പ്രത്യേക പിരിവ് അടച്ചതായി രേഖപ്പെടുത്തുക' : 'Confirm Mark as Paid - Special Collection'}
        description={isMl ? `${confirmSpecialTarget?.house.house_name || ''} നൽകിയ തുക സ്ഥിരീകരിച്ച് രേഖപ്പെടുത്തുക` : `Record verified offline payment for ${confirmSpecialTarget?.house.house_name || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'വീട്' : 'Household'}</span>
              <span className="font-bold text-slate-900">{confirmSpecialTarget?.house.house_name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'കുടുംബനാഥൻ' : 'Head of Family'}</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-700" />
                {getHouseHeadName(confirmSpecialTarget?.house)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'മഹല്ല് രജി. നമ്പർ' : 'Mahallu Reg No'}</span>
              <span className="font-mono font-bold text-emerald-800">
                {confirmSpecialTarget?.house.mahallu_reg_no}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'കാമ്പയിൻ' : 'Campaign Drive'}</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                {confirmSpecialTarget?.request.title}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'വിഭാഗം' : 'Category'}</span>
              <span className="font-semibold text-slate-800">
                {confirmSpecialTarget?.request.category}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-700 font-bold">{isMl ? 'വിഹിത തുക' : 'Contribution Amount'}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  value={specialPayAmount}
                  onChange={(e) => setSpecialPayAmount(Number(e.target.value))}
                  min={1}
                  className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-right font-extrabold text-emerald-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              {isMl
                ? <>ഈ തുക സ്ഥിരീകരിക്കുന്നതോടെ <strong>{confirmSpecialTarget?.request.title}</strong> ലേക്ക് അടച്ചതായി അടയാളപ്പെടുത്തുകയും വരവ് ചിലവ് രജിസ്റ്ററിലേക്ക് <strong>₹{specialPayAmount}.00</strong> വരവായി രേഖപ്പെടുത്തുകയും ചെയ്യും.</>
                : <>Confirming this payment will mark the special contribution for{' '}<strong>{confirmSpecialTarget?.request.title}</strong> as verified and automatically post a credit of <strong>₹{specialPayAmount}.00</strong> to the Mahallu Financial Ledger.</>}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmSpecialTarget(null)}
              disabled={isConfirmingSpecialPaid}
            >
              {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmSpecialMarkAsPaid}
              isLoading={isConfirmingSpecialPaid}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isMl ? 'സ്ഥിരീകരിച്ച് അടച്ചതായി രേഖപ്പെടുത്തുക' : 'Confirm & Mark as Paid'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 5: CONFIRM BATCH SPECIAL PAYMENT MARK AS PAID */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={batchConfirmSpecialOpen}
        onClose={() => {
          if (!isBatchMarkingSpecial) setBatchConfirmSpecialOpen(false);
        }}
        title={isMl ? 'കൂട്ടമായി അടച്ചതായി രേഖപ്പെടുത്തുക - പ്രത്യേക പിരിവ്' : 'Confirm Batch Mark as Paid - Special Collection'}
        description={isMl ? `തിരഞ്ഞെടുത്ത ${selectedHouseIds.length} വീടുകളുടെ തുക അടച്ചതായി രേഖപ്പെടുത്തുക` : `Record verified offline payments for ${selectedHouseIds.length} selected household(s)`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'കാമ്പയിൻ' : 'Campaign'}</span>
              <span className="font-bold text-slate-900">{currentSpecialReq?.title}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'തിരഞ്ഞെടുത്ത വീടുകൾ' : 'Selected Households'}</span>
              <span className="font-bold text-slate-900">{selectedHouseIds.length} {isMl ? 'വീടുകൾ' : 'Houses'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{isMl ? 'ഒരു വീടിന്റെ നിരക്ക്' : 'Amount per House'}</span>
              <span className="font-medium text-slate-800">
                ₹{currentSpecialReq?.fixed_amount || 200}.00
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-700 font-bold">{isMl ? 'രേഖപ്പെടുത്തുന്ന ആകെ തുക' : 'Total Collection to Credit'}</span>
              <span className="text-base font-extrabold text-emerald-800">
                {formatCurrency(selectedHouseIds.length * (currentSpecialReq?.fixed_amount || 200))}
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              {isMl
                ? <>തിരഞ്ഞെടുത്ത {selectedHouseIds.length} വീടുകൾ &quot;{currentSpecialReq?.title}&quot; ലേക്ക് അടച്ചതായി അടയാളപ്പെടുത്തുകയും വരവ് ചിലവ് രജിസ്റ്ററിലേക്ക് തുക വരവായി രേഖപ്പെടുത്തുകയും ചെയ്യും.</>
                : <>This will record {selectedHouseIds.length} verified contributions for &quot;{currentSpecialReq?.title}&quot; and automatically post the corresponding credits to the Financial Ledger.</>}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBatchConfirmSpecialOpen(false)}
              disabled={isBatchMarkingSpecial}
            >
              {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmBatchSpecialMarkAsPaid}
              isLoading={isBatchMarkingSpecial}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isMl ? `എല്ലാം അടച്ചതായി രേഖപ്പെടുത്തുക (${selectedHouseIds.length})` : `Confirm All as Paid (${selectedHouseIds.length})`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
