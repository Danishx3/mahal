import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export interface UpiSettings {
  upiId: string;
  payeeName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  updatedAt?: string;
}

const DEFAULT_UPI_SETTINGS: UpiSettings = {
  upiId: 'kunjikkulam@upi',
  payeeName: "Kunjikkulam Juma Masjid",
  bankName: 'State Bank of India',
  accountNumber: '123456789012',
  ifscCode: 'SBIN0001234',
  updatedAt: new Date().toISOString(),
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from('upi_settings') as any)
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch upi_settings error:', error.message);
    }

    if (data) {
      const settings: UpiSettings = {
        upiId: data.upi_id,
        payeeName: data.payee_name,
        bankName: data.bank_name || undefined,
        accountNumber: data.account_number || undefined,
        ifscCode: data.ifsc_code || undefined,
        updatedAt: data.updated_at,
      };
      return NextResponse.json({
        success: true,
        settings,
      });
    }
  } catch (err) {
    console.error('Error fetching upi_settings from Supabase:', err);
  }

  return NextResponse.json({
    success: true,
    settings: DEFAULT_UPI_SETTINGS,
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
    const cleanPayeeName = payeeName?.trim() || "Kunjikkulam Juma Masjid";
    const nowIso = new Date().toISOString();

    const supabase = createClient();
    const { data, error } = await (supabase.from('upi_settings') as any)
      .upsert({
        id: 1,
        upi_id: cleanUpiId,
        payee_name: cleanPayeeName,
        bank_name: bankName?.trim() || null,
        account_number: accountNumber?.trim() || null,
        ifsc_code: ifscCode?.trim() || null,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const settings: UpiSettings = {
      upiId: data.upi_id,
      payeeName: data.payee_name,
      bankName: data.bank_name || undefined,
      accountNumber: data.account_number || undefined,
      ifscCode: data.ifsc_code || undefined,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Mahallu UPI settings updated successfully.',
      settings,
    });
  } catch (err: any) {
    console.error('Error saving UPI settings to Supabase:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update UPI settings' },
      { status: 500 }
    );
  }
}
