'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { useLanguage } from '@/lib/context/LanguageContext';
import { DataService } from '@/lib/data-service';
import { MarriageCertificateApplication, FamilyMember, DIVISION_LABELS, DIVISION_LABELS_ML } from '@/lib/supabase/types';
import { marriageCertificateSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';
import { formatDateTime } from '@/lib/utils';
import { MarriageCertificateSlipModal } from '@/components/resident/MarriageCertificateSlipModal';
import {
  FileCheck,
  Heart,
  Calendar,
  User,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Printer,
  Send,
  Info,
  Phone,
  Mail,
  Building2,
  Sparkles,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';

export default function MarriageCertificateDashboardPage() {
  const { user, house, isApproved, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isMl = language === 'ml';
  const { toast } = useToast();

  const [applications, setApplications] = useState<MarriageCertificateApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedAppForSlip, setSelectedAppForSlip] = useState<MarriageCertificateApplication | null>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);

  const openFormAndScroll = () => {
    setShowForm(true);
    setTimeout(() => {
      if (formSectionRef.current) {
        const top = formSectionRef.current.getBoundingClientRect().top + window.pageYOffset - 85;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 80);
  };

  // Form State
  const [husbandName, setHusbandName] = useState('');
  const [husbandDob, setHusbandDob] = useState('');
  const [wifeFullName, setWifeFullName] = useState('');
  const [wifeInitial, setWifeInitial] = useState('');
  const [wifeFatherName, setWifeFatherName] = useState('');
  const [wifeAddress, setWifeAddress] = useState('');
  const [wifeDob, setWifeDob] = useState('');
  const [dateOfNikah, setDateOfNikah] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Active household data
  const effectiveHouse = house || (user ? DataService.getHouseByUserId(user.id) : null);

  // Filter household family members age >= 21 (excluding female relatives) for husband suggestions
  const eligibleGroomMembers = useMemo(() => {
    const members = (effectiveHouse as any)?.family_members;
    if (!Array.isArray(members)) return [];
    const femaleRelations = new Set([
      'wife',
      'mother',
      'daughter',
      'sister',
      'grandmother',
      'granddaughter',
      'daughter-in-law',
    ]);
    return members.filter((m: any) => {
      const age = typeof m.age === 'number' ? m.age : Number(m.age);
      const rel = (m.relationship || '').toLowerCase().trim();
      return !isNaN(age) && age >= 21 && !femaleRelations.has(rel);
    });
  }, [effectiveHouse]);

  // Max dates for age limits
  const maxGroomDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 21);
    return d.toISOString().split('T')[0];
  }, []);

  const maxBrideDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  }, []);

  const loadApplications = async () => {
    if (!effectiveHouse?.id) return;
    try {
      setLoadingApps(true);
      const apps = await DataService.getMarriageCertificatesAsync(effectiveHouse.id);
      setApplications(apps);
      // If user has no applications yet, open form by default
      if (apps.length === 0) {
        setShowForm(true);
      }
    } catch (err) {
      console.error('Failed to load marriage certificate applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    loadApplications();
    const handleUpdate = () => loadApplications();
    window.addEventListener('mahallu_marriage_certs_updated', handleUpdate);
    return () => window.removeEventListener('mahallu_marriage_certs_updated', handleUpdate);
  }, [effectiveHouse?.id]);

  // Handle member suggestion click
  const handleSelectMember = (member: FamilyMember) => {
    setHusbandName(member.name);
    // Estimate approximate birth year based on age if DOB not set
    if (member.age) {
      const estYear = new Date().getFullYear() - member.age;
      setHusbandDob(`${estYear}-01-01`);
    }
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.husband_name;
      delete next.husband_dob;
      return next;
    });
    toast(
      isMl
        ? `${member.name} (${member.relationship}) വരനായി തിരഞ്ഞെടുത്തു.`
        : `Selected ${member.name} (${member.relationship}) as groom.`,
      'info'
    );
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveHouse) {
      toast(isMl ? 'നിങ്ങളുടെ കുടുംബ പ്രൊഫൈൽ കണ്ടെത്താനായില്ല.' : 'Could not detect your registered household profile.', 'error');
      return;
    }

    const payload = {
      husband_name: husbandName.trim(),
      husband_dob: husbandDob,
      wife_full_name: wifeFullName.trim(),
      wife_initial: wifeInitial.trim(),
      wife_father_name: wifeFatherName.trim(),
      wife_address: wifeAddress.trim(),
      wife_dob: wifeDob,
      date_of_nikah: dateOfNikah,
    };

    // Validate using Zod schema
    const validation = marriageCertificateSchema.safeParse(payload);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      }
      setFormErrors(errors);
      toast(isMl ? 'ദയവായി ആവശ്യമായ എല്ലാ വിവരങ്ങളും കൃത്യമായി പൂരിപ്പിക്കുക.' : 'Please complete all required fields correctly.', 'error');
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const submissionData = {
        house_id: effectiveHouse.id,
        user_id: user?.id || effectiveHouse.user_id,
        mahallu_reg_no: effectiveHouse.mahallu_reg_no,
        house_name: effectiveHouse.house_name,
        applicant_email: user?.email || '',
        applicant_phone: effectiveHouse.phone || '',
        ...payload,
      };

      const result = await DataService.submitMarriageCertificateAsync(submissionData);

      toast(
        isMl
          ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ മഹല്ല് ഭരണസമിതിക്ക് സമർപ്പിച്ചു. കമ്മിറ്റിക്ക് ഇമെയിൽ അറിയിപ്പ് അയച്ചിട്ടുണ്ട്.'
          : 'Your marriage certificate application has been sent to Mahallu administration. Committee has been notified by email.',
        'success'
      );

      // Clear form
      setHusbandName('');
      setHusbandDob('');
      setWifeFullName('');
      setWifeInitial('');
      setWifeFatherName('');
      setWifeAddress('');
      setWifeDob('');
      setDateOfNikah('');
      setShowForm(false);
      loadApplications();
    } catch (err: any) {
      toast(err?.message || (isMl ? 'അപേക്ഷ സമർപ്പിക്കാനായില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.' : 'Could not submit application. Please try again.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingApps) {
    return (
      <LoadingScreen
        title={isMl ? 'വിവാഹ രജിസ്ട്രി' : 'Marriage Registry'}
        message={isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് രേഖകൾ ലഭ്യമാക്കുന്നു...' : 'Loading household marriage certificate records...'}
        minHeight="min-h-[60vh]"
      />
    );
  }

  const approvedApps = applications.filter((a) => a.status === 'approved');
  const pendingApps = applications.filter((a) => a.status === 'pending');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200/60">
            <Heart className="h-3.5 w-3.5 text-emerald-600 fill-emerald-100" />
            {isMl ? 'ഔദ്യോഗിക മഹല്ല് രജിസ്ട്രി' : 'Official Mahallu Registry'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ' : 'Marriage Certificate Application'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {isMl
              ? 'മഹല്ല് വിവാഹ സർട്ടിഫിക്കറ്റിനായി ഓൺലൈനായി അപേക്ഷിക്കുക. കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് ഭരണസമിതി നേരിട്ടാണ് അപേക്ഷകൾ പരിശോധിച്ച് നടപടി സ്വീകരിക്കുന്നത്.'
              : 'Apply online for official Mahallu marriage certificate verification. Applications are reviewed directly by the Kunjikkulam Juma Masjid Administration Committee.'}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              {isMl ? 'കുടുംബം:' : 'Household:'} <span className="text-emerald-700">{effectiveHouse?.house_name || (isMl ? 'എന്റെ വീട്' : 'My Household')}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              {isMl ? 'മഹല്ല് രജി. നമ്പർ:' : 'Reg No:'} <span className="font-mono font-bold text-slate-800">{effectiveHouse?.mahallu_reg_no || 'N/A'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!showForm && (
            <Button
              onClick={openFormAndScroll}
              variant="primary"
              className="w-full md:w-auto flex items-center justify-center gap-2 shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              {isMl ? 'സർട്ടിഫിക്കറ്റിനായി അപേക്ഷിക്കുക' : 'Apply for Certificate'}
            </Button>
          )}
          {showForm && applications.length > 0 && (
            <Button
              onClick={() => setShowForm(false)}
              variant="outline"
              className="w-full md:w-auto"
            >
              {isMl ? 'നിലവിലെ അപേക്ഷകൾ കാണുക' : 'View Existing Applications'}
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════ APPROVED APPLICATIONS DISPLAY ═══════════ */}
      {approvedApps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            {isMl ? `അംഗീകരിച്ച സർട്ടിഫിക്കറ്റുകൾ (${approvedApps.length})` : `Approved Certificates (${approvedApps.length})`}
          </h2>

          {approvedApps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl border-2 border-emerald-500 shadow-md p-6 sm:p-8 relative overflow-hidden"
            >
              {/* Top Accent Ribbon */}
              <div
                className="absolute top-0 left-0 right-0 h-2 bg-emerald-600"
                style={{ background: 'linear-gradient(to right, #10b981, #14b8a6, #059669)' }}
              />

              <div className="space-y-6">
                {/* User Notification Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-emerald-950">
                        {isMl
                          ? 'നിങ്ങളുടെ അപേക്ഷ സ്വീകരിച്ചു, സർട്ടിഫിക്കറ്റിനായി മഹല്ല് കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക'
                          : 'Your application is accepted, contact mahal committee for certificate'}
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                        {isMl
                          ? 'നിങ്ങളുടെ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ സ്വീകരിച്ചു. ഒറിജിനൽ സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റുന്നതിനായി മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.'
                          : 'Your marriage certificate application has been accepted. Please contact the Mahallu committee office to collect the original certificate.'}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setSelectedAppForSlip(app)}
                    variant="outline"
                    size="sm"
                    className="shrink-0 bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {isMl ? 'അക്നോളജ്മെന്റ് പ്രിന്റ് ചെയ്യുക' : 'Print Acknowledgment'}
                  </Button>
                </div>

                {/* Details Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Groom & Bride Info */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                      {isMl ? 'ദമ്പതികളുടെ വിവരങ്ങൾ' : 'Couple Information'}
                    </div>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">{isMl ? 'വരൻ (ഭർത്താവ്):' : 'Husband (Groom):'}</span>
                        <span className="font-bold text-slate-900">{app.husband_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">{isMl ? 'വരന്റെ ജനനത്തീയതി:' : 'Husband DOB:'}</span>
                        <span className="font-medium text-slate-700">{app.husband_dob}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">{isMl ? 'വധു (ഭാര്യ):' : 'Wife (Bride):'}</span>
                        <span className="font-bold text-slate-900">{app.wife_full_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">{isMl ? 'വധുവിന്റെ ഇനിഷ്യൽ:' : 'Wife Initial (Full Form):'}</span>
                        <span className="font-medium text-slate-700">{app.wife_initial}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">{isMl ? 'വധുവിന്റെ പിതാവ്:' : "Wife's Father:"}</span>
                        <span className="font-medium text-slate-700">{app.wife_father_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">{isMl ? 'നിക്കാഹ് തീയതി:' : 'Date of Nikah:'}</span>
                        <span className="font-bold text-emerald-800">{app.date_of_nikah}</span>
                      </div>
                    </div>
                  </div>

                  {/* Certificate & Office Collection Info */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                        {isMl ? 'സർട്ടിഫിക്കറ്റ് വിവരങ്ങൾ' : 'Certificate Details'}
                      </div>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{isMl ? 'സർട്ടിഫിക്കറ്റ് നമ്പർ:' : 'Certificate Ref No:'}</span>
                          <span className="font-mono font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            {app.certificate_number || 'MHL-MC-2026-PENDING'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{isMl ? 'നിലവിലെ സ്ഥിതി:' : 'Status:'}</span>
                          <Badge variant="approved">{isMl ? 'അംഗീകരിച്ചു (Approved)' : 'Accepted & Approved'}</Badge>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">{isMl ? 'അംഗീകരിച്ച തീയതി:' : 'Approval Date:'}</span>
                          <span className="font-medium text-slate-700">
                            {app.reviewed_at ? formatDateTime(app.reviewed_at) : (isMl ? 'അംഗീകരിച്ചു' : 'Approved')}
                          </span>
                        </div>
                        {app.admin_notes && (
                          <div className="py-1">
                            <span className="text-slate-500 block mb-0.5">{isMl ? 'കമ്മിറ്റിയുടെ കുറിപ്പ്:' : 'Committee Note:'}</span>
                            <span className="font-medium text-slate-800 bg-white p-2 rounded-lg border border-slate-200 block">
                              {app.admin_notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Committee Helpdesk Card */}
                    <div className="mt-4 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <Building2 className="h-3.5 w-3.5 text-emerald-700" />
                        {isMl ? 'മഹല്ല് കമ്മിറ്റി ഹെൽപ്പ്‌ഡെസ്ക്' : 'Mahallu Committee Helpdesk'}
                      </div>
                      <p className="text-emerald-800">
                        {isMl ? (
                          <>കമ്മിറ്റിയുമായി ബന്ധപ്പെടുമ്പോൾ റഫറൻസ് നമ്പർ <strong className="font-mono font-bold text-emerald-950">{app.certificate_number}</strong> ഓർമ്മിപ്പിക്കുക.</>
                        ) : (
                          <>Please quote reference number <strong className="font-mono font-bold text-emerald-950">{app.certificate_number}</strong> when contacting the committee.</>
                        )}
                      </p>
                      <p className="flex items-center gap-2 pt-1 font-semibold text-emerald-900">
                        <Phone className="h-3 w-3 text-emerald-600" /> {isMl ? 'ഹെൽപ്പ്‌ലൈൻ: +91 9846045482' : 'Helpline: +91 9846045482'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ PENDING APPLICATIONS DISPLAY ═══════════ */}
      {pendingApps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            {isMl ? `പരിശോധനയിലുള്ള അപേക്ഷകൾ (${pendingApps.length})` : `Under Administrative Review (${pendingApps.length})`}
          </h2>

          {pendingApps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl border border-amber-200 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {app.husband_name} &amp; {app.wife_full_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isMl ? 'നിക്കാഹ് തീയതി:' : 'Nikah Date:'} <strong className="text-slate-700">{app.date_of_nikah}</strong> • {isMl ? 'സമർപ്പിച്ചത്:' : 'Submitted:'}{' '}
                      {formatDateTime(app.submitted_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedAppForSlip(app)}
                    variant="outline"
                    size="sm"
                    className="text-amber-800 border-amber-300 hover:bg-amber-50 text-xs font-semibold flex items-center gap-1"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {isMl ? 'സ്ലിപ്പ് പ്രിന്റ് ചെയ്യുക' : 'Print Slip'}
                  </Button>
                  <Badge variant="pending" size="md">
                    {isMl ? 'പരിശോധനയിലാണ്' : 'Pending Verification'}
                  </Badge>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{isMl ? 'അപേക്ഷ മഹല്ല് കമ്മിറ്റിക്ക് ലഭിച്ചു' : 'Application Received by Committee'}</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {isMl
                      ? 'നിങ്ങൾ നൽകിയ വിവരങ്ങൾ മഹല്ല് നിക്കാഹ് രജിസ്റ്ററുമായി ഒത്തുനോക്കുകയാണ്. അപേക്ഷ അംഗീകരിച്ചാലുടൻ അറിയിപ്പ് ലഭിക്കുന്നതാണ്.'
                      : 'Your application details are currently being cross-referenced with the official Mahallu Nikah register. You will receive an automated email notification as soon as the application is accepted.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block">{isMl ? 'വരന്റെ ജനനത്തീയതി' : 'Groom DOB'}</span>
                  <span className="font-semibold text-slate-800">{app.husband_dob}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isMl ? 'വധുവിന്റെ ഇനിഷ്യൽ' : 'Bride Initial'}</span>
                  <span className="font-semibold text-slate-800">{app.wife_initial}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isMl ? 'വധുവിന്റെ പിതാവ്' : 'Bride Father'}</span>
                  <span className="font-semibold text-slate-800">{app.wife_father_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isMl ? 'വധുവിന്റെ ജനനത്തീയതി' : 'Bride DOB'}</span>
                  <span className="font-semibold text-slate-800">{app.wife_dob}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ REJECTED APPLICATIONS DISPLAY ═══════════ */}
      {rejectedApps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-rose-900 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-600" />
            {isMl ? `തിരുത്തേണ്ട അപേക്ഷകൾ (${rejectedApps.length})` : `Applications Needing Revision (${rejectedApps.length})`}
          </h2>

          {rejectedApps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl border border-rose-200 p-6 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    {app.husband_name} &amp; {app.wife_full_name}
                  </h3>
                  <p className="text-xs text-slate-500">{isMl ? 'സമർപ്പിച്ചത്:' : 'Submitted:'} {formatDateTime(app.submitted_at)}</p>
                </div>
                <Badge variant="rejected">{isMl ? 'നിരസിച്ചു' : 'Rejected'}</Badge>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-1">
                <span className="font-bold block">{isMl ? 'കമ്മിറ്റി നൽകിയ കാരണം:' : 'Reason for Rejection from Committee:'}</span>
                <p>{app.rejection_reason || (isMl ? 'വിവരങ്ങൾ സ്ഥിരീകരിക്കാനായില്ല.' : 'Could not verify Nikah details with local registry.')}</p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setHusbandName(app.husband_name);
                    setHusbandDob(app.husband_dob);
                    setWifeFullName(app.wife_full_name);
                    setWifeInitial(app.wife_initial);
                    setWifeFatherName(app.wife_father_name);
                    setWifeAddress(app.wife_address);
                    setWifeDob(app.wife_dob);
                    setDateOfNikah(app.date_of_nikah);
                    openFormAndScroll();
                  }}
                  variant="outline"
                  size="sm"
                >
                  {isMl ? 'തിരുത്തി വീണ്ടും സമർപ്പിക്കുക' : 'Edit & Re-submit Application'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ APPLICATION FORM SECTION ═══════════ */}
      {showForm && (
        <div ref={formSectionRef} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-24">
          <div
            className="bg-[#064e3b] text-white p-6 sm:p-8 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)' }}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              {isMl ? 'പുതിയ അപേക്ഷാ ഫോറം' : 'New Application Form'}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ' : 'Marriage Certificate Request'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              {isMl
                ? 'ഔദ്യോഗിക രേഖകളിലുള്ളതുപോലെ വരന്റെയും വധുവിന്റെയും വിവരങ്ങൾ പൂരിപ്പിക്കുക. മഹല്ല് കമ്മിറ്റി പരിശോധിച്ച് അപ്‌ഡേറ്റുകൾ നൽകുന്നതാണ്.'
                : 'Fill in the groom and bride details as recorded in official records. Once submitted, Mahallu committee will verify the registry and dispatch email updates.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {/* Household Auto-filled Meta */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 block">{isMl ? 'രജിസ്റ്റർ ചെയ്ത വീട്' : 'Registered Household'}</span>
                <span className="font-bold text-slate-900">{effectiveHouse?.house_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isMl ? 'മഹല്ല് രജി. നമ്പർ' : 'Mahallu Reg. No'}</span>
                <span className="font-mono font-bold text-emerald-700">{effectiveHouse?.mahallu_reg_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isMl ? 'വിഭാഗം' : 'Division'}</span>
                <span className="font-medium text-slate-800 capitalize">
                  {isMl && effectiveHouse?.division
                    ? (DIVISION_LABELS_ML[effectiveHouse.division] || effectiveHouse.division)
                    : (effectiveHouse?.division ? DIVISION_LABELS[effectiveHouse.division] || effectiveHouse.division : '')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isMl ? 'ഫോൺ നമ്പർ' : 'Contact Phone'}</span>
                <span className="font-medium text-slate-800">{effectiveHouse?.phone || (isMl ? 'നൽകിയിട്ടില്ല' : 'Not provided')}</span>
              </div>
            </div>

            {/* 1. GROOM (HUSBAND) SECTION */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <User className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>{isMl ? 'ഭാഗം 1: വരന്റെ വിവരങ്ങൾ' : 'Section 1: Husband (Groom) Information'}</span>
                  {!isMl && <span className="text-xs font-normal text-slate-500">• വരന്റെ വിവരങ്ങൾ</span>}
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 self-start sm:self-auto shrink-0">
                  {isMl ? 'നിയമാനുസൃത കുറഞ്ഞ പ്രായം: 21' : 'Legal Min. Age: 21'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Husband Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isMl ? 'വരന്റെ പൂർണ്ണ പേര് *' : 'Husband Name (Full Name) *'}
                  </label>

                  {/* Dropdown Suggestion from Household Members (age >= 21) */}
                  {eligibleGroomMembers.length > 0 && (
                    <div className="mb-2">
                      <select
                        value={
                          eligibleGroomMembers.find(
                            (m: any) => m.name.toLowerCase() === husbandName.trim().toLowerCase()
                          )?.name || ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const found = eligibleGroomMembers.find((m: any) => m.name === val);
                            if (found) handleSelectMember(found);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 transition-all cursor-pointer"
                      >
                        <option value="">{isMl ? 'കുടുംബാംഗങ്ങളിൽ നിന്ന് തിരഞ്ഞെടുക്കുക (≥ 21 വയസ്സ്)' : 'Select from family members (≥ 21 yrs)'}</option>
                        {eligibleGroomMembers.map((member: FamilyMember) => (
                          <option key={member.id || member.name} value={member.name}>
                            {member.name} ({member.relationship}, {member.age} {isMl ? 'വയസ്സ്' : 'yrs'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    type="text"
                    value={husbandName}
                    onChange={(e) => {
                      setHusbandName(e.target.value);
                      if (formErrors.husband_name) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.husband_name;
                          return n;
                        });
                      }
                    }}
                    placeholder={isMl ? 'വരന്റെ പൂർണ്ണ പേര്' : 'Husband full name'}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${formErrors.husband_name
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                      }`}
                  />
                  {formErrors.husband_name && (
                    <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.husband_name}
                    </p>
                  )}
                </div>

                {/* Husband Date of Birth */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isMl ? 'വരന്റെ ജനനത്തീയതി *' : 'Husband Date of Birth *'}
                  </label>
                  <input
                    type="date"
                    value={husbandDob}
                    max={maxGroomDob}
                    onChange={(e) => {
                      setHusbandDob(e.target.value);
                      if (formErrors.husband_dob) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.husband_dob;
                          return n;
                        });
                      }
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${formErrors.husband_dob
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                      }`}
                  />
                  {formErrors.husband_dob ? (
                    <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.husband_dob}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isMl ? 'വിവാഹ തീയതിയിൽ 21 വയസോ അതിൽ കൂടുതലോ പ്രായമുണ്ടായിരിക്കണം.' : 'Must be 21 or older on wedding date.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. BRIDE (WIFE) SECTION */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <User className="h-4 w-4 text-teal-700 shrink-0" />
                  <span>{isMl ? 'ഭാഗം 2: വധുവിന്റെ വിവരങ്ങൾ' : 'Section 2: Wife (Bride) Information'}</span>
                  {!isMl && <span className="text-xs font-normal text-slate-500">• വധുവിന്റെ വിവരങ്ങൾ</span>}
                </h3>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60 self-start sm:self-auto shrink-0">
                  {isMl ? 'നിയമാനുസൃത കുറഞ്ഞ പ്രായം: 18' : 'Legal Min. Age: 18'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Wife Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isMl ? 'വധുവിന്റെ പൂർണ്ണ പേര് *' : 'Wife Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={wifeFullName}
                    onChange={(e) => {
                      setWifeFullName(e.target.value);
                      if (formErrors.wife_full_name) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.wife_full_name;
                          return n;
                        });
                      }
                    }}
                    placeholder={isMl ? 'വധുവിന്റെ പൂർണ്ണ പേര്' : 'Wife full name'}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${formErrors.wife_full_name
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                      }`}
                  />
                  {formErrors.wife_full_name && (
                    <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.wife_full_name}
                    </p>
                  )}
                </div>

                {/* Wife Initial (Full Form) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isMl ? 'വധുവിന്റെ ഇനിഷ്യൽ (പൂർണ്ണ രൂപം) *' : 'Wife Initial (Full Form) *'}
                  </label>
                  <input
                    type="text"
                    value={wifeInitial}
                    onChange={(e) => {
                      setWifeInitial(e.target.value);
                      if (formErrors.wife_initial) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.wife_initial;
                          return n;
                        });
                      }
                    }}
                    placeholder={isMl ? 'വധുവിന്റെ ഇനിഷ്യൽ (പൂർണ്ണ രൂപം)' : 'Wife initial (full form)'}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${formErrors.wife_initial
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                      }`}
                  />
                  {formErrors.wife_initial ? (
                    <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.wife_initial}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isMl ? 'വധുവിന്റെ ഇനിഷ്യൽ പൂർണ്ണമായ വാക്കായി രേഖപ്പെടുത്തുക.' : "Enter bride's initials with complete word expansion."}
                    </p>
                  )}
                </div>

                {/* Wife Father Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isMl ? 'വധുവിന്റെ പിതാവിന്റെ പൂർണ്ണ പേര് *' : "Wife's Father Full Name *"}
                  </label>
                  <input
                    type="text"
                    value={wifeFatherName}
                    onChange={(e) => {
                      setWifeFatherName(e.target.value);
                      if (formErrors.wife_father_name) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.wife_father_name;
                          return n;
                        });
                      }
                    }}
                    placeholder={isMl ? 'വധുവിന്റെ പിതാവിന്റെ പൂർണ്ണ പേര്' : "Wife's father full name"}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${formErrors.wife_father_name
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                      }`}
                  />
                  {formErrors.wife_father_name && (
                    <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.wife_father_name}
                    </p>
                  )}
                </div>

                {/* Wife Date of Birth */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isMl ? 'വധുവിന്റെ ജനനത്തീയതി *' : 'Wife Date of Birth *'}
                  </label>
                  <input
                    type="date"
                    value={wifeDob}
                    max={maxBrideDob}
                    onChange={(e) => {
                      setWifeDob(e.target.value);
                      if (formErrors.wife_dob) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.wife_dob;
                          return n;
                        });
                      }
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${formErrors.wife_dob
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                      }`}
                  />
                  {formErrors.wife_dob ? (
                    <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.wife_dob}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isMl ? 'വിവാഹ തീയതിയിൽ 18 വയസോ അതിൽ കൂടുതലോ പ്രായമുണ്ടായിരിക്കണം.' : 'Must be 18 or older on wedding date.'}
                    </p>
                  )}
                </div>

                {/* Wife Permanent Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isMl ? 'വധുവിന്റെ സ്ഥിര മേൽവിലാസം *' : 'Wife Permanent Address *'}
                  </label>
                  <textarea
                    rows={3}
                    value={wifeAddress}
                    onChange={(e) => {
                      setWifeAddress(e.target.value);
                      if (formErrors.wife_address) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.wife_address;
                          return n;
                        });
                      }
                    }}
                    placeholder={isMl ? 'വധുവിന്റെ സ്ഥിര മേൽവിലാസം' : 'Wife permanent address'}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${formErrors.wife_address
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                      }`}
                  />
                  {formErrors.wife_address && (
                    <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.wife_address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. NIKAH EVENT DATE */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <Calendar className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>{isMl ? 'ഭാഗം 3: നിക്കാഹ് തീയതി' : 'Section 3: Nikah Ceremony Date'}</span>
                  {!isMl && <span className="text-xs font-normal text-slate-500">• നിക്കാഹ് തീയതി</span>}
                </h3>
              </div>

              <div className="max-w-sm">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isMl ? 'നിക്കാഹ് തീയതി *' : 'Date of Nikah *'}
                </label>
                <input
                  type="date"
                  value={dateOfNikah}
                  onChange={(e) => {
                    setDateOfNikah(e.target.value);
                    if (formErrors.date_of_nikah) {
                      setFormErrors((prev) => {
                        const n = { ...prev };
                        delete n.date_of_nikah;
                        return n;
                      });
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${formErrors.date_of_nikah
                    ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                    }`}
                />
                {formErrors.date_of_nikah && (
                  <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.date_of_nikah}
                  </p>
                )}
              </div>
            </div>

            {/* Declaration note */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                {isMl
                  ? 'ഈ അപേക്ഷ സമർപ്പിക്കുന്നതിലൂടെ, നൽകിയിട്ടുള്ള വിവരങ്ങൾ കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല് നിക്കാഹ് രജിസ്റ്ററിലുള്ള വിവരങ്ങളുമായി പൂർണ്ണമായും ഒത്തുപോകുന്നതാണെന്ന് നിങ്ങൾ സാക്ഷ്യപ്പെടുത്തുന്നു. അപേക്ഷാ വിവരങ്ങൾ ഭരണസമിതിക്ക് സ്വമേധയാ ലഭിക്കുന്നതാണ്.'
                  : 'By submitting this application, you declare that the particulars provided above correspond accurately with the official Nikah register of Kunjikkulam Juma Masjid Mahallu. An automatic email notification will be dispatched to the administrative committee.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                variant="outline"
                className="w-full sm:w-auto"
                disabled={submitting}
              >
                {isMl ? 'റദ്ദാക്കുക' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-6 rounded-xl shadow-md"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {isMl ? 'അപേക്ഷ സമർപ്പിക്കുന്നു...' : 'Submitting Application...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {isMl ? 'അപേക്ഷ സമർപ്പിക്കുക' : 'Submit Application'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Official Acknowledgment Slip Modal */}
      <MarriageCertificateSlipModal
        application={selectedAppForSlip}
        isOpen={Boolean(selectedAppForSlip)}
        onClose={() => setSelectedAppForSlip(null)}
      />
    </div>
  );
}
