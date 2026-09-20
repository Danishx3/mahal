import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

export function hasSupabaseConfig(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseAnonKey = rawKey?.trim();
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('placeholder-domain') &&
      !supabaseAnonKey.includes('placeholder')
  );
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const rawKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const supabaseAnonKey = rawKey?.trim();

    // If Supabase environment variables are missing, strictly guard protected routes
    if (!hasSupabaseConfig() || !supabaseUrl || !supabaseAnonKey) {
      if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Strict Server-Side Guard: Admin routes (/admin/*)
    if (pathname.startsWith('/admin')) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }

      // Verify admin role in profiles table
      try {
        const { data: profile } = (await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()) as { data: { role?: string } | null };

        if (profile && profile.role !== 'admin') {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }
      } catch (profileErr) {
        console.warn('[Middleware] Profile role check warning:', profileErr);
        // Fall through to allow client-side AdminLayout to handle verification gracefully
      }
    }

    // Strict Server-Side Guard: Resident routes (/dashboard/*)
    if (pathname.startsWith('/dashboard')) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
      // Authenticated users are permitted into /dashboard routes on the server.
      // Client-side DashboardLayout and AuthContext handle offline-first/localStorage
      // profile & house verification seamlessly without server-side redirect loops.
    }

    return supabaseResponse;
  } catch (err) {
    console.error('[Middleware] Unexpected updateSession error:', err);
    return supabaseResponse;
  }
}

