import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Division, FamilyMember } from '@/lib/supabase/types';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/client';

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

function getFilePath(): string {
  return path.join(process.cwd(), 'src', 'data', 'profile-updates.json');
}

export function readUpdatesFromDisk(): ProfileUpdateRequest[] {
  try {
    const filePath = getFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Could not read profile-updates.json:', err);
  }
  return [];
}

export function writeUpdatesToDisk(updates: ProfileUpdateRequest[]): void {
  try {
    const filePath = getFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(updates, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write profile-updates.json:', err);
  }
}

export async function GET() {
  const updates = readUpdatesFromDisk();
  return NextResponse.json({ success: true, updates });
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

    const updates = readUpdatesFromDisk();
    // If an existing pending request exists for this house, replace it with latest updates
    const existingIndex = updates.findIndex(
      (u) => (u.house_id === house_id || u.user_id === user_id) && u.status === 'pending'
    );

    const newRequest: ProfileUpdateRequest = {
      id: existingIndex >= 0 ? updates[existingIndex].id : `pupdate-${Date.now()}`,
      house_id,
      user_id: user_id || '',
      mahallu_reg_no: mahallu_reg_no || '',
      current_details: {
        house_name: current_details?.house_name || '',
        house_number: current_details?.house_number || '',
        phone: current_details?.phone || '',
        division: current_details?.division || 'alungal',
      },
      requested_details: {
        house_name: requested_details.house_name.trim(),
        house_number: requested_details.house_number.trim(),
        phone: requested_details.phone.trim(),
        division: requested_details.division || 'alungal',
      },
      current_members: Array.isArray(current_members) ? current_members : [],
      requested_members: Array.isArray(requested_members) ? requested_members : [],
      note: note ? note.trim() : undefined,
      status: 'pending',
      rejection_reason: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    };

    if (existingIndex >= 0) {
      updates[existingIndex] = newRequest;
    } else {
      updates.unshift(newRequest);
    }

    writeUpdatesToDisk(updates);

    return NextResponse.json({
      success: true,
      message: 'Profile update request submitted for verification.',
      update: newRequest,
    });
  } catch (err: any) {
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

    const updates = readUpdatesFromDisk();
    const target = updates.find((u) => u.id === update_id);
    if (!target) {
      return NextResponse.json({ error: 'Update request not found.' }, { status: 404 });
    }

    if (action === 'approve') {
      target.status = 'approved';
      target.reviewed_at = new Date().toISOString();
      target.reviewed_by = admin_id || 'admin';
      target.rejection_reason = null;

      // If Supabase is configured, update the houses and family_members tables
      if (hasSupabaseConfig()) {
        try {
          const supabase = createClient();
          await (supabase.from('houses') as any)
            .update({
              house_name: target.requested_details.house_name,
              house_number: target.requested_details.house_number,
              phone: target.requested_details.phone,
              division: target.requested_details.division,
            })
            .eq('id', target.house_id);

          if (target.requested_members && Array.isArray(target.requested_members) && target.requested_members.length > 0) {
            await (supabase.from('family_members') as any).delete().eq('house_id', target.house_id);
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const membersToInsert = target.requested_members.map((m) => {
              const parsedAge = typeof m.age === 'number' ? m.age : Number(m.age);
              const row: any = {
                house_id: target.house_id,
                name: m.name.trim(),
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
        } catch (dbErr) {
          console.warn('Supabase house & members update error:', dbErr);
        }
      }
    } else if (action === 'reject') {
      target.status = 'rejected';
      target.reviewed_at = new Date().toISOString();
      target.reviewed_by = admin_id || 'admin';
      target.rejection_reason = rejection_reason || 'Information could not be verified by Mahallu Administration.';
    } else if (action === 'cancel') {
      const idx = updates.findIndex((u) => u.id === update_id);
      if (idx >= 0) updates.splice(idx, 1);
      writeUpdatesToDisk(updates);
      return NextResponse.json({ success: true, message: 'Update request cancelled.' });
    }

    writeUpdatesToDisk(updates);

    return NextResponse.json({
      success: true,
      message: `Profile update request ${action}d successfully.`,
      update: target,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to review profile update request' },
      { status: 500 }
    );
  }
}
