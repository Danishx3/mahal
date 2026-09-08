import nodemailer from 'nodemailer';

export interface ReminderEmailPayload {
  to: string;
  houseName: string;
  regNo: string;
  month: string;
  amount?: number;
  customMessage?: string;
  siteUrl?: string;
  upiId?: string;
}

export interface EmailSendResult {
  success: boolean;
  to: string;
  houseName: string;
  messageId?: string;
  simulated?: boolean;
  previewUrl?: string;
  error?: string;
}

export interface SmtpStatus {
  configured: boolean;
  user: string | null;
  host: string;
  port: number;
  from: string;
}

/**
 * Check if SMTP credentials have been provided in environment variables.
 */
export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

/**
 * Returns public metadata about current SMTP setup for UI diagnostics.
 */
export function getSmtpStatus(): SmtpStatus {
  const configured = isSmtpConfigured();
  return {
    configured,
    user: process.env.SMTP_USER ? process.env.SMTP_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    from: process.env.SMTP_FROM || 'Al-Huda Mahallu Jama\'ath <alhudamahallu@gmail.com>',
  };
}

/**
 * Create or reuse nodemailer transporter
 */
export function getMailTransporter() {
  if (isSmtpConfigured()) {
    const port = Number(process.env.SMTP_PORT) || 465;
    const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: process.env.SMTP_PASS!.trim().replace(/\s+/g, ''), // strip spaces from Gmail 16-char app pass
      },
    });
  }

  // Fallback / simulated transport when credentials not yet set
  return null;
}

/**
 * Verify SMTP server credentials
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; message: string }> {
  const transporter = getMailTransporter();
  if (!transporter) {
    return {
      ok: false,
      message: 'SMTP credentials not configured in environment variables (SMTP_USER / SMTP_PASS). Running in development simulation mode.',
    };
  }

  try {
    await transporter.verify();
    return { ok: true, message: 'SMTP connection established successfully with ' + process.env.SMTP_HOST };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to connect to SMTP server' };
  }
}

/**
 * Format month '2026-09' to 'September 2026'
 */
function formatMonthName(monthStr: string): string {
  try {
    const [y, m] = monthStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      const date = new Date(y, m - 1, 1);
      return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
  } catch { }
  return monthStr;
}

/**
 * Generate responsive, modern HTML email template for Mahallu monthly dues reminder
 */
