import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Database, Mail, CheckCircle2, UserCheck, FileText } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Mahal Portal (കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്)',
  description: 'Privacy Policy for Kunjikkulam Juma Masjid Mahallu Management Portal detailing data collection, Google OAuth usage, and security.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'October 21, 2026';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <span className="text-xs font-medium text-slate-500 bg-slate-200/70 px-3 py-1.5 rounded-full">
            Last Updated: {lastUpdated}
          </span>
        </div>

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-4">
          <div className="inline-flex p-3 bg-emerald-500/20 rounded-2xl ring-1 ring-emerald-400/30">
            <Shield className="w-8 h-8 text-emerald-300" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-emerald-100/90 text-base sm:text-lg max-w-2xl leading-relaxed">
            Kunjikkulam Juma Masjid Mahallu Management Portal (<span className="font-semibold text-white">Mahal Portal</span>) is committed to safeguarding the privacy and personal information of our community members.
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold">1</span>
              Introduction
            </h2>
            <p>
              This Privacy Policy explains how <strong>Mahal Portal</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;the Portal&quot;), operated by the Kunjikkulam Juma Masjid Mahallu Committee, collects, uses, and protects information when you access or use our web application at{' '}
              <a href="https://mahal-rho.vercel.app" className="text-emerald-600 hover:underline font-medium">
                https://mahal-rho.vercel.app
              </a>.
            </p>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold">2</span>
              Information We Collect
            </h2>
            <p>We collect only the minimum information necessary to authenticate members and maintain official Mahallu records:</p>
            
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  Google Account Information
                </div>
                <p className="text-sm text-slate-600">
                  When you sign in using Google OAuth 2.0, we receive your verified <strong>Email Address</strong>, <strong>Full Name</strong>, and <strong>Profile Picture</strong> URL. We do not access or store your Google password.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Mahallu Registry Information
                </div>
                <p className="text-sm text-slate-600">
                  Family registry data, house number, contact phone numbers, and membership subscription (varisangya) records submitted by residents or committee officials.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold">3</span>
              How We Use Your Information
            </h2>
            <ul className="space-y-2.5 text-slate-600">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Authentication &amp; Account Access:</strong> To identify you securely via Google Single Sign-On and manage permissions (Resident or Administrator).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Mahallu Services:</strong> To maintain the family registry, record monthly fee payments, generate digital payment receipts, and issue marriage certificates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Service Notifications:</strong> To deliver payment confirmations, administrative announcements, and receipt copies to your registered email address.</span>
              </li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 4 - Crucial for Google OAuth Verification */}
          <section className="space-y-4 p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-2.5 text-emerald-950 font-bold text-lg">
              <Lock className="w-5 h-5 text-emerald-700" />
              Google API Services User Data Policy Compliance
            </div>
            <p className="text-sm text-emerald-900 leading-relaxed">
              Mahal Portal&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline text-emerald-800 hover:text-emerald-950"
              >
                Google API Services User Data Policy
              </a>
              , including the <strong>Limited Use</strong> requirements.
            </p>
            <p className="text-sm text-emerald-800">
              We strictly do not use Google user data for advertising, marketing profiling, or reselling to third parties under any circumstances.
            </p>
          </section>

          <hr className="border-slate-100" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold">5</span>
              Data Protection &amp; Security
            </h2>
            <div className="flex items-start gap-3 text-slate-600">
              <Database className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
              <p>
                All data is encrypted in transit via SSL/TLS and stored securely in dedicated PostgreSQL databases managed by Supabase with Row Level Security (RLS) policies. Only authorized administrators and authenticated users have access to their corresponding family records.
              </p>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold">6</span>
              Data Retention &amp; User Rights
            </h2>
            <p className="text-slate-600">
              You have the right to request access to the personal data we hold about you or request its correction or deletion. If you wish to delete your account or remove your registration details from the Mahallu Portal, you can submit a deletion request by contacting us.
            </p>
          </section>

          <hr className="border-slate-100" />

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold">7</span>
              Contact Information
            </h2>
            <p className="text-slate-600">
              If you have any questions or inquiries regarding this Privacy Policy or your personal information, please contact us at:
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Kunjikkulam Juma Masjid Mahallu Committee</p>
              <p>Kunjikkulam, Kerala, India</p>
              <p className="flex items-center gap-2 pt-1 text-emerald-700 font-medium">
                <Mail className="w-4 h-4" />
                <a href="mailto:danishkpmariyad@gmail.com" className="hover:underline">
                  danishkpmariyad@gmail.com
                </a>
              </p>
              <p className="text-xs text-slate-500 pt-1">
                Website: <a href="https://mahal-rho.vercel.app" className="underline">https://mahal-rho.vercel.app</a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
