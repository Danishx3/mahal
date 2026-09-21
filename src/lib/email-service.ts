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

const MALAYALAM_MONTHS = [
  'ജനുവരി',
  'ഫെബ്രുവരി',
  'മാർച്ച്',
  'ഏപ്രിൽ',
  'മെയ്',
  'ജൂൺ',
  'ജൂലൈ',
  'ഓഗസ്റ്റ്',
  'സെപ്റ്റംബർ',
  'ഒക്ടോബർ',
  'നവംബർ',
  'ഡിസംബർ',
];

/**
 * Format month '2026-09' to 'സെപ്റ്റംബർ 2026'
 */
function formatMonthName(monthStr: string): string {
  try {
    const [y, m] = monthStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      return `${MALAYALAM_MONTHS[m - 1]} ${y}`;
    }
  } catch { }
  return monthStr;
}

export const PRODUCTION_DOMAIN = 'https://mahal-rho.vercel.app';

export function isInvalidDomain(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase().trim();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('your-project-name') ||
    lower.includes('example.com') ||
    lower.includes('placeholder')
  );
}

/**
 * Returns the production base URL for email links.
 * Prioritizes custom siteUrl or NEXT_PUBLIC_SITE_URL only if valid;
 * strictly falls back to live production domain https://mahal-rho.vercel.app.
 */
export function getEmailBaseUrl(customUrl?: string): string {
  if (customUrl && !isInvalidDomain(customUrl)) {
    return customUrl.replace(/\/$/, '');
  }
  const envUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL)?.trim();
  if (envUrl && !isInvalidDomain(envUrl)) {
    return envUrl.replace(/\/$/, '');
  }
  return PRODUCTION_DOMAIN;
}

/**
 * Generate responsive, modern HTML email template for Mahallu monthly dues reminder (Malayalam)
 */
