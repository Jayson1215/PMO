/**
 * UTILITY FUNCTIONS (utils.ts)
 * ----------------------------
 * Functionality: General helpers for formatting dates, colors, and strings.
 * Connection: Used by almost every UI component for consistent display.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * CLASS MERGER (cn)
 * Functionality: Combines Tailwind CSS classes and handles conditional styling.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * DATE FORMATTER
 * Functionality: Converts database dates into a readable Philippines format (e.g., January 1, 2024).
 * Connection: Used in Tables and Detail views.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  }).format(new Date(date));
}

export function formatTimeRemaining(returnDate: string): string {
  const now = new Date();
  const ret = new Date(returnDate);
  const diff = ret.getTime() - now.getTime();

  if (diff < 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    return `Overdue by ${hours}h ${minutes}m`;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }

  return `${hours}h ${minutes}m remaining`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    borrowed: 'bg-blue-100 text-blue-800 border-blue-200',
    returned: 'bg-gray-100 text-gray-800 border-gray-200',
    overdue: 'bg-red-100 text-red-900 border-red-300',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    available: 'bg-green-100 text-green-800',
    maintenance: 'bg-orange-100 text-orange-800',
    unavailable: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getEquipmentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    maintenance: 'bg-amber-100 text-amber-700',
    unavailable: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function validateFSUUEmail(email: string): boolean {
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || '';
  if (!domain) return true; // Allow any email when domain not set
  return email.toLowerCase().endsWith(`@${domain}`);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
