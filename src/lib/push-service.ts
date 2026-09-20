import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/client';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export interface StoredPushSubscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  role: 'admin' | 'resident';
  userId?: string;
  houseId?: string;
  createdAt: string;
}

// Ensure VAPID is configured safely
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKGn6-SUJfj7OLkaeMvUM0gis1q65xtbhrmtMIQKgIVVggMAMOBr4ouguEMFyq-hQ9v1b9L_ttt57ZoeAKJYaCI';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'Y7BOvTb-zUA7yxLiDTF6zgZMssJti_3OdM4CQGJuK-4';
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:danishkpmariyad@gmail.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('[PushService] VAPID initialization warning:', err);
}

// Local storage path for push subscriptions persistence
const SUBS_DIR = path.join(process.cwd(), 'scratch');
const SUBS_FILE = path.join(SUBS_DIR, 'push-subscriptions.json');

function ensureSubsFile() {
  if (!fs.existsSync(SUBS_DIR)) {
    fs.mkdirSync(SUBS_DIR, { recursive: true });
  }
  if (!fs.existsSync(SUBS_FILE)) {
    fs.writeFileSync(SUBS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

export function getAllSubscriptions(): StoredPushSubscription[] {
  try {
    ensureSubsFile();
    const data = fs.readFileSync(SUBS_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch (err) {
    console.warn('[PushService] Failed to read subscriptions:', err);
    return [];
  }
}

export function saveSubscription(sub: Omit<StoredPushSubscription, 'id' | 'createdAt'>): StoredPushSubscription {
  ensureSubsFile();
  const subs = getAllSubscriptions();

  // Deduplicate by endpoint
  const existingIndex = subs.findIndex((s) => s.endpoint === sub.endpoint);
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    subs[existingIndex] = {
      ...subs[existingIndex],
      ...sub,
      role: sub.role || subs[existingIndex].role,
      userId: sub.userId || subs[existingIndex].userId,
      houseId: sub.houseId || subs[existingIndex].houseId,
    };
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf8');
    return subs[existingIndex];
  }

  const newSub: StoredPushSubscription = {
    ...sub,
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
  };

  subs.push(newSub);
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf8');

  // Async sync with Supabase push_subscriptions table if exists
  try {
    const supabase = createClient();
    (supabase.from('push_subscriptions') as any)
      .upsert({
        endpoint: newSub.endpoint,
        p256dh: newSub.keys.p256dh,
        auth: newSub.keys.auth,
        role: newSub.role,
        user_id: newSub.userId || null,
        house_id: newSub.houseId || null,
      })
      .then(({ error }: any) => {
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.warn('[PushService] Supabase sync note:', error.message);
        }
      });
  } catch {}

  return newSub;
}

export function removeSubscription(endpoint: string) {
  try {
    ensureSubsFile();
    const subs = getAllSubscriptions();
    const filtered = subs.filter((s) => s.endpoint !== endpoint);
    fs.writeFileSync(SUBS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  } catch (err) {
    console.warn('[PushService] Failed to delete subscription:', err);
  }
}

/**
 * Send a web push notification to a single subscription.
 * Automatically cleans up subscription if device is unregistered (410/404).
 */
export async function sendWebPushToSubscription(
  sub: StoredPushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: sub.keys,
  };

  const stringPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-192x192.png',
    tag: payload.tag || 'mahallu-alert',
  });

  try {
    await webpush.sendNotification(pushSubscription, stringPayload);
    return true;
  } catch (err: any) {
    console.error(`[PushService] Failed to deliver to ${sub.endpoint.slice(0, 30)}...:`, err?.message);
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      console.log('[PushService] Subscription expired or unsubscribed, removing from storage.');
      removeSubscription(sub.endpoint);
    }
    return false;
  }
}

/**
 * Broadcast a notification to a group of target subscriptions.
 */
export async function broadcastPushNotification(
  filter: (sub: StoredPushSubscription) => boolean,
  payload: PushNotificationPayload
): Promise<{ total: number; sent: number }> {
  const subs = getAllSubscriptions().filter(filter);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const ok = await sendWebPushToSubscription(sub, payload);
      if (ok) sent++;
    })
  );

  return { total: subs.length, sent };
}

// =========================================================================
// Specialized Event Dispatchers
// =========================================================================

/**
 * 1. Payment Submitted: Notify Admins & Resident
 */
