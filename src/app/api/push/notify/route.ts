import { NextResponse } from 'next/server';
import {
  notifyPaymentSubmitted,
  notifyPaymentVerified,
  notifyPaymentRejected,
  notifySpecialRequestCreated,
  notifyMarriageAppSubmitted,
  notifyMarriageAppApproved,
  notifyMarriageAppRejected,
  notifyRegistrationSubmitted,
  notifyRegistrationApproved,
  notifyRegistrationRejected,
  notifyProfileUpdateSubmitted,
  notifyProfileUpdateReviewed,
} from '@/lib/push-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, payload } = body;

    if (!event || !payload) {
      return NextResponse.json({ error: 'Event name and payload are required.' }, { status: 400 });
    }

    switch (event) {
      case 'payment_submitted':
        await notifyPaymentSubmitted(payload);
        break;

      case 'payment_verified':
        await notifyPaymentVerified(payload);
        break;

      case 'payment_rejected':
        await notifyPaymentRejected(payload);
        break;

      case 'special_request_created':
        await notifySpecialRequestCreated(payload);
        break;

      case 'marriage_app_submitted':
        await notifyMarriageAppSubmitted(payload);
        break;

      case 'marriage_app_approved':
        await notifyMarriageAppApproved(payload);
        break;

      case 'marriage_app_rejected':
        await notifyMarriageAppRejected(payload);
        break;

      case 'registration_submitted':
        await notifyRegistrationSubmitted(payload);
        break;

      case 'registration_approved':
        await notifyRegistrationApproved(payload);
        break;

      case 'registration_rejected':
        await notifyRegistrationRejected(payload);
        break;

      case 'profile_update_submitted':
        await notifyProfileUpdateSubmitted(payload);
        break;

      case 'profile_update_reviewed':
        await notifyProfileUpdateReviewed(payload);
        break;

      default:
        return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Push notification for ${event} dispatched.` });
  } catch (err: any) {
    console.error('[API] /api/push/notify error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to dispatch push notification' }, { status: 500 });
  }
}
