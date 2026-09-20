import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export interface AdminSecuritySettingsRow {
  id: number;
  role_change_password?: string;
  reset_otp?: string | null;
  reset_otp_expires_at?: string | null;
  updated_at?: string;
}

// In-memory fallback cache so security password and OTP work seamlessly
// even before the migration SQL has been executed in the Supabase SQL editor.
let memorySecuritySettings: {
  role_change_password: string;
  reset_otp: string | null;
  reset_otp_expires_at: number | null;
} = {
  role_change_password: '123123',
  reset_otp: null,
  reset_otp_expires_at: null,
};

/**
 * Resolves the authenticated admin caller from:
 * 1. Bearer token in Authorization header
 * 2. Supabase server cookies (via Next.js createServerClient)
 * 3. Fallback x-caller-id or explicit callerId verified against profiles.role === 'admin'
 */
export async function resolveAdminCaller(req: Request, explicitCallerId?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseAnonKey = rawKey?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const callerIdHeader = req.headers.get('x-caller-id');
  const callerEmailHeader = req.headers.get('x-caller-email');
  const callerId = explicitCallerId || callerIdHeader;

  let caller: { id: string; email?: string; role?: string } | null = null;
  let client: any = null;

  // 1. Optional service role client for elevated database queries
  let adminClient: any = null;
  if (
    supabaseUrl &&
    serviceRoleKey &&
    !serviceRoleKey.includes('placeholder') &&
    !serviceRoleKey.includes('your-service-role')
  ) {
    try {
      adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
    } catch {}
  }

  // 2. Try Bearer token if provided by client
  if (bearerToken && supabaseUrl && supabaseAnonKey) {
    try {
      const tokenClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      });
      const { data, error } = await tokenClient.auth.getUser(bearerToken);
      if (!error && data?.user) {
        caller = { id: data.user.id, email: data.user.email };
        client = tokenClient;
      }
    } catch (e) {
      console.warn('Bearer auth check warning in admin security helper:', e);
    }
  }

  // 3. Try server cookies if not resolved
  if (!caller) {
    try {
      const serverClient = await createServerClient();
      const { data, error } = await serverClient.auth.getUser();
      if (!error && data?.user) {
        caller = { id: data.user.id, email: data.user.email };
        client = serverClient;
      }
    } catch (e) {
      console.warn('Server cookies auth check warning in admin security helper:', e);
    }
  }

  // Fallback client for database queries
  if (!client) {
    if (adminClient) {
      client = adminClient;
    } else if (supabaseUrl && supabaseAnonKey) {
      client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    }
  }

  const queryClient = adminClient || client;

  // 4. Fallback: If caller is not yet resolved, verify explicit callerId or header against profiles table
  if (!caller && callerId && queryClient) {
    try {
      const { data: prof } = await queryClient
        .from('profiles')
        .select('id, email, role')
        .eq('id', callerId)
        .maybeSingle();

      if (prof && prof.role === 'admin') {
        caller = {
          id: prof.id,
          email: prof.email || callerEmailHeader || undefined,
          role: 'admin',
        };
      }
    } catch (e) {
      console.warn('Fallback callerId lookup warning:', e);
    }
  }

  // If caller found, check/populate role from profiles
  if (caller && !caller.role && queryClient) {
    try {
      const { data: prof } = await queryClient
        .from('profiles')
        .select('role, email')
        .eq('id', caller.id)
        .maybeSingle();

      if (prof?.role) {
        caller.role = prof.role;
      }
      if (prof?.email && !caller.email) {
        caller.email = prof.email;
      }
    } catch {}
  }

  return { caller, client: queryClient, adminClient };
}

/**
 * Get current role change security password (default: '123123')
 */
export async function getRoleChangePassword(client: any): Promise<string> {
  try {
    if (client) {
      const { data: secRow, error } = await (client.from('admin_security_settings' as any) as any)
        .select('role_change_password')
        .eq('id', 1)
        .maybeSingle();

      if (!error && secRow?.role_change_password) {
        memorySecuritySettings.role_change_password = secRow.role_change_password;
        return secRow.role_change_password;
      }
    }
  } catch (err) {
    console.warn('Could not query admin_security_settings from database, using memory fallback:', err);
  }

  return memorySecuritySettings.role_change_password || '123123';
}

/**
 * Store a newly generated OTP for security password reset
 */
export async function storeSecurityOtp(
  client: any,
  otp: string,
  expiresAtIso: string,
  expiresAtMs: number
): Promise<boolean> {
  memorySecuritySettings.reset_otp = otp;
  memorySecuritySettings.reset_otp_expires_at = expiresAtMs;

  try {
    if (client) {
      const { error } = await (client.from('admin_security_settings' as any) as any)
        .upsert(
          {
            id: 1,
            reset_otp: otp,
            reset_otp_expires_at: expiresAtIso,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (!error) return true;
      console.warn('Supabase upsert OTP error, relying on memory fallback:', error.message);
    }
  } catch (err) {
    console.warn('storeSecurityOtp DB exception, relying on memory fallback:', err);
  }

  return true;
}

/**
 * Verify OTP and update security password
 */
export async function verifyAndSetSecurityPassword(
  client: any,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  let matched = false;
  let isExpired = false;

  // 1. Try checking database
  try {
    if (client) {
      const { data: secRow } = (await (client.from('admin_security_settings' as any) as any)
        .select('*')
        .eq('id', 1)
        .maybeSingle()) as { data: AdminSecuritySettingsRow | null };

      if (secRow?.reset_otp) {
        if (String(secRow.reset_otp).trim() === String(otp).trim()) {
          matched = true;
          if (secRow.reset_otp_expires_at && new Date(secRow.reset_otp_expires_at) < new Date()) {
            isExpired = true;
          }
        }
      }
    }
  } catch {}

  // 2. Check memory fallback if not matched in DB
  if (!matched && memorySecuritySettings.reset_otp) {
    if (String(memorySecuritySettings.reset_otp).trim() === String(otp).trim()) {
      matched = true;
      if (memorySecuritySettings.reset_otp_expires_at && Date.now() > memorySecuritySettings.reset_otp_expires_at) {
        isExpired = true;
      }
    }
  }

  if (!matched) {
    return { success: false, error: 'നൽകിയ ഒ.ടി.പി കോഡ് തെറ്റാണ്! (Invalid OTP code)' };
  }

  if (isExpired) {
    return { success: false, error: 'ഒ.ടി.പി കോഡിന്റെ കാലാവധി കഴിഞ്ഞു. പുതിയ കോഡ് ആവശ്യപ്പെടുക (OTP expired)' };
  }

  // Update password in memory
  memorySecuritySettings.role_change_password = newPassword.trim();
  memorySecuritySettings.reset_otp = null;
  memorySecuritySettings.reset_otp_expires_at = null;

  // Update password in database
  try {
    if (client) {
      await (client.from('admin_security_settings' as any) as any)
        .upsert(
          {
            id: 1,
            role_change_password: newPassword.trim(),
            reset_otp: null,
            reset_otp_expires_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
    }
  } catch (err) {
    console.warn('Failed to update DB password, memory fallback is active:', err);
  }

  return { success: true };
}
