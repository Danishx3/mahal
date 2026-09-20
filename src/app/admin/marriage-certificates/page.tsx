'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useLanguage } from '@/lib/context/LanguageContext';
import { DataService } from '@/lib/data-service';
import { MarriageCertificateApplication, MarriageCertificateStatus } from '@/lib/supabase/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';
import { formatDateTime } from '@/lib/utils';
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Phone,
  Mail,
  Home,
  MapPin,
  Building2,
  Sparkles,
  Award,
  Filter,
  Check,
  X,
  AlertCircle,
  Eye,
  Send,
  Printer,
} from 'lucide-react';
import { MarriageCertificateSlipModal } from '@/components/resident/MarriageCertificateSlipModal';

export default function AdminMarriageCertificatesPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isMl = language === 'ml';
  const { toast } = useToast();

  const [applications, setApplications] = useState<MarriageCertificateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MarriageCertificateStatus>('all');

  // Modal states
  const [selectedApp, setSelectedApp] = useState<MarriageCertificateApplication | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Form states in modals
  const [certNumberInput, setCertNumberInput] = useState('');
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [slipApp, setSlipApp] = useState<MarriageCertificateApplication | null>(null);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await DataService.getMarriageCertificatesAsync();
      setApplications(data);
    } catch (err) {
      console.error('Failed to load marriage applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    const handleUpdate = () => loadApplications();
    window.addEventListener('mahallu_marriage_certs_updated', handleUpdate);
    return () => window.removeEventListener('mahallu_marriage_certs_updated', handleUpdate);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === 'pending').length;
    const approved = applications.filter((a) => a.status === 'approved').length;
    const rejected = applications.filter((a) => a.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [applications]);

  // Filtered List
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        app.husband_name.toLowerCase().includes(q) ||
        app.wife_full_name.toLowerCase().includes(q) ||
        app.house_name.toLowerCase().includes(q) ||
        app.mahallu_reg_no.toLowerCase().includes(q) ||
        (app.certificate_number && app.certificate_number.toLowerCase().includes(q)) ||
        (app.applicant_phone && app.applicant_phone.includes(q))
      );
    });
  }, [applications, statusFilter, searchQuery]);

  // Open Approval Modal
  const openApproveModal = (app: MarriageCertificateApplication) => {
    setSelectedApp(app);
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const defaultCert = app.certificate_number || `MHL-MC-${year}-${randomSuffix}`;
    setCertNumberInput(defaultCert);
    setAdminNotesInput(app.admin_notes || (isMl ? 'ഔദ്യോഗിക മഹല്ല് നിക്കാഹ് രജിസ്റ്ററുമായി ഒത്തുനോക്കി ബോധ്യപ്പെട്ടു.' : 'Verified against the official Mahallu Nikah register.'));
    setApproveModalOpen(true);
  };

  // Open Rejection Modal
  const openRejectModal = (app: MarriageCertificateApplication) => {
    setSelectedApp(app);
    setRejectionReasonInput('');
    setRejectModalOpen(true);
  };

  // Execute Approval
  const handleConfirmApproval = async () => {
    if (!selectedApp) return;
    setProcessing(true);
    try {
      await DataService.reviewMarriageCertificateAsync(selectedApp.id, 'approve', {
        certificateNumber: certNumberInput.trim(),
        adminNotes: adminNotesInput.trim(),
        adminId: user?.id,
        applicantEmail: selectedApp.applicant_email,
        houseName: selectedApp.house_name,
        mahalluRegNo: selectedApp.mahallu_reg_no,
        husbandName: selectedApp.husband_name,
        wifeFullName: selectedApp.wife_full_name,
        dateOfNikah: selectedApp.date_of_nikah,
      });

      toast(
        isMl
          ? `വിവാഹ സർട്ടിഫിക്കറ്റ് ${certNumberInput} അംഗീകരിച്ചു. ${selectedApp.applicant_email} ലേക്ക് ഔദ്യോഗിക ഇമെയിൽ അറിയിപ്പ് അയച്ചു.`
          : `Marriage certificate ${certNumberInput} approved. Automated email notification sent to ${selectedApp.applicant_email}.`,
        'success'
      );

      setApproveModalOpen(false);
      setSelectedApp(null);
      loadApplications();
    } catch (err: any) {
      toast(err?.message || (isMl ? 'അപേക്ഷ അംഗീകരിക്കാൻ കഴിഞ്ഞില്ല.' : 'Could not approve application.'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Execute Rejection
  const handleConfirmRejection = async () => {
    if (!selectedApp) return;
    if (!rejectionReasonInput.trim()) {
      toast(isMl ? 'നിരസിക്കാനുള്ള കാരണം വ്യക്തമാക്കുക.' : 'Please provide a clear reason for rejection.', 'error');
      return;
    }

    setProcessing(true);
    try {
      await DataService.reviewMarriageCertificateAsync(selectedApp.id, 'reject', {
        rejectionReason: rejectionReasonInput.trim(),
        adminId: user?.id,
      });

      toast(isMl ? 'അപേക്ഷ നിരസിച്ചതായി രേഖപ്പെടുത്തി.' : 'Application marked as rejected.', 'info');

      setRejectModalOpen(false);
      setSelectedApp(null);
      loadApplications();
    } catch (err: any) {
      toast(err?.message || (isMl ? 'അപേക്ഷ നിരസിക്കാൻ കഴിഞ്ഞില്ല.' : 'Could not reject application.'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <LoadingScreen
        title={isMl ? 'വിവാഹ രജിസ്ട്രി അഡ്മിനിസ്ട്രേഷൻ' : 'Admin Marriage Registry'}
        message={isMl ? 'സർട്ടിഫിക്കറ്റ് അപേക്ഷകളും പരിശോധനാ വിവരങ്ങളും ലഭ്യമാക്കുന്നു...' : 'Loading certificate applications and verification records...'}
        minHeight="min-h-[70vh]"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200/60">
            <FileCheck className="h-3.5 w-3.5 text-emerald-700" />
            {isMl ? 'കേന്ദ്ര രജിസ്ട്രി അഡ്മിനിസ്ട്രേഷൻ' : 'Central Registry Administration'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷകൾ' : 'Marriage Certificate Applications'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {isMl
              ? 'മഹല്ല് കുടുംബങ്ങൾ സമർപ്പിച്ച ഓൺലൈൻ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷകൾ പരിശോധിക്കുക, നിക്കാഹ് വിവരങ്ങൾ ഒത്തുനോക്കുക, സർട്ടിഫിക്കറ്റ് റഫറൻസ് നമ്പർ നൽകി അംഗീകരിക്കുക.'
              : 'Review online marriage certificate applications submitted by registered Mahallu households, cross-check Nikah details, issue certificate reference numbers, and notify applicants.'}
          </p>
        </div>

        <Button
          onClick={loadApplications}
          variant="outline"
          size="sm"
          className="self-start sm:self-auto flex items-center gap-1.5"
        >
          <Clock className="h-3.5 w-3.5" />
          {isMl ? 'ലിസ്റ്റ് പുതുക്കുക' : 'Refresh List'}
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isMl ? 'ആകെ അപേക്ഷകൾ' : 'Total Received'}</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
            {stats.total}
          </div>
          <span className="text-[11px] text-slate-500">{isMl ? 'ലഭിച്ച എല്ലാ അപേക്ഷകളും' : 'All-time applications'}</span>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-5 rounded-2xl border shadow-xs space-y-1 cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">{isMl ? 'പരിശോധനയിൽ' : 'Pending Review'}</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-900 tabular-nums">
            {stats.pending}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">{isMl ? 'കമ്മിറ്റി നടപടി ആവശ്യമാണ്' : 'Awaiting committee action'}</span>
        </div>

        {/* Approved */}
        <div
          onClick={() => setStatusFilter('approved')}
          className={`p-5 rounded-2xl border shadow-xs space-y-1 cursor-pointer transition-all ${
            statusFilter === 'approved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{isMl ? 'അംഗീകരിച്ചവ' : 'Approved'}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 tabular-nums">
            {stats.approved}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">{isMl ? 'നമ്പർ നൽകി അറിയിപ്പ് അയച്ചു' : 'Issued & notified'}</span>
        </div>

        {/* Rejected */}
        <div
          onClick={() => setStatusFilter('rejected')}
          className={`p-5 rounded-2xl border shadow-xs space-y-1 cursor-pointer transition-all ${
            statusFilter === 'rejected'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">{isMl ? 'നിരസിച്ചവ' : 'Rejected'}</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-900 tabular-nums">
            {stats.rejected}
          </div>
          <span className="text-[11px] text-rose-700 font-medium">{isMl ? 'തിരുത്തൽ ആവശ്യമാണ്' : 'Requires revision'}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isMl ? 'വരൻ, വധു, വീട്, രജി. നമ്പർ എന്നിവ തിരയുക...' : 'Search groom, bride, house, reg no...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => {
            const labelMap = {
              all: isMl ? 'എല്ലാം' : 'All',
              pending: isMl ? 'പരിശോധനയിൽ' : 'Pending',
              approved: isMl ? 'അംഗീകരിച്ചവ' : 'Approved',
              rejected: isMl ? 'നിരസിച്ചവ' : 'Rejected',
            };
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labelMap[st]} ({st === 'all' ? stats.total : stats[st]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{isMl ? 'ഫിൽട്ടറുമായി പൊരുത്തപ്പെടുന്ന അപേക്ഷകളൊന്നുമില്ല' : 'No applications match your filter'}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? (isMl ? `"${searchQuery}" ന് അനുയോജ്യമായ രേഖകളൊന്നും കണ്ടെത്തിയില്ല. കീവേഡുകൾ മാറ്റി തിരയുക.` : `No records found matching "${searchQuery}". Try clearing search keywords.`)
              : (isMl ? 'ഈ വിഭാഗത്തിൽ നിലവിൽ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷകളൊന്നുമില്ല.' : 'There are currently no marriage certificate applications under this category.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className={`bg-white rounded-3xl border shadow-xs transition-all overflow-hidden ${
                app.status === 'pending'
                  ? 'border-amber-200/90 hover:border-amber-300'
                  : app.status === 'approved'
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-6 sm:p-7 space-y-5">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                        app.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {app.status === 'approved' ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : app.status === 'pending' ? (
                        <Clock className="h-6 w-6" />
                      ) : (
                        <XCircle className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          {app.husband_name} <span className="text-slate-400 font-normal">&amp;</span>{' '}
                          {app.wife_full_name}
                        </h2>
                        {app.certificate_number && (
                          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {app.certificate_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{app.house_name}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-emerald-700">{app.mahallu_reg_no}</span>
                        <span className="text-slate-300">•</span>
                        <span>{isMl ? 'സമർപ്പിച്ചത്' : 'Submitted'} {formatDateTime(app.submitted_at)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={app.status}>
                      {isMl
                        ? (app.status === 'approved' ? 'അംഗീകരിച്ചു' : app.status === 'rejected' ? 'നിരസിച്ചു' : 'പരിശോധനയിൽ')
                        : app.status}
                    </Badge>
                  </div>
                </div>

                {/* Details 3-Column Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                  {/* Column 1: Groom */}
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isMl ? 'വരൻ' : 'Husband (Groom)'}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">{app.husband_name}</span>
                      <span className="text-slate-500 text-xs">{isMl ? 'ജനനത്തീയതി:' : 'DOB:'} {app.husband_dob}</span>
                    </div>
                  </div>

                  {/* Column 2: Bride */}
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isMl ? 'വധു' : 'Wife (Bride)'}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">{app.wife_full_name}</span>
                      <span className="text-slate-500 text-xs block">{isMl ? 'ഇനീഷ്യൽ:' : 'Initial:'} {app.wife_initial}</span>
                      <span className="text-slate-500 text-xs block">{isMl ? 'പിതാവ്:' : 'Father:'} {app.wife_father_name}</span>
                      <span className="text-slate-500 text-xs block">{isMl ? 'ജനനത്തീയതി:' : 'DOB:'} {app.wife_dob}</span>
                    </div>
                  </div>

                  {/* Column 3: Event & Contact */}
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isMl ? 'നിക്കാഹും ഫോൺ നമ്പറും' : 'Nikah & Contact'}
                    </span>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <Calendar className="h-3.5 w-3.5" />
                        {isMl ? 'നിക്കാഹ്:' : 'Nikah:'} {app.date_of_nikah}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {app.applicant_phone || (isMl ? 'ഫോൺ ലഭ്യമല്ല' : 'No phone')}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {app.applicant_email || (isMl ? 'ഇമെയിൽ ലഭ്യമല്ല' : 'No email')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bride Address & Committee Notes */}
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/60 text-xs text-slate-600 space-y-1">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700">{isMl ? 'വധുവിന്റെ വിലാസം:' : 'Bride Address:'}</strong> {app.wife_address}
                    </span>
                  </div>
                  {app.admin_notes && (
                    <div className="flex items-start gap-2 text-emerald-800 pt-1">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>{isMl ? 'കമ്മിറ്റി കുറിപ്പ്:' : 'Committee Remarks:'}</strong> {app.admin_notes}
                      </span>
                    </div>
                  )}
                  {app.rejection_reason && (
                    <div className="flex items-start gap-2 text-rose-800 pt-1">
                      <X className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>{isMl ? 'നിരസിക്കാനുള്ള കാരണം:' : 'Rejection Reason:'}</strong> {app.rejection_reason}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <Button
                    onClick={() => {
                      setSelectedApp(app);
                      setDetailsModalOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {isMl ? 'മുഴുവൻ വിവരങ്ങൾ' : 'View Full Details'}
                  </Button>

                  <Button
                    onClick={() => setSlipApp(app)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 text-slate-700"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-500" />
                    {isMl ? 'സ്ലിപ്പ് പ്രിന്റ് ചെയ്യുക' : 'Print Slip'}
                  </Button>

                  {app.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => openRejectModal(app)}
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {isMl ? 'നിരസിക്കുക' : 'Reject'}
                      </Button>
                      <Button
                        onClick={() => openApproveModal(app)}
                        variant="primary"
                        size="sm"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isMl ? 'അംഗീകരിച്ച് അറിയിപ്പ് നൽകുക' : 'Approve & Notify User'}
                      </Button>
                    </>
                  )}

                  {app.status === 'rejected' && (
                    <Button
                      onClick={() => openApproveModal(app)}
                      variant="primary"
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isMl ? 'വീണ്ടും പരിശോധിച്ച് അംഗീകരിക്കുക' : 'Re-evaluate & Approve'}
                    </Button>
                  )}

                  {app.status === 'approved' && (
                    <Button
                      onClick={() => openApproveModal(app)}
                      variant="outline"
                      size="sm"
                      className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <Award className="h-3.5 w-3.5 text-emerald-600" />
                      {isMl ? 'റഫറൻസ് നമ്പർ തിരുത്തുക' : 'Update Certificate Ref'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ APPROVE MODAL ═══════════ */}
      {selectedApp && (
        <Modal
          isOpen={approveModalOpen}
          onClose={() => {
            if (!processing) {
              setApproveModalOpen(false);
              setSelectedApp(null);
            }
          }}
          title={isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ അംഗീകരിക്കുക' : 'Approve Marriage Certificate Application'}
        >
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs sm:text-sm text-emerald-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                {isMl ? 'അപേക്ഷാ അംഗീകാരം സ്ഥിരീകരിക്കുക' : 'Confirm Application Approval'}
              </p>
              <p className="text-xs text-emerald-800">
                {isMl
                  ? <>ഈ അപേക്ഷ അംഗീകരിക്കുന്നതോടെ <strong>{selectedApp.applicant_email || 'അപേക്ഷകന്'}</strong> ഔദ്യോഗിക സ്ഥിരീകരണ ഇമെയിൽ സന്ദേശം ഓട്ടോമേറ്റഡായി അയക്കപ്പെടും.</>
                  : <>Approving this application will automatically dispatch an official confirmation email to{' '}<strong>{selectedApp.applicant_email || 'the applicant'}</strong> instructing them to contact the committee office.</>}
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isMl ? 'ഔദ്യോഗിക സർട്ടിഫിക്കറ്റ് റഫറൻസ് നമ്പർ *' : 'Official Certificate Reference Number *'}
                </label>
                <input
                  type="text"
                  value={certNumberInput}
                  onChange={(e) => setCertNumberInput(e.target.value)}
                  placeholder={isMl ? 'സർട്ടിഫിക്കറ്റ് റഫറൻസ് നമ്പർ' : 'Certificate reference number'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {isMl ? 'രജിസ്റ്ററിലും ഔദ്യോഗിക സർട്ടിഫിക്കറ്റിലും രേഖപ്പെടുത്തുന്ന റഫറൻസ് കോഡ്.' : 'Reference code printed on the physical register and official certificate.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isMl ? 'കമ്മിറ്റി കുറിപ്പ് / അപേക്ഷകനുള്ള നിർദ്ദേശങ്ങൾ' : 'Committee Remarks / Notes for Resident'}
                </label>
                <textarea
                  rows={3}
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  placeholder={isMl ? 'കമ്മിറ്റി കുറിപ്പ് അല്ലെങ്കിൽ സർട്ടിഫിക്കറ്റ് വാങ്ങാനുള്ള നിർദ്ദേശങ്ങൾ...' : 'Committee remarks or collection instructions...'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div><strong>{isMl ? 'വരൻ:' : 'Groom:'}</strong> {selectedApp.husband_name}</div>
                <div><strong>{isMl ? 'വധു:' : 'Bride:'}</strong> {selectedApp.wife_full_name} ({selectedApp.wife_initial})</div>
                <div><strong>{isMl ? 'നിക്കാഹ് തീയതി:' : 'Date of Nikah:'}</strong> {selectedApp.date_of_nikah}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setApproveModalOpen(false)}
                disabled={processing}
              >
                {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmApproval}
                disabled={processing}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {isMl ? 'നടപ്പിലാക്കുന്നു...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {isMl ? 'അംഗീകരിച്ച് ഇമെയിൽ അയക്കുക' : 'Approve & Dispatch Email'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════ REJECT MODAL ═══════════ */}
      {selectedApp && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => {
            if (!processing) {
              setRejectModalOpen(false);
              setSelectedApp(null);
            }
          }}
          title={isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ നിരസിക്കുക' : 'Reject Marriage Certificate Application'}
        >
          <div className="space-y-5">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs sm:text-sm text-rose-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                {isMl ? 'നിരസിക്കാനുള്ള കാരണം വ്യക്തമാക്കുക' : 'Specify Rejection Reason'}
              </p>
              <p className="text-xs text-rose-800">
                {isMl
                  ? 'അപേക്ഷകൻ തിരുത്തലുകൾ വരുത്തുന്നതിനായി ഈ കാരണം റസിഡന്റ് പോർട്ടലിൽ കാണിക്കും.'
                  : 'The reason will be displayed to the applicant in their resident portal so they can submit necessary corrections.'}
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isMl ? 'നിരസിക്കാനുള്ള കാരണം *' : 'Reason for Rejection *'}
                </label>
                <textarea
                  rows={4}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder={isMl ? 'നിരസിക്കാനുള്ള കാരണം ഇവിടെ രേഖപ്പെടുത്തുക...' : 'Enter reason for rejection...'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                disabled={processing}
              >
                {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmRejection}
                disabled={processing || !rejectionReasonInput.trim()}
                className="font-bold flex items-center gap-2"
              >
                {processing ? (isMl ? 'നടപ്പിലാക്കുന്നു...' : 'Processing...') : (isMl ? 'നിരസിക്കൽ സ്ഥിരീകരിക്കുക' : 'Confirm Rejection')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════ FULL DETAILS MODAL ═══════════ */}
      {selectedApp && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedApp(null);
          }}
          title={isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷാ വിവരങ്ങൾ' : 'Marriage Certificate Application Summary'}
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'നില' : 'Status'}</span>
                <Badge variant={selectedApp.status}>
                  {isMl
                    ? (selectedApp.status === 'approved' ? 'അംഗീകരിച്ചു' : selectedApp.status === 'rejected' ? 'നിരസിച്ചു' : 'പരിശോധനയിൽ')
                    : selectedApp.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'സർട്ടിഫിക്കറ്റ് നമ്പർ' : 'Certificate No.'}</span>
                <span className="font-mono font-bold text-emerald-800">
                  {selectedApp.certificate_number || (isMl ? 'നൽകിയിട്ടില്ല' : 'Not yet assigned')}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'കുടുംബം' : 'Household'}</span>
                <span className="font-bold text-slate-900">
                  {selectedApp.house_name} ({selectedApp.mahallu_reg_no})
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'വരൻ' : 'Husband (Groom)'}</span>
                <span className="font-bold text-slate-900">{selectedApp.husband_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'വരന്റെ ജനനത്തീയതി' : 'Husband DOB'}</span>
                <span className="font-semibold text-slate-700">{selectedApp.husband_dob}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'വധു' : 'Wife (Bride)'}</span>
                <span className="font-bold text-slate-900">{selectedApp.wife_full_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'വധുവിന്റെ ഇനീഷ്യൽ' : 'Wife Initial (Full Form)'}</span>
                <span className="font-semibold text-slate-700">{selectedApp.wife_initial}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'വധുവിന്റെ പിതാവ്' : 'Wife\'s Father'}</span>
                <span className="font-semibold text-slate-700">{selectedApp.wife_father_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'വധുവിന്റെ ജനനത്തീയതി' : 'Wife DOB'}</span>
                <span className="font-semibold text-slate-700">{selectedApp.wife_dob}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'നിക്കാഹ് തീയതി' : 'Date of Nikah'}</span>
                <span className="font-bold text-emerald-800">{selectedApp.date_of_nikah}</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                <span className="text-slate-500 shrink-0">{isMl ? 'വധുവിന്റെ വിലാസം' : 'Wife Address'}</span>
                <span className="font-medium text-slate-800 text-right max-w-[65%]">
                  {selectedApp.wife_address}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isMl ? 'ഫോൺ നമ്പർ' : 'Applicant Phone'}</span>
                <span className="font-semibold text-slate-700">{selectedApp.applicant_phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isMl ? 'ഇമെയിൽ വിലാസം' : 'Applicant Email'}</span>
                <span className="font-semibold text-slate-700">{selectedApp.applicant_email}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setDetailsModalOpen(false)} variant="outline">
                {isMl ? 'അടയ്ക്കുക' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Acknowledgment Slip Modal */}
      <MarriageCertificateSlipModal
        application={slipApp}
        isOpen={Boolean(slipApp)}
        onClose={() => setSlipApp(null)}
      />
    </div>
  );
}
