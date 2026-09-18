import { NextResponse } from 'next/server';
import { Division, FamilyMember } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';

export interface ProfileUpdateRequest {
  id: string;
  house_id: string;
  user_id: string;
  mahallu_reg_no: string;
  current_details: {
    house_name: string;
    house_number: string;
    phone: string;
    division: Division;
  };
  requested_details: {
    house_name: string;
    house_number: string;
    phone: string;
    division: Division;
  };
  current_members?: FamilyMember[];
  requested_members?: FamilyMember[];
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from('profile_updates') as any)
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch profile_updates error:', error.message);
    }

    const updates: ProfileUpdateRequest[] = (data || []).map((row: any) => ({
      id: row.id,
      house_id: row.house_id,
      user_id: row.user_id,
      mahallu_reg_no: row.mahallu_reg_no || '',
      current_details: (row.current_details as any) || {},
      requested_details: (row.requested_details as any) || {},
      current_members: Array.isArray(row.current_members) ? (row.current_members as any) : [],
      requested_members: Array.isArray(row.requested_members) ? (row.requested_members as any) : [],
      note: row.note || undefined,
      status: row.status as any,
      rejection_reason: row.rejection_reason,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
    }));

    return NextResponse.json({ success: true, updates });
  } catch (err: any) {
    console.error('Error fetching profile updates from Supabase:', err);
    return NextResponse.json({ success: true, updates: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      house_id,
      user_id,
      mahallu_reg_no,
      current_details,
      requested_details,
      current_members,
      requested_members,
      note,
    } = body;

    if (!house_id || !requested_details?.house_name || !requested_details?.phone) {
      return NextResponse.json(
        { error: 'Missing required house details or contact information.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const supabase = createClient();

    const { data: existingPending } = await (supabase.from('profile_updates') as any)
      .select('id')
      .eq('house_id', house_id)
      .eq('status', 'pending')
      .maybeSingle();

    const payload: any = {
      house_id,
      user_id: user_id || house_id,
      mahallu_reg_no: mahallu_reg_no || '',
      current_details: {
        house_name: current_details?.house_name || '',
        house_number: current_details?.house_number || '',
        phone: current_details?.phone || '',
        division: current_details?.division || 'alungal',
      },
      requested_details: {
        house_name: (requested_details.house_name || '').trim(),
        house_number: (requested_details.house_number || '').trim(),
        phone: (requested_details.phone || '').trim(),
        division: requested_details.division || 'alungal',
      },
      current_members: Array.isArray(current_members) ? current_members : [],
      requested_members: Array.isArray(requested_members) ? requested_members : [],
      note: note ? note.trim() : null,
      status: 'pending',
      rejection_reason: null,
      submitted_at: nowIso,
      reviewed_at: null,
      reviewed_by: null,
    };

    let resultData: any = null;

    if (existingPending) {
      const { data, error } = await (supabase.from('profile_updates') as any)
        .update(payload)
        .eq('id', existingPending.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      resultData = data;
    } else {
      const { data, error } = await (supabase.from('profile_updates') as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      resultData = data;
    }

    const savedRecord: ProfileUpdateRequest = {
      id: resultData.id,
      house_id: resultData.house_id,
      user_id: resultData.user_id,
      mahallu_reg_no: resultData.mahallu_reg_no,
      current_details: resultData.current_details as any,
      requested_details: resultData.requested_details as any,
      current_members: resultData.current_members as any,
      requested_members: resultData.requested_members as any,
      note: resultData.note || undefined,
      status: resultData.status as any,
      rejection_reason: resultData.rejection_reason,
      submitted_at: resultData.submitted_at,
      reviewed_at: resultData.reviewed_at,
      reviewed_by: resultData.reviewed_by,
    };

    return NextResponse.json({
      success: true,
      message: 'Profile update request submitted for verification.',
      update: savedRecord,
    });
  } catch (err: any) {
    console.error('Error submitting profile update to Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to submit profile update request' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { update_id, action, rejection_reason, admin_id } = body;

    if (!update_id || !action || !['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action or update_id.' }, { status: 400 });
    }

    const supabase = createClient();
    const nowIso = new Date().toISOString();
    const isAdminUuid = admin_id && typeof admin_id === 'string' && admin_id.length === 36;

    // Fetch target from Supabase
    const { data: target, error: fetchErr } = await (supabase.from('profile_updates') as any)
      .select('*')
      .eq('id', update_id)
      .maybeSingle();

    if (fetchErr || !target) {
      return NextResponse.json({ error: 'Update request not found.' }, { status: 404 });
    }

    if (action === 'approve') {
      // 1. Update house details
      await (supabase.from('houses') as any)
        .update({
          house_name: target.requested_details.house_name,
          house_number: target.requested_details.house_number,
          phone: target.requested_details.phone,
          division: target.requested_details.division,
        })
        .eq('id', target.house_id);

      // 2. Update family members if requested
      if (target.requested_members && Array.isArray(target.requested_members) && target.requested_members.length > 0) {
        await (supabase.from('family_members') as any).delete().eq('house_id', target.house_id);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const membersToInsert = target.requested_members.map((m: any) => {
          const parsedAge = typeof m.age === 'number' ? m.age : Number(m.age);
          const row: any = {
            house_id: target.house_id,
            name: (m.name || '').trim(),
            is_head_of_family: Boolean(m.is_head_of_family),
            relationship: m.relationship,
            marital_status: m.marital_status,
            job_status: m.job_status,
            general_education: m.general_education,
            religious_education: m.religious_education,
            age: !isNaN(parsedAge) && parsedAge >= 0 ? parsedAge : null,
            phone: m.phone && m.phone.trim() !== '' ? m.phone.trim() : null,
          };
          if (m.id && uuidRegex.test(m.id)) {
            row.id = m.id;
          }
          return row;
        });
        await (supabase.from('family_members') as any).insert(membersToInsert);
      }

      // 3. Mark update as approved in profile_updates table
      const { data: updated, error: updateErr } = await (supabase.from('profile_updates') as any)
        .update({
          status: 'approved',
          reviewed_at: nowIso,
          reviewed_by: isAdminUuid ? admin_id : null,
          rejection_reason: null,
        })
        .eq('id', update_id)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);

      return NextResponse.json({
        success: true,
        message: 'Profile update request approved successfully.',
        update: updated,
      });
    } else if (action === 'reject') {
      const { data: updated, error: updateErr } = await (supabase.from('profile_updates') as any)
        .update({
          status: 'rejected',
          reviewed_at: nowIso,
          reviewed_by: isAdminUuid ? admin_id : null,
          rejection_reason: rejection_reason || 'Information could not be verified by Mahallu Administration.',
        })
        .eq('id', update_id)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);

      return NextResponse.json({
        success: true,
        message: 'Profile update request rejected.',
        update: updated,
      });
    } else if (action === 'cancel') {
      const { error: delErr } = await (supabase.from('profile_updates') as any)
        .delete()
        .eq('id', update_id);

      if (delErr) throw new Error(delErr.message);

      return NextResponse.json({ success: true, message: 'Update request cancelled.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error reviewing profile update request in Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to review profile update request' },
      { status: 500 }
    );
  }
}
