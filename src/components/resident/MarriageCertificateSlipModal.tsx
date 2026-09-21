'use client';

import React from 'react';
import { MarriageCertificateApplication } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/context/LanguageContext';
import { formatDateTime } from '@/lib/utils';
import { Printer, CheckCircle2, FileCheck, X, Building2, User, Calendar, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MarriageCertificateSlipModalProps {
  application: MarriageCertificateApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MarriageCertificateSlipModal({
  application,
  isOpen,
  onClose,
}: MarriageCertificateSlipModalProps) {
  const { language } = useLanguage();
  const isMl = language === 'ml';
  if (!isOpen || !application) return null;

  const certNumber = application.certificate_number || `MRB-ACK-${new Date().getFullYear()}-${application.id.slice(0, 5).toUpperCase()}`;
  const isApproved = application.status === 'approved';
  const issueDateFormatted = application.reviewed_at
    ? new Date(application.reviewed_at).toLocaleDateString('en-GB')
    : new Date(application.submitted_at).toLocaleDateString('en-GB');

  // Format Nikah date as DD/MM/YYYY
  const formatNikahDate = (d?: string) => {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };

  const handlePrint = () => {
    let printFrame = document.getElementById('marriage-slip-print-frame') as HTMLIFrameElement | null;
    if (printFrame) {
      printFrame.remove();
    }

    printFrame = document.createElement('iframe');
    printFrame.id = 'marriage-slip-print-frame';
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
          <title>Marriage Certificate Acknowledgment - ${certNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 10mm 12mm;
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
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0c4a6e;
              display: flex;
              justify-content: center;
              padding: 0;
            }
            .certificate-frame {
              width: 100%;
              max-width: 760px;
              background: #ffffff;
              border: 3.5px solid #0369a1;
              outline: 1.5px solid #0369a1;
              outline-offset: 4px;
              border-radius: 6px;
              padding: 24px 28px 20px;
              position: relative;
              margin: 4px auto;
            }
            .header-committee {
              text-align: center;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 12px;
            }
            .header-committee h1 {
              font-size: 21px;
              font-weight: 900;
              color: #0369a1;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              margin-bottom: 3px;
              font-family: 'Arial Black', -apple-system, sans-serif;
            }
            .header-committee p {
              font-size: 11.5px;
              font-weight: 700;
              color: #0284c7;
              letter-spacing: 0.4px;
              text-transform: uppercase;
              line-height: 1.35;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0 6px;
              font-size: 13px;
              font-weight: 800;
              color: #0369a1;
            }
            .meta-row .reg-no span,
            .meta-row .issue-date span {
              color: #0f172a;
              font-family: monospace;
              border-bottom: 1px dotted #0369a1;
              padding-bottom: 1px;
            }
            .title-banner {
              text-align: center;
              margin: 12px 0 10px;
            }
            .title-banner h2 {
              font-size: 23px;
              font-weight: 900;
              color: #0284c7;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              display: inline-block;
              font-family: 'Arial Black', sans-serif;
            }
            .ack-badge {
              display: block;
              text-align: center;
              font-size: 10px;
              font-weight: 800;
              color: #b45309;
              background: #fffbeb;
              border: 1px dashed #f59e0b;
              border-radius: 6px;
              padding: 4px 10px;
              margin: 4px auto 14px;
              width: fit-content;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .body-text {
              font-size: 13.5px;
              line-height: 2.15;
              color: #0f172a;
              font-weight: 500;
              margin-bottom: 16px;
            }
            .field-val {
              font-weight: 800;
              color: #0284c7;
              border-bottom: 1.5px dotted #0284c7;
              padding: 0 4px;
              display: inline;
              text-transform: uppercase;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            .body-text .line-clause {
              display: block;
              margin-bottom: 2px;
            }
            .disclaimer-box {
              background: #f0fdf4;
              border: 1.5px solid #86efac;
              border-radius: 8px;
              padding: 8px 12px;
              margin-top: 10px;
              text-align: center;
              font-size: 11px;
              font-weight: 700;
              color: #166534;
            }
            .signatures-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding-top: 40px;
              margin-top: 20px;
            }
            .sig-block {
              text-align: center;
              width: 170px;
            }
            .sig-line {
              border-bottom: 1px dotted #0284c7;
              margin-bottom: 5px;
              height: 24px;
            }
            .sig-title {
              font-size: 12px;
              font-weight: 800;
              color: #0369a1;
              text-transform: uppercase;
            }
            .sig-date {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
            }
            .seal-block {
              width: 90px;
              height: 70px;
              border: 1.5px dashed #0284c7;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              font-weight: 800;
              color: #0284c7;
              text-transform: uppercase;
              text-align: center;
              line-height: 1.15;
            }
            .footer-contact {
              border-top: 1px solid #e2e8f0;
              margin-top: 18px;
              padding-top: 8px;
              text-align: center;
              font-size: 9.5px;
              color: #64748b;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="certificate-frame">
            <!-- Header matching scanned reference certificate -->
            <div class="header-committee">
              <h1>MARIYAD-KUNHIKULAM MAHALLU COMMITTEE</h1>
              <p>ANSARI JUMA MASJID, MARIYAD, MANJERI,</p>
              <p>MALAPPURAM, KERALA, INDIA 676 122</p>
            </div>

            <!-- Meta row -->
            <div class="meta-row">
              <div class="reg-no">Reg. No: <span>${certNumber}</span></div>
              <div class="issue-date">Issue Date: <span>${issueDateFormatted}</span></div>
            </div>

            <!-- Title -->
            <div class="title-banner">
              <h2>CERTIFICATE OF MARRIAGE</h2>
            </div>

            <div class="ack-badge">
              അപേക്ഷാ അക്നോളജ്മെന്റ് • APPLICATION ACKNOWLEDGMENT
            </div>

            <!-- Certificate Body formatted with dotted lines like scanned reference -->
            <div class="body-text">
              <span class="line-clause">
                This is to certify that Mr. <span class="field-val">${application.husband_name || '—'}</span>
              </span>
              <span class="line-clause">
                S/o. <span class="field-val">${application.husband_father_name || '—'}</span>
              </span>
              <span class="line-clause">
                House, <span class="field-val">${application.husband_house_name || application.house_name || '—'}</span>
              </span>
              <span class="line-clause">
                PO, <span class="field-val">${application.husband_post_office || '—'}</span> &nbsp;&nbsp;&nbsp;&nbsp; Taluk, <span class="field-val">${application.husband_taluk || '—'}</span>
              </span>
              <span class="line-clause">
                district, <span class="field-val">${application.husband_district || 'MALAPPURAM'}</span> &nbsp;&nbsp;&nbsp;&nbsp; State, <span class="field-val">${application.husband_state || 'KERALA'}</span>
              </span>
              <span class="line-clause">
                has married Ms. <span class="field-val">${application.wife_full_name || '—'}</span>
              </span>
              <span class="line-clause">
                D/o. <span class="field-val">${application.wife_father_name || '—'}</span>
              </span>
              <span class="line-clause">
                House <span class="field-val">${application.wife_house_name || '—'}</span>
              </span>
              <span class="line-clause">
                PO, <span class="field-val">${application.wife_post_office || '—'}</span> &nbsp;&nbsp;&nbsp;&nbsp; Taluk <span class="field-val">${application.wife_taluk || '—'}</span>
              </span>
              <span class="line-clause">
                district, <span class="field-val">${application.wife_district || 'MALAPPURAM'}</span> &nbsp;&nbsp;&nbsp;&nbsp; State, <span class="field-val">${application.wife_state || 'KERALA'}</span>
              </span>
              <span class="line-clause">
                on <span class="field-val">${formatNikahDate(application.date_of_nikah)}</span>.
              </span>
              <p style="margin-top: 10px; text-align: justify; line-height: 1.7;">
                The Nikah ceremony was solemnised at <span class="field-val">${application.nikah_venue || 'Ansari Juma Masjid, Mariyad'}</span> under the leadership of Khatib, Ansari Juma Masjid, in accordance with the Islamic Law of Sharia't, as per the records maintained in this Masjid.
              </p>
            </div>

            <!-- Prominent notice as requested by user -->
            <div class="disclaimer-box">
              📢 ശ്രദ്ധിക്കുക: ഇത് അപേക്ഷാ അക്നോളജ്മെന്റ് രേഖയാണ്. ഔദ്യോഗിക വിവാഹ സർട്ടിഫിക്കറ്റിനായി മഹല്ല് കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക.<br/>
              <span style="font-size: 10px; font-weight: 500; color: #15803d;">(NOTE: This is an Acknowledgment Slip. Please contact the Mahallu Committee office to collect the official stamped certificate.)</span>
            </div>

            <!-- Signatures Section -->
            <div class="signatures-section">
              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-title">Secretary</div>
                <div class="sig-date">${issueDateFormatted}</div>
              </div>

              <div class="seal-block">
                MAHALLU<br/>SEAL / മുദ്ര
              </div>

              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-title">Khatib</div>
                <div class="sig-date">Ansari Juma Masjid</div>
              </div>
            </div>

            <div class="footer-contact">
              Official Digital Acknowledgment • Kunjikkulam-Mariyad Mahallu Committee • Helpline: +91 9846045482 • Reg. No: ${application.mahallu_reg_no}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-4 sm:my-6">
        {/* Modal Top Bar */}
        <div className="bg-[#0369a1] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-sky-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-sm">
              <FileCheck className="h-4 w-4 text-sky-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അക്നോളജ്മെന്റ്' : 'Marriage Certificate Acknowledgment'}
              </h2>
              <p className="text-[11px] text-sky-200 font-mono">Ref: {certNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-sky-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Reference Certificate Style Preview */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-slate-50/50">
          {/* Important Notice Banner (Requested by user) */}
          <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 text-center space-y-1">
            <p className="text-xs sm:text-sm font-extrabold text-amber-950 flex items-center justify-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              {isMl
                ? 'നിങ്ങളുടെ അപേക്ഷ സ്വീകരിച്ചു, സർട്ടിഫിക്കറ്റിനായി മഹല്ല് കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക'
                : 'Your application is accepted, contact mahal committee for certificate'}
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-amber-900">
              {isMl
                ? 'ഇതൊരു അപേക്ഷാ അക്നോളജ്മെന്റ് രേഖയാണ്. ഒറിജിനൽ സീൽ വെച്ച വിവാഹ സർട്ടിഫിക്കറ്റിനായി മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.'
                : 'This is an application acknowledgment slip. Please contact the Mahallu committee office to obtain the official stamped certificate.'}
            </p>
          </div>

          {/* Scanned Reference Style Certificate Preview Box */}
          <div className="bg-white rounded-2xl p-5 sm:p-7 border-2 border-sky-600 shadow-sm relative space-y-4">
            {/* Header matching physical certificate */}
            <div className="text-center pb-3 border-b-2 border-sky-600">
              <h3 className="text-sm sm:text-base font-black text-sky-900 uppercase tracking-wide">
                MARIYAD-KUNHIKULAM MAHALLU COMMITTEE
              </h3>
              <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wide">
                ANSARI JUMA MASJID, MARIYAD, MANJERI, MALAPPURAM, KERALA 676 122
              </p>
            </div>

            {/* Meta row */}
            <div className="flex justify-between items-center text-xs font-bold text-sky-800 pt-1">
              <div>Reg. No: <span className="text-slate-900 font-mono underline decoration-dotted">{certNumber}</span></div>
              <div>Issue Date: <span className="text-slate-900 underline decoration-dotted">{issueDateFormatted}</span></div>
            </div>

            {/* Title */}
            <div className="text-center py-1">
              <h4 className="text-base sm:text-lg font-black text-sky-900 uppercase tracking-wider">
                CERTIFICATE OF MARRIAGE
              </h4>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 mt-0.5">
                {isMl ? 'അപേക്ഷാ അക്നോളജ്മെന്റ് സ്ലിപ്പ്' : 'Application Acknowledgment Slip'}
              </span>
            </div>

            {/* Body matching dotted lines format */}
            <div className="text-xs sm:text-[13px] leading-relaxed text-slate-800 space-y-2 pt-2">
              <p>
                This is to certify that Mr.{' '}
                <strong className="text-sky-900 font-extrabold underline decoration-dotted uppercase">
                  {application.husband_name}
                </strong>
              </p>
              <p>
                S/o.{' '}
                <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                  {application.husband_father_name || '—'}
                </strong>
              </p>
              <p>
                House,{' '}
                <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                  {application.husband_house_name || application.house_name || '—'}
                </strong>
              </p>
              <p>
                PO,{' '}
                <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                  {application.husband_post_office || '—'}
                </strong>
                &nbsp;&nbsp;&nbsp;&nbsp; Taluk,{' '}
                <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                  {application.husband_taluk || '—'}
                </strong>
              </p>
              <p>
                district,{' '}
                <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                  {application.husband_district || 'MALAPPURAM'}
                </strong>
                &nbsp;&nbsp;&nbsp;&nbsp; State,{' '}
                <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                  {application.husband_state || 'KERALA'}
                </strong>
              </p>

              <div className="pt-1">
                <p>
                  has married Ms.{' '}
                  <strong className="text-sky-900 font-extrabold underline decoration-dotted uppercase">
                    {application.wife_full_name}
                  </strong>
                </p>
                <p>
                  D/o.{' '}
                  <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                    {application.wife_father_name || '—'}
                  </strong>
                </p>
                <p>
                  House{' '}
                  <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                    {application.wife_house_name || '—'}
                  </strong>
                </p>
                <p>
                  PO,{' '}
                  <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                    {application.wife_post_office || '—'}
                  </strong>
                  &nbsp;&nbsp;&nbsp;&nbsp; Taluk{' '}
                  <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                    {application.wife_taluk || '—'}
                  </strong>
                </p>
                <p>
                  district,{' '}
                  <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                    {application.wife_district || 'MALAPPURAM'}
                  </strong>
                  &nbsp;&nbsp;&nbsp;&nbsp; State,{' '}
                  <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                    {application.wife_state || 'KERALA'}
                  </strong>
                </p>
                <p>
                  on{' '}
                  <strong className="text-emerald-800 font-bold underline decoration-dotted">
                    {formatNikahDate(application.date_of_nikah)}
                  </strong>.
                </p>
              </div>

              <p className="pt-2 text-slate-700 text-[11.5px] leading-relaxed">
                The Nikah ceremony was solemnised at{' '}
                <strong className="text-sky-900 font-bold underline decoration-dotted uppercase">
                  {application.nikah_venue || 'Ansari Juma Masjid, Mariyad'}
                </strong>{' '}
                under the leadership of Khatib, Ansari Juma Masjid, in accordance with the Islamic Law of Sharia't, as per the records maintained in this Masjid.
              </p>
            </div>

            {/* Bottom Signatures Block */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs font-bold text-sky-900">
              <div className="text-center">
                <div className="w-24 border-b border-sky-700 mb-1"></div>
                <span>Secretary</span>
              </div>
              <div className="w-16 h-12 border border-dashed border-sky-400 rounded-lg flex items-center justify-center text-[9px] text-sky-600 uppercase font-bold text-center">
                Mahallu Seal
              </div>
              <div className="text-center">
                <div className="w-24 border-b border-sky-700 mb-1"></div>
                <span>Khatib</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-white px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            {isMl ? 'A4 സൈസ് പ്രിന്റിന് അനുയോജ്യമായ ഫോർമാറ്റ്' : 'Optimized for A4 Portrait print'}
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose}>
              {isMl ? 'ക്ലോസ് ചെയ്യുക' : 'Close'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="bg-[#0369a1] hover:bg-[#0284c7] text-white font-bold flex items-center gap-2 shadow-sm rounded-xl px-4"
            >
              <Printer className="h-4 w-4" />
              {isMl ? 'അക്നോളജ്മെന്റ് പ്രിന്റ് ചെയ്യുക / PDF' : 'Print Acknowledgment / Save PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
