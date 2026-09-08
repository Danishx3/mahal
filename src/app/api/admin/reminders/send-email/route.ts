import { NextResponse } from 'next/server';
import {
  sendBatchReminderEmails,
  getSmtpStatus,
  verifySmtpConnection,
  ReminderEmailPayload,
} from '@/lib/email-service';

export async function GET() {
  const status = getSmtpStatus();
  let verifyResult: { ok: boolean; message: string } | null = null;

  if (status.configured) {
    verifyResult = await verifySmtpConnection();
  }

  return NextResponse.json({
    status: 'ok',
    smtp: status,
    verification: verifyResult,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, recipients, customMessage } = body;

    if (!month || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid payload. "month" and non-empty "recipients" array are required.',
        },
        { status: 400 }
      );
    }

    const validRecipients = recipients.filter(
      (r: any) => r && typeof r.email === 'string' && r.email.includes('@')
    );

    if (validRecipients.length === 0) {
      return NextResponse.json(
        {
          error: 'None of the selected households have a valid email address.',
        },
        { status: 400 }
      );
    }

    const hostHeader = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const siteUrl = `${protocol}://${hostHeader}`;

    const payloads: ReminderEmailPayload[] = validRecipients.map((r: any) => ({
      to: r.email.trim(),
      houseName: r.houseName || 'Household',
      regNo: r.regNo || '',
      month,
      amount: typeof r.amount === 'number' ? r.amount : 100,
      customMessage: customMessage?.trim() || undefined,
      siteUrl,
    }));

    const result = await sendBatchReminderEmails(payloads, 3);
    const smtpStatus = getSmtpStatus();

    return NextResponse.json({
      success: true,
      month,
      smtpConfigured: smtpStatus.configured,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in send-email route:', err);
    return NextResponse.json(
      {
        error: err?.message || 'Failed to dispatch automated emails',
      },
      { status: 500 }
    );
  }
}
