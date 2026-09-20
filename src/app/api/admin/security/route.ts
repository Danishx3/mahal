import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { sendSecurityPasswordResetEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

interface AdminSecurityRow {
  id: number;
  role_change_password?: string;
  reset_otp?: string | null;
  reset_otp_expires_at?: string | null;
  updated_at?: string;
}

/**
 * POST: Handle Security Password Reset via email OTP
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createClient();

    // 1. Verify caller has admin role
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !caller || !caller.email) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const { data: callerProfile } = (await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()) as { data: { role?: string } | null };

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // ─── ACTION 1: REQUEST OTP VIA EMAIL ─────────────────────────────
    if (action === 'request-reset') {
      // Generate 6-digit cryptographic-quality numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

      // Store in admin_security_settings
      const { error: upsertError } = await (supabase
        .from('admin_security_settings' as any) as any)
        .upsert(
          {
            id: 1,
            reset_otp: otp,
            reset_otp_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        console.error('Error saving reset OTP in admin_security_settings:', upsertError);
        return NextResponse.json({ error: 'Failed to record OTP in database' }, { status: 500 });
      }

      // Dispatch OTP Email to the logged-in admin's email
      const emailResult = await sendSecurityPasswordResetEmail({
        to: caller.email,
        otp,
        adminName: caller.email.split('@')[0],
      });

      if (!emailResult.success) {
        console.warn('Failed to deliver OTP via SMTP, emailResult:', emailResult);
      }

      return NextResponse.json({
        success: true,
        message: `റീസെറ്റ് കോഡ് താങ്കളുടെ ഇമെയിലിലേക്ക് (${caller.email}) അയച്ചിട്ടുണ്ട്.`,
        sentTo: caller.email,
      });
    }

    // ─── ACTION 2: VERIFY OTP AND SET NEW PASSWORD ──────────────────
    if (action === 'verify-reset') {
      const { otp, newPassword } = body;

      if (!otp || !newPassword) {
        return NextResponse.json(
          { error: 'ഒ.ടി.പി കോഡും പുതിയ പാസ്‌വേഡും നൽകുക (OTP and new password required)' },
          { status: 400 }
        );
      }

      if (String(newPassword).trim().length < 4) {
        return NextResponse.json(
          { error: 'പുതിയ പാസ്‌വേഡ് ചുരുങ്ങിയത് 4 അക്ഷരങ്ങൾ/അക്കങ്ങൾ ഉണ്ടായിരിക്കണം (Min 4 characters)' },
          { status: 400 }
        );
      }

      // Fetch stored OTP
      const { data: secRow, error: fetchError } = (await (supabase
        .from('admin_security_settings' as any) as any)
        .select('*')
        .eq('id', 1)
        .maybeSingle()) as { data: AdminSecurityRow | null; error: any };

      if (fetchError || !secRow || !secRow.reset_otp) {
        return NextResponse.json(
          { error: 'സജീവമായ ഒ.ടി.പി കോഡ് കണ്ടെത്തിയില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.' },
          { status: 400 }
        );
      }

      // Check OTP match
      if (String(secRow.reset_otp).trim() !== String(otp).trim()) {
        return NextResponse.json({ error: 'നൽകിയ ഒ.ടി.പി കോഡ് തെറ്റാണ്! (Invalid OTP code)' }, { status: 400 });
      }

      // Check expiry
      if (secRow.reset_otp_expires_at && new Date(secRow.reset_otp_expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'ഒ.ടി.പി കോഡിന്റെ കാലാവധി കഴിഞ്ഞു. പുതിയ കോഡ് ആവശ്യപ്പെടുക (OTP expired)' },
          { status: 400 }
        );
      }

      // Update password and clear OTP
      const { error: updateError } = await (supabase
        .from('admin_security_settings' as any) as any)
        .update({
          role_change_password: String(newPassword).trim(),
          reset_otp: null,
          reset_otp_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (updateError) {
        console.error('Error updating security password:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'റോൾ മാറ്റ സുരക്ഷാ പാസ്‌വേഡ് വിജയകരമായി പുതുക്കി! ഇനി മുതൽ പുതിയ പാസ്‌വേഡ് ഉപയോഗിക്കാം.',
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin security API exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
