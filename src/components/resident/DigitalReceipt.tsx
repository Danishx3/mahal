'use client';

import React, { useRef } from 'react';
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
  const receiptCardRef = useRef<HTMLDivElement>(null);

  const receiptNo = `REC-${due.billing_month.replace('-', '')}-${house.mahallu_reg_no.replace(/[^A-Za-z0-9]/g, '').slice(-4)}`;
  const billingCycle = new Date(due.billing_month + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const divisionLabel = DIVISION_LABELS[house.division] || house.division;
  const transactionRef = due.transaction_ref || 'OFFLINE-665740';
  const submittedAtFormatted = formatDateTime(due.submitted_at);
  const verifiedAtFormatted = formatDateTime(due.verified_at);
  const formattedAmount = formatCurrency(due.amount);
  const authId = due.id ? `${due.id.slice(0, 8)}...` : 'c0c9e604...';

  const handlePrint = () => {
    // Isolated iframe printing to guarantee 100% full-page rendering identical to image 2 in Microsoft Print to PDF
    let printFrame = document.getElementById('receipt-print-frame') as HTMLIFrameElement | null;
    if (printFrame) {
      printFrame.remove();
    }

    printFrame = document.createElement('iframe');
    printFrame.id = 'receipt-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${receiptNo} - Kunjikkulam Juma Masjid Official Receipt</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              background: #ffffff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
              color: #0f172a;
              display: flex;
              justify-content: center;
              padding-top: 10px;
            }
            .receipt-card {
              width: 100%;
              max-width: 680px;
              background: #ffffff;
              border: 1.5px solid #e2e8f0;
              border-radius: 16px;
              padding: 30px 34px;
              position: relative;
              overflow: hidden;
              margin: 0 auto;
            }
            .watermark-wrap {
              position: absolute;
              right: 15px;
              top: 50%;
              transform: translateY(-50%);
              opacity: 0.04;
              pointer-events: none;
              user-select: none;
              width: 380px;
              height: 380px;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 22px;
              border-bottom: 1px solid #e2e8f0;
              position: relative;
              z-index: 1;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .masjid-icon {
              width: 48px;
              height: 48px;
              border-radius: 14px;
              background-color: #065f46;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .masjid-icon svg {
              width: 26px;
              height: 26px;
              stroke: currentColor;
              stroke-width: 2;
              fill: none;
            }
            .title-wrap h1 {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.01em;
              line-height: 1.2;
            }
            .title-wrap p {
              font-size: 11px;
              font-weight: 700;
              color: #047857;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              margin-top: 2px;
            }
            .header-right {
              text-align: right;
            }
            .verified-badge {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              padding: 4px 11px;
              border-radius: 9999px;
              background-color: #ecfdf5;
              color: #065f46;
              border: 1px solid #a7f3d0;
              font-size: 11px;
              font-weight: 700;
            }
            .receipt-no-text {
              font-size: 11px;
              color: #64748b;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              margin-top: 5px;
            }
            .receipt-no-text strong {
              font-weight: 700;
              color: #0f172a;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 28px;
              padding: 22px 0;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
              position: relative;
              z-index: 1;
            }
            .col-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #94a3b8;
              margin-bottom: 8px;
            }
            .detail-line {
              margin-bottom: 3.5px;
              color: #475569;
              font-size: 12.5px;
            }
            .house-name {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a !important;
              margin-bottom: 5px !important;
            }
            .reg-no-highlight {
              font-weight: 800;
              color: #065f46 !important;
              font-family: ui-monospace, monospace;
            }
            .audit-right {
              text-align: right;
            }
            .audit-val-bold {
              font-weight: 700;
              color: #0f172a;
            }
            .audit-val-green {
              font-weight: 700;
              color: #065f46;
            }
            .table-wrap {
              padding: 20px 0;
              border-bottom: 1px solid #e2e8f0;
              position: relative;
              z-index: 1;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            th {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #64748b;
              padding-bottom: 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            th.center, td.center {
              text-align: center;
            }
            th.right, td.right {
              text-align: right;
            }
            td {
              padding: 15px 0;
              vertical-align: middle;
            }
            .desc-main {
              font-weight: 700;
              color: #1e293b;
              font-size: 13.5px;
            }
            .desc-secondary {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .period-val {
              font-family: ui-monospace, monospace;
              font-size: 12px;
              color: #475569;
            }
            .amount-val {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
            }
            .total-row td {
              padding-top: 15px;
              border-top: 2px solid #0f172a;
            }
            .total-label {
              text-align: right;
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
            }
            .total-amount {
              text-align: right;
              font-size: 19px;
              font-weight: 800;
              color: #065f46;
            }
            .footer-row {
              margin-top: 22px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              position: relative;
              z-index: 1;
            }
            .seal-container {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .seal-outer {
              width: 52px;
              height: 52px;
              border-radius: 50%;
              border: 2px dashed #059669;
              padding: 3px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .seal-inner {
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: #ecfdf5;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-size: 7.5px;
              font-weight: 900;
              color: #065f46;
              line-height: 1;
              text-align: center;
            }
            .seal-inner svg {
              width: 14px;
              height: 14px;
              color: #059669;
              margin-bottom: 2px;
            }
            .verified-text-title {
              font-size: 12px;
              font-weight: 700;
              color: #1e293b;
            }
            .verified-text-sub {
              font-size: 10.5px;
              color: #64748b;
              margin-top: 1px;
            }
            .auth-id-text {
              font-family: ui-monospace, monospace;
              font-size: 10.5px;
              color: #94a3b8;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <!-- Watermark -->
            <div class="watermark-wrap">
              <svg viewBox="0 0 24 24" width="380" height="380" stroke="#064e3b" stroke-width="1.2" fill="none">
                <line x1="2" y1="22" x2="22" y2="22"></line>
                <line x1="12" y1="2" x2="12" y2="2"></line>
                <path d="M12 2l8 5H4l8-5z"></path>
                <line x1="6" y1="7" x2="6" y2="22"></line>
                <line x1="10" y1="7" x2="10" y2="22"></line>
                <line x1="14" y1="7" x2="14" y2="22"></line>
                <line x1="18" y1="7" x2="18" y2="22"></line>
              </svg>
            </div>

            <!-- Header -->
            <div class="header-row">
              <div class="header-left">
                <div class="masjid-icon">
                  <svg viewBox="0 0 24 24">
                    <line x1="2" y1="22" x2="22" y2="22"></line>
                    <path d="M12 2l8 5H4l8-5z"></path>
                    <line x1="6" y1="7" x2="6" y2="22"></line>
                    <line x1="10" y1="7" x2="10" y2="22"></line>
                    <line x1="14" y1="7" x2="14" y2="22"></line>
                    <line x1="18" y1="7" x2="18" y2="22"></line>
                  </svg>
                </div>
                <div class="title-wrap">
                  <h1>Kunjikkulam Juma Masjid</h1>
                  <p>Official Monthly Dues Electronic Receipt</p>
                </div>
              </div>
              <div class="header-right">
                <div class="verified-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Verified & Reconciled
                </div>
                <div class="receipt-no-text">
                  Receipt No: <strong>${receiptNo}</strong>
                </div>
              </div>
            </div>

            <!-- Details Grid -->
            <div class="details-grid">
              <div>
                <div class="col-title">Household Information</div>
                <div class="detail-line house-name">${house.house_name}</div>
                <div class="detail-line">House No: ${house.house_number}</div>
                <div class="detail-line">Division: <strong>${divisionLabel}</strong></div>
                <div class="detail-line">Mahallu Reg No: <span class="reg-no-highlight">${house.mahallu_reg_no}</span></div>
                <div class="detail-line">Contact: ${house.phone}</div>
              </div>
              <div class="audit-right">
                <div class="col-title">Payment Audit Details</div>
                <div class="detail-line">Billing Cycle: <span class="audit-val-bold">${billingCycle}</span></div>
                <div class="detail-line">Transaction Ref: <span class="audit-val-bold">${transactionRef}</span></div>
                <div class="detail-line">Submitted At: ${submittedAtFormatted}</div>
                <div class="detail-line">Verified At: <span class="audit-val-green">${verifiedAtFormatted}</span></div>
              </div>
            </div>

            <!-- Items Table -->
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width: 55%">Description</th>
                    <th class="center" style="width: 20%">Period</th>
                    <th class="right" style="width: 25%">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div class="desc-main">Monthly Mahallu Membership Due</div>
                      <div class="desc-secondary">Mosque operations, Madrasa education fund, and local community services</div>
                    </td>
                    <td class="center period-val">${due.billing_month}</td>
                    <td class="right amount-val">${formattedAmount}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="2" class="total-label">Total Paid:</td>
                    <td class="total-amount">${formattedAmount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Security Footer -->
            <div class="footer-row">
              <div class="seal-container">
                <div class="seal-outer">
                  <div class="seal-inner">
                    <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      <polyline points="9 12 11 14 15 10"></polyline>
                    </svg>
                    <span>VERIFIED</span>
                  </div>
                </div>
                <div>
                  <div class="verified-text-title">Digitally Verified by Mahallu Admin</div>
                  <div class="verified-text-sub">System-generated official receipt. Recorded in Mahallu Financial Ledger.</div>
                </div>
              </div>
              <div class="auth-id-text">
                Auth ID: ${authId}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
      printFrame?.contentWindow?.focus();
      printFrame?.contentWindow?.print();
    }, 250);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Printable Receipt Paper Container */}
      <div
        ref={receiptCardRef}
        id="printable-receipt"
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm text-slate-800 relative overflow-hidden"
      >
        {/* Background Watermark */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.035] pointer-events-none select-none">
          <Landmark className="w-96 h-96 text-emerald-950" />
        </div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Kunjikkulam Juma Masjid
              </h1>
              <p className="text-xs text-emerald-700 font-semibold tracking-wide uppercase">
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
              Receipt No: <span className="font-bold text-slate-900">{receiptNo}</span>
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-sm relative z-10">
          {/* Household Info */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Household Information
            </h3>
            <div>
              <p className="font-bold text-base text-slate-900">{house.house_name}</p>
              <p className="text-xs text-slate-600">House No: {house.house_number}</p>
              <p className="text-xs text-slate-600">
                Division: <span className="font-semibold text-slate-800">{divisionLabel}</span>
              </p>
              <p className="text-xs text-slate-600 font-mono">
                Mahallu Reg No: <span className="font-bold text-emerald-800">{house.mahallu_reg_no}</span>
              </p>
              <p className="text-xs text-slate-600">Contact: {house.phone}</p>
            </div>
          </div>

          {/* Payment & Audit Info */}
          <div className="space-y-1.5 sm:text-right">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Payment Audit Details
            </h3>
            <div>
              <p className="text-xs text-slate-600">
                Billing Cycle:{' '}
                <span className="font-bold text-slate-900">{billingCycle}</span>
              </p>
              <p className="text-xs text-slate-600 font-mono">
                Transaction Ref:{' '}
                <span className="font-bold text-slate-900">{transactionRef}</span>
              </p>
              <p className="text-xs text-slate-600">
                Submitted At:{' '}
                <span className="text-slate-800">{submittedAtFormatted}</span>
              </p>
              <p className="text-xs text-slate-600">
                Verified At:{' '}
                <span className="font-semibold text-emerald-800">{verifiedAtFormatted}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Amount Table */}
        <div className="py-6 border-b border-slate-200 relative z-10">
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
                <td className="py-3.5 text-right font-bold text-slate-900 text-base">
                  {formattedAmount}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 font-bold text-slate-900">
                <td colSpan={2} className="pt-3.5 text-right text-sm">
                  Total Paid:
                </td>
                <td className="pt-3.5 text-right text-xl text-emerald-800">
                  {formattedAmount}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Security Stamp / Footer */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full border-2 border-dashed border-emerald-600/70 p-1 flex items-center justify-center text-center">
              <div className="h-full w-full rounded-full bg-emerald-50 flex flex-col items-center justify-center text-[8px] font-extrabold uppercase text-emerald-800 leading-tight">
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
            Auth ID: {authId}
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="flex items-center justify-end gap-3 no-print">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={handlePrint} className="gap-2 font-semibold">
          <Printer className="h-4 w-4" />
          Print / Save PDF Receipt
        </Button>
      </div>
    </div>
  );
}
