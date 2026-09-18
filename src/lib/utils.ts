import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export function getHouseHead(house?: {
  family_members?: Array<{ is_head_of_family?: boolean; name?: string }> | null;
} | null) {
  if (!house || !Array.isArray(house.family_members) || house.family_members.length === 0) {
    return null;
  }
  return house.family_members.find((m) => m.is_head_of_family) || house.family_members[0] || null;
}

export function getHouseHeadName(house?: {
  family_members?: Array<{ is_head_of_family?: boolean; name?: string }> | null;
} | null): string {
  const head = getHouseHead(house);
  return head?.name?.trim() || '—';
}

export function generateReceiptNumber(
  billingMonth?: string | null,
  mahalluRegNo?: string | null
): string {
  if (!billingMonth || !mahalluRegNo) return '';
  const monthClean = billingMonth.replace(/[^0-9]/g, '').slice(0, 6);
  const regClean = mahalluRegNo.replace(/[^A-Za-z0-9]/g, '').slice(-4);
  if (!monthClean || !regClean) return '';
  return `REC-${monthClean}-${regClean}`.toUpperCase();
}


