import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface AdminSecurityRow {
  id: number;
  role_change_password?: string;
  updated_at?: string;
}

/**
 * GET: Fetch all registered users/profiles with house details
 */
export async function GET() {
  try {
    const supabase = createClient();

    // 1. Verify caller has admin role
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !caller) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const { data: callerProfile } = (await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()) as { data: { role?: string } | null };

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Fetch all profiles with their associated house data
    const { data: profiles, error: profilesError } = await (supabase.from('profiles') as any)
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        houses (
          id,
          house_name,
          house_number,
          mahallu_reg_no,
          division,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching users in admin API:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const formattedUsers = (profiles || []).map((p: any) => {
      const houseData = Array.isArray(p.houses) ? p.houses[0] : p.houses;
      return {
        id: p.id,
        email: p.email,
        role: p.role,
        status: p.status,
        created_at: p.created_at,
        house: houseData || null,
      };
    });

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length,
    });
  } catch (err: any) {
    console.error('Admin users GET exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Change a user's role (protected by role-change security password, default: 123123)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetUserId, newRole, password } = body;

    if (!targetUserId || !newRole || !password) {
      return NextResponse.json(
        { error: 'Invalid parameters: targetUserId, newRole, and password are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'resident'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or resident' }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Verify caller has admin role
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !caller) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const { data: callerProfile } = (await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()) as { data: { role?: string } | null };

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Prevent active admin from accidentally demoting their own account
    if (caller.id === targetUserId && newRole === 'resident') {
      return NextResponse.json(
        { error: 'നിങ്ങൾക്ക് സ്വന്തം അക്കൗണ്ടിന്റെ അഡ്മിൻ റോൾ നീക്കം ചെയ്യാനാവില്ല (Cannot self-demote)' },
        { status: 400 }
      );
    }

    // 3. Check security password from admin_security_settings table (default: '123123')
    let expectedPassword = '123123';
    try {
      const { data: secRow } = (await (supabase.from('admin_security_settings' as any) as any)
        .select('role_change_password')
        .eq('id', 1)
        .maybeSingle()) as { data: AdminSecurityRow | null };

      if (secRow?.role_change_password) {
        expectedPassword = secRow.role_change_password;
      }
    } catch {
      // Fallback to default
    }

    if (String(password).trim() !== String(expectedPassword).trim()) {
      return NextResponse.json(
        { error: 'തെറ്റായ സുരക്ഷാ പാസ്‌വേഡ്! (Invalid security password)' },
        { status: 403 }
      );
    }

    // 4. Update the profile role
    const { data: updatedProfile, error: updateError } = await (supabase.from('profiles') as any)
      .update({ role: newRole })
      .eq('id', targetUserId)
      .select('id, email, role, status')
      .single();

    if (updateError) {
      console.error('Error updating profile role:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `ഉപയോക്താവിന്റെ റോൾ ${newRole === 'admin' ? 'അഡ്മിനായി' : 'റെസിഡന്റായി'} വിജയകരമായി മാറ്റി.`,
      user: updatedProfile,
    });
  } catch (err: any) {
    console.error('Admin role update exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
