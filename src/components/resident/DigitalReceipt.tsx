'use client';

import React from 'react';
import { PaymentDue, HouseWithDetails, DIVISION_LABELS } from '@/lib/supabase/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Printer, CheckCircle2, ShieldCheck, Download, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DigitalReceiptProps {
  due: PaymentDue;
  house: HouseWithDetails;
  onClose?: () => void;
}

export function DigitalReceipt({ due, house, onClose }: DigitalReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const receiptNo = `REC-${due.billing_month.replace('-', '')}-${house.mahallu_reg_no.replace(/[^A-Za-z0-9]/g, '').slice(-4)}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Printable Receipt Paper Container */}
      <div
        id="printable-receipt"
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm text-slate-800 relative overflow-hidden"
      >
        {/* Background Watermark */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
          <Landmark className="w-96 h-96 text-emerald-950" />
        </div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Al-Huda Mahallu Jama&apos;ath
              </h1>
              <p className="text-xs text-emerald-700 font-medium tracking-wide uppercase">
                Official Monthly Dues Electronic Receipt
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Verified & Reconciled
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Receipt No: <span className="font-semibold text-slate-800">{receiptNo}</span>
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-sm">
          {/* Household Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Household Information
            </h3>
            <div>
              <p className="font-bold text-base text-slate-900">{house.house_name}</p>
              <p className="text-xs text-slate-600">House No: {house.house_number}</p>
              <p className="text-xs text-slate-600">
                Division: <span className="font-medium text-slate-800">{DIVISION_LABELS[house.division]}</span>
              </p>
              <p className="text-xs text-slate-600 font-mono">
                Mahallu Reg No: <span className="font-semibold text-emerald-800">{house.mahallu_reg_no}</span>
              </p>
              <p className="text-xs text-slate-600">Contact: {house.phone}</p>
            </div>
          </div>

          {/* Payment & Audit Info */}
          <div className="space-y-2 sm:text-right">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Payment Audit Details
            </h3>
            <div>
              <p className="text-xs text-slate-600">
                Billing Cycle:{' '}
                <span className="font-semibold text-slate-900">
                  {new Date(due.billing_month + '-01').toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
              <p className="text-xs text-slate-600 font-mono">
                Transaction Ref:{' '}
                <span className="font-bold text-slate-900">{due.transaction_ref || 'OFFLINE-CASH'}</span>
              </p>
              <p className="text-xs text-slate-600">
                Submitted At:{' '}
                <span className="text-slate-800">{formatDateTime(due.submitted_at)}</span>
              </p>
              <p className="text-xs text-slate-600">
                Verified At:{' '}
                <span className="font-medium text-emerald-800">{formatDateTime(due.verified_at)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Amount Table */}
        <div className="py-6 border-b border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Description</th>
                <th className="pb-3 text-center">Period</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3.5">
                  <p className="font-semibold text-slate-800">Monthly Mahallu Membership Due</p>
                  <p className="text-xs text-slate-500">
                    Mosque operations, Madrasa education fund, and local community services
                  </p>
                </td>
                <td className="py-3.5 text-center font-mono text-xs text-slate-600">
                  {due.billing_month}
                </td>
                <td className="py-3.5 text-right font-bold text-slate-900">
                  {formatCurrency(due.amount)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-800 font-bold text-slate-900">
                <td colSpan={2} className="pt-3 text-right text-sm">
                  Total Paid:
                </td>
                <td className="pt-3 text-right text-lg text-emerald-800">
                  {formatCurrency(due.amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Security Stamp / Footer */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full border-2 border-dashed border-emerald-600/60 p-1 flex items-center justify-center text-center">
              <div className="h-full w-full rounded-full bg-emerald-50 flex flex-col items-center justify-center text-[8px] font-bold uppercase text-emerald-800 leading-tight">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>VERIFIED</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Digitally Verified by Mahallu Admin</p>
              <p className="text-[11px] text-slate-500">
                System-generated official receipt. Recorded in Mahallu Financial Ledger.
              </p>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-400 font-mono">
            Auth ID: {due.id.slice(0, 8)}...
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="flex items-center justify-end gap-3 no-print">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print / Download Receipt
        </Button>
      </div>
    </div>
  );
}
