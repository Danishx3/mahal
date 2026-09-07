'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: {
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
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
  });

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
      const isAvailable = DataService.checkRegNoAvailable(regNo);
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

  const onSubmit = async (data: OnboardingInput) => {
    setIsSubmitting(true);
    try {
      // Save house and members via DataService
      const userId = user?.id || ('user-' + Date.now());
      const newHouse = DataService.createHouse(data, userId);
      await refreshProfile();
      toast('House registration submitted successfully for administrative review!', 'success');
      router.push('/onboarding/pending');
    } catch (err: any) {
      toast(err?.message || 'Submission failed. Please check inputs.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedData = watch();

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
