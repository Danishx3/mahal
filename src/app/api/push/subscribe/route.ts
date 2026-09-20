import { NextResponse } from 'next/server';
import { saveSubscription, removeSubscription } from '@/lib/push-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription, role, userId, houseId } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: 'Valid PushSubscription with endpoint and keys is required.' },
        { status: 400 }
      );
    }

    const saved = await saveSubscription({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      role: role === 'admin' ? 'admin' : 'resident',
      userId: userId || undefined,
      houseId: houseId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription registered successfully.',
      subscriptionId: saved.id,
    });
  } catch (err: any) {
    console.error('[API] /api/push/subscribe error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to register push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required.' }, { status: 400 });
    }

    await removeSubscription(endpoint);
    return NextResponse.json({ success: true, message: 'Push subscription removed.' });
  } catch (err: any) {
    console.error('[API] /api/push/subscribe DELETE error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete push subscription' },
      { status: 500 }
    );
  }
}
