import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check user role and status
      const { data: profile } = (await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', data.user.id)
        .maybeSingle()) as { data: { role?: string; status?: string } | null };

      if (profile?.role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`);
      }

      // Check if house exists in DB
      const { data: house } = (await supabase
        .from('houses')
        .select('id')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: { id?: string } | null };

      if (house && profile?.status === 'pending_verification') {
        return NextResponse.redirect(`${origin}/onboarding/pending`);
      }

      // Allow client-side AuthContext and DashboardLayout to resolve local vs remote house
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
}
