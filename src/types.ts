export interface InvoiceRecord {
  id: string; // Internal UUID or database primary key
  invoice: string; // Invoice ID (e.g., INV-2026-001) - Read-only / Immutable
  amount: number | null; // Amount in USD (numeric data type in DB)
  vendor: string; // Vendor name (e.g., AWS, Figma, Uber)
  category: string; // Category (e.g., Cloud & Infrastructure, SaaS, Travel)
  date: string; // Date formatted as YYYY-MM-DD
  rawSnippet?: string; // Original raw text snippet extracted
  created_at?: string;
  updated_at?: string;
}

export interface DraftInvoiceItem {
  id?: string;
  invoice: string | null;
  amount: number | null;
  vendor: string | null;
  category: string | null;
  date: string | null;
  rawSnippet?: string;
}

export type PeriodFilter = 'all' | 'month' | 'week';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  token?: string;
  isDemo?: boolean;
}

export interface ParseInvoiceResponse {
  success: boolean;
  records?: InvoiceRecord[];
  needsHumanReview?: boolean;
  confidence?: number;
  reasonsForReview?: string[];
  draftInvoices?: DraftInvoiceItem[];
  rawText?: string;
  isInvalidInput?: boolean;
  isCommandInjection?: boolean;
  error?: string;
  method?: string;
}

export const PRESET_CATEGORIES = [
  'Cloud & Hosting',
  'Software & SaaS',
  'Office Supplies',
  'Travel & Transport',
  'Marketing & Ads',
  'Consulting & Professional',
  'Hardware & Equipment',
  'Utilities & Telecom',
  'Meals & Entertainment',
  'Other',
] as const;
