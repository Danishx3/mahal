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
 * Safely clean environment variables, stripping quotes, tabs, newlines, and trailing spaces.
 */
export function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').replace(/[\t\r\n]/g, '').trim();
}

/**
 * Get sanitized From address for outgoing emails.
 */
export function getSmtpFrom(): string {
  const custom = cleanEnv(process.env.SMTP_FROM);
  if (custom && custom.includes('@')) {
    return custom;
  }
  const user = cleanEnv(process.env.SMTP_USER);
  if (user && user.includes('@')) {
    return `Kunjikkulam Juma Masjid <${user}>`;
  }
  return 'Kunjikkulam Juma Masjid <danishkpmariyad@gmail.com>';
}

/**
 * Check if SMTP credentials have been provided in environment variables.
 */
export function isSmtpConfigured(): boolean {
  return Boolean(cleanEnv(process.env.SMTP_USER) && cleanEnv(process.env.SMTP_PASS));
}

/**
 * Returns public metadata about current SMTP setup for UI diagnostics.
 */
export function getSmtpStatus(): SmtpStatus {
  const configured = isSmtpConfigured();
  const user = cleanEnv(process.env.SMTP_USER);
  return {
    configured,
    user: user ? user.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
    host: cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com',
    port: Number(cleanEnv(process.env.SMTP_PORT)) || 465,
    from: getSmtpFrom(),
  };
}

/**
 * Create or reuse nodemailer transporter
 */
