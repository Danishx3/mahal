import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export interface FeeHistoryItem {
  amount: number;
  effectiveFromMonth: string; // 'YYYY-MM'
  createdAt: string;
  updatedBy?: string;
  notes?: string;
}

export interface DuesSettings {
  defaultAmount: number; // fallback baseline amount (100)
  currentAmount: number; // rate active for the current calendar month
  scheduledAmount?: number; // rate scheduled for next month if different
  scheduledEffectiveMonth?: string; // next month 'YYYY-MM'
  history: FeeHistoryItem[];
  updatedAt: string;
}

const DEFAULT_DUES_SETTINGS: DuesSettings = {
  defaultAmount: 100,
  currentAmount: 100,
  history: [],
  updatedAt: new Date().toISOString(),
};

export function getNextBillingMonth(baseDate: Date = new Date()): string {
  let y = baseDate.getFullYear();
  let m = baseDate.getMonth() + 2; // +1 for 1-indexed, +1 for next month
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function getCurrentBillingMonth(baseDate: Date = new Date()): string {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function calculateDueAmountForMonth(settings: DuesSettings, billingMonth: string): number {
  if (!settings || !Array.isArray(settings.history) || settings.history.length === 0) {
    return settings?.defaultAmount || 100;
  }

  // Sort history descending by effectiveFromMonth
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const currentMonth = getCurrentBillingMonth();
  const nextMonth = getNextBillingMonth();

  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from('dues_settings') as any)
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch dues_settings error:', error.message);
    }

    if (data) {
      const merged: DuesSettings = {
        defaultAmount: Number(data.default_amount) || 100,
        currentAmount: Number(data.current_amount) || 100,
        scheduledAmount: data.scheduled_amount != null ? Number(data.scheduled_amount) : undefined,
        scheduledEffectiveMonth: data.scheduled_effective_month || undefined,
        history: Array.isArray(data.history) ? (data.history as FeeHistoryItem[]) : [],
        updatedAt: data.updated_at,
      };

      merged.currentAmount = calculateDueAmountForMonth(merged, currentMonth);
      const nextAmount = calculateDueAmountForMonth(merged, nextMonth);
      if (nextAmount !== merged.currentAmount) {
        merged.scheduledAmount = nextAmount;
        merged.scheduledEffectiveMonth = nextMonth;
      } else {
        merged.scheduledAmount = undefined;
        merged.scheduledEffectiveMonth = undefined;
      }

      return NextResponse.json({
        success: true,
        currentMonth,
        nextMonth,
        settings: merged,
      });
    }
  } catch (err) {
    console.error('Error fetching dues_settings from Supabase:', err);
  }

  return NextResponse.json({
    success: true,
    currentMonth,
    nextMonth,
    settings: DEFAULT_DUES_SETTINGS,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, updatedBy, notes } = body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'A valid positive monthly due amount is required.' },
        { status: 400 }
      );
    }

    const currentMonth = getCurrentBillingMonth();
    const nextMonth = getNextBillingMonth();
    const supabase = createClient();

    // Fetch existing settings from Supabase
    const { data: existingData } = await (supabase.from('dues_settings') as any)
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const currentHistory: FeeHistoryItem[] =
      existingData && Array.isArray(existingData.history)
        ? [...existingData.history]
        : [];

    // Check if an entry already exists for nextMonth
    const existingIndex = currentHistory.findIndex((h) => h.effectiveFromMonth === nextMonth);
    const newRule: FeeHistoryItem = {
      amount: parsedAmount,
      effectiveFromMonth: nextMonth,
      createdAt: new Date().toISOString(),
      updatedBy: updatedBy || 'admin',
      notes: notes || undefined,
    };

    if (existingIndex >= 0) {
      currentHistory[existingIndex] = newRule;
    } else {
      currentHistory.unshift(newRule);
    }

    // Sort descending by effectiveFromMonth
    currentHistory.sort((a, b) => b.effectiveFromMonth.localeCompare(a.effectiveFromMonth));

    const defaultAmount = existingData?.default_amount != null ? Number(existingData.default_amount) : 100;
    const dummyMerged: DuesSettings = {
      defaultAmount,
      currentAmount: defaultAmount,
      history: currentHistory,
      updatedAt: new Date().toISOString(),
    };

    const calculatedCurrent = calculateDueAmountForMonth(dummyMerged, currentMonth);
    const calculatedNext = calculateDueAmountForMonth(dummyMerged, nextMonth);
    const scheduledAmount = calculatedNext !== calculatedCurrent ? calculatedNext : null;
    const scheduledEffectiveMonth = scheduledAmount ? nextMonth : null;
    const nowIso = new Date().toISOString();

    const { data: updatedRow, error: updateError } = await (supabase.from('dues_settings') as any)
      .upsert({
        id: 1,
        default_amount: defaultAmount,
        current_amount: calculatedCurrent,
        scheduled_amount: scheduledAmount,
        scheduled_effective_month: scheduledEffectiveMonth,
        history: currentHistory,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const settings: DuesSettings = {
      defaultAmount: Number(updatedRow.default_amount),
      currentAmount: Number(updatedRow.current_amount),
      scheduledAmount: updatedRow.scheduled_amount != null ? Number(updatedRow.scheduled_amount) : undefined,
      scheduledEffectiveMonth: updatedRow.scheduled_effective_month || undefined,
      history: Array.isArray(updatedRow.history) ? (updatedRow.history as FeeHistoryItem[]) : [],
      updatedAt: updatedRow.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: `Monthly due updated successfully. ₹${parsedAmount} will take effect from ${nextMonth} onwards.`,
      currentMonth,
      nextMonth,
      settings,
    });
  } catch (err: any) {
    console.error('Error saving monthly dues settings to Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update monthly dues settings' },
      { status: 500 }
    );
  }
}
