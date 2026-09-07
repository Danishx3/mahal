'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/client';
import { Landmark, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const isConfigured = hasSupabaseConfig();

  // Production Google OAuth
  const handleGoogleLogin = async () => {
    if (!isConfigured) {
      toast(
        'Supabase project credentials not configured in .env.local yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        'info'
      );
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
        },
      });
      if (error) {
        toast(error.message, 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Authentication failed. Please check credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Production Email & Password Authentication
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast('Please enter both email and password', 'error');
      return;
    }

    if (!isConfigured) {
      toast(
        'Supabase project credentials not configured in .env.local yet. Please configure your Supabase URL and Key.',
        'info'
      );
      return;
    }

    setIsEmailLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast(error.message, 'error');
      } else if (data.user) {
        toast('Signed in successfully', 'success');

        // Check if user is admin to route correctly
        const { data: profile } = (await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()) as { data: { role?: string } | null };

        if (profile?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push(redirectUrl);
        }
      }
    } catch (err: any) {
      toast(err?.message || 'Sign in error', 'error');
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-2xl bg-emerald-800 text-emerald-100 flex items-center justify-center mx-auto shadow-md">
          <Landmark className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Mahallu Portal Access
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Sign in to manage your household dues, submit UPI transaction references, or access the administrative console.
        </p>
      </div>

      {/* Supabase Configuration Notice (if .env.local not yet configured) */}
      {!isConfigured && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            Supabase Setup Required
          </div>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            Please configure your <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code> file with your Supabase Project URL and Anon Key to enable live authentication.
          </p>
        </div>
      )}

      {/* Primary Action: Google OAuth */}
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full py-2.5 h-auto text-slate-700 hover:bg-slate-50 border-slate-300 font-semibold shadow-xs flex items-center justify-center gap-3 cursor-pointer text-xs"
          onClick={handleGoogleLogin}
          isLoading={isLoading}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
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
          Continue with Google OAuth
        </Button>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
            Or With Email Credentials
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs"
            isLoading={isEmailLoading}
          >
            Sign In with Email
          </Button>
        </form>
      </div>

      {/* Security Guarantee Note */}
      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Protected with PostgreSQL Row-Level Security (RLS)
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-slate-100">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading login portal...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
