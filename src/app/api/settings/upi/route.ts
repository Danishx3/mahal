import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface UpiSettings {
  upiId: string;
  payeeName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  updatedAt?: string;
}

const DEFAULT_UPI_SETTINGS: UpiSettings = {
  upiId: 'alhudamahallu@upi',
  payeeName: "Al-Huda Mahallu Jama'ath",
  bankName: 'State Bank of India',
  accountNumber: '123456789012',
  ifscCode: 'SBIN0001234',
  updatedAt: new Date().toISOString(),
};

function getSettingsFilePath(): string {
  return path.join(process.cwd(), 'src', 'data', 'upi-settings.json');
}

export function readUpiSettingsFromDisk(): UpiSettings {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data.upiId === 'string') {
        return {
          ...DEFAULT_UPI_SETTINGS,
          ...data,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read upi-settings.json, using defaults:', err);
  }
  return DEFAULT_UPI_SETTINGS;
}

export function writeUpiSettingsToDisk(settings: UpiSettings): UpiSettings {
  const filePath = getSettingsFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const merged: UpiSettings = {
    ...DEFAULT_UPI_SETTINGS,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export async function GET() {
  const settings = readUpiSettingsFromDisk();
  return NextResponse.json({
    success: true,
    settings,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { upiId, payeeName, bankName, accountNumber, ifscCode } = body;

    if (!upiId || typeof upiId !== 'string' || !upiId.includes('@')) {
      return NextResponse.json(
        { error: 'A valid UPI ID containing "@" (e.g., alhudamahallu@upi) is required.' },
        { status: 400 }
      );
    }

    const cleanUpiId = upiId.trim().toLowerCase();
    const cleanPayeeName = payeeName?.trim() || "Al-Huda Mahallu Jama'ath";

    const updated = writeUpiSettingsToDisk({
      upiId: cleanUpiId,
      payeeName: cleanPayeeName,
      bankName: bankName?.trim(),
      accountNumber: accountNumber?.trim(),
      ifscCode: ifscCode?.trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Mahallu UPI settings updated successfully.',
      settings: updated,
    });
  } catch (err: any) {
    console.error('Error saving UPI settings:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update UPI settings' },
      { status: 500 }
    );
  }
}
