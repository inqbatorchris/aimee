import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistance, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatMbps(mbps: number): string {
  return `${mbps} Mbps`;
}

export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date, formatStr: string = 'PP'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

export function formatTimeAgo(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

export function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getStatusColor(status: string) {
  const statusMap: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-red-500',
    suspended: 'bg-yellow-500',
    pending: 'bg-blue-500',
    paid: 'bg-green-500',
    unpaid: 'bg-red-500',
    new: 'bg-blue-500',
    open: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    waiting_on_customer: 'bg-purple-500',
    waiting_on_agent: 'bg-orange-500',
    resolved: 'bg-green-500',
    closed: 'bg-gray-500',
    credited: 'bg-green-500',
    completed: 'bg-blue-500',
    default: 'bg-gray-500'
  };
  
  return statusMap[status.toLowerCase()] || statusMap.default;
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function validatePassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return regex.test(password);
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validatePostcode(postcode: string): boolean {
  // Basic UK postcode validation
  const regex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  return regex.test(postcode);
}

export function validatePhoneNumber(phone: string): boolean {
  // Basic UK phone number validation
  const regex = /^(?:(?:\+|00)44|0)7\d{9}$/;
  return regex.test(phone);
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Helper function to convert avatar URL to API endpoint
export function getAvatarUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // If it's an /objects/ path, serve it through our API
  if (url.startsWith('/objects/')) {
    return `/api/core${url}`;
  }
  return url;
}