export function generateReminderEmailHtml(payload: ReminderEmailPayload): string {
  const { houseName, regNo, month, amount = 100, customMessage, siteUrl } = payload;
  const upiId = payload.upiId || 'alhudamahallu@upi';
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const paymentLink = `${baseUrl}/dashboard/payments`;
  const formattedMonth = formatMonthName(month);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mahallu Monthly Dues Reminder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .emblem { display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); margin-bottom: 12px; font-size: 22px; }
    .title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ffffff; text-transform: uppercase; }
    .subtitle { font-size: 13px; color: #a7f3d0; margin-top: 6px; font-weight: 500; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .due-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 10px; font-size: 14px; }
    .due-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .badge { background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .amount { font-size: 26px; font-weight: 800; color: #047857; margin: 4px 0; }
    .upi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .upi-id { font-family: monospace; font-size: 15px; font-weight: 700; color: #047857; background: #ecfdf5; padding: 6px 10px; border-radius: 6px; display: inline-block; }
    .cta-btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: #047857; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 700; font-size: 15px; margin-top: 16px; box-shadow: 0 4px 12px rgba(4, 120, 87, 0.25); }
    .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
    .dua { font-style: italic; color: #047857; margin-top: 8px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="emblem">🕌</div>
      <h1 class="title">Al-Huda Mahallu Jama'ath</h1>
      <div class="subtitle">Official Membership Dues Notice • മാസവരി കുടിശ്ശിക അറിയിപ്പ്</div>
    </div>

    <!-- Content -->
    <div class="content">

      <!-- Dues Details Card -->
      <div class="card">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #047857; margin-bottom: 12px;">
          Subscription Notice Details
        </div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #334155;">
          <tr>
            <td style="color: #64748b; width: 40%;">Household Name:</td>
            <td style="font-weight: 700; color: #0f172a;">${houseName}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Mahallu Reg. No:</td>
            <td style="font-weight: 700; font-family: monospace; color: #047857;">${regNo}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Billing Cycle:</td>
            <td style="font-weight: 700; color: #0f172a;">${formattedMonth} (${month})</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Amount Payable:</td>
            <td><span class="amount">₹${amount}</span></td>
          </tr>
          <tr>
            <td style="color: #64748b;">Payment Status:</td>
            <td><span class="badge">Unpaid</span></td>
          </tr>
        </table>
      </div>

      <!-- Custom Admin Note (if any) -->
      ${customMessage
      ? `<div style="padding: 14px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; font-size: 13px; color: #92400e; margin: 16px 0; line-height: 1.5;">
              <strong>Note from Mahallu Committee:</strong><br/>
              ${customMessage}
             </div>`
      : ''
    }

      <!-- Payment Instructions -->
      <div class="upi-box">
        <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 8px;">
          How to Pay via UPI or Bank Transfer:
        </div>
        <p style="font-size: 13px; color: #475569; margin: 0 0 10px 0;">
          Transfer ₹${amount} directly using any UPI App (GPay, PhonePe, Paytm):
        </p>
        <div>
          <span class="upi-id">${upiId}</span>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 10px; margin-bottom: 0;">
          After completing the transaction, please submit your 12-digit UTR/Transaction Reference on the Mahallu Portal for instant verification and receipt generation.
        </p>
      </div>

      <!-- Action Button -->
      <a href="${paymentLink}" class="cta-btn" target="_blank">
        Submit Payment Reference on Portal →
      </a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div><strong>Al-Huda Mahallu Jama'ath Central Office</strong></div>
      <div style="margin-top: 4px;">Main Road, Mahallu Complex • Contact: +91 98470 12345</div>
      <div class="dua">
        "May Allah bless your household with peace, prosperity, and barakah."
      </div>
      <div style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
        This is an automated system notification. If you have already made this payment, kindly verify that your UTR is submitted on the portal.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send a single automated reminder email
 */
export async function sendReminderEmail(payload: ReminderEmailPayload): Promise<EmailSendResult> {
  const { to, houseName, regNo, month, amount = 100 } = payload;
  const upiId = payload.upiId || 'alhudamahallu@upi';
  const from = process.env.SMTP_FROM || 'Al-Huda Mahallu Jama\'ath <alhudamahallu@gmail.com>';
  const formattedMonth = formatMonthName(month);
  const subject = `Al-Huda Mahallu: Payment Due Reminder (${formattedMonth}) - ${houseName}`;
  const html = generateReminderEmailHtml(payload);
  const text = `Assalamu Alaikum. This is a reminder from Al-Huda Mahallu Jama'ath for ${houseName} (${regNo}) regarding monthly membership dues of ₹${amount} for ${formattedMonth}. Kindly transfer to ${upiId} and submit your UTR on the portal: ${payload.siteUrl || 'http://localhost:3000'}/dashboard/payments. Jazakallahu Khair.`;

  const transporter = getMailTransporter();

  if (!transporter) {
    // Development / Simulation mode
    console.log(`[EMAIL SIMULATED] To: ${to} | House: ${houseName} (${regNo}) | Month: ${month} | Subject: ${subject}`);
    return {
      success: true,
      to,
      houseName,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log(`[EMAIL SENT] MessageId: ${info.messageId} | To: ${to} | House: ${houseName}`);
    return {
      success: true,
      to,
      houseName,
      messageId: info.messageId,
      simulated: false,
    };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send to ${to}:`, err);
    return {
      success: false,
      to,
      houseName,
      error: err?.message || 'Unknown SMTP delivery failure',
    };
  }
}

/**
 * Send batch reminder emails with concurrency control
 */
export async function sendBatchReminderEmails(
  payloads: ReminderEmailPayload[],
  concurrency = 3
): Promise<{
  total: number;
  sentCount: number;
  failedCount: number;
  results: EmailSendResult[];
}> {
  const results: EmailSendResult[] = [];
  const queue = [...payloads];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const res = await sendReminderEmail(item);
      results.push(res);
      // Small pause to prevent aggressive rate limiting
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, payloads.length) }, () => worker());
  await Promise.all(workers);

  const sentCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  return {
    total: payloads.length,
    sentCount,
    failedCount,
    results,
  };
}
