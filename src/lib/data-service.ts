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
import { createClient } from './supabase/client';

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
  memoryHouses = houses;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_HOUSES_KEY, JSON.stringify(houses));
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
      list = list.filter((h) => h.profile?.status === filter.status);
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
    return getStoredHouses().find((h) => h.id === id);
  },

  getHouseByUserId(userId: string): HouseWithDetails | undefined {
    return getStoredHouses().find((h) => h.user_id === userId);
  },

  checkRegNoAvailable(regNo: string, excludeHouseId?: string): boolean {
    const list = getStoredHouses();
    return !list.some(
      (h) => h.mahallu_reg_no.toLowerCase() === regNo.toLowerCase() && h.id !== excludeHouseId
    );
  },

  createHouse(input: OnboardingInput, userId: string): HouseWithDetails {
    const houses = getStoredHouses();
    const houseId = `h-${Date.now()}`;

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
        email: input.members[0]?.phone || 'resident@mahallu.org',
        role: 'resident',
        status: 'pending_verification',
        created_at: new Date().toISOString(),
      },
      family_members: input.members.map((m, idx) => ({
        id: `fm-${Date.now()}-${idx}`,
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
          billing_month: new Date().toISOString().slice(0, 7),
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

    // Also persist to Supabase if configured
    try {
      const supabase = createClient();
      (supabase.from('houses') as any).insert({
        id: houseId,
        user_id: userId,
        house_name: input.house.house_name,
        house_number: input.house.house_number,
        mahallu_reg_no: input.house.mahallu_reg_no,
        division: input.house.division,
        phone: input.house.phone,
      }).then(() => {
        const membersData = newHouse.family_members.map((m) => ({
          house_id: houseId,
          name: m.name,
          is_head_of_family: m.is_head_of_family,
          relationship: m.relationship,
          marital_status: m.marital_status,
          job_status: m.job_status,
          general_education: m.general_education,
          religious_education: m.religious_education,
          age: m.age,
          phone: m.phone,
        }));
        (supabase.from('family_members') as any).insert(membersData);
      });
    } catch {
      // Handled
    }

    houses.unshift(newHouse);
    saveStoredHouses(houses);
    return newHouse;
  },

  // Admin Profile Verification
  getPendingProfiles(): HouseWithDetails[] {
    return getStoredHouses().filter((h) => h.profile?.status === 'pending_verification');
  },

  approveProfile(houseId: string): boolean {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId);
    if (!house || !house.profile) return false;

    house.profile.status = 'approved';
    saveStoredHouses(houses);

    try {
      const supabase = createClient();
      (supabase.from('profiles') as any).update({ status: 'approved' }).eq('id', house.user_id);
    } catch {
      // Handled
    }

    return true;
  },

  rejectProfile(houseId: string, reason: string): boolean {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId);
    if (!house || !house.profile) return false;

    house.profile.status = 'rejected';
    saveStoredHouses(houses);

    try {
      const supabase = createClient();
      (supabase.from('profiles') as any).update({ status: 'rejected' }).eq('id', house.user_id);
    } catch {
      // Handled
    }

    return true;
  },

  blockHouse(houseId: string): boolean {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId);
    if (!house || !house.profile) return false;

    house.profile.status = 'blocked';
    saveStoredHouses(houses);

    try {
      const supabase = createClient();
      (supabase.from('profiles') as any).update({ status: 'blocked' }).eq('id', house.user_id);
    } catch {
      // Handled
    }

    return true;
  },

  unblockHouse(houseId: string): boolean {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId);
    if (!house || !house.profile) return false;

    house.profile.status = 'approved';
    saveStoredHouses(houses);

    try {
      const supabase = createClient();
      (supabase.from('profiles') as any).update({ status: 'approved' }).eq('id', house.user_id);
    } catch {
      // Handled
    }

    return true;
  },

  deleteHouse(houseId: string): boolean {
    let houses = getStoredHouses();
    houses = houses.filter((h) => h.id !== houseId);
    saveStoredHouses(houses);

    try {
      const supabase = createClient();
      (supabase.from('houses') as any).delete().eq('id', houseId);
    } catch {
      // Handled
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

  createDueForCurrentMonth(houseId: string, month: string = new Date().toISOString().slice(0, 7)): PaymentDue {
    const houses = getStoredHouses();
    const house = houses.find((h) => h.id === houseId);
    if (!house) throw new Error('House not found');

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