export function generateReminderEmailHtml(payload: ReminderEmailPayload): string {
  const { houseName, regNo, month, amount = 100, customMessage, siteUrl } = payload;
  const upiId = payload.upiId || 'kunjikkulam@upi';
  const baseUrl = getEmailBaseUrl(siteUrl);
  const paymentLink = `${baseUrl}/dashboard/payments`;
  const formattedMonth = formatMonthName(month);

  return `
<!DOCTYPE html>
<html lang="ml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>മാസവരി കുടിശ്ശിക അറിയിപ്പ്</title>
  <style>
    body { font-family: 'Noto Sans Malayalam', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .emblem { display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); margin-bottom: 12px; font-size: 22px; }
    .title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ffffff; }
    .subtitle { font-size: 13px; color: #a7f3d0; margin-top: 6px; font-weight: 500; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .due-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 10px; font-size: 14px; }
    .due-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .badge { background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; }
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
      <h1 class="title">കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്</h1>
      <div class="subtitle">ഔദ്യോഗിക മാസവരി കുടിശ്ശിക അറിയിപ്പ്</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">അസ്സലാമു അലൈക്കും,</div>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 0;">
        താഴെ പറയുന്ന മാസവരി തുക മഹല്ല് ഫണ്ടിലേക്ക് അടയ്ക്കാനുള്ള വിവരം ഓർമ്മിപ്പിക്കുന്നു.
      </p>

      <!-- Dues Details Card -->
      <div class="card">
        <div style="font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 12px;">
          മാസവരി വിവരങ്ങൾ
        </div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #334155;">
          <tr>
            <td style="color: #64748b; width: 45%;">കുടുംബ പേര്:</td>
            <td style="font-weight: 700; color: #0f172a;">${houseName}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">മഹല്ല് രജിസ്റ്റർ നമ്പർ:</td>
            <td style="font-weight: 700; font-family: monospace; color: #047857;">${regNo}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">അടയ്ക്കേണ്ട മാസം:</td>
            <td style="font-weight: 700; color: #0f172a;">${formattedMonth} (${month})</td>
          </tr>
          <tr>
            <td style="color: #64748b;">അടയ്ക്കാനുള്ള തുക:</td>
            <td><span class="amount">₹${amount}</span></td>
          </tr>
          <tr>
            <td style="color: #64748b;">പേയ്‌മെന്റ് സ്റ്റാറ്റസ്:</td>
            <td><span class="badge">കുടിശ്ശിക (Unpaid)</span></td>
          </tr>
        </table>
      </div>

      <!-- Custom Admin Note (if any) -->
      ${customMessage
      ? `<div style="padding: 14px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; font-size: 13px; color: #92400e; margin: 16px 0; line-height: 1.5;">
              <strong>മഹല്ല് കമ്മിറ്റി അറിയിപ്പ്:</strong><br/>
              ${customMessage}
             </div>`
      : ''
    }

      <!-- UPI Payment Info -->
      <div class="upi-box">
        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
          UPI വഴി പണമടയ്ക്കാം:
        </div>
        <div class="upi-id">${upiId}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
          Google Pay, PhonePe, Paytm എന്നിവ വഴി അടച്ച ശേഷം UTR നമ്പർ പോർട്ടലിൽ രേഖപ്പെടുത്തുക.
        </div>
      </div>

      <!-- Action Button -->
      <a href="${paymentLink}" class="cta-btn" target="_blank">
        പോർട്ടലിൽ പേയ്‌മെന്റ് വിവരങ്ങൾ രേഖപ്പെടുത്തുക →
      </a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div><strong>കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് സെൻട്രൽ ഓഫീസ്</strong></div>
      <div style="margin-top: 4px;">മെയിൻ റോഡ്, മഹല്ല് കോംപ്ലക്സ് • ഫോൺ: +91 98470 12345</div>
      <div class="dua">
        "അല്ലാഹു നിങ്ങളുടെ കുടുംബത്തിൽ ഐശ്വര്യവും ശാന്തിയും ബറകത്തും വർഷിക്കട്ടെ."
      </div>
      <div style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
        ഇതൊരു ഓട്ടോമേറ്റഡ് സിസ്റ്റം അറിയിപ്പാണ്. നിങ്ങൾ ഇതിനകം ഈ തുക അടച്ചിട്ടുണ്ടെങ്കിൽ, ദയവായി പോർട്ടലിൽ UTR സമർപ്പിച്ചിട്ടുണ്ടെന്ന് ഉറപ്പുവരുത്തുക.
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
  const subject = `കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്: മാസവരി കുടിശ്ശിക അറിയിപ്പ് (${formattedMonth}) - ${houseName}`;
  const html = generateReminderEmailHtml(payload);
  const text = `അസ്സലാമു അലൈക്കും. കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ലിൽ നിന്നുള്ള മാസവരി അറിയിപ്പ്: ${houseName} (${regNo}) കുടുംബത്തിന്റെ ${formattedMonth} മാസത്തെ മാസവരി തുക ₹${amount} അടയ്ക്കാനുണ്ട്. തുക ${upiId} ലേക്ക് നൽകി പോർട്ടലിൽ (${getEmailBaseUrl(payload.siteUrl)}/dashboard/payments) UTR രേഖപ്പെടുത്തണമെന്ന് അഭ്യർത്ഥിക്കുന്നു. ജസാക്കല്ലാഹു ഖൈർ.`;

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
 * Send an email notification to admin(s) when a household submits a new marriage certificate application. (Malayalam)
 */
export async function sendMarriageApplicationSubmittedAdminEmail(
  application: {
    id: string;
    house_name: string;
    mahallu_reg_no: string;
    applicant_email: string;
    applicant_phone: string;
    husband_name: string;
    husband_father_name?: string | null;
    husband_house_name?: string | null;
    husband_post_office?: string | null;
    husband_taluk?: string | null;
    husband_district?: string | null;
    husband_state?: string | null;
    husband_dob?: string | null;
    wife_full_name: string;
    wife_father_name?: string | null;
    wife_house_name?: string | null;
    wife_post_office?: string | null;
    wife_taluk?: string | null;
    wife_district?: string | null;
    wife_state?: string | null;
    wife_initial?: string | null;
    wife_address?: string | null;
    wife_dob?: string | null;
    date_of_nikah: string;
    nikah_venue?: string | null;
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

  const baseUrl = getEmailBaseUrl();
  const adminReviewUrl = `${baseUrl}/admin/marriage-certificates`;
  const subject = `[മഹല്ല് പോർട്ടൽ] പുതിയ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ: ${application.husband_name} & ${application.wife_full_name} (${application.mahallu_reg_no})`;

  const html = `
<!DOCTYPE html>
<html lang="ml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>പുതിയ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ</title>
  <style>
    body { font-family: 'Noto Sans Malayalam', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .emblem { display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); margin-bottom: 10px; font-size: 22px; }
    .title { font-size: 20px; font-weight: 800; margin: 0; color: #ffffff; }
    .subtitle { font-size: 13px; color: #a7f3d0; margin-top: 4px; }
    .content { padding: 28px 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
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
      <h1 class="title">കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്</h1>
      <div class="subtitle">അഡ്മിനിസ്ട്രേഷൻ പോർട്ടൽ • വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ</div>
    </div>
    <div class="content">
      <span class="badge">പുതിയ അപേക്ഷ ലഭിച്ചു</span>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 0;">
        അസ്സലാമു അലൈക്കും, <strong>${application.house_name}</strong> (${application.mahallu_reg_no}) കുടുംബത്തിൽ നിന്നും പുതിയ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ ലഭിച്ചിട്ടുണ്ട്. ദയവായി പരിശോധിച്ച് തുടർനടപടികൾ സ്വീകരിക്കുക.
      </p>

      <div class="card">
        <div style="font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 10px;">
          വരന്റെയും വധുവിന്റെയും വിവരങ്ങൾ
        </div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
          <tr>
            <td style="color: #64748b; width: 40%;">കുടുംബ പേര്:</td>
            <td style="font-weight: 700; color: #0f172a;">${application.house_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">മഹല്ല് രജിസ്റ്റർ നമ്പർ:</td>
            <td style="font-weight: 700; color: #047857; font-family: monospace;">${application.mahallu_reg_no}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വരൻ (ഭർത്താവ്):</td>
            <td style="font-weight: 700; color: #0f172a;">${application.husband_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വരന്റെ ജനനത്തീയതി:</td>
            <td style="font-weight: 600; color: #334155;">${application.husband_dob}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വധു (ഭാര്യ):</td>
            <td style="font-weight: 700; color: #0f172a;">${application.wife_full_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വധുവിന്റെ ഇനീഷ്യൽ (പൂർണ്ണരൂപം):</td>
            <td style="font-weight: 600; color: #334155;">${application.wife_initial}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വധുവിന്റെ പിതാവ്:</td>
            <td style="font-weight: 600; color: #334155;">${application.wife_father_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വധുവിന്റെ വിലാസം:</td>
            <td style="font-weight: 500; color: #334155;">${application.wife_address}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വധുവിന്റെ ജനനത്തീയതി:</td>
            <td style="font-weight: 600; color: #334155;">${application.wife_dob}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">നിക്കാഹ് തീയതി:</td>
            <td style="font-weight: 700; color: #047857;">${application.date_of_nikah}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">അപേക്ഷകന്റെ ഫോൺ:</td>
            <td style="font-weight: 600; color: #334155;">${application.applicant_phone}</td>
          </tr>
        </table>
      </div>

      <a href="${adminReviewUrl}" class="cta-btn" target="_blank">
        അഡ്മിൻ കൺസോളിൽ പരിശോധിച്ച് അംഗീകരിക്കുക →
      </a>
    </div>

    <div class="footer">
      കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല് അഡ്മിനിസ്ട്രേഷൻ സിസ്റ്റം • ഓട്ടോമേറ്റഡ് ഇൻഫർമേഷൻ
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
        text: `അസ്സലാമു അലൈക്കും. ${application.husband_name} & ${application.wife_full_name} എന്നിവരുടെ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ സമർപ്പിച്ചിട്ടുണ്ട് (${application.mahallu_reg_no}, നിക്കാഹ്: ${application.date_of_nikah}). ദയവായി അഡ്മിൻ കൺസോളിൽ പരിശോധിക്കുക: ${adminReviewUrl}`,
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
 * Send an email notification to user when their marriage certificate application is approved by admin. (Malayalam)
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
  const subject = `🎉 വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ അംഗീകരിച്ചു - കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്`;
  const baseUrl = getEmailBaseUrl();
  const portalUrl = `${baseUrl}/dashboard/marriage-certificate`;

  const html = `
<!DOCTYPE html>
<html lang="ml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>വിവാഹ സർട്ടിഫിക്കറ്റ് അംഗീകരിച്ചു</title>
  <style>
    body { font-family: 'Noto Sans Malayalam', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .emblem { display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background: rgba(255,255,255,0.2); margin-bottom: 10px; font-size: 24px; }
    .title { font-size: 22px; font-weight: 800; margin: 0; color: #ffffff; }
    .subtitle { font-size: 13px; color: #a7f3d0; margin-top: 4px; font-weight: 500; }
    .content { padding: 30px 24px; }
    .celebration-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .celebration-title { font-size: 18px; font-weight: 800; color: #166534; margin: 0 0 6px 0; }
    .celebration-text { font-size: 15px; font-weight: 600; color: #15803d; margin: 0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .cta-btn { display: block; box-sizing: border-box; text-align: center; background: #047857; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 20px; }
    .office-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 6px; font-size: 13px; color: #92400e; margin: 20px 0; line-height: 1.6; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
    .dua { font-style: italic; color: #047857; margin-top: 8px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emblem">✨</div>
      <h1 class="title">കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്</h1>
      <div class="subtitle">ഔദ്യോഗിക വിവാഹ രജിസ്ട്രി • വിവാഹ സർട്ടിഫിക്കറ്റ് അംഗീകരിച്ചു</div>
    </div>

    <div class="content">
      <div class="celebration-box">
        <p class="celebration-title">അപേക്ഷ അംഗീകരിച്ചു! 🎉</p>
        <p class="celebration-text">
          നിങ്ങളുടെ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ സ്വീകരിച്ചു. സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റുന്നതിനായി മഹല്ല് കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക.
        </p>
      </div>

      <div class="card">
        <div style="font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 10px;">
          സർട്ടിഫിക്കറ്റ് & രജിസ്ട്രി വിവരങ്ങൾ
        </div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px; color: #334155;">
          <tr>
            <td style="color: #64748b; width: 45%;">സർട്ടിഫിക്കറ്റ് റഫറൻസ് നമ്പർ:</td>
            <td style="font-weight: 800; color: #047857; font-family: monospace; font-size: 14px;">${certNumber}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വരൻ (ഭർത്താവ്):</td>
            <td style="font-weight: 700; color: #0f172a;">${application.husband_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">വധു (ഭാര്യ):</td>
            <td style="font-weight: 700; color: #0f172a;">${application.wife_full_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">നിക്കാഹ് തീയതി:</td>
            <td style="font-weight: 700; color: #0f172a;">${application.date_of_nikah}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">കുടുംബ പേര്:</td>
            <td style="font-weight: 600; color: #0f172a;">${application.house_name} (${application.mahallu_reg_no})</td>
          </tr>
          ${application.admin_notes ? `
          <tr>
            <td style="color: #64748b;">കമ്മിറ്റി കുറിപ്പ്:</td>
            <td style="font-weight: 500; color: #047857;">${application.admin_notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <div class="office-box">
        <strong>സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റാൻ:</strong><br/>
        നിങ്ങളുടെ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ അംഗീകരിച്ചിരിക്കുന്നു. സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റാൻ റഫറൻസ് നമ്പറുമായി (${certNumber}) മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.
      </div>

      <a href="${portalUrl}" class="cta-btn" target="_blank">
        റെസിഡന്റ് പോർട്ടലിൽ കാണുക →
      </a>
    </div>

    <div class="footer">
      <div><strong>കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് സെൻട്രൽ ഓഫീസ്</strong></div>
      <div style="margin-top: 4px;">മെയിൻ റോഡ്, മഹല്ല് കോംപ്ലക്സ് • ഫോൺ: +91 98470 12345</div>
      <div class="dua">
        "بارك الله لك وبارك عليك وجمع بينكما في خير"
        <br/>"അല്ലാഹു നിങ്ങളുടെ ദാമ്പത്യജീവിതത്തിൽ ശാന്തിയും സ്നേഹവും ബറകത്തും വർഷിക്കട്ടെ."
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
      text: `അസ്സലാമു അലൈക്കും. ${application.husband_name} & ${application.wife_full_name} എന്നിവരുടെ വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ അംഗീകരിച്ചു. സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റാൻ മഹല്ല് കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക (റഫറൻസ് നമ്പർ: ${certNumber}). പോർട്ടൽ ലിങ്ക്: ${portalUrl}`,
    });
    console.log(`[EMAIL SENT - USER APPROVAL] MessageId: ${info.messageId} | To: ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send user approval email to ${to}:`, err);
    return { success: false, error: err?.message || 'SMTP delivery failure' };
  }
}

/**
 * Send Security Password Reset OTP email to logged-in administrator
 */
export async function sendSecurityPasswordResetEmail(params: {
  to: string;
  otp: string;
  adminName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, otp, adminName } = params;
  const from = getSmtpFrom();
  const subject = `🔐 സുരക്ഷാ പാസ്‌വേഡ് റീസെറ്റ് കോഡ് (OTP: ${otp}) - കുഞ്ഞിക്കുളം മഹല്ല്`;

  const html = `
<!DOCTYPE html>
<html lang="ml">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h2 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 30px 26px; }
    .otp-box { text-align: center; margin: 24px 0; padding: 20px; background: #ecfdf5; border: 2px dashed #059669; border-radius: 14px; }
    .otp-code { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #047857; font-family: monospace; }
    .notice { font-size: 12px; color: #64748b; text-align: center; margin-top: 8px; }
    .info-list { margin: 20px 0; background: #f8fafc; border-radius: 12px; padding: 16px; font-size: 13px; line-height: 1.6; border: 1px solid #e2e8f0; }
    .warning { margin-top: 20px; padding: 12px 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; font-size: 12px; color: #92400e; line-height: 1.5; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>🛡️ കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല്</h2>
      <p>അഡ്മിൻ സുരക്ഷാ കൺസോൾ</p>
    </div>
    <div class="body">
      <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">
        അസ്സലാമു അലൈക്കും ${adminName ? adminName + ',' : ''}
      </p>
      <p style="font-size: 13.5px; line-height: 1.6; color: #334155;">
        മഹല്ല് പോർട്ടലിൽ യൂസർ റോൾ മാറ്റുന്നതിനുള്ള സുരക്ഷാ പാസ്‌വേഡ് റീസെറ്റ് ചെയ്യാനുള്ള അഭ്യർത്ഥന ലഭിച്ചിട്ടുണ്ട്. താഴെ പറയുന്ന വെരിഫിക്കേഷൻ ഒ.ടി.പി ഉപയോഗിച്ച് പുതിയ പാസ്‌വേഡ് സജ്ജമാക്കുക:
      </p>
      
      <div class="otp-box">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #065f46; letter-spacing: 1px; margin-bottom: 6px;">
          വെരിഫിക്കേഷൻ ഒ.ടി.പി കോഡ്
        </div>
        <div class="otp-code">${otp}</div>
        <div class="notice">ഈ കോഡ് 15 മിനിറ്റ് മാത്രമേ സാധുതയുള്ളൂ.</div>
      </div>

      <div class="info-list">
        <div><strong>അഭ്യർത്ഥിച്ച ഇമെയിൽ:</strong> ${to}</div>
        <div><strong>ആവശ്യം:</strong> റോൾ മാറ്റ സുരക്ഷാ പാസ്‌വേഡ് മാറ്റൽ</div>
        <div><strong>സ്ഥിതി:</strong> കാത്തിരിക്കുന്നു (Pending Verification)</div>
      </div>

      <div class="warning">
        ⚠️ <strong>സുരക്ഷാ അറിയിപ്പ്:</strong> നിങ്ങളല്ല ഈ പാസ്‌വേഡ് മാറ്റം ആവശ്യപ്പെട്ടതെങ്കിൽ, നിങ്ങളുടെ അക്കൗണ്ട് സുരക്ഷിതമായി സൂക്ഷിക്കുകയും മറ്റ് അഡ്മിൻമാരെ ഉടൻ അറിയിക്കുകയും ചെയ്യുക.
      </div>
    </div>
    <div class="footer">
      <div><strong>കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല് കമ്മിറ്റി</strong></div>
      <div style="margin-top: 4px;">ഡിജിറ്റൽ അഡ്മിനിസ്ട്രേഷൻ സിസ്റ്റം • ഓട്ടോമേറ്റഡ് സുരക്ഷാ സന്ദേശം</div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const transporter = getMailTransporter();

  if (!transporter) {
    console.log(`[EMAIL SIMULATED - SECURITY RESET OTP] To: ${to} | OTP: ${otp}`);
    return { success: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: `കുഞ്ഞിക്കുളം മഹല്ല് അഡ്മിൻ സുരക്ഷാ പാസ്‌വേഡ് റീസെറ്റ് ഒ.ടി.പി കോഡ്: ${otp}. ഈ കോഡ് 15 മിനിറ്റ് മാത്രമേ സാധുതയുള്ളൂ.`,
    });
    console.log(`[EMAIL SENT - SECURITY RESET OTP] MessageId: ${info.messageId} | To: ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send security reset OTP to ${to}:`, err);
    return { success: false, error: err?.message || 'SMTP delivery failure' };
  }
}


