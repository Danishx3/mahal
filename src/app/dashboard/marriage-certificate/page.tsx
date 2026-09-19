'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { DataService } from '@/lib/data-service';
import { MarriageCertificateApplication, FamilyMember } from '@/lib/supabase/types';
import { marriageCertificateSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';
import { formatDateTime } from '@/lib/utils';
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
  const { toast } = useToast();

  const [applications, setApplications] = useState<MarriageCertificateApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  // Filter household family members age >= 21 for husband suggestions
  const eligibleGroomMembers = useMemo(() => {
    const members = (effectiveHouse as any)?.family_members;
    if (!Array.isArray(members)) return [];
    return members.filter((m: any) => {
      const age = typeof m.age === 'number' ? m.age : Number(m.age);
      return !isNaN(age) && age >= 21;
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
    toast(`Selected ${member.name} (${member.relationship}) as groom.`, 'info');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveHouse) {
      toast('Could not detect your registered household profile.', 'error');
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
      toast('Please complete all required fields correctly.', 'error');
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

      toast('Your marriage certificate application has been sent to Mahallu administration. Committee has been notified by email.', 'success');

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
      toast(err?.message || 'Could not submit application. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingApps) {
    return (
      <LoadingScreen
        title="Marriage Registry"
        message="Loading household marriage certificate records..."
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
            Official Mahallu Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Marriage Certificate Application
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Apply online for official Mahallu marriage certificate verification. Applications are reviewed directly by the Kunjikkulam Juma Masjid Administration Committee.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              Household: <span className="text-emerald-700">{effectiveHouse?.house_name || 'My Household'}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Reg No: <span className="font-mono font-bold text-slate-800">{effectiveHouse?.mahallu_reg_no || 'N/A'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              variant="primary"
              className="w-full md:w-auto flex items-center justify-center gap-2 shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Apply for Certificate
            </Button>
          )}
          {showForm && applications.length > 0 && (
            <Button
              onClick={() => setShowForm(false)}
              variant="outline"
              className="w-full md:w-auto"
            >
              View Existing Applications
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════ APPROVED APPLICATIONS DISPLAY ═══════════ */}
      {approvedApps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Approved Certificates ({approvedApps.length})
          </h2>

          {approvedApps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl border-2 border-emerald-500 shadow-md p-6 sm:p-8 relative overflow-hidden"
            >
              {/* Top Accent Ribbon */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

              <div className="space-y-6">
                {/* User Notification Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-emerald-950">
                        Your application is accepted, contact mahal committee for certificate
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                        നിങ്ങളുടെ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ സ്വീകരിച്ചു. ഒറിജിനൽ സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റുന്നതിനായി മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handlePrintSlip}
                    variant="outline"
                    size="sm"
                    className="shrink-0 bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 font-bold flex items-center gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Acknowledgment
                  </Button>
                </div>

                {/* Details Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Groom & Bride Info */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                      Couple Information
                    </div>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Husband (Groom):</span>
                        <span className="font-bold text-slate-900">{app.husband_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Husband DOB:</span>
                        <span className="font-medium text-slate-700">{app.husband_dob}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Wife (Bride):</span>
                        <span className="font-bold text-slate-900">{app.wife_full_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Wife Initial (Full Form):</span>
                        <span className="font-medium text-slate-700">{app.wife_initial}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Wife&apos;s Father:</span>
                        <span className="font-medium text-slate-700">{app.wife_father_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">Date of Nikah:</span>
                        <span className="font-bold text-emerald-800">{app.date_of_nikah}</span>
                      </div>
                    </div>
                  </div>

                  {/* Certificate & Office Collection Info */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Certificate Details
                      </div>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Certificate Ref No:</span>
                          <span className="font-mono font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            {app.certificate_number || 'MHL-MC-2026-PENDING'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Status:</span>
                          <Badge variant="approved">Accepted & Approved</Badge>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Approval Date:</span>
                          <span className="font-medium text-slate-700">
                            {app.reviewed_at ? formatDateTime(app.reviewed_at) : 'Approved'}
                          </span>
                        </div>
                        {app.admin_notes && (
                          <div className="py-1">
                            <span className="text-slate-500 block mb-0.5">Committee Note:</span>
                            <span className="font-medium text-slate-800 bg-white p-2 rounded-lg border border-slate-200 block">
                              {app.admin_notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Committee Office Info Card */}
                    <div className="mt-4 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <Building2 className="h-3.5 w-3.5 text-amber-700" />
                        Mahallu Central Office Instructions
                      </div>
                      <p>
                        Please present your reference number <strong className="font-mono">{app.certificate_number}</strong> at Kunjikkulam Juma Masjid office during working hours (Mon - Sat, 9 AM - 5 PM).
                      </p>
                      <p className="flex items-center gap-2 pt-1 font-semibold text-amber-950">
                        <Phone className="h-3 w-3" /> Helpdesk: +91 98470 12345
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
            Under Administrative Review ({pendingApps.length})
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
                      Nikah Date: <strong className="text-slate-700">{app.date_of_nikah}</strong> • Submitted:{' '}
                      {formatDateTime(app.submitted_at)}
                    </p>
                  </div>
                </div>

                <Badge variant="pending" size="md">
                  Pending Verification
                </Badge>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Application Received by Committee</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your application details are currently being cross-referenced with the official Mahallu Nikah register. You will receive an automated email notification as soon as the application is accepted.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block">Groom DOB</span>
                  <span className="font-semibold text-slate-800">{app.husband_dob}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bride Initial</span>
                  <span className="font-semibold text-slate-800">{app.wife_initial}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bride Father</span>
                  <span className="font-semibold text-slate-800">{app.wife_father_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bride DOB</span>
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
            Applications Needing Revision ({rejectedApps.length})
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
                  <p className="text-xs text-slate-500">Submitted: {formatDateTime(app.submitted_at)}</p>
                </div>
                <Badge variant="rejected">Rejected</Badge>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-1">
                <span className="font-bold block">Reason for Rejection from Committee:</span>
                <p>{app.rejection_reason || 'Could not verify Nikah details with local registry.'}</p>
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
                    setShowForm(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Edit &amp; Re-submit Application
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ APPLICATION FORM SECTION ═══════════ */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <PlusCircle className="h-4 w-4" />
              New Application Form
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Marriage Certificate Request
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Fill in the groom and bride details as recorded in official records. Once submitted, Mahallu committee will verify the registry and dispatch email updates.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {/* Household Auto-filled Meta */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 block">Registered Household</span>
                <span className="font-bold text-slate-900">{effectiveHouse?.house_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Mahallu Reg. No</span>
                <span className="font-mono font-bold text-emerald-700">{effectiveHouse?.mahallu_reg_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Division</span>
                <span className="font-medium text-slate-800 capitalize">{effectiveHouse?.division}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Contact Phone</span>
                <span className="font-medium text-slate-800">{effectiveHouse?.phone || 'Not provided'}</span>
              </div>
            </div>

            {/* 1. GROOM (HUSBAND) SECTION */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-700" />
                  Section 1: Husband (Groom) Information • വരന്റെ വിവരങ്ങൾ
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">Legal Min. Age: 21</span>
              </div>

              {/* Suggestions from Household Members (age >= 21) */}
              {eligibleGroomMembers.length > 0 && (
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Users className="h-4 w-4 text-emerald-700" />
                    Family Members (≥ 21 years old) — Click to auto-fill groom:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {eligibleGroomMembers.map((member: FamilyMember) => (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() => handleSelectMember(member)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          husbandName === member.name
                            ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600'
                            : 'bg-white text-slate-700 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200/80 shadow-xs'
                        }`}
                      >
                        <span>{member.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            husbandName === member.name
                              ? 'bg-emerald-800 text-emerald-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {member.relationship}, {member.age}y
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Husband Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Husband Name (Full Name) *
                  </label>
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
                    placeholder="e.g. Muhammed Danish K.P"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.husband_name
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
                    Husband Date of Birth *
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
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.husband_dob
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
                      Must be 21 or older on wedding date.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. BRIDE (WIFE) SECTION */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-700" />
                  Section 2: Wife (Bride) Information • വധുവിന്റെ വിവരങ്ങൾ
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">Legal Min. Age: 18</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Wife Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Wife Full Name *
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
                    placeholder="e.g. Fathima Zahra"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.wife_full_name
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
                    Wife Initial (Full Form) *
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
                    placeholder="e.g. P.K (Puthan Kulam) or K.T"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.wife_initial
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
                      Enter bride&apos;s initials with complete word expansion.
                    </p>
                  )}
                </div>

                {/* Wife Father Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Wife&apos;s Father Full Name *
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
                    placeholder="e.g. Abdul Khader P.K"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.wife_father_name
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
                    Wife Date of Birth *
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
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.wife_dob
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
                      Must be 18 or older on wedding date.
                    </p>
                  )}
                </div>

                {/* Wife Permanent Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Wife Permanent Address *
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
                    placeholder="House Name / Dwelling, Mahallu name, Locality, Post Office, PIN Code"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.wife_address
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
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-700" />
                  Section 3: Nikah Ceremony Date • നിക്കാഹ് തീയതി
                </h3>
              </div>

              <div className="max-w-sm">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date of Nikah *
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
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    formErrors.date_of_nikah
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
                By submitting this application, you declare that the particulars provided above correspond accurately with the official Nikah register of Kunjikkulam Juma Masjid Mahallu. An automatic email notification will be dispatched to the administrative committee.
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
                Cancel
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
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
