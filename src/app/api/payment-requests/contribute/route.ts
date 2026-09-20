import { NextResponse } from 'next/server';
import { PaymentRequestContribution } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import {
  notifyPaymentSubmitted,
  notifyPaymentVerified,
  notifyPaymentRejected,
} from '@/lib/push-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId, houseId, userId, amount, transactionRef, isVerified, adminId } = body;

    if (!requestId || !houseId) {
      return NextResponse.json(
        { error: 'Payment request ID and house ID are required.' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid contribution amount greater than ₹0.' },
        { status: 400 }
      );
    }

    let cleanRef = (transactionRef || '').trim();
    if (isVerified && (!cleanRef || cleanRef.length < 6)) {
      cleanRef = `OFFLINE-${Date.now().toString().slice(-6)}`;
    } else if (!cleanRef || cleanRef.length < 6) {
      return NextResponse.json(
        { error: 'Please enter a valid 12-digit UPI / Bank UTR transaction reference (minimum 6 characters).' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. Check if campaign exists
    const { data: reqRow, error: reqErr } = await (supabase.from('payment_requests') as any)
      .select('title, status')
      .eq('id', requestId)
      .maybeSingle();

    if (reqErr || !reqRow) {
      return NextResponse.json(
        { error: 'The requested payment campaign could not be found.' },
        { status: 404 }
      );
    }

    // Only residents are restricted to active campaigns
    if (!isVerified && reqRow.status !== 'active') {
      return NextResponse.json(
        { error: 'This payment request is no longer active.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const isUserUuid = userId && typeof userId === 'string' && userId.length === 36;
    const isAdminUuid = adminId && typeof adminId === 'string' && adminId.length === 36;

    // 2. Check if a contribution already exists for this house & request
    const { data: existingHouseContrib } = await (supabase.from('payment_request_contributions') as any)
      .select('*')
      .eq('request_id', requestId)
      .eq('house_id', houseId)
      .maybeSingle();

    if (existingHouseContrib) {
      if (isVerified) {
        // Upgrade existing submission to verified
        const { data: updated, error: updateErr } = await (supabase.from('payment_request_contributions') as any)
          .update({
            amount: numAmount,
            status: 'verified',
            verified_at: now,
            verified_by: isAdminUuid ? adminId : null,
            rejection_reason: null,
          })
          .eq('id', existingHouseContrib.id)
          .select()
          .single();

        if (updateErr) {
          throw new Error(updateErr.message);
        }

        const contrib: PaymentRequestContribution = {
          id: updated.id,
          request_id: updated.request_id,
          house_id: updated.house_id,
          user_id: updated.user_id || undefined,
          amount: Number(updated.amount),
          transaction_ref: updated.transaction_ref,
          status: updated.status as any,
          submitted_at: updated.submitted_at,
          verified_at: updated.verified_at,
          verified_by: updated.verified_by,
          rejection_reason: updated.rejection_reason,
          created_at: updated.created_at,
        };

        return NextResponse.json({
          success: true,
          message: `Payment of ₹${numAmount} for "${reqRow.title}" marked as Paid!`,
          contribution: contrib,
        });
      } else if (existingHouseContrib.status === 'verified') {
        return NextResponse.json(
          { error: `This household has already completed payment for "${reqRow.title}".` },
          { status: 400 }
        );
      }
    }

    // 3. Check reference duplicate
    const { data: existingRefContrib } = await (supabase.from('payment_request_contributions') as any)
      .select('id')
      .eq('transaction_ref', cleanRef)
      .maybeSingle();

    if (existingRefContrib) {
      if (isVerified) {
        cleanRef = `OFFLINE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
      } else {
        return NextResponse.json(
          { error: `Transaction reference "${cleanRef}" has already been submitted.` },
          { status: 400 }
        );
      }
    }

    const { data: inserted, error: insertErr } = await (supabase.from('payment_request_contributions') as any)
      .insert({
        request_id: requestId,
        house_id: houseId,
        user_id: isUserUuid ? userId : null,
        amount: numAmount,
        transaction_ref: cleanRef,
        status: isVerified ? 'verified' : 'under_review',
        submitted_at: now,
        verified_at: isVerified ? now : null,
        verified_by: isVerified && isAdminUuid ? adminId : null,
      })
      .select()
      .single();

    if (insertErr) {
      throw new Error(insertErr.message);
    }

    const contrib: PaymentRequestContribution = {
      id: inserted.id,
      request_id: inserted.request_id,
      house_id: inserted.house_id,
      user_id: inserted.user_id || undefined,
      amount: Number(inserted.amount),
      transaction_ref: inserted.transaction_ref,
      status: inserted.status as any,
      submitted_at: inserted.submitted_at,
      verified_at: inserted.verified_at,
      verified_by: inserted.verified_by,
      rejection_reason: inserted.rejection_reason,
      created_at: inserted.created_at,
    };

    // Dispatch Web Push Notifications if submitted by resident for review
    if (!isVerified) {
      let houseName = 'Household';
      let mahalluRegNo = '';
      try {
        const { data: h } = await (supabase.from('houses') as any)
          .select('house_name, mahallu_reg_no')
          .eq('id', houseId)
          .maybeSingle();
        if (h) {
          houseName = h.house_name;
          mahalluRegNo = h.mahallu_reg_no;
        }
      } catch {}

      notifyPaymentSubmitted({
        houseName,
        regNo: mahalluRegNo,
        amount: numAmount,
        title: reqRow.title || 'Special Collection',
        utr: cleanRef,
        houseId,
        userId: userId || undefined,
      }).catch((e) => console.warn('[Push] Error in contribute submit:', e));
    }

    return NextResponse.json({
      success: true,
      message: isVerified
        ? `Payment of ₹${numAmount} for "${reqRow.title}" marked as Paid!`
        : `Contribution of ₹${numAmount} for "${reqRow.title}" submitted successfully! Sent to Admin for verification.`,
      contribution: contrib,
    });
  } catch (err: any) {
    console.error('Error submitting request contribution to Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to submit contribution.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { contributionId, action, adminId, rejectionReason } = body;

    if (!contributionId || !action) {
      return NextResponse.json(
        { error: 'Contribution ID and action (approve / reject) are required.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const isAdminUuid = adminId && typeof adminId === 'string' && adminId.length === 36;
    const updatePayload: any = {
      status: action === 'approve' ? 'verified' : 'rejected',
      verified_at: action === 'approve' ? now : null,
      verified_by: action === 'approve' && isAdminUuid ? adminId : null,
      rejection_reason: action === 'reject' ? (rejectionReason?.trim() || 'Invalid transaction reference') : null,
    };

    const supabase = createClient();
    const { data, error } = await (supabase.from('payment_request_contributions') as any)
      .update(updatePayload)
      .eq('id', contributionId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Contribution record not found.' },
        { status: 404 }
      );
    }

    const updatedItem: PaymentRequestContribution = {
      id: data.id,
      request_id: data.request_id,
      house_id: data.house_id,
      user_id: data.user_id || undefined,
      amount: Number(data.amount),
      transaction_ref: data.transaction_ref,
      status: data.status as any,
      submitted_at: data.submitted_at,
      verified_at: data.verified_at,
      verified_by: data.verified_by,
      rejection_reason: data.rejection_reason,
      created_at: data.created_at,
    };

    // Dispatch Web Push Notifications to Resident
    let houseName = 'Household';
    let mahalluRegNo = '';
    let reqTitle = 'Special Collection';
    try {
      const { data: h } = await (supabase.from('houses') as any)
        .select('house_name, mahallu_reg_no')
        .eq('id', data.house_id)
        .maybeSingle();
      if (h) {
        houseName = h.house_name;
        mahalluRegNo = h.mahallu_reg_no;
      }
      const { data: r } = await (supabase.from('payment_requests') as any)
        .select('title')
        .eq('id', data.request_id)
        .maybeSingle();
      if (r) {
        reqTitle = r.title;
      }
    } catch {}

    if (action === 'approve') {
      notifyPaymentVerified({
        houseName,
        regNo: mahalluRegNo,
        amount: Number(data.amount),
        title: reqTitle,
        houseId: data.house_id,
        userId: data.user_id || undefined,
      }).catch((e) => console.warn('[Push] Error in contribute approve:', e));
    } else if (action === 'reject') {
      notifyPaymentRejected({
        houseName,
        regNo: mahalluRegNo,
        amount: Number(data.amount),
        title: reqTitle,
        reason: rejectionReason || 'Invalid transaction reference',
        houseId: data.house_id,
        userId: data.user_id || undefined,
      }).catch((e) => console.warn('[Push] Error in contribute reject:', e));
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Contribution verified successfully!' : 'Contribution marked as rejected.',
      contribution: updatedItem,
    });
  } catch (err: any) {
    console.error('Error reviewing request contribution in Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to review contribution.' },
      { status: 500 }
    );
  }
}
