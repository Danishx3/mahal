'use client';

import {
  Division,
  HouseWithDetails,
  PaymentDue,
  FinancialLedger,
  ProfileStatus,
  Profile,
  DIVISION_LABELS,
  FamilyMember,
  PaymentRequestItem,
  PaymentRequestContribution,
  MarriageCertificateApplication,
  MarriageCertificateStatus,
} from './supabase/types';
import { OnboardingInput } from './schemas';
import { createClient, hasSupabaseConfig } from './supabase/client';

export interface FeeHistoryItem {
  amount: number;
  effectiveFromMonth: string; // 'YYYY-MM'
  createdAt: string;
  updatedBy?: string;
  notes?: string;
}

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

export interface DuesSettings {
  defaultAmount: number;
  currentAmount: number;
  scheduledAmount?: number;
  scheduledEffectiveMonth?: string;
  history: FeeHistoryItem[];
  updatedAt: string;
}

function dispatchPush(event: string, payload: any) {
  if (typeof window !== 'undefined') {
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload }),
    }).catch((err) => {
      console.warn(`[Push] Failed to dispatch ${event}:`, err);
    });
  }
}

function calculateDueAmountForMonth(settings: DuesSettings, billingMonth: string): number {
  if (!settings || !Array.isArray(settings.history) || settings.history.length === 0) {
    return settings?.defaultAmount || 100;
  }
  const sorted = [...settings.history].sort((a, b) =>
    b.effectiveFromMonth.localeCompare(a.effectiveFromMonth)
  );
  for (const rule of sorted) {
    if (billingMonth >= rule.effectiveFromMonth) {
      return rule.amount;
    }
  }
  return settings.defaultAmount || 100;
}

// In-memory runtime state (No localStorage for database models; Supabase is single source of truth)
let memoryHouses: HouseWithDetails[] = [];
let memoryLedger: FinancialLedger[] = [];
let memoryProfileUpdates: ProfileUpdateRequest[] = [];

// One-time purge of legacy local database caches (preserves onboarding draft form key: mahallu_onboarding_draft_v1)
if (typeof window !== 'undefined') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('mahallu_houses') ||
          key.startsWith('mahallu_ledger') ||
          key.startsWith('mahallu_auth_session') ||
          key.startsWith('mahallu_demo_role'))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // Non-blocking
  }
}

let syncBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined') {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncBroadcastChannel = new BroadcastChannel('mahallu_sync_channel');
      syncBroadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'mahallu_data_updated') {
          window.dispatchEvent(new CustomEvent('mahallu_data_updated', { detail: event.data }));
        }
      };
    }
  } catch (err) {
    console.warn('Could not initialize BroadcastChannel:', err);
  }

  // Cross-tab storage event listener
  window.addEventListener('storage', (event) => {
    if (event.key === 'mahallu_sync_ping') {
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
    }
  });
}

export function notifyDataUpdated(detail?: any) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('mahallu_data_updated', { detail }));

  try {
    syncBroadcastChannel?.postMessage({
      type: 'mahallu_data_updated',
      timestamp: Date.now(),
      detail,
    });
  } catch {
    // Non-blocking
  }

  try {
    localStorage.setItem('mahallu_sync_ping', String(Date.now()));
  } catch {
    // Non-blocking
  }
}

let supabaseRealtimeActive = false;
export function initSupabaseRealtimeSync() {
  if (typeof window === 'undefined' || supabaseRealtimeActive || !hasSupabaseConfig()) return;
  try {
    const supabase = createClient();
    supabase
      .channel('mahallu_db_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'houses' },
        () => notifyDataUpdated({ source: 'supabase_houses' })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_members' },
        () => notifyDataUpdated({ source: 'supabase_family_members' })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_dues' },
        () => notifyDataUpdated({ source: 'supabase_payment_dues' })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => notifyDataUpdated({ source: 'supabase_profiles' })
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          supabaseRealtimeActive = true;
        }
      });
  } catch (err) {
    console.warn('Supabase realtime init error:', err);
  }
}

const LIVE_CENSUS_CACHE_KEY = 'mahallu_synced_census_cache_v1';

function hydrateMemoryHouses(): HouseWithDetails[] {
  if (memoryHouses.length > 0) return memoryHouses;
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LIVE_CENSUS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryHouses = parsed;
          return memoryHouses;
        }
      }
    } catch {}
  }
  return memoryHouses;
}

if (typeof window !== 'undefined') {
  hydrateMemoryHouses();
  initSupabaseRealtimeSync();
  setTimeout(() => {
    DataService.syncHousesFromSupabase().catch(() => {});
  }, 0);
}

function getStoredHouses(): HouseWithDetails[] {
  if (memoryHouses.length === 0) {
    hydrateMemoryHouses();
  }
  return memoryHouses;
}

function saveStoredHouses(houses: HouseWithDetails[], notify: boolean = true) {
  // Normalize any array profile to single object
  const normalized = houses.map((h) => {
    if (Array.isArray(h.profile)) {
      return { ...h, profile: (h.profile as any)[0] };
    }
    return h;
  });
  memoryHouses = normalized;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LIVE_CENSUS_CACHE_KEY, JSON.stringify(normalized));
    } catch {}
  }
  if (notify) {
    notifyDataUpdated();
  }
}

function getStoredLedger(): FinancialLedger[] {
  return memoryLedger;
}

function saveStoredLedger(ledger: FinancialLedger[]) {
  memoryLedger = ledger;
  notifyDataUpdated();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

export function getMonthsFromDate(startDateStr?: string | null): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 to 11

  let startYear = currentYear;
  let startMonth = currentMonth;

  if (startDateStr) {
    const parsed = new Date(startDateStr);
    if (!isNaN(parsed.getTime())) {
      startYear = parsed.getFullYear();
      startMonth = parsed.getMonth();
    }
  }

  // Safety threshold: don't look back more than 3 years
  const minYear = currentYear - 3;
  if (startYear < minYear) {
    startYear = minYear;
    startMonth = currentMonth;
  }

  // If start is in future, default to current month
  if (startYear > currentYear || (startYear === currentYear && startMonth > currentMonth)) {
    startYear = currentYear;
    startMonth = currentMonth;
  }

  const months: string[] = [];
  let y = startYear;
  let m = startMonth;

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    months.push(monthStr);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }

  // Descending: newest month first ('2026-09', '2026-08', ...)
  return months.reverse();
}

export function getHouseRegistrationMonth(house: { created_at?: string | null; payment_dues?: any[] }): string {
  if (house?.created_at) {
    const parsed = new Date(house.created_at);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
    if (typeof house.created_at === 'string' && house.created_at.length >= 7) {
      return house.created_at.slice(0, 7);
    }
  }
  if (house?.payment_dues && house.payment_dues.length > 0) {
    const months = house.payment_dues.map((d: any) => d.billing_month).filter(Boolean).sort();
    if (months.length > 0) return months[0];
  }
  return '2026-09';
}

