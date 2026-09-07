'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  onboardingSchema,
  OnboardingInput,
  divisions,
  maritalStatuses,
} from '@/lib/schemas';
import { DataService } from '@/lib/data-service';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/client';
import { DIVISION_LABELS, Division } from '@/lib/supabase/types';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  Home,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Crown,
  ShieldCheck,
  Lock,
  Landmark,
  Clock,
  Loader2,
  RotateCcw,
} from 'lucide-react';

const ONBOARDING_DRAFT_KEY = 'mahallu_onboarding_draft_v1';

const DEFAULT_ONBOARDING_VALUES: OnboardingInput = {
  house: {
    house_name: '',
    house_number: '',
    mahallu_reg_no: '',
    division: 'alungal',
    phone: '',
  },
  members: [
    {
      name: '',
      is_head_of_family: true,
      relationship: 'Self',
      marital_status: 'married',
      job_status: 'Employed',
      general_education: 'Plus Two',
      religious_education: 'Madrasa 10th',
      age: 40,
      phone: '',
    },
  ],
};

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, house, isApproved, isPending, isLoading, refreshProfile, signOut } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: DEFAULT_ONBOARDING_VALUES,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
  });

  // 1. Restore saved draft on mount so data is never lost on refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData && typeof parsed.formData === 'object') {
          reset(parsed.formData);
          setHasSavedDraft(true);
        }
        if (parsed.step && [1, 2, 3].includes(parsed.step)) {
          setCurrentStep(parsed.step);
        }
      }
    } catch (e) {
      console.warn('Failed to restore onboarding draft from localStorage:', e);
    } finally {
      setDraftRestored(true);
    }
  }, [reset]);

  // 2. Auto-save form inputs to localStorage whenever changes happen
  useEffect(() => {
    if (!draftRestored) return;

    const subscription = watch((value) => {
      try {
        localStorage.setItem(
          ONBOARDING_DRAFT_KEY,
          JSON.stringify({
            formData: value,
            step: currentStep,
            updatedAt: Date.now(),
          })
        );
        setHasSavedDraft(true);
      } catch (e) {
        console.warn('Failed to auto-save onboarding draft to localStorage:', e);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, currentStep, draftRestored]);

  // 3. Keep current step synced to localStorage
  useEffect(() => {
    if (!draftRestored) return;
    try {
      const saved = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem(
          ONBOARDING_DRAFT_KEY,
          JSON.stringify({
            ...parsed,
            step: currentStep,
            updatedAt: Date.now(),
          })
        );
      }
    } catch {
      // Handled
    }
  }, [currentStep, draftRestored]);

  // Handler to clear draft and start fresh
  const handleResetDraft = () => {
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to clear your saved draft and start fresh?')) {
      try {
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      } catch {
        // Handled
      }
      reset(DEFAULT_ONBOARDING_VALUES);
      setCurrentStep(1);
      setHasSavedDraft(false);
      toast('Registration draft cleared. Starting fresh.', 'info');
    }
  };

  const memberCount = watch('members')?.length || 1;

  // Sync dynamic member counter
  const handleMemberCountChange = (targetCount: number) => {
    if (targetCount < 1) targetCount = 1;
    if (targetCount > 15) targetCount = 15;

    const currentCount = fields.length;
    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        append({
          name: '',
          is_head_of_family: false,
          relationship: i === 1 ? 'Wife' : 'Son',
          marital_status: 'single',
          job_status: 'Student',
          general_education: 'SSLC',
          religious_education: 'Madrasa 7th',
          age: 18,
          phone: '',
        });
      }
    } else if (targetCount < currentCount) {
      for (let i = currentCount - 1; i >= targetCount; i--) {
        remove(i);
      }
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isHouseValid = await trigger('house');
      if (!isHouseValid) {
        toast('Please resolve the errors in the house details form', 'error');
        return;
      }
      // Check uniqueness of reg no
      const regNo = watch('house.mahallu_reg_no');
      const isAvailable = await DataService.checkRegNoAvailable(regNo);
      if (!isAvailable) {
        toast(`Registration number "${regNo}" is already taken. Please enter a unique ID.`, 'error');
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      const isMembersValid = await trigger('members');
      if (!isMembersValid) {
        toast('Please fill in required fields for all family members', 'error');
        return;
      }
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoogleLogin = async () => {
    if (!hasSupabaseConfig()) {
      toast(
        'Supabase project credentials not configured in .env.local yet. Please configure your Supabase URL and Anon Key.',
        'info'
      );
      return;
    }
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/onboarding')}`,
        },
      });
      if (error) {
        toast(error.message, 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Authentication failed. Please check credentials.', 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = async (data: OnboardingInput) => {
    if (!user) {
      toast('Authentication required. Please sign in with Google before submitting.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save house and members via DataService with authenticated Supabase user ID and email
      const newHouse = await DataService.createHouse(data, user.id, user.email || undefined);
      await refreshProfile();
      // Clear auto-saved draft upon successful submission
      try {
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      } catch {
        // Handled
      }
      toast('House and family members registered successfully!', 'success');
      router.push('/onboarding/pending');
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      toast(err?.message || 'Submission failed. Please check inputs and database connection.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedData = watch();

  // 1. Session Loading State
  if (isLoading) {
    return (
      <div className="flex-1 min-h-[75vh] flex flex-col items-center justify-center space-y-4 bg-slate-50">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-800">Checking Account Status</p>
          <p className="text-xs text-slate-400">Verifying session credentials...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Resident Gate: Ask user to log in with Google
  if (!user) {
    return (
      <div className="flex-1 bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-lg w-full space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 text-center space-y-6">
            {/* Badge & Icon */}
            <div className="relative mx-auto w-16 h-16">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
                <Lock className="w-8 h-8" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-700 text-white rounded-full p-1.5 shadow-sm">
                <Landmark className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
                Sign In Required
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Please Sign In to Register
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                To submit your household details and family census to the Mahallu directory, please sign in with your Google account.
              </p>
            </div>

            {/* Why Sign In with Google */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Why Google Sign-In is Required:
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>
                  <strong className="text-slate-800">Identity Security:</strong> Links your house records directly to your verified Google account.
                </li>
                <li>
                  <strong className="text-slate-800">Dues & Receipts:</strong> Enables real-time tracking of monthly Mahallu dues and payment receipts.
                </li>
                <li>
                  <strong className="text-slate-800">Verification Updates:</strong> Allows committee officials to verify your dwelling and family census.
                </li>
              </ul>
            </div>

            {/* Google Sign In Action */}
            <div className="space-y-3 pt-2">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                isLoading={isGoogleLoading}
                className="w-full py-3.5 h-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 font-bold shadow-sm flex items-center justify-center gap-3 cursor-pointer text-sm rounded-xl transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                Sign In with Google to Register
              </Button>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/"
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Return to Home
                </Link>

                <Link
                  href="/auth/login?redirect=/onboarding"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Go to Login Page &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute effective house and status across Supabase and local storage
  const effectiveHouse = house || (user ? DataService.getHouseByUserId(user.id) : null);
  const effectiveStatus = (effectiveHouse as any)?.profile?.status || profile?.status;
  const effectiveIsApproved = isApproved || effectiveStatus === 'approved';
  const effectiveIsPending = !effectiveIsApproved && (isPending || effectiveStatus === 'pending_verification');

  // 3. User already has a registered house
  if (effectiveHouse) {
    if (effectiveIsPending) {
      return (
        <div className="flex-1 bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
                Registration Under Review
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                Household Already Registered
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                You have already registered household <strong>{effectiveHouse.house_name}</strong>. It is currently under administrative review by the Mahallu Committee.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={() => router.push('/onboarding/pending')} className="gap-2">
                Check Verification Status
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => router.push('/')} className="text-xs">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (effectiveIsApproved) {
      return (
        <div className="flex-1 bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                Household Active
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                Registration Complete & Approved
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your household <strong>{effectiveHouse.house_name}</strong> is verified. You have full access to the resident portal.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={() => router.push('/dashboard')} className="gap-2">
                Go to Resident Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => router.push('/')} className="text-xs">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex-1 bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            Resident Registration Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Household & Family Census Onboarding
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Complete your house registration to join the Mahallu directory, track monthly membership dues, and access community services.
          </p>

          {/* Authenticated Resident Identity Pill & Local Auto-Save Status */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                Signed in with Google as <strong className="text-slate-900">{user.email}</strong>
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-rose-600 hover:text-rose-700 font-semibold ml-1.5 hover:underline cursor-pointer"
              >
                Sign out
              </button>
            </div>

            {hasSavedDraft && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium animate-in fade-in">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Auto-saved in browser
                </span>
                <span className="text-emerald-300">•</span>
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="text-slate-500 hover:text-rose-600 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                  title="Clear saved draft and start over"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Form
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stepper Wizard Progress */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-100 z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-600 z-0 transition-all duration-300"
              style={{
                width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
              }}
            />

            {/* Step 1 Indicator */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  currentStep >= 1
                    ? 'bg-emerald-700 text-white shadow-md ring-4 ring-emerald-50'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                1
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
                House Info
              </span>
            </div>

            {/* Step 2 Indicator */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  currentStep >= 2
                    ? 'bg-emerald-700 text-white shadow-md ring-4 ring-emerald-50'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                2
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
                Family Members
              </span>
            </div>

            {/* Step 3 Indicator */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  currentStep === 3
                    ? 'bg-emerald-700 text-white shadow-md ring-4 ring-emerald-50'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                3
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
                Review & Submit
              </span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit as any)}>
          {/* ============================================================ */}
          {/* STEP 1: HOUSE INFORMATION */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Step 1: House Information</h2>
                    <p className="text-xs text-slate-500">
                      Enter the official dwelling identifiers recognized by the Mahallu.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* House Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    House / Villa Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Baitul Noor, Darul Aman, Al Rahma"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                      errors.house?.house_name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                    {...register('house.house_name')}
                  />
                  {errors.house?.house_name && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.house.house_name.message}
                    </p>
                  )}
                </div>

                {/* House Number / Ward No */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Panchayat / Ward House Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., VII/142 or Ward 4, Door 89"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                      errors.house?.house_number ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                    {...register('house.house_number')}
                  />
                  {errors.house?.house_number && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.house.house_number.message}
                    </p>
                  )}
                </div>

                {/* Mahallu Reg No */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mahallu Registration Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., MHL-ALU-042"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                      errors.house?.mahallu_reg_no ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                    {...register('house.mahallu_reg_no')}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Must be unique in the Mahallu records.
                  </p>
                  {errors.house?.mahallu_reg_no && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.house.mahallu_reg_no.message}
                    </p>
                  )}
                </div>

                {/* Division Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mahallu Division / Ward *
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    {...register('house.division')}
                  >
                    {divisions.map((div) => (
                      <option key={div} value={div}>
                        {DIVISION_LABELS[div]}
                      </option>
                    ))}
                  </select>
                  {errors.house?.division && (
                    <p className="text-xs text-rose-600 mt-1">{errors.house.division.message}</p>
                  )}
                </div>

                {/* Primary Contact Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Primary Contact Phone *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 98471 23456"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                      errors.house?.phone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                    {...register('house.phone')}
                  />
                  {errors.house?.phone && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.house.phone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button type="button" onClick={handleNextStep} className="gap-2">
                  Continue to Family Members
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: FAMILY MEMBERS */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Step 2: Family Structure & Census</h2>
                    <p className="text-xs text-slate-500">
                      Record all permanent residents residing in this household.
                    </p>
                  </div>
                </div>

                {/* Dynamic Member Counter */}
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-700">Family Members Count:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMemberCountChange(memberCount - 1)}
                      className="h-7 w-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-base cursor-pointer disabled:opacity-40"
                      disabled={memberCount <= 1}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold text-emerald-800 text-sm">
                      {memberCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMemberCountChange(memberCount + 1)}
                      className="h-7 w-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-base cursor-pointer disabled:opacity-40"
                      disabled={memberCount >= 15}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Member Cards */}
              <div className="space-y-6">
                {fields.map((field, index) => {
                  const isFirst = index === 0;
                  return (
                    <div
                      key={field.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isFirst
                          ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50/40'
                      }`}
                    >
                      {/* Member Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-bold text-sm text-slate-900">
                            {isFirst ? 'Head of Family (Primary Contact)' : `Family Member #${index + 1}`}
                          </span>
                          {isFirst && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <Crown className="h-3 w-3 text-amber-500" />
                              Head of Household
                            </span>
                          )}
                        </div>

                        {!isFirst && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Member Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                        {/* Full Name */}
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            placeholder="Full name as per official ID"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                            {...register(`members.${index}.name` as const)}
                          />
                          {errors.members?.[index]?.name && (
                            <p className="text-rose-600 mt-1">
                              {errors.members[index]?.name?.message}
                            </p>
                          )}
                        </div>

                        {/* Relationship to Head */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Relationship to Head *
                          </label>
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                            {...register(`members.${index}.relationship` as const)}
                          >
                            {isFirst ? (
                              <option value="Self">Self (Head of Family)</option>
                            ) : (
                              <>
                                <option value="Wife">Wife</option>
                                <option value="Husband">Husband</option>
                                <option value="Son">Son</option>
                                <option value="Daughter">Daughter</option>
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Other">Other Relative</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* Age */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Age (Years) *
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={130}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                            {...register(`members.${index}.age` as const, {
                              valueAsNumber: true,
                            })}
                          />
                        </div>

                        {/* Marital Status */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Marital Status *
                          </label>
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs capitalize"
                            {...register(`members.${index}.marital_status` as const)}
                          >
                            {maritalStatuses.map((m) => (
                              <option key={m} value={m}>
                                {m}
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
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                            {...register(`members.${index}.job_status` as const)}
                          >
                            <option value="Employed">Employed (Local)</option>
                            <option value="Business">Business / Trade</option>
                            <option value="Abroad">Abroad / NRI</option>
                            <option value="Homemaker">Homemaker</option>
                            <option value="Student">Student</option>
                            <option value="Agriculture">Agriculture</option>
                            <option value="Retired">Retired</option>
                            <option value="Unemployed">Unemployed</option>
                          </select>
                        </div>

                        {/* General Education */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            General Education *
                          </label>
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                            {...register(`members.${index}.general_education` as const)}
                          >
                            <option value="Below SSLC">Below SSLC</option>
                            <option value="SSLC">SSLC</option>
                            <option value="Plus Two">Plus Two / VHSE</option>
                            <option value="Diploma">Diploma / ITI</option>
                            <option value="Degree">Bachelor Degree (Graduate)</option>
                            <option value="PG">Post Graduate (PG)</option>
                            <option value="Professional">Professional (MBBS/B.Tech/CA)</option>
                          </select>
                        </div>

                        {/* Religious Education */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Religious Education *
                          </label>
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                            {...register(`members.${index}.religious_education` as const)}
                          >
                            <option value="Basic">Basic Quran Reading</option>
                            <option value="Madrasa 5th">Madrasa 5th Standard</option>
                            <option value="Madrasa 7th">Madrasa 7th Standard</option>
                            <option value="Madrasa 10th">Madrasa 10th Standard</option>
                            <option value="Madrasa +2">Madrasa Higher Secondary</option>
                            <option value="Dars">Dars Student</option>
                            <option value="Islamic Scholar">Islamic Scholar (Faizy/Baqavi/Hudawi)</option>
                            <option value="Hafiz">Hafiz-ul-Quran</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Member Shortcut */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleMemberCountChange(memberCount + 1)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Family Member
                </Button>
              </div>

              {/* Step 2 Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <Button type="button" variant="outline" onClick={handlePrevStep} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="button" onClick={handleNextStep} className="gap-2">
                  Review & Finalize
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: REVIEW & SUBMIT */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Step 3: Review Registration Summary</h2>
                    <p className="text-xs text-slate-500">
                      Verify all household and census entries before transmitting to the Mahallu office.
                    </p>
                  </div>
                </div>
              </div>

              {/* House Summary Card */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3 text-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Dwelling Overview
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block">House Name</span>
                    <span className="font-semibold text-slate-900">{watchedData.house.house_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">House / Ward No</span>
                    <span className="font-semibold text-slate-900">{watchedData.house.house_number}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Mahallu Reg No</span>
                    <span className="font-semibold text-emerald-800 font-mono">
                      {watchedData.house.mahallu_reg_no}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Division</span>
                    <span className="font-semibold text-slate-900">
                      {DIVISION_LABELS[watchedData.house.division as Division]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Family Members Roster */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Registered Members ({watchedData.members.length})
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Relation</th>
                        <th className="p-3">Age</th>
                        <th className="p-3">Occupation</th>
                        <th className="p-3">Education</th>
                        <th className="p-3">Religious Edu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {watchedData.members.map((m, idx) => (
                        <tr key={idx} className={m.is_head_of_family ? 'bg-emerald-50/30' : ''}>
                          <td className="p-3 font-semibold">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">
                            {m.name || '—'}
                            {m.is_head_of_family && (
                              <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                                Head
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700">{m.relationship}</td>
                          <td className="p-3 text-slate-700">{m.age}</td>
                          <td className="p-3 text-slate-700">{m.job_status}</td>
                          <td className="p-3 text-slate-700">{m.general_education}</td>
                          <td className="p-3 text-slate-700">{m.religious_education}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  By submitting this form, you confirm that all information provided is accurate. Once submitted, your profile will undergo administrative review by the Mahallu Committee before unlocking full portal access.
                </p>
              </div>

              {/* Step 3 Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <Button type="button" variant="outline" onClick={handlePrevStep} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Edit Information
                </Button>
                <Button type="submit" isLoading={isSubmitting} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Registration
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
