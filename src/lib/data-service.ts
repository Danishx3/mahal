'use client';

import {
  Division,
  HouseWithDetails,
  PaymentDue,
  FinancialLedger,
  ProfileStatus,
  DIVISION_LABELS,
} from './supabase/types';
import { OnboardingInput } from './schemas';
import { createClient, hasSupabaseConfig } from './supabase/client';

// Storage keys for client persistence
const STORAGE_HOUSES_KEY = 'mahallu_houses_prod_v1';
const STORAGE_LEDGER_KEY = 'mahallu_ledger_prod_v1';

// In-memory singleton fallback
let memoryHouses: HouseWithDetails[] = [];
let memoryLedger: FinancialLedger[] = [];

function getStoredHouses(): HouseWithDetails[] {
  if (typeof window === 'undefined') {
    return memoryHouses;
  }

  const raw = localStorage.getItem(STORAGE_HOUSES_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredHouses(houses: HouseWithDetails[]) {
  // Normalize any array profile to single object
  const normalized = houses.map((h) => {
    if (Array.isArray(h.profile)) {
      return { ...h, profile: (h.profile as any)[0] };
    }
    return h;
  });
  memoryHouses = normalized;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_HOUSES_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('mahallu_data_updated'));
  }
}

function getStoredLedger(): FinancialLedger[] {
  if (typeof window === 'undefined') {
    return memoryLedger;
  }

  const raw = localStorage.getItem(STORAGE_LEDGER_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredLedger(ledger: FinancialLedger[]) {
  memoryLedger = ledger;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_LEDGER_KEY, JSON.stringify(ledger));
    window.dispatchEvent(new Event('mahallu_data_updated'));
  }
}

