import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendBatchReminderEmails, ReminderEmailPayload, getSmtpStatus } from '@/lib/email-service';
import { getHouseRegistrationMonth } from '@/lib/data-service';
import { HouseWithDetails } from '@/lib/supabase/types';

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  const url = new URL(request.url);
  const secretParam = url.searchParams.get('secret');
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET || 'mahallu_monthly_cron_secret_key_2026';

  // Protect endpoint if secret is provided or configured
  if (
    process.env.NODE_ENV === 'production' &&
    secretParam !== expectedSecret &&
    authHeader !== `Bearer ${expectedSecret}`
  ) {
    return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
  }

  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rjkxblgxhfbcdjflyshk.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your-service-role-key'
        ? process.env.SUPABASE_SERVICE_ROLE_KEY
        : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Og-EJvJYUvz4U6DDOxejNw_1c3RaRCR';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Fetch all houses with profile and dues
    const { data: houses, error } = await supabase
      .from('houses')
      .select('*, profile:profiles(*), payment_dues(*)');

    if (error) {
      throw new Error(`Failed to query houses: ${error.message}`);
    }

    const defaultersToRemind: ReminderEmailPayload[] = [];
    const hostHeader = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const siteUrl = `${protocol}://${hostHeader}`;

    for (const rawHouse of (houses || [])) {
      const house = rawHouse as unknown as HouseWithDetails;
      const regMonth = getHouseRegistrationMonth(house);

      // House was registered after current month, ignore
      if (currentMonth < regMonth) continue;

      const currentDue = (house.payment_dues || []).find((d) => d.billing_month === currentMonth);
      const isUnpaid = !currentDue || currentDue.status !== 'verified';

      if (isUnpaid && house.profile?.email) {
        defaultersToRemind.push({
          to: house.profile.email.trim(),
          houseName: house.house_name,
          regNo: house.mahallu_reg_no,
          month: currentMonth,
          amount: currentDue?.amount || 100,
          siteUrl,
        });
      }
    }

    if (defaultersToRemind.length === 0) {
      return NextResponse.json({
        success: true,
        month: currentMonth,
        message: 'No eligible unpaid households with emails found for automated reminder dispatch.',
        totalChecked: houses?.length || 0,
        sentCount: 0,
      });
    }

    const dispatchResult = await sendBatchReminderEmails(defaultersToRemind, 3);
    const smtp = getSmtpStatus();

    return NextResponse.json({
      success: true,
      scheduledTrigger: true,
      month: currentMonth,
      smtpConfigured: smtp.configured,
      totalEligible: defaultersToRemind.length,
      ...dispatchResult,
    });
  } catch (err: any) {
    console.error('Cron job reminder execution error:', err);
    return NextResponse.json({ error: err?.message || 'Cron execution failed' }, { status: 500 });
  }
}
