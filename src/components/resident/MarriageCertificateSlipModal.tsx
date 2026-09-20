'use client';

import React from 'react';
import { MarriageCertificateApplication } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/context/LanguageContext';
import { formatDateTime } from '@/lib/utils';
import { Printer, CheckCircle2, FileCheck, X, Building2, User, Calendar, MapPin } from 'lucide-react';
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

  const certNumber = application.certificate_number || `MHL-MC-${new Date().getFullYear()}-PENDING`;
  const isApproved = application.status === 'approved';
  const submittedAtFormatted = formatDateTime(application.submitted_at);
  const reviewedAtFormatted = application.reviewed_at ? formatDateTime(application.reviewed_at) : null;

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
          <title>Acknowledgment - ${certNumber} - Kunjikkulam Juma Masjid</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 12mm 15mm;
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
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              display: flex;
              justify-content: center;
              padding: 0;
            }
            .slip-card {
              width: 100%;
              max-width: 720px;
              background: #ffffff;
              border: 1.5px solid #cbd5e1;
              border-radius: 12px;
              padding: 24px 28px;
              position: relative;
              margin: 0 auto;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 16px;
              border-bottom: 2px solid #047857;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .masjid-emblem {
              width: 48px;
              height: 48px;
              border-radius: 12px;
              background-color: #065f46;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 22px;
              font-weight: bold;
              flex-shrink: 0;
            }
            .title-wrap h1 {
              font-size: 18px;
              font-weight: 800;
              color: #064e3b;
              text-transform: uppercase;
              letter-spacing: 0.02em;
              line-height: 1.2;
            }
            .title-wrap p {
              font-size: 11px;
              font-weight: 600;
              color: #047857;
              margin-top: 2px;
            }
            .header-right {
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 6px;
              background-color: ${isApproved ? '#ecfdf5' : '#fffbeb'};
              color: ${isApproved ? '#065f46' : '#92400e'};
              border: 1px solid ${isApproved ? '#a7f3d0' : '#fde68a'};
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .cert-no {
              font-size: 12px;
              font-family: monospace;
              font-weight: 800;
              color: #0f172a;
              margin-top: 5px;
            }
            .doc-title-bar {
              text-align: center;
              margin: 16px 0 14px;
              padding: 6px 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
            }
            .doc-title-bar h2 {
              font-size: 13px;
              font-weight: 800;
              color: #1e293b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .doc-title-bar p {
              font-size: 10px;
              color: #64748b;
              font-weight: 500;
            }
            .banner-box {
              background: ${isApproved ? '#f0fdf4' : '#fefce8'};
              border: 1.5px solid ${isApproved ? '#86efac' : '#fde047'};
              border-radius: 8px;
              padding: 12px 14px;
              margin-bottom: 14px;
              text-align: center;
            }
            .banner-title {
              font-size: 13px;
              font-weight: 800;
              color: ${isApproved ? '#166534' : '#854d0e'};
              margin-bottom: 2px;
            }
            .banner-sub {
              font-size: 11px;
              font-weight: 600;
              color: ${isApproved ? '#15803d' : '#a16207'};
            }
            .table-section {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
              font-size: 11px;
            }
            .table-section th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 6px 10px;
              border: 1px solid #e2e8f0;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .table-section td {
              padding: 6px 10px;
              border: 1px solid #e2e8f0;
              color: #0f172a;
            }
            .table-section td.label-col {
              width: 32%;
              background: #f8fafc;
              font-weight: 600;
              color: #475569;
            }
            .table-section td.value-col {
              font-weight: 700;
            }

            .signatures-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding-top: 24px;
              border-top: 1px solid #e2e8f0;
              margin-top: 10px;
            }
            .sig-box {
              text-align: center;
              width: 140px;
            }
            .sig-line {
              border-top: 1px dotted #94a3b8;
              margin-bottom: 4px;
            }
            .sig-label {
              font-size: 9.5px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
            }
            .seal-box {
              width: 80px;
              height: 60px;
              border: 1px dashed #94a3b8;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              font-weight: 700;
              color: #94a3b8;
              text-transform: uppercase;
              text-align: center;
            }
            .footer-line {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              margin-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="header-row">
              <div class="header-left">
                <div class="masjid-emblem">🕌</div>
                <div class="title-wrap">
                  <h1>${isMl ? 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ്' : 'Kunjikkulam Juma Masjid'}</h1>
                  <p>${isMl ? 'മഹല്ല് കമ്മിറ്റി • നിക്കാഹ് & വിവാഹ രജിസ്ട്രി' : 'Mahallu Committee • Nikah & Marriage Registry'}</p>
                </div>
              </div>
              <div class="header-right">
                <div class="status-badge">${isMl ? (isApproved ? 'അംഗീകരിച്ചു (Approved)' : 'പരിശോധനയിലാണ്') : (isApproved ? 'Accepted & Approved' : 'Pending Review')}</div>
                <div class="cert-no">Ref: ${certNumber}</div>
              </div>
            </div>

            <div class="doc-title-bar">
              <h2>${isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ സ്വീകൃതി പത്രം' : 'Marriage Certificate Application Acknowledgment'}</h2>
              <p>${isMl ? 'Marriage Certificate Application Acknowledgment' : 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ സ്വീകൃതി പത്രം'}</p>
            </div>

            ${
              isApproved
                ? `
            <div class="banner-box">
              <div class="banner-title">🎉 ${isMl ? 'നിങ്ങളുടെ അപേക്ഷ സ്വീകരിച്ചു, സർട്ടിഫിക്കറ്റിനായി മഹല്ല് കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക' : 'Your application is accepted, contact mahal committee for certificate'}</div>
              <div class="banner-sub">${isMl ? 'നിങ്ങളുടെ അപേക്ഷ സ്വീകരിച്ചു. സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റുന്നതിനായി മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.' : 'നിങ്ങളുടെ അപേക്ഷ സ്വീകരിച്ചു. സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റുന്നതിനായി മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.'}</div>
            </div>
            `
                : `
            <div class="banner-box">
              <div class="banner-title">⏳ ${isMl ? 'അപേക്ഷ പരിശോധനയിലാണ്' : 'Application Under Verification'}</div>
              <div class="banner-sub">${isMl ? 'നിങ്ങളുടെ അപേക്ഷ മഹല്ല് കമ്മിറ്റിയുടെ പരിശോധനയിലാണ്.' : 'നിങ്ങളുടെ അപേക്ഷ മഹല്ല് കമ്മിറ്റിയുടെ പരിശോധനയിലാണ്.'}</div>
            </div>
            `
            }

            <table class="table-section">
              <thead>
                <tr>
                  <th colspan="2">${isMl ? 'ദമ്പതികളുടെയും നിക്കാഹിന്റെയും വിവരങ്ങൾ' : 'Couple & Nikah Details'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="label-col">${isMl ? 'വരന്റെ പേര്' : 'Husband Name (Groom)'}</td>
                  <td class="value-col">${application.husband_name}</td>
                </tr>
                <tr>
                  <td class="label-col">${isMl ? 'വരന്റെ ജനനത്തീയതി' : 'Husband Date of Birth'}</td>
                  <td class="value-col">${application.husband_dob}</td>
                </tr>
                <tr>
                  <td class="label-col">${isMl ? 'വധുവിന്റെ പേര്' : 'Wife Full Name (Bride)'}</td>
                  <td class="value-col">${application.wife_full_name} (${application.wife_initial})</td>
                </tr>
                <tr>
                  <td class="label-col">${isMl ? 'വധുവിന്റെ ജനനത്തീയതി' : 'Wife Date of Birth'}</td>
                  <td class="value-col">${application.wife_dob}</td>
                </tr>
                <tr>
                  <td class="label-col">${isMl ? 'വധുവിന്റെ പിതാവ്' : "Wife Father's Name"}</td>
                  <td class="value-col">${application.wife_father_name}</td>
                </tr>
                <tr>
                  <td class="label-col">${isMl ? 'വധുവിന്റെ സ്ഥിര മേൽവിലാസം' : 'Wife Permanent Address'}</td>
                  <td class="value-col">${application.wife_address}</td>
                </tr>
                <tr>
                  <td class="label-col">${isMl ? 'നിക്കാഹ് തീയതി' : 'Date of Nikah Ceremony'}</td>
                  <td class="value-col" style="color: #065f46;">${application.date_of_nikah}</td>
                </tr>
              </tbody>
            </table>

            <table class="table-section">
              <thead>
                <tr>
                  <th colspan="2">${isMl ? 'കുടുംബ വിവരങ്ങളും അപേക്ഷാ വിവരങ്ങളും' : 'Household & Application Particulars'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="label-col">${isMl ? 'കുടുംബം / മഹല്ല് രജി. നമ്പർ' : 'Household Name / Reg No.'}</td>
                  <td class="value-col">${application.house_name} • ${isMl ? 'മഹല്ല് രജി. നമ്പർ:' : 'Reg No:'} ${application.mahallu_reg_no}</td>
                </tr>
                <tr>
                  <td class="label-col">${isMl ? 'ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ' : 'Applicant Contact'}</td>
                  <td class="value-col">${isMl ? 'ഫോൺ:' : 'Phone:'} ${application.applicant_phone} | ${isMl ? 'ഇമെയിൽ:' : 'Email:'} ${application.applicant_email}</td>
                </tr>
                <tr>
                  <td class="label-col">${isMl ? 'അപേക്ഷ സമർപ്പിച്ചത്' : 'Application Submitted At'}</td>
                  <td class="value-col">${submittedAtFormatted}</td>
                </tr>
                ${
                  reviewedAtFormatted
                    ? `
                <tr>
                  <td class="label-col">${isMl ? 'അംഗീകരിച്ച തീയതി' : 'Committee Approval Date'}</td>
                  <td class="value-col">${reviewedAtFormatted}</td>
                </tr>
                `
                    : ''
                }
                ${
                  application.admin_notes
                    ? `
                <tr>
                  <td class="label-col">${isMl ? 'കമ്മിറ്റിയുടെ കുറിപ്പ്' : 'Committee Remarks'}</td>
                  <td class="value-col">${application.admin_notes}</td>
                </tr>
                `
                    : ''
                }
              </tbody>
            </table>


            <div class="signatures-row">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">${isMl ? 'അപേക്ഷകന്റെ ഒപ്പ്' : 'Applicant Signature'}</div>
              </div>
              <div class="seal-box">
                ${isMl ? 'മഹല്ല്<br/>സീൽ' : 'Mahallu<br/>Seal'}
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">${isMl ? 'ജനറൽ സെക്രട്ടറി / ഖാസി' : 'General Secretary / Qazi'}</div>
              </div>
            </div>

            <div class="footer-line">
              ${isMl ? 'തയ്യാറാക്കിയത്' : 'Generated on'} ${new Date().toLocaleDateString()} • ${isMl ? 'ഔദ്യോഗിക ഡിജിറ്റൽ രജിസ്ട്രി സ്ലിപ്പ് • കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല്' : 'Official Digital Registry Slip • Kunjikkulam Juma Masjid Mahallu'}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അക്നോളജ്മെന്റ്' : 'Marriage Certificate Acknowledgment'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">Ref: {certNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content / Preview */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Header Banner */}
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200/80">
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              {isMl ? 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല് കമ്മിറ്റി' : 'Kunjikkulam Juma Masjid Mahallu Committee'}
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              {isMl ? 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ സ്വീകൃതി പത്രം' : 'Marriage Certificate Application Acknowledgment'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isMl ? 'Marriage Certificate Application Acknowledgment' : 'വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷ സ്വീകൃതി പത്രം'}
            </p>
          </div>

          {/* Status Message */}
          {isApproved ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center space-y-1">
              <p className="text-sm sm:text-base font-extrabold text-emerald-950 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                {isMl
                  ? 'നിങ്ങളുടെ അപേക്ഷ സ്വീകരിച്ചു, സർട്ടിഫിക്കറ്റിനായി മഹല്ല് കമ്മിറ്റിയുമായി ബന്ധപ്പെടുക'
                  : 'Your application is accepted, contact mahal committee for certificate'}
              </p>
              <p className="text-xs font-semibold text-emerald-800">
                {isMl
                  ? 'നിങ്ങളുടെ അപേക്ഷ സ്വീകരിച്ചു. സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റുന്നതിനായി മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.'
                  : 'നിങ്ങളുടെ അപേക്ഷ സ്വീകരിച്ചു. സർട്ടിഫിക്കറ്റ് കൈപ്പറ്റുന്നതിനായി മഹല്ല് കമ്മിറ്റി ഓഫീസുമായി ബന്ധപ്പെടുക.'}
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-center space-y-1">
              <p className="text-sm font-bold text-amber-950">
                {isMl ? 'അപേക്ഷ പരിശോധനയിലാണ്' : 'Application Under Verification'}
              </p>
              <p className="text-xs text-amber-800">
                {isMl ? 'നിങ്ങളുടെ അപേക്ഷ മഹല്ല് കമ്മിറ്റിയുടെ പരിശോധനയിലാണ്.' : 'നിങ്ങളുടെ അപേക്ഷ മഹല്ല് കമ്മിറ്റിയുടെ പരിശോധനയിലാണ്.'}
              </p>
            </div>
          )}

          {/* Couple Particulars */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-700" />
              {isMl ? 'അപേക്ഷകരുടെയും ദമ്പതികളുടെയും വിവരങ്ങൾ' : 'Applicant & Couple Details'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">{isMl ? 'വരൻ (ഭർത്താവ്)' : 'Husband (Groom)'}</span>
                <span className="font-bold text-slate-900">{application.husband_name}</span>
                <span className="text-slate-500 block text-[11px] mt-0.5">{isMl ? 'ജനനം:' : 'DOB:'} {application.husband_dob}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">{isMl ? 'വധു (ഭാര്യ)' : 'Wife (Bride)'}</span>
                <span className="font-bold text-slate-900">{application.wife_full_name} ({application.wife_initial})</span>
                <span className="text-slate-500 block text-[11px] mt-0.5">{isMl ? 'ജനനം:' : 'DOB:'} {application.wife_dob}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">{isMl ? 'വധുവിന്റെ പിതാവ്' : "Wife's Father"}</span>
                <span className="font-semibold text-slate-800">{application.wife_father_name}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">{isMl ? 'നിക്കാഹ് തീയതി' : 'Date of Nikah'}</span>
                <span className="font-bold text-emerald-800">{application.date_of_nikah}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 sm:col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">{isMl ? 'വധുവിന്റെ സ്ഥിര മേൽവിലാസം' : 'Wife Permanent Address'}</span>
                <span className="font-medium text-slate-800">{application.wife_address}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 sm:col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">{isMl ? 'കുടുംബ വിവരങ്ങൾ' : 'Household & Contact'}</span>
                <span className="font-medium text-slate-800">
                  {application.house_name} ({isMl ? 'രജി. നമ്പർ:' : 'Reg No:'} {application.mahallu_reg_no}) • {application.applicant_phone} • {application.applicant_email}
                </span>
              </div>
            </div>
          </div>

          {/* Committee Note if any */}
          {application.admin_notes && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950">
              <span className="font-bold block text-emerald-900 mb-0.5">{isMl ? 'കമ്മിറ്റിയുടെ കുറിപ്പ്:' : 'Committee Notes:'}</span>
              <p>{application.admin_notes}</p>
            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {isMl ? 'ക്ലോസ് ചെയ്യുക' : 'Close'}
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-2 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            {isMl ? 'അക്നോളജ്മെന്റ് പ്രിന്റ് ചെയ്യുക / PDF' : 'Print Acknowledgment / Save PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}
