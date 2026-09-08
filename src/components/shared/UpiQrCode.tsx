'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode as QrIcon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface UpiQrCodeProps {
  upiId: string;
  payeeName?: string;
  amount?: number;
  note?: string;
  size?: number;
  showDetails?: boolean;
  showOpenAppButton?: boolean;
  className?: string;
}

export function buildUpiUri(params: {
  upiId: string;
  payeeName?: string;
  amount?: number;
  note?: string;
}): string {
  const { upiId, payeeName = "Al-Huda Mahallu Jama'ath", amount, note = 'Mahallu Monthly Dues' } = params;
  const query = new URLSearchParams();
  query.set('pa', upiId.trim());
  query.set('pn', payeeName.trim());
  if (amount && amount > 0) {
    query.set('am', amount.toFixed(2));
  }
  query.set('cu', 'INR');
  if (note) {
    query.set('tn', note.trim());
  }
  return `upi://pay?${query.toString()}`;
}

export const UpiQrCode: React.FC<UpiQrCodeProps> = ({
  upiId,
  payeeName = "Al-Huda Mahallu Jama'ath",
  amount,
  note = 'Mahallu Monthly Dues',
  size = 170,
  showDetails = true,
  showOpenAppButton = true,
  className = '',
}) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  const upiUri = buildUpiUri({ upiId, payeeName, amount, note });

  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(upiUri, {
      width: size * 2, // 2x for sharp retina rendering
      margin: 1,
      color: {
        dark: '#064e3b', // Deep emerald dark modules
        light: '#ffffff', // Pure white background
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate UPI QR code:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [upiUri, size]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast(`Copied UPI ID: ${upiId}`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* QR Code Container */}
      <div className="relative p-2.5 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-md inline-block">
        {isGenerating || !qrDataUrl ? (
          <div
            style={{ width: size, height: size }}
            className="flex flex-col items-center justify-center bg-slate-50 rounded-xl text-slate-400 animate-pulse text-xs gap-1.5"
          >
            <QrIcon className="h-6 w-6 text-emerald-600 animate-spin" />
            <span>Generating QR...</span>
          </div>
        ) : (
          <div className="relative group">
            <img
              src={qrDataUrl}
              alt={`UPI QR Code for ${upiId}`}
              width={size}
              height={size}
              className="rounded-xl block"
            />
            {/* Center Brand Badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-white shadow-md border border-emerald-100 flex items-center justify-center text-emerald-800 text-xs font-black">
                ₹
              </div>
            </div>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="mt-2.5 space-y-2 w-full max-w-[260px]">
          {/* UPI ID Pill with Copy Button */}
          <div className="inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs w-full">
            <span className="font-mono font-bold text-emerald-950 truncate select-all">
              {upiId}
            </span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-md transition-colors shrink-0"
              title="Copy UPI ID"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Amount badge if provided */}
          {amount && amount > 0 ? (
            <div className="text-[11px] text-slate-600 font-medium">
              Amount: <strong className="text-emerald-800 text-xs">₹{amount.toFixed(2)}</strong>
            </div>
          ) : null}

          {/* Supported UPI Apps Badges */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium pt-0.5">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold">GPay</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60 font-semibold">PhonePe</span>
            <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60 font-semibold">Paytm</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold">BHIM</span>
          </div>
        </div>
      )}
    </div>
  );
};