export async function notifyPaymentSubmitted(params: {
  houseName: string;
  regNo: string;
  amount: number;
  title: string;
  utr: string;
  houseId?: string;
  userId?: string;
}) {
  const { houseName, regNo, amount, title, utr, houseId, userId } = params;

  // A. Notify all Admins
  await broadcastPushNotification(
    (s) => s.role === 'admin',
    {
      title: '💰 New Payment Submitted',
      body: `${houseName} (${regNo}) paid ₹${amount} (UTR: ${utr}) for ${title}. Tap to verify.`,
      url: '/admin/payments',
      tag: `payment-sub-${utr}`,
    }
  );

  // B. Notify Submitting Resident
  if (houseId || userId) {
    await broadcastPushNotification(
      (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
      {
        title: '⏳ Payment Reference Received',
        body: `Your payment of ₹${amount} for ${title} has been submitted for administrative verification.`,
        url: '/dashboard/payments',
        tag: `payment-ack-${utr}`,
      }
    );
  }
}

/**
 * 2. Payment Verified: Notify Resident
 */
export async function notifyPaymentVerified(params: {
  houseName: string;
  regNo: string;
  amount: number;
  title: string;
  houseId?: string;
  userId?: string;
}) {
  const { houseName, amount, title, houseId, userId } = params;

  await broadcastPushNotification(
    (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
    {
      title: '✅ Payment Verified & Credited!',
      body: `Alhamdulillah! Your payment of ₹${amount} for ${title} has been verified and your digital receipt is ready.`,
      url: '/dashboard/payments',
      tag: 'payment-verified',
    }
  );
}

/**
 * 3. Payment Rejected: Notify Resident
 */
export async function notifyPaymentRejected(params: {
  houseName: string;
  regNo: string;
  amount: number;
  title: string;
  reason: string;
  houseId?: string;
  userId?: string;
}) {
  const { title, reason, houseId, userId } = params;

  await broadcastPushNotification(
    (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
    {
      title: '❌ Payment Reference Not Approved',
      body: `Your payment reference for ${title} could not be verified: ${reason}. Tap to resubmit.`,
      url: '/dashboard/payments',
      tag: 'payment-rejected',
    }
  );
}

/**
 * 4. Special Collection Request Published: Notify ALL Residents
 */
export async function notifySpecialRequestCreated(params: {
  title: string;
  category: string;
  amountType?: string;
  fixedAmount?: number;
}) {
  const { title, category, fixedAmount } = params;
  const amtText = fixedAmount ? ` (₹${fixedAmount})` : '';

  await broadcastPushNotification(
    (s) => s.role === 'resident',
    {
      title: `📢 New Collection Drive: ${title}`,
      body: `Kunjikkulam Juma Masjid has announced "${title}"${amtText} under ${category}. Tap to view & contribute.`,
      url: '/dashboard/payments',
      tag: `special-request-${Date.now()}`,
    }
  );
}

/**
 * 5. Marriage Certificate Application Submitted: Notify Admins & Resident
 */
export async function notifyMarriageAppSubmitted(params: {
  houseName: string;
  regNo: string;
  groom: string;
  bride: string;
  dateOfNikah: string;
  houseId?: string;
  userId?: string;
}) {
  const { houseName, regNo, groom, bride, dateOfNikah, houseId, userId } = params;

  // A. Notify Admins
  await broadcastPushNotification(
    (s) => s.role === 'admin',
    {
      title: '📜 New Marriage Certificate Application',
      body: `${groom} & ${bride} (${houseName} - ${regNo}). Nikah: ${dateOfNikah}. Tap to review.`,
      url: '/admin/marriage-certificates',
      tag: 'marriage-app-new',
    }
  );

  // B. Notify Resident
  if (houseId || userId) {
    await broadcastPushNotification(
      (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
      {
        title: '📜 Marriage Application Submitted',
        body: `Your marriage certificate application for ${groom} & ${bride} has been submitted for committee review.`,
        url: '/dashboard/marriage-certificate',
        tag: 'marriage-app-submitted',
      }
    );
  }
}

/**
 * 6. Marriage Certificate Approved: Notify Resident
 */
export async function notifyMarriageAppApproved(params: {
  houseName: string;
  groom: string;
  bride: string;
  certNo: string;
  houseId?: string;
  userId?: string;
}) {
  const { groom, bride, certNo, houseId, userId } = params;

  await broadcastPushNotification(
    (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
    {
      title: '🎉 Marriage Certificate Approved!',
      body: `Application for ${groom} & ${bride} has been approved. Certificate Ref: ${certNo}. Tap to view details.`,
      url: '/dashboard/marriage-certificate',
      tag: 'marriage-app-approved',
    }
  );
}

/**
 * 7. Marriage Certificate Rejected: Notify Resident
 */
export async function notifyMarriageAppRejected(params: {
  groom: string;
  bride: string;
  reason: string;
  houseId?: string;
  userId?: string;
}) {
  const { groom, bride, reason, houseId, userId } = params;

  await broadcastPushNotification(
    (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
    {
      title: '⚠️ Marriage Application Needs Revision',
      body: `Application for ${groom} & ${bride} requires correction: ${reason}. Tap to view details.`,
      url: '/dashboard/marriage-certificate',
      tag: 'marriage-app-rejected',
    }
  );
}

/**
 * 8. Household Registration Submitted: Notify Admins & Resident
 */
export async function notifyRegistrationSubmitted(params: {
  houseName: string;
  division: string;
  phone: string;
  userId?: string;
}) {
  const { houseName, division, phone, userId } = params;

  // A. Notify Admins
  await broadcastPushNotification(
    (s) => s.role === 'admin',
    {
      title: '🏠 New Household Registration',
      body: `${houseName} (${division}) submitted registration (Phone: ${phone}) and awaits verification.`,
      url: '/admin/verification',
      tag: 'reg-submitted-admin',
    }
  );

  // B. Notify Resident
  if (userId) {
    await broadcastPushNotification(
      (s) => Boolean(s.userId === userId),
      {
        title: '🏠 Registration Under Review',
        body: `Your household registration for ${houseName} has been received. You will be notified once verified by the committee.`,
        url: '/onboarding/pending',
        tag: 'reg-submitted-user',
      }
    );
  }
}

/**
 * 9. Household Registration Approved: Notify Resident
 */
export async function notifyRegistrationApproved(params: {
  houseName: string;
  regNo: string;
  userId?: string;
  houseId?: string;
}) {
  const { houseName, regNo, userId, houseId } = params;

  await broadcastPushNotification(
    (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
    {
      title: '🎉 Household Profile Approved!',
      body: `Welcome to Kunjikkulam Juma Masjid! Your household profile (${houseName} - ${regNo}) is now verified.`,
      url: '/dashboard',
      tag: 'reg-approved',
    }
  );
}

/**
 * 10. Household Registration Rejected: Notify Resident
 */
export async function notifyRegistrationRejected(params: {
  houseName: string;
  reason: string;
  userId?: string;
}) {
  const { houseName, reason, userId } = params;

  if (userId) {
    await broadcastPushNotification(
      (s) => Boolean(s.userId === userId),
      {
        title: '❌ Household Registration Update',
        body: `Registration for ${houseName} could not be approved: ${reason}. Please contact the Mahallu office.`,
        url: '/onboarding',
        tag: 'reg-rejected',
      }
    );
  }
}

/**
 * 11. Profile Update Submitted: Notify Admins & Resident
 */
export async function notifyProfileUpdateSubmitted(params: {
  houseName: string;
  regNo: string;
  houseId?: string;
  userId?: string;
}) {
  const { houseName, regNo, houseId, userId } = params;

  // A. Notify Admins
  await broadcastPushNotification(
    (s) => s.role === 'admin',
    {
      title: '🔄 Profile Change Request',
      body: `${houseName} (${regNo}) requested updates to family/house records. Tap to review.`,
      url: '/admin/verification',
      tag: 'profile-update-admin',
    }
  );

  // B. Notify Resident
  if (houseId || userId) {
    await broadcastPushNotification(
      (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
      {
        title: '🔄 Change Request Submitted',
        body: `Your profile update for ${houseName} has been submitted to the Mahallu committee.`,
        url: '/dashboard',
        tag: 'profile-update-user',
      }
    );
  }
}

/**
 * 12. Profile Update Reviewed: Notify Resident
 */
export async function notifyProfileUpdateReviewed(params: {
  houseName: string;
  regNo: string;
  status: 'approved' | 'rejected';
  reason?: string;
  houseId?: string;
  userId?: string;
}) {
  const { status, reason, houseId, userId } = params;

  const isApproved = status === 'approved';
  await broadcastPushNotification(
    (s) => (Boolean(userId && s.userId === userId) || Boolean(houseId && s.houseId === houseId)),
    {
      title: isApproved ? '✅ Profile Changes Approved!' : '❌ Profile Changes Rejected',
      body: isApproved
        ? 'Your requested household changes have been verified and applied to the official registry.'
        : `Your profile change request was not approved: ${reason || 'Details could not be verified'}.`,
      url: '/dashboard',
      tag: 'profile-update-reviewed',
    }
  );
}
