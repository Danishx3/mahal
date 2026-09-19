import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { MarriageCertificateApplication, MarriageCertificateStatus } from '@/lib/supabase/types';
import {
  sendMarriageApplicationSubmittedAdminEmail,
  sendMarriageApplicationApprovedUserEmail,
} from '@/lib/email-service';
import { DataService } from '@/lib/data-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('house_id');
    const status = searchParams.get('status') as MarriageCertificateStatus | null;

    const supabase = createClient();
    let query = (supabase.from('marriage_certificates') as any).select('*').order('submitted_at', { ascending: false });

    if (houseId) {
      query = query.eq('house_id', houseId);
    }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetch marriage_certificates error, using fallback:', error.message);
      const fallbackList = DataService.getMarriageCertificates(houseId || undefined, status || undefined);
      return NextResponse.json({ success: true, applications: fallbackList, source: 'local_fallback' });
    }

    const applications: MarriageCertificateApplication[] = (data || []).map((row: any) => ({
      id: row.id,
      house_id: row.house_id,
      user_id: row.user_id,
      mahallu_reg_no: row.mahallu_reg_no,
      house_name: row.house_name,
      applicant_email: row.applicant_email,
      applicant_phone: row.applicant_phone,
      husband_name: row.husband_name,
      husband_dob: row.husband_dob,
      wife_full_name: row.wife_full_name,
      wife_initial: row.wife_initial,
      wife_father_name: row.wife_father_name,
      wife_address: row.wife_address,
      wife_dob: row.wife_dob,
      date_of_nikah: row.date_of_nikah,
      status: row.status,
      certificate_number: row.certificate_number,
      admin_notes: row.admin_notes,
      rejection_reason: row.rejection_reason,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
    }));

    return NextResponse.json({ success: true, applications });
  } catch (err: any) {
    console.error('Error fetching marriage certificates:', err);
    return NextResponse.json({ success: true, applications: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      house_id,
      user_id,
      mahallu_reg_no,
      house_name,
      applicant_email,
      applicant_phone,
      husband_name,
      husband_dob,
      wife_full_name,
      wife_initial,
      wife_father_name,
      wife_address,
      wife_dob,
      date_of_nikah,
    } = body;

    // Validate required fields
    if (
      !house_id ||
      !husband_name?.trim() ||
      !husband_dob ||
      !wife_full_name?.trim() ||
      !wife_initial?.trim() ||
      !wife_father_name?.trim() ||
      !wife_address?.trim() ||
      !wife_dob ||
      !date_of_nikah
    ) {
      return NextResponse.json(
        { error: 'All fields including groom, bride, father, address, and nikah date are required.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const payload: any = {
      house_id,
      user_id: user_id || house_id,
      mahallu_reg_no: (mahallu_reg_no || '').trim(),
      house_name: (house_name || 'Household').trim(),
      applicant_email: (applicant_email || '').trim(),
      applicant_phone: (applicant_phone || '').trim(),
      husband_name: husband_name.trim(),
      husband_dob,
      wife_full_name: wife_full_name.trim(),
      wife_initial: wife_initial.trim(),
      wife_father_name: wife_father_name.trim(),
      wife_address: wife_address.trim(),
      wife_dob,
      date_of_nikah,
      status: 'pending',
      certificate_number: null,
      admin_notes: null,
      rejection_reason: null,
      submitted_at: nowIso,
      reviewed_at: null,
      reviewed_by: null,
    };

    const supabase = createClient();
    let savedApplication: MarriageCertificateApplication | null = null;

    const { data, error } = await (supabase.from('marriage_certificates') as any)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert marriage_certificates error, using local fallback:', error.message);
      savedApplication = DataService.saveMarriageCertificateLocal({
        ...payload,
        id: `mc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
    } else {
      savedApplication = data;
      // Also cache in local DataService
      DataService.saveMarriageCertificateLocal(savedApplication as any);
    }

    // Collect all admin emails to notify
    let adminEmails: string[] = [];
    try {
      const { data: adminProfiles } = await (supabase.from('profiles') as any)
        .select('email')
        .eq('role', 'admin');

      if (adminProfiles && Array.isArray(adminProfiles)) {
        adminEmails = adminProfiles.map((p: any) => p.email).filter(Boolean);
      }
    } catch {
      // Fallback
    }

    // Dispatch automated email to admin user(s)
    try {
      if (savedApplication) {
        await sendMarriageApplicationSubmittedAdminEmail(savedApplication, adminEmails);
      }
    } catch (emailErr: any) {
      console.error('Failed to send admin email alert:', emailErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Marriage certificate application submitted successfully.',
      application: savedApplication,
    });
  } catch (err: any) {
    console.error('Error in marriage certificate submission:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to submit marriage certificate application' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { application_id, action, admin_id, admin_notes, certificate_number, rejection_reason } = body;

    if (!application_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Valid application_id and action (approve/reject) are required.' }, { status: 400 });
    }

    const supabase = createClient();
    const nowIso = new Date().toISOString();
    const isAdminUuid = admin_id && typeof admin_id === 'string' && admin_id.length === 36;

    // Fetch existing application
    let targetApp: MarriageCertificateApplication | null = null;
    const { data: dbTarget } = await (supabase.from('marriage_certificates') as any)
      .select('*')
      .eq('id', application_id)
      .maybeSingle();

    if (dbTarget) {
      targetApp = dbTarget;
    } else {
      targetApp = DataService.getMarriageCertificateById(application_id);
    }

    if (!targetApp) {
      return NextResponse.json({ error: 'Marriage certificate application not found.' }, { status: 404 });
    }

    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const assignedCertNo = certificate_number?.trim() || `MHL-MC-${year}-${randomSuffix}`;

    if (action === 'approve') {
      const updateData: any = {
        status: 'approved',
        certificate_number: assignedCertNo,
        admin_notes: admin_notes?.trim() || 'Approved following verification of Nikah register.',
        rejection_reason: null,
        reviewed_at: nowIso,
        reviewed_by: isAdminUuid ? admin_id : null,
      };

      const { data: updated, error } = await (supabase.from('marriage_certificates') as any)
        .update(updateData)
        .eq('id', application_id)
        .select()
        .single();

      let finalApp: MarriageCertificateApplication = updated || {
        ...targetApp,
        ...updateData,
      };

      // Also persist in local service
      DataService.saveMarriageCertificateLocal(finalApp);

      // Dispatch approval confirmation email to resident user
      try {
        await sendMarriageApplicationApprovedUserEmail(finalApp);
      } catch (emailErr: any) {
        console.error('Failed to send user approval email:', emailErr?.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Application approved successfully and applicant notified.',
        application: finalApp,
      });
    } else if (action === 'reject') {
      const reason = rejection_reason?.trim() || 'Information could not be verified against the official Mahallu Nikah register.';
      const updateData: any = {
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: nowIso,
        reviewed_by: isAdminUuid ? admin_id : null,
      };

      const { data: updated } = await (supabase.from('marriage_certificates') as any)
        .update(updateData)
        .eq('id', application_id)
        .select()
        .single();

      let finalApp: MarriageCertificateApplication = updated || {
        ...targetApp,
        ...updateData,
      };

      DataService.saveMarriageCertificateLocal(finalApp);

      return NextResponse.json({
        success: true,
        message: 'Application rejected.',
        application: finalApp,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error reviewing marriage certificate:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to review application' },
      { status: 500 }
    );
  }
}