// Data operations for Mahallu Management System
export const DataService = {
  // Houses & Population
  getHouses(filter?: {
    division?: Division | 'all';
    search?: string;
    status?: ProfileStatus | 'all';
    memberCount?: string;
  }): HouseWithDetails[] {
    let list = getStoredHouses();

    if (filter?.division && filter.division !== 'all') {
      list = list.filter((h) => h.division === filter.division);
    }

    if (filter?.status && filter.status !== 'all') {
      list = list.filter((h) => {
        const prof = Array.isArray(h.profile) ? (h.profile[0] as any) : h.profile;
        return prof?.status === filter.status;
      });
    }

    if (filter?.memberCount && filter.memberCount !== 'all') {
      const mc = filter.memberCount;
      list = list.filter((h) => {
        const count = h.family_members?.length || 0;
        if (mc === '1-3') return count >= 1 && count <= 3;
        if (mc === '4-6') return count >= 4 && count <= 6;
        if (mc.endsWith('+')) {
          const min = parseInt(mc.replace('+', ''), 10);
          return !isNaN(min) ? count >= min : true;
        }
        if (mc.includes('-')) {
          const [min, max] = mc.split('-').map((v) => parseInt(v, 10));
          return (!isNaN(min) && !isNaN(max)) ? count >= min && count <= max : true;
        }
        const exact = parseInt(mc, 10);
        if (!isNaN(exact)) {
          return count === exact;
        }
        return true;
      });
    }

    if (filter?.search?.trim()) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.house_name.toLowerCase().includes(q) ||
          h.house_number.toLowerCase().includes(q) ||
          h.mahallu_reg_no.toLowerCase().includes(q) ||
          h.phone.includes(q) ||
          h.family_members.some((m) => m.name.toLowerCase().includes(q))
      );
    }

    return list;
  },

  getHouseById(id: string): HouseWithDetails | undefined {
    const h = getStoredHouses().find((h) => h.id === id);
    if (h && Array.isArray(h.profile)) {
      h.profile = (h.profile as any)[0];
    }
    return h;
  },

  getHouseByUserId(userId: string): HouseWithDetails | undefined {
    const h = getStoredHouses().find((h) => h.user_id === userId);
    if (h && Array.isArray(h.profile)) {
      h.profile = (h.profile as any)[0];
    }
    return h;
  },

  async getHouseByUserIdAsync(userId: string): Promise<HouseWithDetails | null> {
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('houses') as any)
          .select('*, profile:profiles(*), family_members(*), payment_dues(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          let prof = Array.isArray(data.profile) ? data.profile[0] : data.profile;
          if (!prof) {
            prof = {
              id: data.user_id,
              email: data.phone || 'resident@mahallu.org',
              role: 'resident',
              status: 'approved',
              created_at: data.created_at,
            };
          }
          const dues = (data.payment_dues || []).sort((a: any, b: any) =>
            b.billing_month.localeCompare(a.billing_month)
          );
          const houseWithDetails: HouseWithDetails = {
            id: data.id,
            user_id: data.user_id,
            house_name: data.house_name,
            house_number: data.house_number,
            mahallu_reg_no: data.mahallu_reg_no,
            division: data.division,
            phone: data.phone,
            created_at: data.created_at,
            profile: prof,
            family_members: data.family_members || [],
            payment_dues: dues,
          };
          this.saveHouseToStorage(houseWithDetails, false);
          return houseWithDetails;
        }
      } catch (err) {
        console.warn('getHouseByUserIdAsync exception:', err);
      }
    }
    return this.getHouseByUserId(userId) || null;
  },

  async getHouseByIdAsync(id: string): Promise<HouseWithDetails | null> {
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('houses') as any)
          .select('*, profile:profiles(*), family_members(*), payment_dues(*)')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          let prof = Array.isArray(data.profile) ? data.profile[0] : data.profile;
          const dues = (data.payment_dues || []).sort((a: any, b: any) =>
            b.billing_month.localeCompare(a.billing_month)
          );
          const houseWithDetails: HouseWithDetails = {
            id: data.id,
            user_id: data.user_id,
            house_name: data.house_name,
            house_number: data.house_number,
            mahallu_reg_no: data.mahallu_reg_no,
            division: data.division,
            phone: data.phone,
            created_at: data.created_at,
            profile: prof,
            family_members: data.family_members || [],
            payment_dues: dues,
          };
          this.saveHouseToStorage(houseWithDetails, false);
          return houseWithDetails;
        }
      } catch (err) {
        console.warn('getHouseByIdAsync exception:', err);
      }
    }
    return this.getHouseById(id) || null;
  },

  async getHousesAsync(filter?: { division?: Division | 'all'; search?: string; status?: ProfileStatus | 'all'; memberCount?: string }): Promise<HouseWithDetails[]> {
    await this.syncHousesFromSupabase();
    return this.getHouses(filter);
  },

  saveHouseToStorage(house: HouseWithDetails, notify: boolean = true): void {
    const houses = getStoredHouses();
    const existingIndex = houses.findIndex((h) => h.id === house.id || h.user_id === house.user_id);
    if (existingIndex >= 0) {
      const existing = houses[existingIndex];
      // Merge dues intelligently: keep any existing submitted / verified status if incoming is still pending
      const mergedDues = [...(house.payment_dues || [])];
      for (const exDue of (existing.payment_dues || [])) {
        const idx = mergedDues.findIndex((d) => d.id === exDue.id || d.billing_month === exDue.billing_month);
        if (idx >= 0) {
          const incomingDue = mergedDues[idx];
          let status = incomingDue.status;
          let transaction_ref = incomingDue.transaction_ref;
          let submitted_at = incomingDue.submitted_at;
          let verified_at = incomingDue.verified_at;
          let verified_by = incomingDue.verified_by;
          let rejection_reason = incomingDue.rejection_reason;

          if (exDue.status === 'verified') {
            status = 'verified';
            verified_at = exDue.verified_at || verified_at;
            verified_by = exDue.verified_by || verified_by;
            transaction_ref = exDue.transaction_ref || transaction_ref;
          } else if (exDue.status === 'under_review') {
            if (incomingDue.status !== 'verified') {
              status = 'under_review';
              transaction_ref = exDue.transaction_ref || transaction_ref;
              submitted_at = exDue.submitted_at || submitted_at;
            }
          } else if (exDue.status === 'failed') {
            if (incomingDue.status === 'verified') {
              status = 'verified';
              verified_at = incomingDue.verified_at || verified_at;
              verified_by = incomingDue.verified_by || verified_by;
            } else if (
              incomingDue.status === 'under_review' &&
              incomingDue.transaction_ref &&
              incomingDue.transaction_ref !== exDue.transaction_ref
            ) {
              // Resident re-submitted with a new transaction reference
              status = 'under_review';
              transaction_ref = incomingDue.transaction_ref;
              submitted_at = incomingDue.submitted_at;
              rejection_reason = null;
            } else {
              status = 'failed';
              rejection_reason = exDue.rejection_reason || rejection_reason;
            }
          }

          if (exDue.transaction_ref && !transaction_ref) {
            transaction_ref = exDue.transaction_ref;
          }

          const realId = isUuid(incomingDue.id) ? incomingDue.id : (isUuid(exDue.id) ? exDue.id : incomingDue.id || exDue.id);

          mergedDues[idx] = {
            ...incomingDue,
            ...exDue,
            id: realId,
            status,
            transaction_ref,
            submitted_at,
            verified_at,
            verified_by,
            rejection_reason,
          };
        } else {
          mergedDues.push(exDue);
        }
      }

      // Sort descending by billing_month so latest month is always top
      mergedDues.sort((a, b) => b.billing_month.localeCompare(a.billing_month));

      // Preserve local profile approval if existing was approved
      let effectiveProfile: Profile | undefined = house.profile || existing.profile;
      if (existing.profile?.status === 'approved') {
        if (effectiveProfile) {
          effectiveProfile = {
            id: effectiveProfile.id || house.user_id,
            email: effectiveProfile.email || 'resident@mahallu.org',
            role: effectiveProfile.role || 'resident',
            status: 'approved',
            created_at: effectiveProfile.created_at || new Date().toISOString(),
          };
        } else {
          effectiveProfile = {
            id: house.user_id,
            email: 'resident@mahallu.org',
            role: 'resident',
            status: 'approved',
            created_at: new Date().toISOString(),
          };
        }
      }

      const updatedHouse: HouseWithDetails = {
        ...existing,
        ...house,
        profile: effectiveProfile,
        payment_dues: mergedDues,
      };

      houses[existingIndex] = updatedHouse;
      saveStoredHouses(houses, notify);
    } else {
      houses.unshift(house);
      saveStoredHouses(houses, notify);
    }
  },

  async checkRegNoAvailable(regNo: string, excludeHouseId?: string): Promise<boolean> {
    const cleanReg = regNo.trim();
    if (!cleanReg) return true;

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        let query = (supabase.from('houses') as any)
          .select('id')
          .ilike('mahallu_reg_no', cleanReg);

        if (excludeHouseId) {
          query = query.neq('id', excludeHouseId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return false;
        }
      } catch (err) {
        console.warn('Supabase reg_no check warning:', err);
      }
    }

    const list = getStoredHouses();
    return !list.some(
      (h) => h.mahallu_reg_no.toLowerCase() === cleanReg.toLowerCase() && h.id !== excludeHouseId
    );
  },

  async createHouse(input: OnboardingInput, userId: string, userEmail?: string): Promise<HouseWithDetails> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // If Supabase is configured, persist to PostgreSQL database tables
    if (hasSupabaseConfig()) {
      const supabase = createClient();

      // 1. Ensure user profile exists in public.profiles table
      try {
        const { data: existingProf } = await (supabase.from('profiles') as any)
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (!existingProf) {
          const { error: profErr } = await (supabase.from('profiles') as any).upsert({
            id: userId,
            email: userEmail || input.members[0]?.phone || 'resident@mahallu.org',
            role: 'resident',
            status: 'pending_verification',
          });
          if (profErr) {
            console.warn('Profile initialization note:', profErr.message);
          }
        }
      } catch (profCheckErr) {
        console.warn('Profile check warning:', profCheckErr);
      }

      // 2. Insert house into public.houses
      const { data: insertedHouse, error: houseErr } = await (supabase.from('houses') as any)
        .insert({
          user_id: userId,
          house_name: input.house.house_name.trim(),
          house_number: input.house.house_number.trim(),
          mahallu_reg_no: input.house.mahallu_reg_no.trim(),
          division: input.house.division,
          phone: input.house.phone.trim(),
        })
        .select()
        .single();

      if (houseErr) {
        console.error('Database house insert error:', houseErr);
        if (houseErr.code === '23505') {
          if (houseErr.message.includes('mahallu_reg_no')) {
            throw new Error(`Mahallu registration number "${input.house.mahallu_reg_no}" is already registered in the database.`);
          }
          if (houseErr.message.includes('user_id')) {
            throw new Error('A household is already registered for this user account in the database.');
          }
        }
        throw new Error(`Database error saving house: ${houseErr.message}`);
      }

      const realHouseId = insertedHouse.id;

      // 3. Insert family members into public.family_members
      const membersToInsert = input.members.map((m) => ({
        house_id: realHouseId,
        name: m.name.trim(),
        is_head_of_family: Boolean(m.is_head_of_family),
        relationship: m.relationship,
        marital_status: m.marital_status,
        job_status: m.job_status,
        general_education: m.general_education,
        religious_education: m.religious_education,
        age: typeof m.age === 'number' ? m.age : null,
        phone: m.phone && m.phone.trim() !== '' ? m.phone.trim() : null,
      }));

      const { data: insertedMembers, error: membersErr } = await (supabase.from('family_members') as any)
        .insert(membersToInsert)
        .select();

      if (membersErr) {
        console.error('Database family members insert error:', membersErr);
        throw new Error(`House registered, but failed to save family members: ${membersErr.message}`);
      }

      // 4. Create monthly payment dues from registered date up to current month
      const houseCreatedAt = insertedHouse.created_at || new Date().toISOString();
      const requiredMonths = getMonthsFromDate(houseCreatedAt);
      let insertedDues: any[] = [];
      try {
        const duesToInsert = requiredMonths.map((m) => ({
          house_id: realHouseId,
          billing_month: m,
          amount: this.getMonthlyDueAmount(m),
          status: 'pending',
        }));
        const { data: duesData } = await (supabase.from('payment_dues') as any)
          .upsert(duesToInsert, { onConflict: 'house_id,billing_month' })
          .select();
        if (duesData && duesData.length > 0) {
          insertedDues = duesData;
        }
      } catch (dueErr) {
        console.warn('Initial dues notice:', dueErr);
      }

      const initialDues: PaymentDue[] = insertedDues.length > 0
        ? insertedDues
        : requiredMonths.map((m) => ({
            id: `due-${realHouseId}-${m}`,
            house_id: realHouseId,
            billing_month: m,
            amount: this.getMonthlyDueAmount(m),
            transaction_ref: null,
            status: 'pending',
            submitted_at: null,
            verified_at: null,
            verified_by: null,
            rejection_reason: null,
          }));

      const newHouse: HouseWithDetails = {
        id: realHouseId,
        user_id: userId,
        house_name: input.house.house_name,
        house_number: input.house.house_number,
        mahallu_reg_no: input.house.mahallu_reg_no,
        division: input.house.division,
        phone: input.house.phone,
        created_at: houseCreatedAt,
        profile: {
          id: userId,
          email: userEmail || input.members[0]?.phone || 'resident@mahallu.org',
          role: 'resident',
          status: 'pending_verification',
          created_at: new Date().toISOString(),
        },
        family_members: (insertedMembers as any[]) || membersToInsert.map((m, idx) => ({ ...m, id: `fm-${idx}` })),
        payment_dues: initialDues,
      };

      const houses = getStoredHouses();
      const filtered = houses.filter((h) => h.user_id !== userId && h.mahallu_reg_no !== input.house.mahallu_reg_no);
      filtered.unshift(newHouse);
      saveStoredHouses(filtered);
      return newHouse;
    }

    // Local fallback if Supabase credentials are not configured
    const houseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const fallbackMonths = getMonthsFromDate(createdAt);
    const newHouse: HouseWithDetails = {
      id: houseId,
      user_id: userId,
      house_name: input.house.house_name,
      house_number: input.house.house_number,
      mahallu_reg_no: input.house.mahallu_reg_no,
      division: input.house.division,
      phone: input.house.phone,
      created_at: createdAt,
      profile: {
        id: userId,
        email: userEmail || input.members[0]?.phone || 'resident@mahallu.org',
        role: 'resident',
        status: 'pending_verification',
        created_at: new Date().toISOString(),
      },
      family_members: input.members.map((m, idx) => ({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `fm-${Date.now()}-${idx}`,
        house_id: houseId,
        name: m.name,
        is_head_of_family: m.is_head_of_family,
        relationship: m.relationship,
        marital_status: m.marital_status,
        job_status: m.job_status,
        general_education: m.general_education,
        religious_education: m.religious_education,
        age: m.age ?? null,
        phone: m.phone || null,
      })),
      payment_dues: fallbackMonths.map((m) => ({
        id: `due-${houseId}-${m}`,
        house_id: houseId,
        billing_month: m,
        amount: this.getMonthlyDueAmount(m),
        transaction_ref: null,
        status: 'pending',
        submitted_at: null,
        verified_at: null,
        verified_by: null,
        rejection_reason: null,
      })),
    };

    const houses = getStoredHouses();
    const filtered = houses.filter((h) => h.user_id !== userId && h.mahallu_reg_no !== input.house.mahallu_reg_no);
    filtered.unshift(newHouse);
    saveStoredHouses(filtered);
    return newHouse;
  },

  async syncHousesFromSupabase(): Promise<HouseWithDetails[]> {
    if (!hasSupabaseConfig()) return getStoredHouses();
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('houses') as any)
        .select('*, family_members(*), payment_dues(*), profile:profiles(*)');

      if (!error && Array.isArray(data) && data.length > 0) {
        const existingHouses = getStoredHouses();
        const mapped: HouseWithDetails[] = data.map((h: any) => {
          let prof = Array.isArray(h.profile) ? h.profile[0] : h.profile;
          const match = existingHouses.find((eh) => eh.id === h.id || eh.user_id === h.user_id);
          if (!prof && h.user_id) {
            prof = match?.profile || {
              id: h.user_id,
              email: 'resident@mahallu.org',
              role: 'resident',
              status: 'pending_verification',
              created_at: h.created_at,
            };
          }
          // Prevent stale Supabase read from reverting a locally approved house
          if (match?.profile?.status === 'approved' && prof?.status === 'pending_verification') {
            prof.status = 'approved';
          }
          // Preserve local dues if already submitted or verified
          const remoteDues = h.payment_dues || [];
          const localDues = match?.payment_dues || [];
          const mergedDues = [...remoteDues];
          for (const lDue of localDues) {
            const idx = mergedDues.findIndex((d) => d.id === lDue.id || d.billing_month === lDue.billing_month);
            if (idx >= 0) {
              const rDue = mergedDues[idx];
              if (
                (lDue.status === 'verified' && rDue.status !== 'verified') ||
                (lDue.status === 'under_review' && rDue.status === 'pending') ||
                (lDue.status === 'failed' && rDue.status !== 'verified') ||
                (lDue.transaction_ref && !rDue.transaction_ref)
              ) {
                mergedDues[idx] = { ...rDue, ...lDue };
              }
            } else {
              mergedDues.push(lDue);
            }
          }

          return {
            id: h.id,
            user_id: h.user_id,
            house_name: h.house_name,
            house_number: h.house_number,
            mahallu_reg_no: h.mahallu_reg_no,
            division: h.division,
            phone: h.phone,
            created_at: h.created_at,
            profile: prof || undefined,
            family_members: h.family_members || [],
            payment_dues: mergedDues,
          };
        });

        // Merge to keep any local houses that haven't synced yet
        const mappedIds = new Set(mapped.map((h) => h.id));
        const merged = [...mapped];
        for (const eh of existingHouses) {
          if (!mappedIds.has(eh.id)) {
            merged.push(eh);
          }
        }

        saveStoredHouses(merged, false);
        return merged;
      }
    } catch (err) {
      console.warn('Supabase sync error:', err);
    }
    return getStoredHouses();
  },

  getPendingProfiles(): HouseWithDetails[] {
    return getStoredHouses().filter((h) => {
      const prof = Array.isArray(h.profile) ? (h.profile[0] as any) : h.profile;
      return prof?.status === 'pending_verification';
    });
  },

  async getPendingProfilesAsync(): Promise<HouseWithDetails[]> {
    await this.syncHousesFromSupabase();
    return this.getPendingProfiles();
  },

  async approveProfile(houseId: string): Promise<boolean> {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId || h.user_id === houseId);
    if (!house) {
      console.warn('approveProfile: house not found for id', houseId);
      return false;
    }

    // Ensure house.profile object is initialized
    if (Array.isArray(house.profile)) {
      house.profile = (house.profile as any)[0];
    }
    if (!house.profile) {
      house.profile = {
        id: house.user_id,
        email: house.phone || 'resident@mahallu.org',
        role: 'resident',
        status: 'pending_verification',
        created_at: house.created_at || new Date().toISOString(),
      };
    }

    // 1. Update local cache immediately
    house.profile.status = 'approved';
    saveStoredHouses(houses);

    // 2. Persist to Supabase database
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('profiles') as any)
          .update({ status: 'approved' })
          .eq('id', house.user_id)
          .select();

        if (error) {
          console.warn('Supabase profile update warning:', error.message);
        } else if (!data || data.length === 0) {
          // If no row updated, try upserting profile in case it wasn't present
          await (supabase.from('profiles') as any).upsert({
            id: house.user_id,
            email: house.profile?.email || 'resident@mahallu.org',
            role: 'resident',
            status: 'approved',
          });
        }
      } catch (err) {
        console.warn('Supabase profile approval exception:', err);
      }
    }

    // Trigger Web Push Notification
    dispatchPush('registration_approved', {
      houseName: house.house_name,
      regNo: house.mahallu_reg_no,
      userId: house.user_id,
      houseId: house.id,
    });

    return true;
  },

  async rejectProfile(houseId: string, reason: string): Promise<boolean> {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId || h.user_id === houseId);
    if (!house) return false;

    if (Array.isArray(house.profile)) {
      house.profile = (house.profile as any)[0];
    }
    if (!house.profile) {
      house.profile = {
        id: house.user_id,
        email: house.phone || 'resident@mahallu.org',
        role: 'resident',
        status: 'pending_verification',
        created_at: house.created_at || new Date().toISOString(),
      };
    }

    house.profile.status = 'rejected';
    saveStoredHouses(houses);

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('profiles') as any)
          .update({ status: 'rejected' })
          .eq('id', house.user_id)
          .select();

        if (error) {
          console.warn('Supabase profile reject warning:', error.message);
        } else if (!data || data.length === 0) {
          await (supabase.from('profiles') as any).upsert({
            id: house.user_id,
            email: house.profile?.email || 'resident@mahallu.org',
            role: 'resident',
            status: 'rejected',
          });
        }
      } catch (err) {
        console.warn('Supabase profile reject exception:', err);
      }
    }

    // Trigger Web Push Notification
    dispatchPush('registration_rejected', {
      houseName: house.house_name,
      reason,
      userId: house.user_id,
      houseId: house.id,
    });

    return true;
  },

  async getProfileUpdatesAsync(): Promise<ProfileUpdateRequest[]> {
    try {
      const res = await fetch('/api/profile-updates', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.updates)) {
          memoryProfileUpdates = data.updates;
          return data.updates;
        }
      }
    } catch (err) {
      console.warn('Error fetching profile updates:', err);
    }
    return memoryProfileUpdates;
  },

  async getPendingProfileUpdatesAsync(): Promise<ProfileUpdateRequest[]> {
    const list = await this.getProfileUpdatesAsync();
    return list.filter((u) => u.status === 'pending');
  },

  async getProfileUpdateForHouseAsync(houseId: string): Promise<ProfileUpdateRequest | null> {
    const list = await this.getProfileUpdatesAsync();
    return list.find((u) => u.house_id === houseId || u.user_id === houseId) || null;
  },

  async submitProfileUpdateRequestAsync(params: {
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
  }): Promise<ProfileUpdateRequest> {
    const res = await fetch('/api/profile-updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to submit profile update request');
    }

    const data = await res.json();
    const updatedRequest = data.update;

    const idx = memoryProfileUpdates.findIndex((u) => u.id === updatedRequest.id);
    if (idx >= 0) {
      memoryProfileUpdates[idx] = updatedRequest;
    } else {
      memoryProfileUpdates.unshift(updatedRequest);
    }

    notifyDataUpdated({ type: 'profile_update_submitted', house_id: params.house_id });

    dispatchPush('profile_update_submitted', {
      houseName: params.requested_details.house_name,
      regNo: params.mahallu_reg_no,
      houseId: params.house_id,
      userId: params.user_id,
    });

    return updatedRequest;
  },

  async approveProfileUpdateAsync(updateId: string, adminId?: string): Promise<boolean> {
    const res = await fetch('/api/profile-updates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_id: updateId, action: 'approve', admin_id: adminId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve update request');
    }

    const data = await res.json();
    const approvedUpdate: ProfileUpdateRequest = data.update;

    const idx = memoryProfileUpdates.findIndex((u) => u.id === updateId);
    if (idx >= 0) memoryProfileUpdates[idx] = approvedUpdate;

    // Apply changes to memory houses cache
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === approvedUpdate.house_id || h.user_id === approvedUpdate.user_id);
    if (house) {
      house.house_name = approvedUpdate.requested_details.house_name;
      house.house_number = approvedUpdate.requested_details.house_number;
      house.phone = approvedUpdate.requested_details.phone;
      house.division = approvedUpdate.requested_details.division;
      if (approvedUpdate.requested_members && Array.isArray(approvedUpdate.requested_members)) {
        house.family_members = approvedUpdate.requested_members;
      }
      saveStoredHouses(houses, false);
    }

    notifyDataUpdated({ type: 'profile_update_approved', updateId });

    dispatchPush('profile_update_reviewed', {
      houseName: approvedUpdate.requested_details.house_name,
      regNo: approvedUpdate.mahallu_reg_no,
      status: 'approved',
      houseId: approvedUpdate.house_id,
      userId: approvedUpdate.user_id,
    });

    return true;
  },

  async rejectProfileUpdateAsync(updateId: string, reason: string, adminId?: string): Promise<boolean> {
    const res = await fetch('/api/profile-updates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_id: updateId, action: 'reject', rejection_reason: reason, admin_id: adminId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reject update request');
    }

    const data = await res.json();
    const rejectedUpdate: ProfileUpdateRequest = data.update;

    const idx = memoryProfileUpdates.findIndex((u) => u.id === updateId);
    if (idx >= 0) memoryProfileUpdates[idx] = rejectedUpdate;

    notifyDataUpdated({ type: 'profile_update_rejected', updateId });

    dispatchPush('profile_update_reviewed', {
      houseName: rejectedUpdate.requested_details?.house_name || 'Household',
      regNo: rejectedUpdate.mahallu_reg_no,
      status: 'rejected',
      reason,
      houseId: rejectedUpdate.house_id,
      userId: rejectedUpdate.user_id,
    });

    return true;
  },

  async cancelProfileUpdateRequestAsync(updateId: string): Promise<boolean> {
    const res = await fetch('/api/profile-updates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_id: updateId, action: 'cancel' }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to cancel update request');
    }

    memoryProfileUpdates = memoryProfileUpdates.filter((u) => u.id !== updateId);

    notifyDataUpdated({ type: 'profile_update_cancelled', updateId });

    return true;
  },

  async blockHouse(houseId: string): Promise<boolean> {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId || h.user_id === houseId);
    if (!house) return false;

    if (Array.isArray(house.profile)) {
      house.profile = (house.profile as any)[0];
    }
    if (!house.profile) {
      house.profile = {
        id: house.user_id,
        email: house.phone || 'resident@mahallu.org',
        role: 'resident',
        status: 'pending_verification',
        created_at: house.created_at || new Date().toISOString(),
      };
    }

    house.profile.status = 'blocked';
    saveStoredHouses(houses);

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('profiles') as any)
          .update({ status: 'blocked' })
          .eq('id', house.user_id)
          .select();

        if (error) {
          console.warn('Supabase block warning:', error.message);
        } else if (!data || data.length === 0) {
          await (supabase.from('profiles') as any).upsert({
            id: house.user_id,
            email: house.profile?.email || 'resident@mahallu.org',
            role: 'resident',
            status: 'blocked',
          });
        }
      } catch (err) {
        console.warn('Supabase block exception:', err);
      }
    }

    return true;
  },

  async unblockHouse(houseId: string): Promise<boolean> {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId || h.user_id === houseId);
    if (!house) return false;

    if (Array.isArray(house.profile)) {
      house.profile = (house.profile as any)[0];
    }
    if (!house.profile) {
      house.profile = {
        id: house.user_id,
        email: house.phone || 'resident@mahallu.org',
        role: 'resident',
        status: 'pending_verification',
        created_at: house.created_at || new Date().toISOString(),
      };
    }

    house.profile.status = 'approved';
    saveStoredHouses(houses);

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('profiles') as any)
          .update({ status: 'approved' })
          .eq('id', house.user_id)
          .select();

        if (error) {
          console.warn('Supabase unblock warning:', error.message);
        } else if (!data || data.length === 0) {
          await (supabase.from('profiles') as any).upsert({
            id: house.user_id,
            email: house.profile?.email || 'resident@mahallu.org',
            role: 'resident',
            status: 'approved',
          });
        }
      } catch (err) {
        console.warn('Supabase unblock exception:', err);
      }
    }

    return true;
  },

  async deleteHouse(houseId: string): Promise<boolean> {
    let houses = getStoredHouses();
    houses = houses.filter((h) => h.id !== houseId && h.user_id !== houseId);
    saveStoredHouses(houses);

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        await (supabase.from('houses') as any).delete().eq('id', houseId);
      } catch (err) {
        console.warn('Supabase delete exception:', err);
      }
    }

    return true;
  },

  // Payment Dues
  ensureDuesForHouseSync(house: HouseWithDetails): HouseWithDetails {
    if (!house) return house;
    const requiredMonths = getMonthsFromDate(house.created_at);
    const existingDues = house.payment_dues || [];
    const updatedDues: PaymentDue[] = [];

    for (const m of requiredMonths) {
      const existing = existingDues.find((d) => d.billing_month === m);
      if (existing) {
        updatedDues.push(existing);
      } else {
        updatedDues.push({
          id: `due-${house.id}-${m}`,
          house_id: house.id,
          billing_month: m,
          amount: this.getMonthlyDueAmount(m),
          transaction_ref: null,
          status: 'pending',
          submitted_at: null,
          verified_at: null,
          verified_by: null,
          rejection_reason: null,
        });
      }
    }

    // Preserve any existing dues not in the generated list
    for (const ex of existingDues) {
      if (!updatedDues.some((d) => d.billing_month === ex.billing_month)) {
        updatedDues.push(ex);
      }
    }

    updatedDues.sort((a, b) => b.billing_month.localeCompare(a.billing_month));
    house.payment_dues = updatedDues;
    if (updatedDues.length !== existingDues.length) {
      this.saveHouseToStorage(house);
    }
    return house;
  },

  async ensureDuesForHouse(house: HouseWithDetails): Promise<HouseWithDetails> {
    if (!house) return house;
    const requiredMonths = getMonthsFromDate(house.created_at);
    const existingDues = house.payment_dues || [];
    const updatedDues: PaymentDue[] = [];
    const newDuesToInsert: PaymentDue[] = [];

    for (const m of requiredMonths) {
      const existing = existingDues.find((d) => d.billing_month === m);
      if (existing) {
        updatedDues.push(existing);
      } else {
        const newDue: PaymentDue = {
          id: `due-${house.id}-${m}`,
          house_id: house.id,
          billing_month: m,
          amount: this.getMonthlyDueAmount(m),
          transaction_ref: null,
          status: 'pending',
          submitted_at: null,
          verified_at: null,
          verified_by: null,
          rejection_reason: null,
        };
        updatedDues.push(newDue);
        newDuesToInsert.push(newDue);
      }
    }

    for (const ex of existingDues) {
      if (!updatedDues.some((d) => d.billing_month === ex.billing_month)) {
        updatedDues.push(ex);
      }
    }

    updatedDues.sort((a, b) => b.billing_month.localeCompare(a.billing_month));
    house.payment_dues = updatedDues;
    if (newDuesToInsert.length > 0) {
      this.saveHouseToStorage(house);
    }

    if (newDuesToInsert.length > 0 && hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data: inserted } = await (supabase.from('payment_dues') as any)
          .upsert(
            newDuesToInsert.map((d) => ({
              house_id: house.id,
              billing_month: d.billing_month,
              amount: this.getMonthlyDueAmount(d.billing_month),
              status: 'pending',
            })),
            { onConflict: 'house_id,billing_month' }
          )
          .select();

        if (inserted && inserted.length > 0) {
          for (const row of inserted) {
            const match = house.payment_dues.find((d) => d.billing_month === row.billing_month);
            if (match) {
              match.id = row.id;
            }
          }
          this.saveHouseToStorage(house);
        }
      } catch (err) {
        console.warn('Supabase bulk dues sync notice:', err);
      }
    }

    return house;
  },

  async ensureHouseInSupabase(house: HouseWithDetails): Promise<HouseWithDetails> {
    if (!hasSupabaseConfig() || !house) return house;
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        return house;
      }
      const authUserId = authUser.id;

      // 1. Ensure profile exists in profiles table for this authenticated user
      try {
        await (supabase.from('profiles') as any).upsert(
          {
            id: authUserId,
            email: authUser.email || house.phone || 'resident@mahallu.org',
            role: 'resident',
            status: house.profile?.status || 'approved',
          },
          { onConflict: 'id' }
        );
      } catch (pErr) {
        // Handled
      }

      // 2. Query Supabase for this user's house
      let existingHouseId: string | null = null;
      const { data: dbHouseByUser } = await (supabase.from('houses') as any)
        .select('id, mahallu_reg_no, user_id')
        .eq('user_id', authUserId)
        .maybeSingle();

      if ((dbHouseByUser as any)?.id) {
        existingHouseId = (dbHouseByUser as any).id;
      } else if (house.mahallu_reg_no) {
        const { data: dbHouseByReg } = await (supabase.from('houses') as any)
          .select('id, mahallu_reg_no, user_id')
          .eq('mahallu_reg_no', house.mahallu_reg_no)
          .maybeSingle();
        if ((dbHouseByReg as any)?.id) {
          existingHouseId = (dbHouseByReg as any).id;
        }
      }

      // 3. If house already exists in Supabase, sync IDs
      if (existingHouseId) {
        house.id = existingHouseId;
        house.user_id = authUserId;
        for (const d of house.payment_dues || []) {
          d.house_id = existingHouseId;
        }
        const houses = getStoredHouses();
        const target = houses.find(
          (h) => h.user_id === authUserId || h.mahallu_reg_no === house.mahallu_reg_no || h.id === house.id
        );
        if (target) {
          target.id = existingHouseId;
          target.user_id = authUserId;
          for (const d of target.payment_dues || []) {
            d.house_id = existingHouseId;
          }
          saveStoredHouses(houses);
        }
        return house;
      }

      // 4. If house does NOT exist in Supabase, insert it now with authUserId
      const validDivisions = ['alungal', 'palam', 'kallam', 'padam', 'angadi'];
      const rawDiv = (house.division || 'alungal').toLowerCase();
      const safeDivision = validDivisions.includes(rawDiv) ? rawDiv : 'alungal';
      const regNo = house.mahallu_reg_no?.trim() || `MHL-${authUserId.slice(0, 6).toUpperCase()}`;

      const { data: insertedH, error: insErr } = await (supabase.from('houses') as any)
        .insert({
          user_id: authUserId,
          house_name: house.house_name || 'Resident House',
          house_number: house.house_number || '1',
          mahallu_reg_no: regNo,
          division: safeDivision,
          phone: house.phone || '9999999999',
          created_at: house.created_at || new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (insertedH?.id) {
        house.id = insertedH.id;
        house.user_id = authUserId;
        for (const d of house.payment_dues || []) {
          d.house_id = insertedH.id;
        }
        const houses = getStoredHouses();
        const target = houses.find(
          (h) => h.user_id === authUserId || h.mahallu_reg_no === house.mahallu_reg_no || h.id === house.id
        );
        if (target) {
          target.id = insertedH.id;
          target.user_id = authUserId;
          for (const d of target.payment_dues || []) {
            d.house_id = insertedH.id;
          }
          saveStoredHouses(houses);
        }
      } else if (insErr) {
        console.warn('[ensureHouseInSupabase] insert notice:', insErr.message);
      }
    } catch (err) {
      console.warn('ensureHouseInSupabase exception:', err);
    }
    return house;
  },

  async submitPayment(
    dueId: string,
    transactionRef: string,
    houseId?: string,
    billingMonth?: string
  ): Promise<boolean> {
    const cleanRef = transactionRef.trim();
    if (!cleanRef) return false;

    const houses = getStoredHouses();
    let targetHouse: HouseWithDetails | undefined;
    let targetDue: PaymentDue | undefined;

    // 1. Locate due within houses
    for (const h of houses) {
      if (houseId && h.id !== houseId && h.user_id !== houseId) continue;
      const due = h.payment_dues.find(
        (d) => d.id === dueId || (billingMonth && d.billing_month === billingMonth) || d.billing_month === dueId
      );
      if (due) {
        targetHouse = h;
        targetDue = due;
        break;
      }
    }

    // Fallback across all houses
    if (!targetDue) {
      for (const h of houses) {
        const due = h.payment_dues.find(
          (d) => d.id === dueId || (billingMonth && d.billing_month === billingMonth) || d.billing_month === dueId
        );
        if (due) {
          targetHouse = h;
          targetDue = due;
          break;
        }
      }
    }

    // Direct Supabase lookup fallback if targetHouse not found in local memory
    if ((!targetHouse || !targetDue) && houseId && hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data: hData } = await (supabase.from('houses') as any)
          .select('*, payment_dues(*)')
          .or(`id.eq.${houseId},user_id.eq.${houseId}`)
          .maybeSingle();

        if (hData) {
          if (!targetHouse) {
            targetHouse = {
              id: hData.id,
              user_id: hData.user_id,
              house_name: hData.house_name,
              house_number: hData.house_number,
              mahallu_reg_no: hData.mahallu_reg_no,
              division: hData.division,
              phone: hData.phone,
              created_at: hData.created_at,
              profile: undefined,
              family_members: [],
              payment_dues: hData.payment_dues || [],
            };
          }
          if (!targetDue && Array.isArray(hData.payment_dues)) {
            targetDue = hData.payment_dues.find(
              (d: any) => d.id === dueId || (billingMonth && d.billing_month === billingMonth) || d.billing_month === dueId
            );
          }
        }
      } catch (err) {
        console.warn('[submitPayment] Supabase house fetch exception:', err);
      }
    }

    if (!targetHouse) {
      console.warn('submitPayment: could not locate house', { dueId, houseId, billingMonth });
      return false;
    }

    const submittedAt = new Date().toISOString();

    if (!targetDue && billingMonth) {
      const createdDue: PaymentDue = {
        id: dueId || `due-${Date.now()}`,
        house_id: targetHouse.id,
        billing_month: billingMonth,
        amount: this.getMonthlyDueAmount(billingMonth),
        transaction_ref: cleanRef,
        status: 'under_review',
        submitted_at: submittedAt,
        verified_at: null,
        verified_by: null,
        rejection_reason: null,
      };
      targetHouse.payment_dues.push(createdDue);
      targetDue = createdDue;
    }

    if (!targetDue) {
      console.warn('submitPayment: could not locate due', { dueId, houseId, billingMonth });
      return false;
    }

    targetDue.transaction_ref = cleanRef;
    targetDue.status = 'under_review';
    targetDue.submitted_at = submittedAt;
    targetDue.rejection_reason = null;

    saveStoredHouses(houses);

    if (hasSupabaseConfig()) {
      try {
        const ensuredHouse = await this.ensureHouseInSupabase(targetHouse);
        const realHouseId = ensuredHouse.id;

        // If the house is not a valid Supabase UUID, do not call Supabase to avoid RLS error
        if (!isUuid(realHouseId)) {
          return true;
        }

        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          return true;
        }

        // 1. Direct update by house_id and billing_month (or by UUID if valid)
        let query = (supabase.from('payment_dues') as any)
          .update({
            transaction_ref: cleanRef,
            status: 'under_review',
            submitted_at: submittedAt,
            rejection_reason: null,
          });

        if (isUuid(targetDue.id)) {
          query = query.eq('id', targetDue.id);
        } else {
          query = query.match({
            house_id: realHouseId,
            billing_month: targetDue.billing_month,
          });
        }

        const { data: updated, error: updateErr } = await query.select();

        // 2. If no row was updated in Supabase, insert it
        if (!updated || updated.length === 0) {
          const { data: inserted, error: insertErr } = await (supabase.from('payment_dues') as any)
            .insert({
              house_id: realHouseId,
              billing_month: targetDue.billing_month,
              amount: targetDue.amount || 100,
              transaction_ref: cleanRef,
              status: 'under_review',
              submitted_at: submittedAt,
            })
            .select();

          if (insertErr) {
            console.warn('[submitPayment] Supabase insert notice:', insertErr.message);
          } else if (inserted && inserted.length > 0) {
            targetDue.id = inserted[0].id;
            targetDue.house_id = realHouseId;
            saveStoredHouses(houses);
          }
        } else if (updated && updated.length > 0) {
          targetDue.id = updated[0].id;
          targetDue.house_id = realHouseId;
          saveStoredHouses(houses);
        }
      } catch (err) {
        console.warn('Supabase submitPayment sync exception:', err);
      }
    }

    // Trigger Web Push Notification
    dispatchPush('payment_submitted', {
      houseName: targetHouse.house_name,
      regNo: targetHouse.mahallu_reg_no,
      amount: targetDue.amount || 100,
      title: `Monthly Dues (${targetDue.billing_month})`,
      utr: cleanRef,
      houseId: targetHouse.id,
      userId: targetHouse.user_id,
    });

    return true;
  },

  async syncLocalSubmissionsToSupabase(house: HouseWithDetails): Promise<void> {
    // Local storage setup removed; Supabase is the single source of truth
    return;
  },

  createDueForCurrentMonth(
    houseId: string,
    month: string = new Date().toISOString().slice(0, 7),
    fallbackHouse?: HouseWithDetails
  ): PaymentDue {
    const houses = getStoredHouses();
    let house = houses.find((h) => h.id === houseId || h.user_id === houseId);
    if (!house && fallbackHouse) {
      this.saveHouseToStorage(fallbackHouse);
      house = fallbackHouse;
    }
    if (!house) {
      return {
        id: `due-${Date.now()}`,
        house_id: houseId,
        billing_month: month,
        amount: this.getMonthlyDueAmount(month),
        transaction_ref: null,
        status: 'pending',
        submitted_at: null,
        verified_at: null,
        verified_by: null,
        rejection_reason: null,
      };
    }

    let due = house.payment_dues.find((d) => d.billing_month === month);
    if (!due) {
      due = {
        id: `due-${Date.now()}`,
        house_id: houseId,
        billing_month: month,
        amount: this.getMonthlyDueAmount(month),
        transaction_ref: null,
        status: 'pending',
        submitted_at: null,
        verified_at: null,
        verified_by: null,
        rejection_reason: null,
      };
      house.payment_dues.push(due);
      saveStoredHouses(houses);

      try {
        const supabase = createClient();
        (supabase.from('payment_dues') as any).insert({
          house_id: houseId,
          billing_month: month,
          amount: this.getMonthlyDueAmount(month),
          status: 'pending',
        });
      } catch {
        // Handled
      }
    }
    return due;
  },

  getPaymentsUnderReview(): { due: PaymentDue; house: HouseWithDetails }[] {
    const houses = getStoredHouses();
    const list: { due: PaymentDue; house: HouseWithDetails }[] = [];

    for (const h of houses) {
      for (const d of h.payment_dues) {
        if (d.status === 'under_review') {
          list.push({ due: d, house: h });
        }
      }
    }
    return list;
  },

  async getPaymentsUnderReviewAsync(): Promise<{ due: PaymentDue; house: HouseWithDetails }[]> {
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('payment_dues') as any)
          .select('*, house:houses(*, profile:profiles(*), family_members(*))')
          .eq('status', 'under_review')
          .order('submitted_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const list: { due: PaymentDue; house: HouseWithDetails }[] = [];
          for (const row of data) {
            if (row.house) {
              const h = row.house;
              const prof = Array.isArray(h.profile) ? h.profile[0] : h.profile;
              const houseWithDetails: HouseWithDetails = {
                id: h.id,
                user_id: h.user_id,
                house_name: h.house_name,
                house_number: h.house_number,
                mahallu_reg_no: h.mahallu_reg_no,
                division: h.division,
                phone: h.phone,
                created_at: h.created_at,
                profile: prof,
                family_members: h.family_members || [],
                payment_dues: [],
              };
              const due: PaymentDue = {
                id: row.id,
                house_id: row.house_id,
                billing_month: row.billing_month,
                amount: row.amount,
                transaction_ref: row.transaction_ref,
                status: row.status,
                submitted_at: row.submitted_at,
                verified_at: row.verified_at,
                verified_by: row.verified_by,
                rejection_reason: row.rejection_reason,
              };
              list.push({ due, house: houseWithDetails });
            }
          }
          return list;
        }
      } catch (err) {
        console.warn('Sync error in getPaymentsUnderReviewAsync:', err);
      }
    }
    return this.getPaymentsUnderReview();
  },

  async verifyPayment(dueId: string, adminId: string = 'admin'): Promise<boolean> {
    const verifiedByUuid = isUuid(adminId) ? adminId : null;

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();

        if (isUuid(adminId)) {
          try {
            await (supabase.from('profiles') as any).update({ role: 'admin' }).eq('id', adminId);
          } catch {
            // Non-blocking
          }
        }

        let updateQuery = (supabase.from('payment_dues') as any).update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: verifiedByUuid,
          rejection_reason: null,
        });

        if (isUuid(dueId)) {
          updateQuery = updateQuery.eq('id', dueId);
        } else {
          let matchedDue: PaymentDue | undefined;
          for (const h of memoryHouses) {
            const d = h.payment_dues.find((d) => d.id === dueId || d.billing_month === dueId);
            if (d) {
              matchedDue = d;
              break;
            }
          }
          if (matchedDue && isUuid(matchedDue.id)) {
            updateQuery = updateQuery.eq('id', matchedDue.id);
          } else if (matchedDue && isUuid(matchedDue.house_id)) {
            updateQuery = updateQuery.match({
              house_id: matchedDue.house_id,
              billing_month: matchedDue.billing_month,
            });
          } else {
            updateQuery = updateQuery.match({ id: dueId });
          }
        }

        const { data, error } = await updateQuery.select('*, house:houses(*, family_members(*))');
        let targetHouseName = '';
        let targetRegNo = '';
        let targetAmount = 100;
        let targetTitle = 'Monthly Dues';
        let targetHouseId: string | undefined;
        let targetUserId: string | undefined;

        if (!error && data && data.length > 0) {
          const row = data[0];
          if (row.house) {
            targetHouseName = row.house.house_name || '';
            targetRegNo = row.house.mahallu_reg_no || '';
            targetHouseId = row.house.id || row.house_id;
            targetUserId = row.house.user_id;
          }
          if (row.amount) targetAmount = Number(row.amount);
          if (row.billing_month) targetTitle = `Monthly Dues (${row.billing_month})`;

          const head = row.house?.family_members?.find((m: any) => m.is_head_of_family) || row.house?.family_members?.[0];
          const headName = head?.name || '';
          // Check if database trigger on_payment_verified already posted the credit
          if (isUuid(row.id)) {
            const { data: existingLedger } = await (supabase.from('financial_ledger') as any)
              .select('id')
              .eq('payment_due_id', row.id)
              .limit(1);

            if (!existingLedger || existingLedger.length === 0) {
              await (supabase.from('financial_ledger') as any).insert({
                type: 'credit',
                category: 'House Monthly Due',
                amount: row.amount || 100,
                description: `Monthly Dues - Month: ${row.billing_month} | House: ${row.house?.mahallu_reg_no || 'N/A'}${row.house?.house_name ? ` - ${row.house.house_name}` : ''}${headName ? ` | Head: ${headName}` : ''} | Ref: ${row.transaction_ref || 'N/A'}`,
                payment_due_id: row.id,
                created_by: verifiedByUuid,
              });
            }
          }
        }

        // Update in-memory state if available
        for (const h of memoryHouses) {
          const due = h.payment_dues.find((d) => d.id === dueId || d.billing_month === dueId);
          if (due) {
            due.status = 'verified';
            due.verified_at = new Date().toISOString();
            due.verified_by = adminId;
            due.rejection_reason = null;
            if (!targetHouseName) targetHouseName = h.house_name;
            if (!targetRegNo) targetRegNo = h.mahallu_reg_no;
            if (!targetHouseId) targetHouseId = h.id;
            if (!targetUserId) targetUserId = h.user_id;
            if (due.amount) targetAmount = due.amount;
            if (due.billing_month) targetTitle = `Monthly Dues (${due.billing_month})`;
            break;
          }
        }

        if (targetHouseId || targetUserId) {
          dispatchPush('payment_verified', {
            houseName: targetHouseName || 'Household',
            regNo: targetRegNo || '',
            amount: targetAmount,
            title: targetTitle,
            houseId: targetHouseId,
            userId: targetUserId,
          });
        }
      } catch (err) {
        console.warn('Supabase verifyPayment sync error:', err);
      }
    } else {
      // In-memory runtime fallback
      let verifiedHouse: HouseWithDetails | undefined;
      let verifiedDue: PaymentDue | undefined;
      for (const h of memoryHouses) {
        const due = h.payment_dues.find((d) => d.id === dueId || d.billing_month === dueId);
        if (due) {
          due.status = 'verified';
          due.verified_at = new Date().toISOString();
          due.verified_by = adminId;
          due.rejection_reason = null;
          verifiedHouse = h;
          verifiedDue = due;
          break;
        }
      }

      if (verifiedHouse && verifiedDue) {
        dispatchPush('payment_verified', {
          houseName: verifiedHouse.house_name,
          regNo: verifiedHouse.mahallu_reg_no,
          amount: verifiedDue.amount,
          title: `Monthly Dues (${verifiedDue.billing_month})`,
          houseId: verifiedHouse.id,
          userId: verifiedHouse.user_id,
        });
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mahallu_data_updated'));
    }

    return true;
  },

  async rejectPayment(dueId: string, reason: string, adminId?: string): Promise<boolean> {
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();

        // Ensure caller admin profile has role 'admin' in Supabase to pass RLS
        if (isUuid(adminId)) {
          try {
            await (supabase.from('profiles') as any).update({ role: 'admin' }).eq('id', adminId);
          } catch {
            // Non-blocking
          }
        }

        let updateQuery = (supabase.from('payment_dues') as any).update({
          status: 'failed',
          rejection_reason: reason,
        });

        if (isUuid(dueId)) {
          updateQuery = updateQuery.eq('id', dueId);
        } else {
          let matchedDue: PaymentDue | undefined;
          for (const h of memoryHouses) {
            const d = h.payment_dues.find((d) => d.id === dueId || d.billing_month === dueId);
            if (d) {
              matchedDue = d;
              break;
            }
          }
          if (matchedDue && isUuid(matchedDue.id)) {
            updateQuery = updateQuery.eq('id', matchedDue.id);
          } else if (matchedDue && isUuid(matchedDue.house_id)) {
            updateQuery = updateQuery.match({
              house_id: matchedDue.house_id,
              billing_month: matchedDue.billing_month,
            });
          } else {
            updateQuery = updateQuery.match({ id: dueId });
          }
        }

        const { data, error } = await updateQuery.select('*, house:houses(*)');
        let targetHouseName = '';
        let targetRegNo = '';
        let targetAmount = 100;
        let targetTitle = 'Monthly Dues';
        let targetHouseId: string | undefined;
        let targetUserId: string | undefined;

        if (!error && data && data.length > 0) {
          const row = data[0];
          if (row.house) {
            targetHouseName = row.house.house_name || '';
            targetRegNo = row.house.mahallu_reg_no || '';
            targetHouseId = row.house.id || row.house_id;
            targetUserId = row.house.user_id;
          }
          if (row.amount) targetAmount = Number(row.amount);
          if (row.billing_month) targetTitle = `Monthly Dues (${row.billing_month})`;
        } else if (error) {
          console.warn('[rejectPayment] Supabase update warning:', error.message);
        }

        // Update in-memory runtime cache
        for (const h of memoryHouses) {
          const due = h.payment_dues.find((d) => d.id === dueId || d.billing_month === dueId);
          if (due) {
            due.status = 'failed';
            due.rejection_reason = reason;
            if (!targetHouseName) targetHouseName = h.house_name;
            if (!targetRegNo) targetRegNo = h.mahallu_reg_no;
            if (!targetHouseId) targetHouseId = h.id;
            if (!targetUserId) targetUserId = h.user_id;
            if (due.amount) targetAmount = due.amount;
            if (due.billing_month) targetTitle = `Monthly Dues (${due.billing_month})`;
            break;
          }
        }

        if (targetHouseId || targetUserId) {
          dispatchPush('payment_rejected', {
            houseName: targetHouseName || 'Household',
            regNo: targetRegNo || '',
            amount: targetAmount,
            title: targetTitle,
            reason,
            houseId: targetHouseId,
            userId: targetUserId,
          });
        }
      } catch (err) {
        console.warn('Supabase rejectPayment sync exception:', err);
      }
    } else {
      // In-memory runtime fallback
      let rejectedHouse: HouseWithDetails | undefined;
      let rejectedDue: PaymentDue | undefined;
      for (const h of memoryHouses) {
        const due = h.payment_dues.find((d) => d.id === dueId || d.billing_month === dueId);
        if (due) {
          due.status = 'failed';
          due.rejection_reason = reason;
          rejectedHouse = h;
          rejectedDue = due;
          break;
        }
      }

      if (rejectedHouse && rejectedDue) {
        dispatchPush('payment_rejected', {
          houseName: rejectedHouse.house_name,
          regNo: rejectedHouse.mahallu_reg_no,
          amount: rejectedDue.amount,
          title: `Monthly Dues (${rejectedDue.billing_month})`,
          reason,
          houseId: rejectedHouse.id,
          userId: rejectedHouse.user_id,
        });
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mahallu_data_updated'));
    }

    return true;
  },

  getHouseDues(
    month: string = '2026-09',
    division?: Division | 'all',
    status?: 'all' | 'unpaid' | 'under_review' | 'verified' | 'defaulters'
  ): { house: HouseWithDetails; due: PaymentDue | null }[] {
    const houses = getStoredHouses().filter((h) => h.profile?.status === 'approved');
    const result: { house: HouseWithDetails; due: PaymentDue | null }[] = [];

    for (const h of houses) {
      if (division && division !== 'all' && h.division !== division) {
        continue;
      }

      // Dues only start from the house's registered date/month onwards
      const regMonth = getHouseRegistrationMonth(h);
      if (month < regMonth) {
        continue;
      }

      const due = h.payment_dues.find((d) => d.billing_month === month) || null;
      const isVerified = due?.status === 'verified';
      const isUnderReview = due?.status === 'under_review';
      const isUnpaid = !due || due.status === 'pending' || due.status === 'failed';

      let match = true;
      if (status === 'unpaid') {
        match = isUnpaid;
      } else if (status === 'under_review') {
        match = isUnderReview;
      } else if (status === 'verified') {
        match = isVerified;
      } else if (status === 'defaulters') {
        match = !isVerified;
      }

      if (match) {
        result.push({ house: h, due });
      }
    }
    return result;
  },

  async getHouseDuesAsync(
    month: string = '2026-09',
    division?: Division | 'all',
    status?: 'all' | 'unpaid' | 'under_review' | 'verified' | 'defaulters'
  ): Promise<{ house: HouseWithDetails; due: PaymentDue | null }[]> {
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        let query = (supabase.from('houses') as any)
          .select('*, profile:profiles(*), family_members(*), payment_dues(*)');

        if (division && division !== 'all') {
          query = query.eq('division', division);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          const result: { house: HouseWithDetails; due: PaymentDue | null }[] = [];
          for (const h of data) {
            const prof = Array.isArray(h.profile) ? h.profile[0] : h.profile;
            if (prof?.status !== 'approved') continue;

            const houseWithDetails: HouseWithDetails = {
              id: h.id,
              user_id: h.user_id,
              house_name: h.house_name,
              house_number: h.house_number,
              mahallu_reg_no: h.mahallu_reg_no,
              division: h.division,
              phone: h.phone,
              created_at: h.created_at,
              profile: prof,
              family_members: h.family_members || [],
              payment_dues: h.payment_dues || [],
            };

            // Dues only start from the house's registered date/month onwards
            const regMonth = getHouseRegistrationMonth(houseWithDetails);
            if (month < regMonth) {
              continue;
            }

            const due = (h.payment_dues || []).find((d: any) => d.billing_month === month) || null;
            const isVerified = due?.status === 'verified';
            const isUnderReview = due?.status === 'under_review';
            const isUnpaid = !due || due.status === 'pending' || due.status === 'failed';

            let match = true;
            if (status === 'unpaid') {
              match = isUnpaid;
            } else if (status === 'under_review') {
              match = isUnderReview;
            } else if (status === 'verified') {
              match = isVerified;
            } else if (status === 'defaulters') {
              match = !isVerified;
            }

            if (match) {
              result.push({ house: houseWithDetails, due });
            }
          }
          return result;
        }
      } catch (err) {
        console.warn('getHouseDuesAsync error:', err);
      }
    }
    return this.getHouseDues(month, division, status);
  },

  getDefaulters(month: string = '2026-09', division?: Division | 'all'): { house: HouseWithDetails; due: PaymentDue | null }[] {
    return this.getHouseDues(month, division, 'defaulters');
  },

  async getDefaultersAsync(
    month: string = '2026-09',
    division?: Division | 'all'
  ): Promise<{ house: HouseWithDetails; due: PaymentDue | null }[]> {
    return this.getHouseDuesAsync(month, division, 'defaulters');
  },

  async markHouseDueAsPaidAsync(
    houseId: string,
    month: string,
    adminId: string = 'admin',
    paymentMethod: string = 'Cash / Offline'
  ): Promise<boolean> {
    const verifiedByUuid = isUuid(adminId) ? adminId : null;
    const now = new Date().toISOString();
    let resolvedDueId: string | null = null;
    let houseRegNo = '';
    let houseName = '';
    let houseHeadName = '';

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        if (isUuid(adminId)) {
          try {
            await (supabase.from('profiles') as any).update({ role: 'admin' }).eq('id', adminId);
          } catch {}
        }

        const { data: houseRow } = await (supabase.from('houses') as any)
          .select('id, house_name, mahallu_reg_no, family_members(*)')
          .eq('id', houseId)
          .maybeSingle();

        if (houseRow) {
          houseRegNo = houseRow.mahallu_reg_no || '';
          houseName = houseRow.house_name || '';
          const head = houseRow.family_members?.find((m: any) => m.is_head_of_family) || houseRow.family_members?.[0];
          if (head?.name) houseHeadName = head.name;
        }

        const { data: existingDues } = await (supabase.from('payment_dues') as any)
          .select('*')
          .eq('house_id', houseId)
          .eq('billing_month', month)
          .limit(1);

        if (existingDues && existingDues.length > 0) {
          const due = existingDues[0];
          resolvedDueId = due.id;
          await (supabase.from('payment_dues') as any)
            .update({
              status: 'verified',
              verified_at: now,
              verified_by: verifiedByUuid,
              rejection_reason: null,
              transaction_ref: due.transaction_ref || `OFFLINE-${Date.now().toString().slice(-6)}`,
            })
            .eq('id', due.id);
        } else {
          const transRef = `OFFLINE-${Date.now().toString().slice(-6)}`;
          const dueAmt = this.getMonthlyDueAmount(month);
          const { data: newDue, error: insertErr } = await (supabase.from('payment_dues') as any)
            .insert({
              house_id: houseId,
              billing_month: month,
              amount: dueAmt,
              status: 'verified',
              transaction_ref: transRef,
              submitted_at: now,
              verified_at: now,
              verified_by: verifiedByUuid,
            })
            .select()
            .single();

          if (!insertErr && newDue) {
            resolvedDueId = newDue.id;
          }
        }

        if (resolvedDueId && isUuid(resolvedDueId)) {
          const { data: existingLedger } = await (supabase.from('financial_ledger') as any)
            .select('id')
            .eq('payment_due_id', resolvedDueId)
            .limit(1);

          if (!existingLedger || existingLedger.length === 0) {
            const dueAmt = (existingDues && existingDues[0]?.amount) || this.getMonthlyDueAmount(month);
            await (supabase.from('financial_ledger') as any).insert({
              type: 'credit',
              category: 'House Monthly Due',
              amount: dueAmt,
              description: `Monthly Dues (${paymentMethod}) - Month: ${month} | House: ${houseRegNo || 'N/A'}${houseName ? ` - ${houseName}` : ''}${houseHeadName ? ` | Head: ${houseHeadName}` : ''}`,
              payment_due_id: resolvedDueId,
              created_by: verifiedByUuid,
            });
          }
        }
      } catch (err) {
        console.warn('Supabase markHouseDueAsPaidAsync sync error:', err);
      }
    }

    // In-memory runtime cache update
    for (const h of memoryHouses) {
      if (h.id === houseId) {
        if (!houseRegNo) houseRegNo = h.mahallu_reg_no;
        if (!houseName) houseName = h.house_name;
        if (!houseHeadName) {
          const head = h.family_members?.find((m) => m.is_head_of_family) || h.family_members?.[0];
          if (head?.name) houseHeadName = head.name;
        }

        let due = h.payment_dues.find((d) => d.billing_month === month);
        if (due) {
          due.status = 'verified';
          due.verified_at = now;
          due.verified_by = adminId;
          due.rejection_reason = null;
          if (!due.transaction_ref) {
            due.transaction_ref = `OFFLINE-${Date.now().toString().slice(-6)}`;
          }
          resolvedDueId = due.id;
        } else {
          const newDueId = resolvedDueId || `due-${Date.now()}`;
          const dueAmt = this.getMonthlyDueAmount(month);
          due = {
            id: newDueId,
            house_id: houseId,
            billing_month: month,
            amount: dueAmt,
            transaction_ref: `OFFLINE-${Date.now().toString().slice(-6)}`,
            status: 'verified',
            submitted_at: now,
            verified_at: now,
            verified_by: adminId,
            rejection_reason: null,
          };
          h.payment_dues.push(due);
          resolvedDueId = newDueId;
        }
        break;
      }
    }

    const ledger = getStoredLedger();
    const alreadyInLedger = resolvedDueId && ledger.some((l) => l.payment_due_id === resolvedDueId);
    if (!alreadyInLedger) {
      let resolvedAmount = this.getMonthlyDueAmount(month);
      for (const h of memoryHouses) {
        const d = h.payment_dues.find((p) => p.id === resolvedDueId || p.billing_month === month);
        if (d && d.amount) {
          resolvedAmount = d.amount;
          break;
        }
      }
      const newEntry: FinancialLedger = {
        id: `fl-${Date.now()}`,
        type: 'credit',
        category: 'House Monthly Due',
        amount: resolvedAmount,
        description: `Monthly Dues (${paymentMethod}) - Month: ${month} | House: ${houseRegNo || 'N/A'}${houseName ? ` - ${houseName}` : ''}${houseHeadName ? ` | Head: ${houseHeadName}` : ''}`,
        payment_due_id: resolvedDueId || null,
        created_by: adminId,
        created_at: now,
      };
      ledger.unshift(newEntry);
      saveStoredLedger(ledger);
      memoryLedger = ledger;
    }

    // Dispatch Web Push Notification to Resident
    dispatchPush('payment_verified', {
      houseName: houseName || 'Household',
      regNo: houseRegNo || '',
      amount: this.getMonthlyDueAmount(month),
      title: `Monthly Dues (${month})`,
      houseId,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mahallu_data_updated'));
    }

    return true;
  },

  // Helper to deduplicate ledger records
  deduplicateLedgerEntries(entries: FinancialLedger[]): {
    clean: FinancialLedger[];
    duplicateIds: string[];
  } {
    const seenDueIds = new Set<string>();
    const seenManualKeys = new Set<string>();
    const clean: FinancialLedger[] = [];
    const duplicateIds: string[] = [];

    for (const row of entries) {
      if (row.payment_due_id) {
        if (seenDueIds.has(row.payment_due_id)) {
          if (row.id) duplicateIds.push(row.id);
          continue;
        }
        seenDueIds.add(row.payment_due_id);
      } else {
        // For manual entries without payment_due_id, deduplicate exact duplicates created within the same minute
        const timeMinute = row.created_at ? new Date(row.created_at).toISOString().slice(0, 16) : '';
        const key = `${row.type}_${row.category}_${row.amount}_${row.description}_${timeMinute}`;
        if (seenManualKeys.has(key)) {
          if (row.id) duplicateIds.push(row.id);
          continue;
        }
        seenManualKeys.add(key);
      }
      clean.push(row);
    }
    return { clean, duplicateIds };
  },

  // Financial Ledger
  getLedger(): FinancialLedger[] {
    return this.deduplicateLedgerEntries(getStoredLedger()).clean;
  },

  async getLedgerAsync(): Promise<FinancialLedger[]> {
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('financial_ledger') as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const { clean, duplicateIds } = this.deduplicateLedgerEntries(data);

          // Purge duplicate rows from Supabase database so future queries are clean
          if (duplicateIds.length > 0) {
            (supabase.from('financial_ledger') as any)
              .delete()
              .in('id', duplicateIds)
              .then(() => {
                console.info(`Purged ${duplicateIds.length} duplicate ledger records from Supabase.`);
              })
              .catch((delErr: any) => {
                console.warn('Failed to purge duplicate ledger entries from Supabase:', delErr);
              });
          }

          memoryLedger = clean;
          return clean;
        }
      } catch (err) {
        console.warn('getLedgerAsync error:', err);
      }
    }
    return this.getLedger();
  },

  async addLedgerEntryAsync(entry: {
    type: 'credit' | 'debit';
    category: string;
    amount: number;
    description: string;
  }): Promise<FinancialLedger> {
    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from('financial_ledger') as any)
          .insert({
            type: entry.type,
            category: entry.category,
            amount: entry.amount,
            description: entry.description,
          })
          .select()
          .single();

        if (!error && data) {
          memoryLedger.unshift(data);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('mahallu_data_updated'));
          }
          return data;
        }
      } catch (err) {
        console.warn('Supabase addLedgerEntryAsync error:', err);
      }
    }

    const newEntry: FinancialLedger = {
      id: `fl-${Date.now()}`,
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      description: entry.description,
      payment_due_id: null,
      created_by: 'admin',
      created_at: new Date().toISOString(),
    };
    memoryLedger.unshift(newEntry);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mahallu_data_updated'));
    }

    return newEntry;
  },

  addLedgerEntry(entry: {
    type: 'credit' | 'debit';
    category: string;
    amount: number;
    description: string;
  }): FinancialLedger {
    this.addLedgerEntryAsync(entry);
    const newEntry: FinancialLedger = {
      id: `fl-${Date.now()}`,
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      description: entry.description,
      payment_due_id: null,
      created_by: 'admin',
      created_at: new Date().toISOString(),
    };
    return newEntry;
  },

  async deleteLedgerEntryAsync(entryId: string, revertDue: boolean = true): Promise<boolean> {
    let targetEntry = memoryLedger.find((item) => item.id === entryId);
    if (!targetEntry) {
      targetEntry = getStoredLedger().find((item) => item.id === entryId);
    }

    const paymentDueId = targetEntry?.payment_due_id;

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient();
        const { error: delError } = await (supabase.from('financial_ledger') as any)
          .delete()
          .eq('id', entryId);

        if (delError) {
          console.warn('Supabase deleteLedgerEntry error:', delError);
        }

        if (revertDue && paymentDueId && isUuid(paymentDueId)) {
          await (supabase.from('payment_dues') as any)
            .update({
              status: 'pending',
              verified_at: null,
              verified_by: null,
            })
            .eq('id', paymentDueId);
        }
      } catch (err) {
        console.warn('deleteLedgerEntryAsync exception:', err);
      }
    }

    // In-memory removal from ledger
    memoryLedger = memoryLedger.filter((item) => item.id !== entryId);
    saveStoredLedger(memoryLedger);

    // Revert due if linked by payment_due_id or via description match
    if (revertDue) {
      let reverted = false;
      if (paymentDueId) {
        for (const h of memoryHouses) {
          const d = h.payment_dues.find((due) => due.id === paymentDueId || due.billing_month === paymentDueId);
          if (d) {
            d.status = 'pending';
            d.verified_at = null;
            d.verified_by = null;
            reverted = true;
            break;
          }
        }
      }

      if (!reverted && targetEntry?.category === 'House Monthly Due' && targetEntry?.description) {
        const monthMatch = targetEntry.description.match(/Month:\s*([0-9]{4}-[0-9]{2})/);
        const houseMatch = targetEntry.description.match(/House:\s*([A-Za-z0-9-]+)/);
        if (monthMatch && houseMatch) {
          const bMonth = monthMatch[1];
          const hReg = houseMatch[1];
          for (const h of memoryHouses) {
            if (h.mahallu_reg_no === hReg) {
              const d = h.payment_dues.find((due) => due.billing_month === bMonth);
              if (d) {
                d.status = 'pending';
                d.verified_at = null;
                d.verified_by = null;
                if (hasSupabaseConfig() && isUuid(d.id)) {
                  try {
                    const supabase = createClient();
                    (supabase.from('payment_dues') as any)
                      .update({ status: 'pending', verified_at: null, verified_by: null })
                      .eq('id', d.id);
                  } catch {}
                }
                break;
              }
            }
          }
        }
      }
      saveStoredHouses(memoryHouses, false);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mahallu_data_updated'));
    }

    return true;
  },

  deleteLedgerEntry(entryId: string, revertDue: boolean = true): boolean {
    this.deleteLedgerEntryAsync(entryId, revertDue);
    return true;
  },

  getFinancialSummary(): { totalCredit: number; totalDebit: number; balance: number } {
    const ledger = getStoredLedger();
    let totalCredit = 0;
    let totalDebit = 0;

    for (const item of ledger) {
      if (item.type === 'credit') {
        totalCredit += Number(item.amount);
      } else {
        totalDebit += Number(item.amount);
      }
    }

    return {
      totalCredit,
      totalDebit,
      balance: totalCredit - totalDebit,
    };
  },

  async getFinancialSummaryAsync(): Promise<{ totalCredit: number; totalDebit: number; balance: number }> {
    const ledger = await this.getLedgerAsync();
    let totalCredit = 0;
    let totalDebit = 0;

    for (const item of ledger) {
      if (item.type === 'credit') {
        totalCredit += Number(item.amount);
      } else {
        totalDebit += Number(item.amount);
      }
    }

    return {
      totalCredit,
      totalDebit,
      balance: totalCredit - totalDebit,
    };
  },

  // Statistics
  getSystemStats(customHouses?: HouseWithDetails[]) {
    const houses = customHouses || getStoredHouses();
    const totalHouses = houses.length;
    const approvedHouses = houses.filter((h) => {
      const prof = Array.isArray(h.profile) ? (h.profile[0] as any) : h.profile;
      return prof?.status === 'approved';
    }).length;
    const pendingHouses = houses.filter((h) => {
      const prof = Array.isArray(h.profile) ? (h.profile[0] as any) : h.profile;
      return prof?.status === 'pending_verification';
    }).length;
    const blockedHouses = houses.filter((h) => {
      const prof = Array.isArray(h.profile) ? (h.profile[0] as any) : h.profile;
      return prof?.status === 'blocked';
    }).length;

    let totalPopulation = 0;
    let totalChildren = 0;
    let totalEmployed = 0;
    let totalAbroad = 0;

    const divisionBreakdown: Record<Division, { houses: number; population: number; label: string }> = {
      alungal: { houses: 0, population: 0, label: DIVISION_LABELS.alungal },
      prammal: { houses: 0, population: 0, label: DIVISION_LABELS.prammal },
      kayanikkara: { houses: 0, population: 0, label: DIVISION_LABELS.kayanikkara },
      mariyad: { houses: 0, population: 0, label: DIVISION_LABELS.mariyad },
      meenamkuzhiyil_south: { houses: 0, population: 0, label: DIVISION_LABELS.meenamkuzhiyil_south },
      meenamkuzhiyil_north: { houses: 0, population: 0, label: DIVISION_LABELS.meenamkuzhiyil_north },
    };

    for (const h of houses) {
      const pCount = h.family_members?.length || 0;
      totalPopulation += pCount;

      if (divisionBreakdown[h.division]) {
        divisionBreakdown[h.division].houses++;
        divisionBreakdown[h.division].population += pCount;
      }

      for (const m of (h.family_members || [])) {
        const ageNum = typeof m.age === 'number' ? m.age : parseInt(String(m.age), 10);
        if (!isNaN(ageNum) && ageNum < 18) {
          totalChildren++;
        }
        const job = (m.job_status || '').toLowerCase().trim();
        if (job === 'abroad') {
          totalAbroad++;
        } else if (['employed', 'business', 'agriculture'].includes(job)) {
          totalEmployed++;
        }
      }
    }

    return {
      totalHouses,
      approvedHouses,
      pendingHouses,
      blockedHouses,
      totalPopulation,
      totalChildren,
      totalAbroad,
      totalEmployed,
      divisionBreakdown,
      monthlyDueAmount: this.getMonthlyDueAmount(),
      nextMonthSchedule: this.getNextMonthSchedule(),
    };
  },

  async getSystemStatsAsync(customHouses?: HouseWithDetails[]) {
    if (!customHouses) {
      await this.syncHousesFromSupabase();
    }
    return this.getSystemStats(customHouses);
  },

  getDuesSettings(): DuesSettings {
    if (typeof window !== 'undefined') {
      try {
        const cached = (window as any).__mahallu_dues_settings;
        if (cached) return cached;
      } catch {}
    }
    return {
      defaultAmount: 100,
      currentAmount: 100,
      history: [],
      updatedAt: new Date().toISOString(),
    };
  },

  async getDuesSettingsAsync(): Promise<DuesSettings> {
    try {
      const res = await fetch('/api/settings/dues', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.settings) {
          if (typeof window !== 'undefined') {
            (window as any).__mahallu_dues_settings = data.settings;
          }
          return data.settings;
        }
      }
    } catch (err) {
      console.warn('Error fetching dues settings from API:', err);
    }
    return this.getDuesSettings();
  },

  async saveMonthlyDueAmountAsync(amount: number, updatedBy?: string): Promise<DuesSettings> {
    const res = await fetch('/api/settings/dues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, updatedBy }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update monthly due amount');
    }

    const data = await res.json();
    const updated = data.settings;
    if (typeof window !== 'undefined') {
      (window as any).__mahallu_dues_settings = updated;
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      window.dispatchEvent(new CustomEvent('mahallu_dues_updated', { detail: updated }));
    }
    return updated;
  },

  getMonthlyDueAmount(billingMonth?: string): number {
    const month = billingMonth || new Date().toISOString().slice(0, 7);
    const settings = this.getDuesSettings();
    return calculateDueAmountForMonth(settings, month);
  },

  getNextMonthSchedule(): {
    currentMonth: string;
    currentAmount: number;
    nextMonth: string;
    nextAmount: number;
    isPendingChange: boolean;
  } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonth = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

    let nextY = currentYear;
    let nextM = currentMonthNum + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const nextMonth = `${nextY}-${String(nextM).padStart(2, '0')}`;

    const currentAmount = this.getMonthlyDueAmount(currentMonth);
    const nextAmount = this.getMonthlyDueAmount(nextMonth);

    return {
      currentMonth,
      currentAmount,
      nextMonth,
      nextAmount,
      isPendingChange: nextAmount !== currentAmount,
    };
  },

  getUpiSettings(): {
    upiId: string;
    payeeName: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    updatedAt?: string;
  } {
    if (typeof window !== 'undefined') {
      try {
        const cached = (window as any).__mahallu_upi_settings;
        if (cached) return cached;
      } catch {}
    }
    return {
      upiId: 'kunjikkulam@upi',
      payeeName: "Kunjikkulam Juma Masjid",
      bankName: 'State Bank of India',
      accountNumber: '123456789012',
      ifscCode: 'SBIN0001234',
    };
  },

  async getUpiSettingsAsync(): Promise<{
    upiId: string;
    payeeName: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    updatedAt?: string;
  }> {
    try {
      const res = await fetch('/api/settings/upi', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.settings) {
          if (typeof window !== 'undefined') {
            (window as any).__mahallu_upi_settings = data.settings;
          }
          return data.settings;
        }
      }
    } catch (err) {
      console.warn('Error fetching UPI settings from API:', err);
    }
    return this.getUpiSettings();
  },

  async saveUpiSettingsAsync(settings: {
    upiId: string;
    payeeName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  }) {
    const res = await fetch('/api/settings/upi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update UPI settings');
    }

    const data = await res.json();
    const updated = data.settings;
    if (typeof window !== 'undefined') {
      (window as any).__mahallu_upi_settings = updated;
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      window.dispatchEvent(new CustomEvent('mahallu_upi_updated', { detail: updated }));
    }
    return updated;
  },

  async getPaymentRequestsAsync(): Promise<{
    requests: PaymentRequestItem[];
    contributions: PaymentRequestContribution[];
  }> {
    try {
      const res = await fetch(`/api/payment-requests?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.requests)) {
          return {
            requests: data.requests,
            contributions: Array.isArray(data.contributions) ? data.contributions : [],
          };
        }
      }
    } catch (err) {
      console.warn('Error fetching payment requests:', err);
    }
    return { requests: [], contributions: [] };
  },

  async createPaymentRequestAsync(requestData: Omit<PaymentRequestItem, 'id' | 'created_at' | 'status'>): Promise<PaymentRequestItem> {
    const res = await fetch('/api/payment-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || 'Failed to create payment request');
    }

    const data = await res.json();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      window.dispatchEvent(new CustomEvent('mahallu_requests_updated'));
    }

    // Broadcast push notification to all resident devices
    dispatchPush('special_request_created', {
      title: data.request.title,
      category: data.request.category,
      amountType: data.request.amount_type,
      fixedAmount: data.request.fixed_amount,
    });

    return data.request;
  },

  async updatePaymentRequestStatusAsync(id: string, status: 'active' | 'completed' | 'cancelled') {
    const res = await fetch('/api/payment-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || 'Failed to update payment request');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      window.dispatchEvent(new CustomEvent('mahallu_requests_updated'));
    }
    return res.json();
  },

  async deletePaymentRequestAsync(id: string) {
    const res = await fetch(`/api/payment-requests?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || 'Failed to delete payment request');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      window.dispatchEvent(new CustomEvent('mahallu_requests_updated'));
    }
    return res.json();
  },

  async submitRequestContributionAsync(params: {
    requestId: string;
    houseId: string;
    userId?: string;
    amount: number;
    transactionRef: string;
  }): Promise<PaymentRequestContribution> {
    const res = await fetch('/api/payment-requests/contribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || 'Failed to submit contribution reference');
    }

    const data = await res.json();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      window.dispatchEvent(new CustomEvent('mahallu_requests_updated'));
    }
    return data.contribution;
  },

  async verifyRequestContributionAsync(params: {
    contributionId: string;
    adminId?: string;
    amount: number;
    requestTitle: string;
    category?: string;
    house?: HouseWithDetails | null;
    transactionRef: string;
  }) {
    const res = await fetch('/api/payment-requests/contribute', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contributionId: params.contributionId,
        action: 'approve',
        adminId: params.adminId || 'admin',
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || 'Failed to verify contribution');
    }

    // Auto-record credit in financial_ledger
    const headName = params.house ? (params.house.family_members?.find(m => m.is_head_of_family)?.name || params.house.family_members?.[0]?.name || '') : '';
    const houseDesc = params.house
      ? ` | House: ${params.house.mahallu_reg_no || ''}${params.house.house_name ? ` - ${params.house.house_name}` : ''}${headName ? ` | Head: ${headName}` : ''}`
      : '';

    try {
      await this.addLedgerEntryAsync({
        type: 'credit',
        category: params.category || 'Special Fund',
        amount: params.amount,
        description: `Special Collection: ${params.requestTitle} - Ref: ${params.transactionRef}${houseDesc}`,
      });
    } catch (e) {
      console.warn('Ledger auto-credit warning for request contribution:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      window.dispatchEvent(new CustomEvent('mahallu_requests_updated'));
    }
    return res.json();
  },

  async rejectRequestContributionAsync(contributionId: string, reason?: string) {
    const res = await fetch('/api/payment-requests/contribute', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contributionId,
        action: 'reject',
        rejectionReason: reason,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || 'Failed to reject contribution');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      window.dispatchEvent(new CustomEvent('mahallu_requests_updated'));
    }
    return res.json();
  },

  async markSpecialContributionAsPaidAsync(params: {
    requestId: string;
    houseId: string;
    amount: number;
    adminId?: string;
    requestTitle: string;
    category?: string;
    paymentMethod?: string;
    house?: HouseWithDetails | null;
    existingContributionId?: string;
  }): Promise<boolean> {
    try {
      if (params.existingContributionId) {
        await this.verifyRequestContributionAsync({
          contributionId: params.existingContributionId,
          adminId: params.adminId,
          amount: params.amount,
          requestTitle: params.requestTitle,
          category: params.category,
          house: params.house,
          transactionRef: `OFFLINE-${Date.now().toString().slice(-6)}`,
        });
        return true;
      }

      const res = await fetch('/api/payment-requests/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: params.requestId,
          houseId: params.houseId,
          amount: params.amount,
          transactionRef: `OFFLINE-${Date.now().toString().slice(-6)}`,
          isVerified: true,
          adminId: params.adminId || 'admin',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Failed to mark special payment as paid');
      }

      const data = await res.json();

      // Auto-record credit in financial_ledger if not already recorded
      const headName = params.house
        ? (params.house.family_members?.find((m) => m.is_head_of_family)?.name || params.house.family_members?.[0]?.name || '')
        : '';
      const houseDesc = params.house
        ? ` | House: ${params.house.mahallu_reg_no || ''}${params.house.house_name ? ` - ${params.house.house_name}` : ''}${headName ? ` | Head: ${headName}` : ''}`
        : '';

      try {
        await this.addLedgerEntryAsync({
          type: 'credit',
          category: params.category || 'Special Fund',
          amount: params.amount,
          description: `Special Collection (${params.paymentMethod || 'Cash / Offline'}): ${params.requestTitle} - Ref: ${data.contribution?.transaction_ref || 'OFFLINE'}${houseDesc}`,
        });
      } catch (e) {
        console.warn('Ledger auto-credit warning for offline contribution:', e);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
        window.dispatchEvent(new CustomEvent('mahallu_requests_updated'));
      }
      return true;
    } catch (err) {
      console.error('Error marking special contribution as paid:', err);
      throw err;
    }
  },

  getMarriageCertificates(houseId?: string, status?: string): MarriageCertificateApplication[] {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('mahallu_marriage_certificates');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            let list = [...parsed];
            if (houseId) list = list.filter((m) => m.house_id === houseId);
            if (status && status !== 'all') list = list.filter((m) => m.status === status);
            return list.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
          }
        }
      } catch {}
    }
    return [];
  },

  getMarriageCertificateById(id: string): MarriageCertificateApplication | null {
    const all = this.getMarriageCertificates();
    return all.find((m) => m.id === id) || null;
  },

  saveMarriageCertificateLocal(application: MarriageCertificateApplication): MarriageCertificateApplication {
    if (typeof window !== 'undefined') {
      try {
        const all = this.getMarriageCertificates();
        const idx = all.findIndex((m) => m.id === application.id);
        if (idx >= 0) {
          all[idx] = application;
        } else {
          all.unshift(application);
        }
        localStorage.setItem('mahallu_marriage_certificates', JSON.stringify(all));
        window.dispatchEvent(new CustomEvent('mahallu_marriage_certs_updated'));
        window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
      } catch {}
    }
    return application;
  },

  async getMarriageCertificatesAsync(houseId?: string, status?: string): Promise<MarriageCertificateApplication[]> {
    try {
      const queryParams = new URLSearchParams();
      if (houseId) queryParams.set('house_id', houseId);
      if (status && status !== 'all') queryParams.set('status', status);

      const res = await fetch(`/api/marriage-certificates?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.applications && Array.isArray(data.applications)) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('mahallu_marriage_certificates', JSON.stringify(data.applications));
            } catch {}
          }
          return data.applications;
        }
      }
    } catch {}
    return this.getMarriageCertificates(houseId, status);
  },

  async submitMarriageCertificateAsync(payload: any): Promise<MarriageCertificateApplication> {
    try {
      const res = await fetch('/api/marriage-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Failed to submit marriage certificate application');
      }

      const data = await res.json();
      if (data.application) {
        this.saveMarriageCertificateLocal(data.application);
        return data.application;
      }
    } catch (err: any) {
      console.warn('API submission failed, storing locally:', err?.message);
    }

    const localApp: MarriageCertificateApplication = {
      ...payload,
      id: `mc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      certificate_number: null,
      admin_notes: null,
      rejection_reason: null,
      reviewed_at: null,
      reviewed_by: null,
    };
    return this.saveMarriageCertificateLocal(localApp);
  },

  async reviewMarriageCertificateAsync(
    applicationId: string,
    action: 'approve' | 'reject',
    options: {
      certificateNumber?: string;
      adminNotes?: string;
      rejectionReason?: string;
      adminId?: string;
      applicantEmail?: string;
      houseName?: string;
      mahalluRegNo?: string;
      husbandName?: string;
      wifeFullName?: string;
      dateOfNikah?: string;
    } = {}
  ): Promise<MarriageCertificateApplication> {
    try {
      const res = await fetch('/api/marriage-certificates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          action,
          certificate_number: options.certificateNumber,
          admin_notes: options.adminNotes,
          rejection_reason: options.rejectionReason,
          admin_id: options.adminId,
          applicant_email: options.applicantEmail,
          house_name: options.houseName,
          mahallu_reg_no: options.mahalluRegNo,
          husband_name: options.husbandName,
          wife_full_name: options.wifeFullName,
          date_of_nikah: options.dateOfNikah,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Failed to review application');
      }

      const data = await res.json();
      if (data.application) {
        this.saveMarriageCertificateLocal(data.application);
        return data.application;
      }
    } catch (err: any) {
      console.warn('API review failed, updating locally:', err?.message);
    }

    const target = this.getMarriageCertificateById(applicationId);
    if (!target) throw new Error('Application not found');

    const updated: MarriageCertificateApplication = {
      ...target,
      status: action === 'approve' ? 'approved' : 'rejected',
      certificate_number: action === 'approve' ? (options.certificateNumber || `MHL-MC-${new Date().getFullYear()}-001`) : target.certificate_number,
      admin_notes: options.adminNotes || target.admin_notes,
      rejection_reason: action === 'reject' ? (options.rejectionReason || 'Application rejected') : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: options.adminId || 'admin',
    };
    return this.saveMarriageCertificateLocal(updated);
  },

  // ─── USER & ROLE MANAGEMENT ──────────────────────────────────────────
  async getAdminAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      if (hasSupabaseConfig()) {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        if (session?.user?.id) {
          headers['x-caller-id'] = session.user.id;
        }
        if (session?.user?.email) {
          headers['x-caller-email'] = session.user.email;
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve Supabase session for admin auth headers:', e);
    }
    return headers;
  },

  async getAllUsersAsync(): Promise<any[]> {
    try {
      const headers = await this.getAdminAuthHeaders();
      const res = await fetch('/api/admin/users', {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        throw new Error('Failed to fetch users directory');
      }
      const data = await res.json();
      return data.users || [];
    } catch (err: any) {
      console.warn('getAllUsersAsync error, fallback to local houses:', err?.message);
      // Fallback: derive from memory houses
      return memoryHouses.map((h) => ({
        id: h.user_id,
        email: h.profile?.email || `${h.house_name.toLowerCase().replace(/\s+/g, '')}@mahallu.local`,
        role: h.profile?.role || 'resident',
        status: h.profile?.status || 'approved',
        created_at: h.created_at,
        house: {
          id: h.id,
          house_name: h.house_name,
          house_number: h.house_number,
          mahallu_reg_no: h.mahallu_reg_no,
          division: h.division,
          phone: h.phone,
        },
      }));
    }
  },

  async updateUserRoleAsync(
    targetUserId: string,
    newRole: 'admin' | 'resident',
    password: string,
    callerId?: string
  ): Promise<{ success: boolean; message: string; user?: any }> {
    const headers = await this.getAdminAuthHeaders();
    const effectiveCallerId = callerId || headers['x-caller-id'];

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        targetUserId,
        newRole,
        password,
        callerId: effectiveCallerId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user role');
    }

    // Direct client-side update with current admin credentials to ensure immediate cache sync
    try {
      if (hasSupabaseConfig()) {
        const supabase = createClient();
        await (supabase.from('profiles') as any)
          .update({ role: newRole })
          .eq('id', targetUserId);
      }
    } catch (e) {
      console.warn('Client-side profile role update warning:', e);
    }

    // Update in-memory houses if present
    const h = memoryHouses.find((item) => item.user_id === targetUserId);
    if (h && h.profile) {
      h.profile.role = newRole;
      this.saveHouseToStorage(h);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahallu_data_updated'));
    }

    return data;
  },

  async requestSecurityPasswordResetAsync(
    callerId?: string
  ): Promise<{ success: boolean; message: string; sentTo?: string }> {
    const headers = await this.getAdminAuthHeaders();
    const effectiveCallerId = callerId || headers['x-caller-id'];

    const res = await fetch('/api/admin/security', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'request-reset', callerId: effectiveCallerId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to request password reset OTP');
    }
    return data;
  },

  async verifySecurityPasswordResetAsync(
    otp: string,
    newPassword: string,
    callerId?: string
  ): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAdminAuthHeaders();
    const effectiveCallerId = callerId || headers['x-caller-id'];

    const res = await fetch('/api/admin/security', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'verify-reset',
        otp,
        newPassword,
        callerId: effectiveCallerId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to verify and reset security password');
    }
    return data;
  },
};