// Data operations for Mahallu Management System
export const DataService = {
  // Houses & Population
  getHouses(filter?: { division?: Division | 'all'; search?: string; status?: ProfileStatus | 'all' }): HouseWithDetails[] {
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

  saveHouseToStorage(house: HouseWithDetails): void {
    const houses = getStoredHouses();
    const existing = houses.find((h) => h.id === house.id || h.user_id === house.user_id);
    if (existing) {
      const sameStatus = existing.profile?.status === house.profile?.status;
      const sameDues = (existing.payment_dues?.length || 0) === (house.payment_dues?.length || 0);
      const sameMembers = (existing.family_members?.length || 0) === (house.family_members?.length || 0);
      if (sameStatus && sameDues && sameMembers) {
        return;
      }
    }
    const filtered = houses.filter((h) => h.id !== house.id && h.user_id !== house.user_id);
    filtered.unshift(house);
    saveStoredHouses(filtered);
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

      // 4. Create initial monthly payment due in public.payment_dues
      let insertedDue: any = null;
      try {
        const { data: dueData } = await (supabase.from('payment_dues') as any)
          .insert({
            house_id: realHouseId,
            billing_month: currentMonth,
            amount: 100,
            status: 'pending',
          })
          .select()
          .maybeSingle();
        insertedDue = dueData;
      } catch (dueErr) {
        console.warn('Initial due notice:', dueErr);
      }

      const newHouse: HouseWithDetails = {
        id: realHouseId,
        user_id: userId,
        house_name: input.house.house_name,
        house_number: input.house.house_number,
        mahallu_reg_no: input.house.mahallu_reg_no,
        division: input.house.division,
        phone: input.house.phone,
        created_at: insertedHouse.created_at || new Date().toISOString(),
        profile: {
          id: userId,
          email: userEmail || input.members[0]?.phone || 'resident@mahallu.org',
          role: 'resident',
          status: 'pending_verification',
          created_at: new Date().toISOString(),
        },
        family_members: (insertedMembers as any[]) || membersToInsert.map((m, idx) => ({ ...m, id: `fm-${idx}` })),
        payment_dues: insertedDue
          ? [insertedDue]
          : [
              {
                id: `due-${Date.now()}`,
                house_id: realHouseId,
                billing_month: currentMonth,
                amount: 100,
                transaction_ref: null,
                status: 'pending',
                submitted_at: null,
                verified_at: null,
                verified_by: null,
                rejection_reason: null,
              },
            ],
      };

      const houses = getStoredHouses();
      const filtered = houses.filter((h) => h.user_id !== userId && h.mahallu_reg_no !== input.house.mahallu_reg_no);
      filtered.unshift(newHouse);
      saveStoredHouses(filtered);
      return newHouse;
    }

    // Local fallback if Supabase credentials are not configured
    const houseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}`;
    const newHouse: HouseWithDetails = {
      id: houseId,
      user_id: userId,
      house_name: input.house.house_name,
      house_number: input.house.house_number,
      mahallu_reg_no: input.house.mahallu_reg_no,
      division: input.house.division,
      phone: input.house.phone,
      created_at: new Date().toISOString(),
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
      payment_dues: [
        {
          id: `due-${Date.now()}`,
          house_id: houseId,
          billing_month: currentMonth,
          amount: 100,
          transaction_ref: null,
          status: 'pending',
          submitted_at: null,
          verified_at: null,
          verified_by: null,
          rejection_reason: null,
        },
      ],
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
            payment_dues: h.payment_dues || [],
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

        saveStoredHouses(merged);
        return merged;
      }
    } catch (err) {
      console.warn('Supabase sync error:', err);
    }
    return getStoredHouses();
  },

  // Admin Profile Verification
  getPendingProfiles(): HouseWithDetails[] {
    return getStoredHouses().filter((h) => {
      const prof = Array.isArray(h.profile) ? (h.profile[0] as any) : h.profile;
      return prof?.status === 'pending_verification';
    });
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
  submitPayment(dueId: string, transactionRef: string): boolean {
    const houses = getStoredHouses();
    for (const h of houses) {
      const due = h.payment_dues.find((d) => d.id === dueId);
      if (due) {
        due.transaction_ref = transactionRef;
        due.status = 'under_review';
        due.submitted_at = new Date().toISOString();
        due.rejection_reason = null;
        saveStoredHouses(houses);

        try {
          const supabase = createClient();
          (supabase.from('payment_dues') as any).update({
            transaction_ref: transactionRef,
            status: 'under_review',
            submitted_at: new Date().toISOString(),
          }).eq('id', dueId);
        } catch {
          // Handled
        }

        return true;
      }
    }
    return false;
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
        amount: 100,
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
        amount: 100,
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
          amount: 100,
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

  verifyPayment(dueId: string, adminId: string = 'admin'): boolean {
    const houses = getStoredHouses();
    let verifiedDue: PaymentDue | null = null;
    let targetHouse: HouseWithDetails | null = null;

    for (const h of houses) {
      const due = h.payment_dues.find((d) => d.id === dueId);
      if (due) {
        due.status = 'verified';
        due.verified_at = new Date().toISOString();
        due.verified_by = adminId;
        due.rejection_reason = null;
        verifiedDue = due;
        targetHouse = h;
        break;
      }
    }

    if (verifiedDue && targetHouse) {
      saveStoredHouses(houses);

      // AUTOMATICALLY POST TO FINANCIAL LEDGER AS REQUIRED BY TRIGGER ARCHITECTURE
      const ledger = getStoredLedger();
      ledger.unshift({
        id: `fl-${Date.now()}`,
        type: 'credit',
        category: 'House Monthly Due',
        amount: verifiedDue.amount,
        description: `Monthly Dues - Month: ${verifiedDue.billing_month} | House: ${targetHouse.mahallu_reg_no} | Ref: ${verifiedDue.transaction_ref || 'N/A'}`,
        payment_due_id: verifiedDue.id,
        created_by: adminId,
        created_at: new Date().toISOString(),
      });
      saveStoredLedger(ledger);

      try {
        const supabase = createClient();
        (supabase.from('payment_dues') as any).update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: adminId,
        }).eq('id', dueId);
      } catch {
        // Handled
      }

      return true;
    }

    return false;
  },

  rejectPayment(dueId: string, reason: string): boolean {
    const houses = getStoredHouses();
    for (const h of houses) {
      const due = h.payment_dues.find((d) => d.id === dueId);
      if (due) {
        due.status = 'failed';
        due.rejection_reason = reason;
        saveStoredHouses(houses);

        try {
          const supabase = createClient();
          (supabase.from('payment_dues') as any).update({
            status: 'failed',
            rejection_reason: reason,
          }).eq('id', dueId);
        } catch {
          // Handled
        }

        return true;
      }
    }
    return false;
  },

  getDefaulters(month: string = '2026-09', division?: Division | 'all'): { house: HouseWithDetails; due: PaymentDue | null }[] {
    const houses = getStoredHouses().filter((h) => h.profile?.status === 'approved');
    const defaulters: { house: HouseWithDetails; due: PaymentDue | null }[] = [];

    for (const h of houses) {
      if (division && division !== 'all' && h.division !== division) {
        continue;
      }
      const due = h.payment_dues.find((d) => d.billing_month === month);
      if (!due || due.status !== 'verified') {
        defaulters.push({ house: h, due: due || null });
      }
    }
    return defaulters;
  },

  // Financial Ledger
  getLedger(): FinancialLedger[] {
    return getStoredLedger();
  },

  addLedgerEntry(entry: {
    type: 'credit' | 'debit';
    category: string;
    amount: number;
    description: string;
  }): FinancialLedger {
    const ledger = getStoredLedger();
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
    ledger.unshift(newEntry);
    saveStoredLedger(ledger);

    try {
      const supabase = createClient();
      (supabase.from('financial_ledger') as any).insert({
        type: entry.type,
        category: entry.category,
        amount: entry.amount,
        description: entry.description,
      });
    } catch {
      // Handled
    }

    return newEntry;
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

  // Statistics
  getSystemStats() {
    const houses = getStoredHouses();
    const totalHouses = houses.length;
    const approvedHouses = houses.filter((h) => h.profile?.status === 'approved').length;
    const pendingHouses = houses.filter((h) => h.profile?.status === 'pending_verification').length;
    const blockedHouses = houses.filter((h) => h.profile?.status === 'blocked').length;

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
      const pCount = h.family_members.length;
      totalPopulation += pCount;

      if (divisionBreakdown[h.division]) {
        divisionBreakdown[h.division].houses++;
        divisionBreakdown[h.division].population += pCount;
      }

      for (const m of h.family_members) {
        if (m.age !== null && m.age < 18) {
          totalChildren++;
        }
        if (m.job_status === 'Abroad') {
          totalAbroad++;
        } else if (['Employed', 'Business', 'Agriculture'].includes(m.job_status)) {
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
    };
  },
};
