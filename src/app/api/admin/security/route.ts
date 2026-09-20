import { NextResponse } from 'next/server';
import {
  resolveAdminCaller,
  storeSecurityOtp,
  verifyAndSetSecurityPassword,
} from '@/lib/admin-security';
import { sendSecurityPasswordResetEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST: Handle Security Password Reset via email OTP
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, callerId } = body;

    // 1. Resolve and verify admin caller
    const { caller, client, adminClient } = await resolveAdminCaller(req, callerId);

    if (!caller || caller.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required to manage security settings' },
        { status: 401 }
      );
    }

    const queryClient = adminClient || client;

    // ─── ACTION 1: REQUEST OTP VIA EMAIL ─────────────────────────────
    if (action === 'request-reset') {
      let recipientEmail = caller.email;

      // If caller email is not on user object, fetch from profiles
      if (!recipientEmail && queryClient) {
        try {
          const { data: prof } = await queryClient
            .from('profiles')
            .select('email')
            .eq('id', caller.id)
            .maybeSingle();

          if (prof?.email) {
            recipientEmail = prof.email;
          }
        } catch {}
      }

      // If still missing, fallback to SMTP_USER or placeholder
      if (!recipientEmail) {
        recipientEmail = process.env.SMTP_USER || 'admin@mahallu.local';
      }

      // Generate 6-digit numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAtMs = Date.now() + 15 * 60 * 1000; // 15 minutes
      const expiresAtIso = new Date(expiresAtMs).toISOString();

      // Store in DB and memory cache
      await storeSecurityOtp(queryClient, otp, expiresAtIso, expiresAtMs);

      // Dispatch OTP Email to the logged-in admin's email
      const emailResult = await sendSecurityPasswordResetEmail({
        to: recipientEmail,
        otp,
        adminName: recipientEmail.split('@')[0],
      });

      if (!emailResult.success) {
        console.warn('Failed to deliver OTP via SMTP, emailResult:', emailResult);
      }

      return NextResponse.json({
        success: true,
        message: `റീസെറ്റ് കോഡ് താങ്കളുടെ ഇമെയിലിലേക്ക് (${recipientEmail}) അയച്ചിട്ടുണ്ട്.`,
        sentTo: recipientEmail,
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

      const result = await verifyAndSetSecurityPassword(queryClient, otp, newPassword);

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Invalid OTP' }, { status: 400 });
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
