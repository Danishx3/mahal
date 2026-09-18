'use client';
import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { FinancialLedger, TransactionType, HouseWithDetails, PaymentDue } from '@/lib/supabase/types';
import { ledgerEntrySchema, LedgerEntryInput } from '@/lib/schemas';
import { formatCurrency, formatDateTime, formatDate, getHouseHeadName, generateReceiptNumber } from '@/lib/utils';
import { DigitalReceipt } from '@/components/resident/DigitalReceipt';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Building2,
  Plus,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  AlertTriangle,
  User,
  Receipt,
  Calendar,
  RotateCcw,
  X,
  FileText,
} from 'lucide-react';

export default function FinancialLedgerPage() {
  const { toast } = useToast();
  const [ledger, setLedger] = useState<FinancialLedger[]>([]);
  const [houses, setHouses] = useState<HouseWithDetails[]>([]);
  const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, balance: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('all');

  const formatDateForInput = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyDatePreset = (preset: 'all' | 'today' | 'this_month' | 'last_month' | 'this_year') => {
    const now = new Date();
    setDatePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const today = formatDateForInput(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'this_month') {
      const firstDay = formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
      const lastDay = formatDateForInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'last_month') {
      const firstDay = formatDateForInput(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const lastDay = formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 0));
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'this_year') {
      const firstDay = formatDateForInput(new Date(now.getFullYear(), 0, 1));
      const lastDay = formatDateForInput(new Date(now.getFullYear(), 11, 31));
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };

  const handleResetAllFilters = () => {
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
    toast('All filters cleared to All-Time view', 'info');
  };

  // Manual Transaction Entry Modal
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<TransactionType>('credit');
  const [category, setCategory] = useState('Donation');
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Transaction Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FinancialLedger | null>(null);
  const [revertDueStatus, setRevertDueStatus] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Digital Receipt View Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{ due: PaymentDue; house: HouseWithDetails } | null>(null);

  const loadLedger = async () => {
    const [list, sum, housesList] = await Promise.all([
      DataService.getLedgerAsync(),
      DataService.getFinancialSummaryAsync(),
      DataService.getHousesAsync(),
    ]);
    setLedger(list);
    setSummary(sum);
    setHouses(housesList);
  };

  useEffect(() => {
    loadLedger();
    window.addEventListener('mahallu_data_updated', loadLedger);
    return () => window.removeEventListener('mahallu_data_updated', loadLedger);
  }, []);

  // Map and resolver to identify the house, head of family, and receipt number for any ledger entry
  const houseResolver = React.useMemo(() => {
    const dueMap = new Map<string, HouseWithDetails>();
    const dueObjMap = new Map<string, { due: PaymentDue; house: HouseWithDetails }>();
    const regMap = new Map<string, HouseWithDetails>();
    const nameMap = new Map<string, HouseWithDetails>();

    for (const h of houses) {
      if (h.mahallu_reg_no) {
        regMap.set(h.mahallu_reg_no.trim().toUpperCase(), h);
      }
      if (h.house_name) {
        nameMap.set(h.house_name.trim().toLowerCase(), h);
      }
      if (Array.isArray(h.payment_dues)) {
        for (const d of h.payment_dues) {
          if (d.id) {
            dueMap.set(d.id, h);
            dueObjMap.set(d.id, { due: d, house: h });
          }
        }
      }
    }

    return (item: FinancialLedger): {
      house: HouseWithDetails | null;
      due: PaymentDue | null;
      headName: string;
      houseName: string;
      regNo: string;
      receiptNo: string;
      billingMonth: string;
      isDuesOrHouse: boolean;
    } => {
      let matchedHouse: HouseWithDetails | null = null;
      let matchedDue: PaymentDue | null = null;

      // 1. By payment_due_id
      if (item.payment_due_id && dueObjMap.has(item.payment_due_id)) {
        const entry = dueObjMap.get(item.payment_due_id)!;
        matchedDue = entry.due;
        matchedHouse = entry.house;
      } else if (item.payment_due_id && dueMap.has(item.payment_due_id)) {
        matchedHouse = dueMap.get(item.payment_due_id) || null;
      }

      // 2. By reg no in description
      if (!matchedHouse && item.description) {
        const match = item.description.match(/(MHL-[A-Z0-9-]+|KL-[A-Z0-9-]+)/i);
        if (match) {
          matchedHouse = regMap.get(match[1].toUpperCase()) || null;
        }
      }

      // 3. By house name in description
      if (!matchedHouse && item.description) {
        for (const [lowerName, h] of nameMap.entries()) {
          if (lowerName.length > 3 && item.description.toLowerCase().includes(lowerName)) {
            matchedHouse = h;
            break;
          }
        }
      }

      let headName = '';
      let houseName = '';
      let regNo = '';
      let billingMonth = matchedDue?.billing_month || '';

      if (matchedHouse) {
        headName = getHouseHeadName(matchedHouse);
        houseName = matchedHouse.house_name;
        regNo = matchedHouse.mahallu_reg_no;
      } else if (item.description) {
        const headMatch = item.description.match(/Head:\s*([^|\n\r]+)/i);
        if (headMatch) {
          headName = headMatch[1].trim();
        }
        const houseMatch = item.description.match(/House:\s*([^|\n\r]+)/i);
        if (houseMatch) {
          const parts = houseMatch[1].trim().split(/\s*-\s*|\s*\(/);
          regNo = parts[0]?.trim() || '';
          houseName = parts[1]?.replace(/\)/g, '')?.trim() || '';
        }
      }

      if (!billingMonth && item.description) {
        const monthMatch = item.description.match(/Month:\s*(\d{4}-\d{2})/i);
        if (monthMatch) {
          billingMonth = monthMatch[1];
        }
      }

      if (!matchedDue && matchedHouse && billingMonth && Array.isArray(matchedHouse.payment_dues)) {
        matchedDue = matchedHouse.payment_dues.find((d) => d.billing_month === billingMonth) || null;
      }

      // Compute or extract receipt number
      let receiptNo = '';
      const explicitRec = item.description?.match(/REC-[A-Z0-9-]+/i);
      if (explicitRec) {
        receiptNo = explicitRec[0].toUpperCase();
      } else if (billingMonth && regNo) {
        receiptNo = generateReceiptNumber(billingMonth, regNo);
      } else if (item.payment_due_id && regNo) {
        receiptNo = generateReceiptNumber(item.created_at.slice(0, 7), regNo);
      }

      const isDuesOrHouse = item.category === 'House Monthly Due' || Boolean(matchedHouse) || Boolean(headName) || Boolean(receiptNo);

      return {
        house: matchedHouse,
        due: matchedDue,
        headName: headName || (isDuesOrHouse ? '—' : ''),
        houseName: houseName || (matchedHouse?.house_name || ''),
        regNo: regNo || (matchedHouse?.mahallu_reg_no || ''),
        receiptNo,
        billingMonth,
        isDuesOrHouse,
      };
    };
  }, [houses]);

  // Filtered entries with date range and receipt number matching
  const filteredLedger = ledger.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const itemDate = new Date(item.created_at);
      if (itemDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const itemDate = new Date(item.created_at);
      if (itemDate > end) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qClean = q.replace(/[^a-z0-9]/g, '');
      const resolved = houseResolver(item);
      const recClean = resolved.receiptNo.toLowerCase().replace(/[^a-z0-9]/g, '');

      return (
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.amount.toString().includes(q) ||
        resolved.headName.toLowerCase().includes(q) ||
        resolved.houseName.toLowerCase().includes(q) ||
        resolved.regNo.toLowerCase().includes(q) ||
        (resolved.receiptNo && (
          resolved.receiptNo.toLowerCase().includes(q) ||
          (qClean.length >= 2 && recClean.includes(qClean))
        ))
      );
    }
    return true;
  });

  // Dynamic financial aggregations based on current filter
  const filteredTotalCredit = React.useMemo(() => {
    return filteredLedger
      .filter((item) => item.type === 'credit')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredLedger]);

  const filteredTotalDebit = React.useMemo(() => {
    return filteredLedger
      .filter((item) => item.type === 'debit')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredLedger]);

  const filteredNetBalance = filteredTotalCredit - filteredTotalDebit;
  const creditCount = filteredLedger.filter((item) => item.type === 'credit').length;
  const debitCount = filteredLedger.filter((item) => item.type === 'debit').length;

  const isFiltered = Boolean(
    startDate ||
    endDate ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    searchQuery.trim()
  );

  const categories = Array.from(new Set(ledger.map((item) => item.category)));

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast('Please enter a valid positive amount', 'error');
      return;
    }
    if (!description.trim()) {
      toast('Please provide a detailed description', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await DataService.addLedgerEntryAsync({
        type: entryType,
        category,
        amount: numAmount,
        description: description.trim(),
      });
      setEntryModalOpen(false);
      setAmount('');
      setDescription('');
      toast(`Recorded manual ${entryType} transaction of ${formatCurrency(numAmount)}!`, 'success');
      await loadLedger();
    } catch {
      toast('Failed to record transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (item: FinancialLedger) => {
    setItemToDelete(item);
    setRevertDueStatus(true);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await DataService.deleteLedgerEntryAsync(itemToDelete.id, revertDueStatus);
      toast(`Deleted ${itemToDelete.category} transaction (${formatCurrency(itemToDelete.amount)}) from ledger`, 'success');
      setDeleteModalOpen(false);
      setItemToDelete(null);
      await loadLedger();
    } catch (err: any) {
      toast(err?.message || 'Failed to delete ledger entry', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Receipt No', 'Head of Family', 'House Name', 'Reg No', 'Amount (INR)', 'Description', 'Due ID'];
    const rows = filteredLedger.map((item) => {
      const resolved = houseResolver(item);
      return [
        `"${new Date(item.created_at).toISOString()}"`,
        `"${item.type}"`,
        `"${item.category}"`,
        `"${(resolved.receiptNo || '').replace(/"/g, '""')}"`,
        `"${(resolved.headName || '').replace(/"/g, '""')}"`,
        `"${(resolved.houseName || '').replace(/"/g, '""')}"`,
        `"${(resolved.regNo || '').replace(/"/g, '""')}"`,
        item.amount,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${item.payment_due_id || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateRangeTag = startDate || endDate
      ? `_${startDate || 'start'}_to_${endDate || 'end'}`
      : `_${new Date().toISOString().slice(0, 10)}`;
    link.setAttribute('download', `mahallu_financial_ledger${dateRangeTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`Exported ${filteredLedger.length} ledger transactions to CSV`, 'success');
  };

  const handleExportPDF = () => {
    if (filteredLedger.length === 0) {
      toast('No transactions to export for the current filter', 'error');
      return;
    }

    let printFrame = document.getElementById('ledger-print-frame') as HTMLIFrameElement | null;
    if (printFrame) {
      printFrame.remove();
    }

    printFrame = document.createElement('iframe');
    printFrame.id = 'ledger-print-frame';
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

    const periodLabel = startDate || endDate
      ? `${startDate ? formatDate(startDate) : 'Beginning'} to ${endDate ? formatDate(endDate) : 'Today'}`
      : 'All Time Records';

    const filterCriteria: string[] = [];
    if (startDate || endDate) filterCriteria.push(`Period: ${periodLabel}`);
    if (typeFilter !== 'all') filterCriteria.push(`Type: ${typeFilter.toUpperCase()}`);
    if (categoryFilter !== 'all') filterCriteria.push(`Category: ${categoryFilter}`);
    if (searchQuery.trim()) filterCriteria.push(`Search: "${searchQuery.trim()}"`);

    const rowsHtml = filteredLedger.map((item, index) => {
      const resolved = houseResolver(item);
      const isCredit = item.type === 'credit';
      const formattedDate = formatDateTime(item.created_at);
      const displayHead = resolved.headName && resolved.headName !== '—' ? resolved.headName : '';
      const displayHouse = resolved.houseName ? `${resolved.houseName} ${resolved.regNo ? `(${resolved.regNo})` : ''}` : '';
      const householdText = displayHead
        ? `${displayHead}${displayHouse ? `<br><span style="color:#64748b;font-size:10px;">${displayHouse}</span>` : ''}`
        : (resolved.regNo || '<span style="color:#94a3b8">Mosque / General</span>');
      const recBadge = resolved.receiptNo
        ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#ecfdf5;color:#065f46;font-weight:700;font-family:monospace;font-size:10px;border:1px solid #a7f3d0">${resolved.receiptNo}</span>`
        : '—';

      return `
        <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;font-size:11px;color:#334155;">${formattedDate}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">
            <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;${
              isCredit ? 'background:#dcfce7;color:#166534;' : 'background:#ffe4e6;color:#9f1239;'
            }">${item.type}</span>
          </td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:11px;color:#0f172a;">${item.category}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#1e293b;">${householdText}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${recBadge}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:10.5px;color:#475569;max-width:240px;">${item.description || '—'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:800;font-size:11.5px;white-space:nowrap;color:${isCredit ? '#047857' : '#be123c'};">
            ${isCredit ? '+' : '-'} ${formatCurrency(item.amount)}
          </td>
        </tr>
      `;
    }).join('');

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Financial Ledger Statement - ${periodLabel}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm 12mm 12mm 12mm;
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
              padding: 10px;
            }
            .header-wrap {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #065f46;
              padding-bottom: 12px;
              margin-bottom: 14px;
            }
            .title-main {
              font-size: 20px;
              font-weight: 800;
              color: #064e3b;
              letter-spacing: -0.5px;
            }
            .title-sub {
              font-size: 11px;
              font-weight: 600;
              color: #047857;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
            .org-details {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
            }
            .meta-right {
              text-align: right;
              font-size: 10.5px;
              color: #475569;
            }
            .meta-badge {
              display: inline-block;
              background: #ecfdf5;
              color: #065f46;
              font-weight: 700;
              font-size: 11px;
              padding: 4px 10px;
              border-radius: 6px;
              border: 1px solid #a7f3d0;
              margin-bottom: 4px;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 14px;
            }
            .sum-card {
              border-radius: 8px;
              padding: 10px 14px;
              border: 1px solid #e2e8f0;
            }
            .sum-card.green {
              background: #f0fdf4;
              border-color: #bbf7d0;
            }
            .sum-card.rose {
              background: #fff1f2;
              border-color: #fecdd3;
            }
            .sum-card.slate {
              background: #f8fafc;
              border-color: #cbd5e1;
            }
            .sum-card.dark {
              background: #064e3b;
              color: #ffffff;
              border-color: #064e3b;
            }
            .sum-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: #64748b;
            }
            .sum-card.green .sum-label { color: #166534; }
            .sum-card.rose .sum-label { color: #9f1239; }
            .sum-card.dark .sum-label { color: #a7f3d0; }
            .sum-value {
              font-size: 17px;
              font-weight: 800;
              margin-top: 3px;
              letter-spacing: -0.3px;
            }
            .sum-card.green .sum-value { color: #15803d; }
            .sum-card.rose .sum-value { color: #be123c; }
            .sum-card.dark .sum-value { color: #ffffff; }
            .sum-sub {
              font-size: 9px;
              margin-top: 2px;
              color: #64748b;
            }
            .sum-card.dark .sum-sub { color: #cbd5e1; }
            .filter-banner {
              background: #f1f5f9;
              border-radius: 6px;
              padding: 6px 12px;
              font-size: 10px;
              color: #334155;
              margin-bottom: 12px;
              display: flex;
              gap: 16px;
              align-items: center;
              flex-wrap: wrap;
            }
            .table-wrap {
              width: 100%;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              overflow: hidden;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              text-align: left;
            }
            thead {
              background: #f1f5f9;
            }
            th {
              padding: 8px 10px;
              font-size: 9.5px;
              text-transform: uppercase;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: #475569;
              border-bottom: 1.5px solid #cbd5e1;
            }
            .footer-wrap {
              margin-top: 24px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding-top: 14px;
              border-top: 1px solid #e2e8f0;
              font-size: 9.5px;
              color: #64748b;
            }
            .sign-grid {
              display: flex;
              gap: 40px;
            }
            .sign-box {
              text-align: center;
              width: 130px;
            }
            .sign-line {
              border-top: 1px solid #94a3b8;
              margin-bottom: 4px;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header-wrap">
            <div>
              <div class="title-main">Kunjikkulam Juma Masjid Mahallu Muslim Jama-ath</div>
              <div class="title-sub">Official Financial Accounts & Ledger Statement</div>
              <div class="org-details">Reg. No: KL-MLP-2024 • Reconciled Double-Entry Audit Statement</div>
            </div>
            <div class="meta-right">
              <div class="meta-badge">Audit Statement</div>
              <div><strong>Period:</strong> ${periodLabel}</div>
              <div><strong>Generated On:</strong> ${formatDateTime(new Date().toISOString())}</div>
              <div><strong>Records:</strong> ${filteredLedger.length} transactions</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="sum-card green">
              <div class="sum-label">Total Inflow (Credits)</div>
              <div class="sum-value">${formatCurrency(filteredTotalCredit)}</div>
              <div class="sum-sub">${creditCount} credit entries</div>
            </div>
            <div class="sum-card rose">
              <div class="sum-label">Total Outflow (Debits)</div>
              <div class="sum-value">${formatCurrency(filteredTotalDebit)}</div>
              <div class="sum-sub">${debitCount} debit entries</div>
            </div>
            <div class="sum-card slate">
              <div class="sum-label">Selected Period Net Flow</div>
              <div class="sum-value" style="color:${filteredNetBalance >= 0 ? '#047857' : '#be123c'}">
                ${filteredNetBalance >= 0 ? '+' : ''}${formatCurrency(filteredNetBalance)}
              </div>
              <div class="sum-sub">Inflow minus Outflow</div>
            </div>
            <div class="sum-card dark">
              <div class="sum-label">Treasury Cash Balance</div>
              <div class="sum-value">${formatCurrency(summary.balance)}</div>
              <div class="sum-sub">All-Time Reconciled Balance</div>
            </div>
          </div>

          ${filterCriteria.length > 0 ? `
            <div class="filter-banner">
              <strong>Applied Filters:</strong>
              ${filterCriteria.map(f => `<span>• ${f}</span>`).join('')}
            </div>
          ` : ''}

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 14%">Date & Time</th>
                  <th style="width: 8%; text-align:center;">Type</th>
                  <th style="width: 15%">Category</th>
                  <th style="width: 21%">Household & Head</th>
                  <th style="width: 13%; text-align:center;">Receipt No</th>
                  <th style="width: 17%">Description / Ref</th>
                  <th style="width: 12%; text-align:right;">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div class="footer-wrap">
            <div>
              <div><strong>Mahallu Accounting System</strong> • Confidential Internal Audit Document</div>
              <div>Printed: ${new Date().toLocaleString()} • Authorized Mahallu Committee Copy</div>
            </div>
            <div class="sign-grid">
              <div class="sign-box">
                <div style="height:25px;"></div>
                <div class="sign-line"><strong>Treasurer</strong></div>
                <div>Mahallu Committee</div>
              </div>
              <div class="sign-box">
                <div style="height:25px;"></div>
                <div class="sign-line"><strong>General Secretary</strong></div>
                <div>Mahallu Committee</div>
              </div>
              <div class="sign-box">
                <div style="height:25px;"></div>
                <div class="sign-line"><strong>President</strong></div>
                <div>Mahallu Committee</div>
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

    toast('Preparing PDF export statement...', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Mahallu Financial Accounts & Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Double-entry bookkeeping audit of all monthly membership dues, public donations, and community expenditures.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2 text-emerald-800 border-emerald-300 hover:bg-emerald-50">
            <FileText className="h-4 w-4 text-emerald-700" />
            Export PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setEntryModalOpen(true)}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Record Transaction
          </Button>
        </div>
      </div>

      {/* 3 Hero Cards with Dynamic Aggregation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Inflow (Credits) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Inflow (Credits)
              </span>
              {isFiltered && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Filtered ({creditCount})
                </span>
              )}
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-emerald-800">
              {formatCurrency(filteredTotalCredit)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isFiltered
                ? `${creditCount} credit entries in filtered view`
                : 'Monthly dues collections & public donations'}
            </p>
          </div>
        </div>

        {/* Total Outflow (Debits) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Outflow (Debits)
              </span>
              {isFiltered && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Filtered ({debitCount})
                </span>
              )}
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-700">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-rose-700">
              {formatCurrency(filteredTotalDebit)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isFiltered
                ? `${debitCount} debit entries in filtered view`
                : 'Mosque power, sound repair, aid & maintenance'}
            </p>
          </div>
        </div>

        {/* Current Cash/Bank Balance / Net Period Flow */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-6 rounded-3xl shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                {isFiltered ? 'Period Net Balance' : 'Treasury Cash Balance'}
              </span>
              {isFiltered && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Filtered Flow
                </span>
              )}
            </div>
            <div className="p-2.5 rounded-2xl bg-white/10 text-emerald-300">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {isFiltered
                ? `${filteredNetBalance >= 0 ? '+' : ''}${formatCurrency(filteredNetBalance)}`
                : formatCurrency(summary.balance)}
            </div>
            <p className="text-xs text-emerald-200/80 mt-1">
              {isFiltered
                ? `Net flow for selected filter • All-Time Treasury: ${formatCurrency(summary.balance)}`
                : 'Reconciled across bank & cash accounts'}
            </p>
          </div>
        </div>
      </div>

      {/* Date Range, Filter & Search Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Top Row: Date Presets & Date Pickers */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              Period:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyDatePreset(preset.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => applyDatePreset('all')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear date filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Type, Category, and Search */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('credit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === 'credit' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Credits Only
            </button>
            <button
              onClick={() => setTypeFilter('debit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === 'debit' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Debits Only
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full md:w-auto"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by receipt no (e.g. REC-202607-U042), head name, house, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Third Row: Active Filter Indicators & Reset Action */}
        {isFiltered && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-600">
                Showing <strong className="text-slate-900">{filteredLedger.length}</strong> of{' '}
                <strong className="text-slate-900">{ledger.length}</strong> entries:
              </span>

              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                  <Calendar className="h-3 w-3 text-emerald-600" />
                  {startDate ? formatDate(startDate) : 'Start'} – {endDate ? formatDate(endDate) : 'End'}
                  <button
                    type="button"
                    onClick={() => applyDatePreset('all')}
                    className="hover:text-emerald-950 ml-0.5 cursor-pointer"
                    title="Clear date filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {typeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-300">
                  Type: {typeFilter === 'credit' ? 'Credits' : 'Debits'}
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className="hover:text-slate-950 ml-0.5 cursor-pointer"
                    title="Clear type filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-300">
                  Category: {categoryFilter}
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className="hover:text-slate-950 ml-0.5 cursor-pointer"
                    title="Clear category filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-300">
                  Search: &ldquo;{searchQuery.trim()}&rdquo;
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-slate-950 ml-0.5 cursor-pointer"
                    title="Clear search query"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-50 transition-colors ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Ledger Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Household & Head of House</th>
                <th className="py-3.5 px-4">Description / Reference</th>
                <th className="py-3.5 px-6 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No ledger transactions matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((item) => {
                  const resolved = houseResolver(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 text-slate-600 whitespace-nowrap">
                        {formatDateTime(item.created_at)}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={item.type} size="sm">
                          {item.type}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.category}
                      </td>

                      <td className="py-3.5 px-4">
                        {resolved.headName && resolved.headName !== '—' ? (
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                              <span className="truncate">{resolved.headName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              {resolved.houseName && <span>{resolved.houseName}</span>}
                              {resolved.houseName && resolved.regNo && <span>•</span>}
                              {resolved.regNo && (
                                <span className="font-mono text-emerald-800 font-semibold">{resolved.regNo}</span>
                              )}
                            </div>
                            {resolved.receiptNo && (
                              <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px]">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold">
                                  <Receipt className="h-2.5 w-2.5 text-emerald-600" />
                                  {resolved.receiptNo}
                                </span>
                                {resolved.house && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const effectiveDue: PaymentDue = resolved.due || {
                                        id: item.payment_due_id || `due-${item.id}`,
                                        house_id: resolved.house!.id,
                                        billing_month: resolved.billingMonth || item.created_at.slice(0, 7),
                                        amount: item.amount,
                                        transaction_ref: item.description?.match(/Ref:\s*([^|\n]+)/i)?.[1]?.trim() || `LEDGER-${item.id.slice(0, 8)}`,
                                        status: 'verified',
                                        submitted_at: item.created_at,
                                        verified_at: item.created_at,
                                        verified_by: item.created_by,
                                        rejection_reason: null,
                                      };
                                      setReceiptData({ due: effectiveDue, house: resolved.house! });
                                      setReceiptModalOpen(true);
                                    }}
                                    className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer"
                                    title="View & Print Official Digital Receipt"
                                  >
                                    View Receipt
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : resolved.isDuesOrHouse ? (
                          <div className="text-slate-400 text-xs">
                            <span className="font-mono text-slate-600">
                              {resolved.regNo || resolved.houseName || 'House Dues'}
                            </span>
                            {resolved.receiptNo && (
                              <div className="mt-0.5 font-mono text-[10px] text-emerald-800 font-bold">
                                {resolved.receiptNo}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Mosque / General</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                        {item.description}
                      </td>

                      <td
                        className={`py-3.5 px-6 text-right font-extrabold text-sm whitespace-nowrap ${
                          item.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {item.type === 'credit' ? '+' : '-'} {formatCurrency(item.amount)}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete this transaction entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Transaction Entry Drawer / Modal */}
      <Modal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        title="Post Manual Transaction Entry"
        description="Record offline donations, cash dues, or mosque operational expenditures into the ledger."
      >
        <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
          {/* Credit vs Debit Toggle */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Transaction Nature *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEntryType('credit');
                  if (category === 'Electricity' || category === 'Maintenance') setCategory('Donation');
                }}
                className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${entryType === 'credit'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-100'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                Credit (Income / Inflow)
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryType('debit');
                  if (category === 'House Monthly Due' || category === 'Donation') setCategory('Maintenance');
                }}
                className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${entryType === 'debit'
                  ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-100'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <ArrowUpRight className="h-4 w-4 text-rose-600" />
                Debit (Expense / Outflow)
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Category *</label>
            <select
              value={category}
              onChange={(e) => {
                const newCat = e.target.value;
                setCategory(newCat);
                if (newCat !== 'House Monthly Due') {
                  setSelectedHouseId('');
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              {entryType === 'credit' ? (
                <>
                  <option value="Donation">Public / Well-wisher Donation</option>
                  <option value="House Monthly Due">House Monthly Due (Offline Cash)</option>
                  <option value="Madrasa Collection">Madrasa Education Fund</option>
                  <option value="Friday Collection">Friday Jumua Collection</option>
                  <option value="Other">Other (Will mention in description)</option>
                </>
              ) : (
                <>
                  <option value="Maintenance">Mosque / Madrasa Maintenance</option>
                  <option value="Electricity">KSEB Electricity & Water</option>
                  <option value="Relief Aid">Medical & Relief Financial Aid</option>
                  <option value="Salaries">Staff / Imam / Muazzin Stipend</option>
                  <option value="Sound System">Azaan Speaker & Sound Repair</option>
                  <option value="Other">Other (Will mention in description)</option>
                </>
              )}
            </select>
          </div>

          {/* Household Selector for Dues Entries */}
          {entryType === 'credit' && category === 'House Monthly Due' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Select Household (Head of Family) *
              </label>
              <select
                value={selectedHouseId}
                onChange={(e) => {
                  const hId = e.target.value;
                  setSelectedHouseId(hId);
                  const targetH = houses.find((h) => h.id === hId);
                  if (targetH) {
                    const headName = getHouseHeadName(targetH);
                    const curMonth = new Date().toISOString().slice(0, 7);
                    const dueAmt = DataService.getMonthlyDueAmount(curMonth);
                    if (!amount) setAmount(String(dueAmt));
                    setDescription(
                      `Monthly Dues (Offline Cash) - Month: ${curMonth} | House: ${targetH.mahallu_reg_no} - ${targetH.house_name} | Head: ${headName}`
                    );
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="">-- Choose Household (Sorted by Reg No) --</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.mahallu_reg_no} - {h.house_name} (Head: {getHouseHeadName(h)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Amount (INR ₹) *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none font-bold"
              required
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Audit Description & Purpose *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Offline cash contribution by sponsor or Invoice #489 paid for minaret repair"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEntryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Post to Ledger
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Transaction / Payment Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }
        }}
        title="Delete Ledger Transaction"
        description="Are you sure you want to delete this payment or transaction from the financial ledger?"
        maxWidth="md"
      >
        {itemToDelete && (
          <div className="space-y-4 text-xs">
            {/* Warning Callout */}
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-950">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Financial Ledger Audit Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-800">
                Deleting this record will immediately update the Mahallu accounts, recalculate total inflow, outflow, and treasury balance.
              </p>
            </div>

            {/* Transaction Details Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={itemToDelete.type} size="sm">
                    {itemToDelete.type}
                  </Badge>
                  <span className="font-bold text-slate-900 text-sm">{itemToDelete.category}</span>
                </div>
                <span
                  className={`font-black text-base ${
                    itemToDelete.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {itemToDelete.type === 'credit' ? '+' : '-'} {formatCurrency(itemToDelete.amount)}
                </span>
              </div>

              {itemToDelete && (() => {
                const resolved = houseResolver(itemToDelete);
                if (resolved.headName && resolved.headName !== '—') {
                  return (
                    <>
                      <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                        <span>Head of Family:</span>
                        <strong className="text-slate-900 flex items-center gap-1 font-bold">
                          <User className="h-3 w-3 text-emerald-700" />
                          {resolved.headName} ({resolved.houseName || resolved.regNo})
                        </strong>
                      </div>
                      {resolved.receiptNo && (
                        <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                          <span>Receipt Number:</span>
                          <strong className="text-emerald-800 font-mono font-bold flex items-center gap-1">
                            <Receipt className="h-3 w-3 text-emerald-600" />
                            {resolved.receiptNo}
                          </strong>
                        </div>
                      )}
                    </>
                  );
                }
                return null;
              })()}

              <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                <span>Transaction Date:</span>
                <strong className="text-slate-800">{formatDateTime(itemToDelete.created_at)}</strong>
              </div>

              {itemToDelete.description && (
                <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">
                    Description & Reference
                  </span>
                  {itemToDelete.description}
                </div>
              )}
            </div>

            {/* Household Due Reversion Toggle */}
            {(itemToDelete.payment_due_id || itemToDelete.category === 'House Monthly Due') && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revertDueStatus}
                  onChange={(e) => setRevertDueStatus(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300 cursor-pointer"
                />
                <div className="text-[11px] text-amber-950">
                  <span className="font-bold block">Revert linked household due to Pending (Unpaid)</span>
                  <span className="text-amber-800">
                    Marks the household's monthly fee as pending/unpaid again so it is accurately reflected on the defaulters and payment records.
                  </span>
                </div>
              </label>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                className="gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete Transaction
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Digital Receipt View / Print Modal */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Official Mahallu Electronic Receipt"
        maxWidth="2xl"
      >
        {receiptData && (
          <DigitalReceipt
            due={receiptData.due}
            house={receiptData.house}
            onClose={() => setReceiptModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
