import { NextResponse } from 'next/server';
import { resolveAdminCaller, getRoleChangePassword } from '@/lib/admin-security';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch all registered users/profiles with house details
 */
export async function GET(req: Request) {
  try {
    const { caller, client } = await resolveAdminCaller(req);

    // If caller check fails, check if the client can query profiles or if authorization is required
    if (caller && caller.role && caller.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!client) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }

    // Fetch all profiles with their associated house data
    const { data: profiles, error: profilesError } = await (client.from('profiles') as any)
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
      console.warn('Error fetching users in admin API from Supabase:', profilesError.message);
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
    const { targetUserId, newRole, password, callerId } = body;

    if (!targetUserId || !newRole || !password) {
      return NextResponse.json(
        { error: 'Invalid parameters: targetUserId, newRole, and password are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'resident'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or resident' }, { status: 400 });
    }

    // 1. Resolve and verify admin caller
    const { caller, client, adminClient } = await resolveAdminCaller(req, callerId);

    // If caller could not be authenticated as admin
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required to modify roles' },
        { status: 401 }
      );
    }

    // 2. Prevent active admin from accidentally demoting their own account
    if (caller.id === targetUserId && newRole === 'resident') {
      return NextResponse.json(
        { error: 'നിങ്ങൾക്ക് സ്വന്തം അക്കൗണ്ടിന്റെ അഡ്മിൻ റോൾ നീക്കം ചെയ്യാനാവില്ല (Cannot self-demote)' },
        { status: 400 }
      );
    }

    // 3. Verify security password (default: '123123')
    const activePassword = await getRoleChangePassword(adminClient || client);
    if (String(password).trim() !== String(activePassword).trim()) {
      return NextResponse.json(
        { error: 'തെറ്റായ സുരക്ഷാ പാസ്‌വേഡ്! (Invalid security password)' },
        { status: 403 }
      );
    }

    // 4. Update profile role in database
    const queryClient = adminClient || client;
    let updatedProfile: any = null;

    if (queryClient) {
      const { data, error: updateError } = await (queryClient.from('profiles') as any)
        .update({ role: newRole })
        .eq('id', targetUserId)
        .select('id, email, role, status')
        .maybeSingle();

      if (updateError) {
        console.error('Error updating profile role in database:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      updatedProfile = data;
    }

    return NextResponse.json({
      success: true,
      message: `ഉപയോക്താവിന്റെ റോൾ ${newRole === 'admin' ? 'അഡ്മിനായി' : 'റെസിഡന്റായി'} വിജയകരമായി മാറ്റി.`,
      user: updatedProfile || { id: targetUserId, role: newRole },
    });
  } catch (err: any) {
    console.error('Admin role update exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
