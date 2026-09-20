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

import os from 'os';

function isUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Local storage path for push subscriptions persistence
function getSubsFilePath(): string {
  try {
    // In serverless environments like Vercel, use /tmp (os.tmpdir()) which is writable
    const tmp = os.tmpdir();
    return path.join(tmp, 'mahallu-push-subscriptions.json');
  } catch {
    return 'push-subscriptions.json';
  }
}

let inMemorySubs: StoredPushSubscription[] = [];

function writeSubsFile(subs: StoredPushSubscription[]) {
  inMemorySubs = subs;
  try {
    const file = getSubsFilePath();
    fs.writeFileSync(file, JSON.stringify(subs, null, 2), 'utf8');
  } catch (err) {
    console.warn('[PushService] Safe disk write fallback (using in-memory):', err);
  }
}

export function getAllSubscriptions(): StoredPushSubscription[] {
  try {
    if (inMemorySubs.length > 0) return inMemorySubs;
    const file = getSubsFilePath();
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        inMemorySubs = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[PushService] Failed to read subscriptions:', err);
  }
  return inMemorySubs;
}

export async function saveSubscription(
  sub: Omit<StoredPushSubscription, 'id' | 'createdAt'>
): Promise<StoredPushSubscription> {
  const now = new Date().toISOString();

  // 1. In-memory & safe temp file update
  const subs = getAllSubscriptions();
  const existingIndex = subs.findIndex((s) => s.endpoint === sub.endpoint);
  let resolvedSub: StoredPushSubscription;

  if (existingIndex >= 0) {
    subs[existingIndex] = {
      ...subs[existingIndex],
      ...sub,
      role: sub.role || subs[existingIndex].role,
      userId: sub.userId || subs[existingIndex].userId,
      houseId: sub.houseId || subs[existingIndex].houseId,
    };
    resolvedSub = subs[existingIndex];
  } else {
    resolvedSub = {
      ...sub,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
    };
    subs.push(resolvedSub);
  }

  writeSubsFile(subs);

  // 2. Async sync with Supabase push_subscriptions table
  try {
    const supabase = createClient();
    const validUserId = isUuid(resolvedSub.userId) ? resolvedSub.userId : null;
    const validHouseId = isUuid(resolvedSub.houseId) ? resolvedSub.houseId : null;

    const { error } = await (supabase.from('push_subscriptions') as any).upsert({
      endpoint: resolvedSub.endpoint,
      p256dh: resolvedSub.keys.p256dh,
      auth: resolvedSub.keys.auth,
      role: resolvedSub.role,
      user_id: validUserId,
      house_id: validHouseId,
      updated_at: now,
    });

    if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      console.warn('[PushService] Supabase sync note:', error.message);
    }
  } catch (err: any) {
    console.warn('[PushService] Supabase sync note:', err?.message);
  }

  return resolvedSub;
}

export async function removeSubscription(endpoint: string) {
  try {
    const subs = getAllSubscriptions();
    const filtered = subs.filter((s) => s.endpoint !== endpoint);
    writeSubsFile(filtered);
  } catch (err) {
    console.warn('[PushService] Failed to delete local subscription:', err);
  }

  try {
    const supabase = createClient();
    await (supabase.from('push_subscriptions') as any).delete().eq('endpoint', endpoint);
  } catch {}
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