export function getMailTransporter() {
  if (isSmtpConfigured()) {
    const host = cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com';
    const rawPort = cleanEnv(process.env.SMTP_PORT);
    const port = Number(rawPort) || 465;
    const isSecure = cleanEnv(process.env.SMTP_SECURE) === 'true' || port === 465;
    const user = cleanEnv(process.env.SMTP_USER);
    const pass = cleanEnv(process.env.SMTP_PASS).replace(/\s+/g, '');

    return nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
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
 * Returns the production base URL for email links.
 * Prioritizes custom siteUrl or NEXT_PUBLIC_SITE_URL if not pointing to localhost;
 * otherwise defaults to the live production domain https://mahal-rho.vercel.app.
 */
export function getEmailBaseUrl(customUrl?: string): string {
  if (customUrl && !customUrl.includes('localhost') && !customUrl.includes('127.0.0.1')) {
    return customUrl.replace(/\/$/, '');
  }
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }
  return 'https://mahal-rho.vercel.app';
}

/**
 * Generate responsive, modern HTML email template for Mahallu monthly dues reminder
 */
export function generateReminderEmailHtml(payload: ReminderEmailPayload): string {
  const { houseName, regNo, month, amount = 100, customMessage, siteUrl } = payload;
  const upiId = payload.upiId || 'kunjikkulam@upi';
  const baseUrl = getEmailBaseUrl(siteUrl);
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
      <h1 class="title">Kunjikkulam Juma Masjid</h1>
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


      <!-- Action Button -->
      <a href="${paymentLink}" class="cta-btn" target="_blank">
        Submit Payment Reference on Portal →
      </a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div><strong>Kunjikkulam Juma Masjid Central Office</strong></div>
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
  const upiId = payload.upiId || 'kunjikkulam@upi';
  const from = getSmtpFrom();
  const formattedMonth = formatMonthName(month);
  const subject = `Kunjikkulam Juma Masjid: Payment Due Reminder (${formattedMonth}) - ${houseName}`;
  const html = generateReminderEmailHtml(payload);
  const text = `Assalamu Alaikum. This is a reminder from Kunjikkulam Juma Masjid for ${houseName} (${regNo}) regarding monthly membership dues of ₹${amount} for ${formattedMonth}. Kindly transfer to ${upiId} and submit your UTR on the portal: ${getEmailBaseUrl(payload.siteUrl)}/dashboard/payments. Jazakallahu Khair.`;

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

/**
 * Send an email notification to admin(s) when a household submits a new marriage certificate application.
 */
export async function sendMarriageApplicationSubmittedAdminEmail(
  application: {
    id: string;
    house_name: string;
    mahallu_reg_no: string;
    applicant_email: string;
    applicant_phone: string;
    husband_name: string;
    husband_dob: string;
    wife_full_name: string;
    wife_initial: string;
    wife_father_name: string;
    wife_address: string;
    wife_dob: string;
    date_of_nikah: string;
    submitted_at: string;
  },
  adminEmails: string[] = []
): Promise<{ sentCount: number; recipients: string[] }> {
  const from = getSmtpFrom();
  const fallbackAdmin = cleanEnv(process.env.ADMIN_NOTIFICATION_EMAIL) || cleanEnv(process.env.SMTP_USER) || 'danishkpmariyad@gmail.com';

  // Deduplicate and filter recipient emails
  const recipients = Array.from(
    new Set(
      [...adminEmails, fallbackAdmin]
        .map((e) => e?.trim().toLowerCase())

        .filter((e): e is string => Boolean(e && e.includes('@')))
    )
  );

  const baseUrl = 'https://mahal-rho.vercel.app';
  const adminReviewUrl = `${baseUrl}/admin/marriage-certificates`;
  const subject = `[Mahallu Portal] New Marriage Certificate Application: ${application.husband_name} & ${application.wife_full_name} (${application.mahallu_reg_no})`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Marriage Certificate Application</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .emblem { display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); margin-bottom: 10px; font-size: 22px; }
    .title { font-size: 20px; font-weight: 800; margin: 0; color: #ffffff; text-transform: uppercase; }
    .subtitle { font-size: 13px; color: #a7f3d0; margin-top: 4px; }
    .content { padding: 28px 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .val { color: #0f172a; font-weight: 700; text-align: right; }
    .cta-btn { display: block; box-sizing: border-box; text-align: center; background: #047857; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emblem">🕌</div>
      <h1 class="title">Kunjikkulam Juma Masjid</h1>
      <div class="subtitle">Official Administration Portal • വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ</div>
    </div>
    <div class="content">
      <span class="badge">New Application Received</span>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-top: 0;">
        Assalamu Alaikum, a new online marriage certificate application has been submitted by household <strong>${application.house_name}</strong> (${application.mahallu_reg_no}) and is awaiting administrative verification.
      </p>

      <div class="card">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #047857; margin-bottom: 10px;">
          Groom & Bride Information
        </div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
          <tr>
            <td style="color: #64748b; width: 40%;">Household Name:</td>
            <td style="font-weight: 700; color: #0f172a;">${application.house_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Mahallu Reg. No:</td>
            <td style="font-weight: 700; color: #047857; font-family: monospace;">${application.mahallu_reg_no}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Husband (Groom):</td>
            <td style="font-weight: 700; color: #0f172a;">${application.husband_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Husband DOB:</td>
            <td style="font-weight: 600; color: #334155;">${application.husband_dob}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Wife (Bride):</td>
            <td style="font-weight: 700; color: #0f172a;">${application.wife_full_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Wife Initial (Full Form):</td>
            <td style="font-weight: 600; color: #334155;">${application.wife_initial}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Wife's Father:</td>
            <td style="font-weight: 600; color: #334155;">${application.wife_father_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Wife's Address:</td>
            <td style="font-weight: 500; color: #334155;">${application.wife_address}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Wife DOB:</td>
            <td style="font-weight: 600; color: #334155;">${application.wife_dob}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Date of Nikah:</td>
            <td style="font-weight: 700; color: #047857;">${application.date_of_nikah}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Applicant Phone:</td>
            <td style="font-weight: 600; color: #334155;">${application.applicant_phone}</td>
          </tr>
        </table>
      </div>

      <a href="${adminReviewUrl}" class="cta-btn" target="_blank">
        Review & Approve in Admin Console →
      </a>
    </div>

    <div class="footer">
      Kunjikkulam Juma Masjid Mahallu Administration System • Automated Internal Alert
    </div>
  </div>
</body>
</html>
  `.trim();

  const transporter = getMailTransporter();
  let sentCount = 0;

  for (const recipient of recipients) {
    if (!transporter) {
      console.log(`[EMAIL SIMULATED - ADMIN NOTIFICATION] To: ${recipient} | Subject: ${subject}`);
      sentCount++;
      continue;
    }

    try {
      await transporter.sendMail({
        from,
        to: recipient,
        subject,
        html,
        text: `Assalamu Alaikum. A new marriage certificate application was submitted for ${application.husband_name} and ${application.wife_full_name} (${application.mahallu_reg_no}, Nikah date: ${application.date_of_nikah}). Please review in the Admin Console: ${adminReviewUrl}`,
      });
      console.log(`[EMAIL SENT - ADMIN NOTIFICATION] To: ${recipient}`);
      sentCount++;
    } catch (err: any) {
      console.error(`[EMAIL ERROR] Failed to send admin alert to ${recipient}:`, err?.message);
    }
  }

  return { sentCount, recipients };
}

/**
 * Send an email notification to user when their marriage certificate application is approved by admin.
 */
export async function sendMarriageApplicationApprovedUserEmail(
  application: {
    applicant_email: string;
    house_name: string;
    mahallu_reg_no: string;
    husband_name: string;
    wife_full_name: string;
    date_of_nikah: string;
    certificate_number?: string | null;
    admin_notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!application.applicant_email || !application.applicant_email.includes('@')) {
    return { success: false, error: 'No valid applicant email provided.' };
  }

  const from = getSmtpFrom();
  const to = application.applicant_email.trim();
  const certNumber = application.certificate_number || `MHL-MC-${new Date().getFullYear()}-001`;
  const subject = `🎉 Marriage Certificate Application Approved - Kunjikkulam Juma Masjid`;
  const baseUrl = 'https://mahal-rho.vercel.app';
  const portalUrl = `${baseUrl}/dashboard/marriage-certificate`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Marriage Certificate Approved</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .emblem { display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background: rgba(255,255,255,0.2); margin-bottom: 10px; font-size: 24px; }
    .title { font-size: 22px; font-weight: 800; margin: 0; color: #ffffff; text-transform: uppercase; }
    .subtitle { font-size: 13px; color: #a7f3d0; margin-top: 4px; font-weight: 500; }
    .content { padding: 30px 24px; }
    .celebration-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .celebration-title { font-size: 17px; font-weight: 800; color: #166534; margin: 0 0 6px 0; }
    .celebration-text { font-size: 14px; font-weight: 600; color: #15803d; margin: 0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .cta-btn { display: block; box-sizing: border-box; text-align: center; background: #047857; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 20px; }
    .office-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 6px; font-size: 13px; color: #92400e; margin: 20px 0; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
    .dua { font-style: italic; color: #047857; margin-top: 8px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emblem">✨</div>
      <h1 class="title">Kunjikkulam Juma Masjid</h1>
      <div class="subtitle">Official Marriage Registry • വിവാഹ സർട്ടിഫിക്കറ്റ് അംഗീകരിച്ചു</div>
    </div>

    <div class="content">
      <div class="celebration-box">
        <p class="celebration-title">Application Approved! 🎉</p>
        <p class="celebration-text">
          Your application is accepted, contact mahal committee for certificate
        </p>
        <p style="font-size: 12px; color: #166534; margin-top: 6px; font-style: italic;">
          (നിങ്ങളുടെ അപേക്ഷ അംഗീകരിച്ചു. സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റുന്നതിനായി മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.)
        </p>
      </div>

      <div class="card">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #047857; margin-bottom: 10px;">
          Certificate & Registry Details
        </div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px; color: #334155;">
          <tr>
            <td style="color: #64748b; width: 42%;">Certificate Ref. No:</td>
            <td style="font-weight: 800; color: #047857; font-family: monospace; font-size: 14px;">${certNumber}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Husband (Groom):</td>
            <td style="font-weight: 700; color: #0f172a;">${application.husband_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Wife (Bride):</td>
            <td style="font-weight: 700; color: #0f172a;">${application.wife_full_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Date of Nikah:</td>
            <td style="font-weight: 700; color: #0f172a;">${application.date_of_nikah}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Household Name:</td>
            <td style="font-weight: 600; color: #0f172a;">${application.house_name} (${application.mahallu_reg_no})</td>
          </tr>
          ${application.admin_notes ? `
          <tr>
            <td style="color: #64748b;">Committee Remarks:</td>
            <td style="font-weight: 500; color: #047857;">${application.admin_notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <div class="office-box">
        <strong>Office Collection Instructions:</strong><br/>
        Please visit the Mahallu Central Office during operating hours to collect the signed and sealed physical certificate. Please bring your valid identification and reference number <strong>${certNumber}</strong>.
      </div>

      <a href="${portalUrl}" class="cta-btn" target="_blank">
        View Application in Resident Portal →
      </a>
    </div>

    <div class="footer">
      <div><strong>Kunjikkulam Juma Masjid Central Office</strong></div>
      <div style="margin-top: 4px;">Main Road, Mahallu Complex • Contact: +91 98470 12345</div>
      <div class="dua">
        "بارك الله لك وبارك عليك وجمع بينكما في خير"
        <br/>"May Allah bless your union with peace, love, and righteousness."
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const transporter = getMailTransporter();

  if (!transporter) {
    console.log(`[EMAIL SIMULATED - USER APPROVAL] To: ${to} | Subject: ${subject}`);
    return { success: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: `Assalamu Alaikum. Your marriage certificate application for ${application.husband_name} and ${application.wife_full_name} has been approved. Your application is accepted, contact mahal committee for certificate (Certificate No: ${certNumber}). Portal link: ${portalUrl}`,
    });
    console.log(`[EMAIL SENT - USER APPROVAL] MessageId: ${info.messageId} | To: ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send user approval email to ${to}:`, err);
    return { success: false, error: err?.message || 'SMTP delivery failure' };
  }
}

