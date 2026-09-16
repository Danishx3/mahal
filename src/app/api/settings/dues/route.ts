import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

function getSettingsFilePath(): string {
  return path.join(process.cwd(), 'src', 'data', 'dues-settings.json');
}

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

export function readDuesSettingsFromDisk(): DuesSettings {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8').trim();
      if (!raw) {
        return DEFAULT_DUES_SETTINGS;
      }
      const data = JSON.parse(raw);
      if (data && typeof data.defaultAmount === 'number') {
        const merged: DuesSettings = {
          ...DEFAULT_DUES_SETTINGS,
          ...data,
          history: Array.isArray(data.history) ? data.history : [],
        };
        const curMonth = getCurrentBillingMonth();
        const nextMonth = getNextBillingMonth();
        merged.currentAmount = calculateDueAmountForMonth(merged, curMonth);

        const nextAmount = calculateDueAmountForMonth(merged, nextMonth);
        if (nextAmount !== merged.currentAmount) {
          merged.scheduledAmount = nextAmount;
          merged.scheduledEffectiveMonth = nextMonth;
        } else {
          merged.scheduledAmount = undefined;
          merged.scheduledEffectiveMonth = undefined;
        }

        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not read dues-settings.json, using defaults:', err);
  }
  return DEFAULT_DUES_SETTINGS;
}

export function writeDuesSettingsToDisk(settings: Partial<DuesSettings>): DuesSettings {
  const filePath = getSettingsFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existing = readDuesSettingsFromDisk();
  const merged: DuesSettings = {
    ...existing,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  const curMonth = getCurrentBillingMonth();
  const nextMonth = getNextBillingMonth();
  merged.currentAmount = calculateDueAmountForMonth(merged, curMonth);

  const nextAmount = calculateDueAmountForMonth(merged, nextMonth);
  if (nextAmount !== merged.currentAmount) {
    merged.scheduledAmount = nextAmount;
    merged.scheduledEffectiveMonth = nextMonth;
  } else {
    merged.scheduledAmount = undefined;
    merged.scheduledEffectiveMonth = undefined;
  }

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export async function GET() {
  const settings = readDuesSettingsFromDisk();
  const currentMonth = getCurrentBillingMonth();
  const nextMonth = getNextBillingMonth();

  return NextResponse.json({
    success: true,
    currentMonth,
    nextMonth,
    settings,
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

    const nextMonth = getNextBillingMonth();
    const currentSettings = readDuesSettingsFromDisk();
    const history = [...(currentSettings.history || [])];

    // Check if an entry already exists for nextMonth
    const existingIndex = history.findIndex((h) => h.effectiveFromMonth === nextMonth);
    const newRule: FeeHistoryItem = {
      amount: parsedAmount,
      effectiveFromMonth: nextMonth,
      createdAt: new Date().toISOString(),
      updatedBy: updatedBy || 'admin',
      notes: notes || undefined,
    };

    if (existingIndex >= 0) {
      history[existingIndex] = newRule;
    } else {
      history.unshift(newRule);
    }

    // Sort descending by effectiveFromMonth
    history.sort((a, b) => b.effectiveFromMonth.localeCompare(a.effectiveFromMonth));

    const updated = writeDuesSettingsToDisk({
      history,
      updatedAt: new Date().toISOString(),
    });

    const currentMonth = getCurrentBillingMonth();

    return NextResponse.json({
      success: true,
      message: `Monthly due updated successfully. ₹${parsedAmount} will take effect from ${nextMonth} onwards.`,
      currentMonth,
      nextMonth,
      settings: updated,
    });
  } catch (err: any) {
    console.error('Error saving monthly dues settings:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update monthly dues settings' },
      { status: 500 }
    );
  }
}
