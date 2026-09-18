import { NextResponse } from 'next/server';
import { PaymentRequestItem, PaymentRequestContribution } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createClient();
    const [reqRes, contribRes] = await Promise.all([
      (supabase.from('payment_requests') as any).select('*').order('created_at', { ascending: false }),
      (supabase.from('payment_request_contributions') as any).select('*').order('submitted_at', { ascending: false }),
    ]);

    if (reqRes.error) {
      console.warn('Supabase fetch payment_requests error:', reqRes.error.message);
    }

    const requests: PaymentRequestItem[] = (reqRes.data || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      category: r.category,
      amount_type: r.amount_type,
      fixed_amount: r.fixed_amount != null ? Number(r.fixed_amount) : undefined,
      min_amount: r.min_amount != null ? Number(r.min_amount) : undefined,
      suggested_amount: r.suggested_amount != null ? Number(r.suggested_amount) : undefined,
      target_total: r.target_total != null ? Number(r.target_total) : undefined,
      target_audience: (r.target_audience as any) || 'all',
      status: r.status,
      created_at: r.created_at,
      created_by: r.created_by || undefined,
      due_date: r.due_date || null,
    }));

    const contributions: PaymentRequestContribution[] = (contribRes.data || []).map((c: any) => ({
      id: c.id,
      request_id: c.request_id,
      house_id: c.house_id,
      user_id: c.user_id || undefined,
      amount: Number(c.amount),
      transaction_ref: c.transaction_ref,
      status: c.status as any,
      submitted_at: c.submitted_at,
      verified_at: c.verified_at,
      verified_by: c.verified_by,
      rejection_reason: c.rejection_reason,
      created_at: c.created_at,
    }));

    return NextResponse.json({
      success: true,
      requests,
      contributions,
    });
  } catch (err: any) {
    console.error('Error in GET /api/payment-requests:', err);
    return NextResponse.json({
      success: true,
      requests: [],
      contributions: [],
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      amount_type,
      fixed_amount,
      min_amount,
      suggested_amount,
      target_total,
      target_audience,
      due_date,
      created_by,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'A valid request title / purpose is required.' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'Please select a valid category (e.g., Donation, Building Fund, Other).' },
        { status: 400 }
      );
    }

    if (amount_type !== 'fixed' && amount_type !== 'custom') {
      return NextResponse.json(
        { error: 'Invalid amount type. Must be "fixed" or "custom".' },
        { status: 400 }
      );
    }

    const numFixed = Number(fixed_amount);
    if (amount_type === 'fixed' && (isNaN(numFixed) || numFixed <= 0)) {
      return NextResponse.json(
        { error: 'Please specify a valid fixed amount greater than ₹0.' },
        { status: 400 }
      );
    }

    const isValidUuid = created_by && typeof created_by === 'string' && created_by.length === 36;
    const supabase = createClient();

    const { data, error } = await (supabase.from('payment_requests') as any)
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        category: category.trim(),
        amount_type,
        fixed_amount: amount_type === 'fixed' ? numFixed : null,
        min_amount: min_amount ? Number(min_amount) : null,
        suggested_amount: suggested_amount ? Number(suggested_amount) : null,
        target_total: target_total ? Number(target_total) : null,
        target_audience: target_audience || 'all',
        status: 'active',
        due_date: due_date || null,
        created_by: isValidUuid ? created_by : null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const createdItem: PaymentRequestItem = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      category: data.category,
      amount_type: data.amount_type,
      fixed_amount: data.fixed_amount != null ? Number(data.fixed_amount) : undefined,
      min_amount: data.min_amount != null ? Number(data.min_amount) : undefined,
      suggested_amount: data.suggested_amount != null ? Number(data.suggested_amount) : undefined,
      target_total: data.target_total != null ? Number(data.target_total) : undefined,
      target_audience: (data.target_audience as any) || 'all',
      status: data.status,
      created_at: data.created_at,
      created_by: data.created_by || undefined,
      due_date: data.due_date || null,
    };

    return NextResponse.json({
      success: true,
      message: `Amount request "${createdItem.title}" published successfully to all users!`,
      request: createdItem,
    });
  } catch (err: any) {
    console.error('Error creating payment request in Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create payment request.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, title, description, category, due_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const supabase = createClient();
    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (title) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description ? description.trim() : null;
    if (category) updatePayload.category = category.trim();
    if (due_date !== undefined) updatePayload.due_date = due_date || null;

    const { data, error } = await (supabase.from('payment_requests') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const updated: PaymentRequestItem | undefined = data
      ? {
          id: data.id,
          title: data.title,
          description: data.description || '',
          category: data.category,
          amount_type: data.amount_type,
          fixed_amount: data.fixed_amount != null ? Number(data.fixed_amount) : undefined,
          min_amount: data.min_amount != null ? Number(data.min_amount) : undefined,
          suggested_amount: data.suggested_amount != null ? Number(data.suggested_amount) : undefined,
          target_total: data.target_total != null ? Number(data.target_total) : undefined,
          target_audience: (data.target_audience as any) || 'all',
          status: data.status,
          created_at: data.created_at,
          created_by: data.created_by || undefined,
          due_date: data.due_date || null,
        }
      : undefined;

    return NextResponse.json({
      success: true,
      message: 'Amount request updated successfully.',
      request: updated,
    });
  } catch (err: any) {
    console.error('Error updating payment request in Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update payment request.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const supabase = createClient();

    // Check if this payment request has any resident contributions (submitted, under_review, or verified)
    const { data: existingContribs, error: checkError } = await (supabase.from('payment_request_contributions') as any)
      .select('id')
      .eq('request_id', id);

    if (checkError) {
      console.warn('Error checking existing contributions:', checkError.message);
    }

    if (existingContribs && existingContribs.length > 0) {
      // Resident contributions exist! Real financial payments have been made.
      // We MUST preserve users' transaction records and receipts permanently.
      // Soft-delete by setting status = 'cancelled'
      const { error } = await (supabase.from('payment_requests') as any)
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment request removed from active drives. Resident payment history and receipts have been safely preserved.',
        archived: true,
      });
    }

    // No resident contributions exist: safe to permanently delete from database
    const { error } = await (supabase.from('payment_requests') as any).delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment request deleted successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting payment request from Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete payment request.' },
      { status: 500 }
    );
  }
}
