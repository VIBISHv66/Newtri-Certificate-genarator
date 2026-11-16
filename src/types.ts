export type CertType = 'Course' | 'Value-added' | 'Internship' | 'Workshop';
export type CertStatus = 'pending' | 'approved' | 'revoked';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank' | 'Card';

export const CERT_TYPES: CertType[] = ['Course', 'Value-added', 'Internship', 'Workshop'];

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries',
  'Electricity & water',
  'Internet & phone',
  'Marketing & ads',
  'Software & subscriptions',
  'Travel',
  'Office supplies',
  'Repairs & maintenance',
  'Taxes & fees',
  'Other',
] as const;

export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank', 'Card'];

export interface PublicCertificate {
  certificateId: string;
  qrToken: string;
  studentName: string;
  college: string;
  course: string;
  certType: CertType;
  duration: string;
  startDate: string;
  endDate: string;
  issueDate: string;
  status: CertStatus;
  approvalNote: string;
  scanCount: number;
  lastScanAt: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentContact {
  certificateId: string;
  qrToken: string;
  phone: string;
  email: string;
  emailSentAt: string;
  waSentAt: string;
  sendError: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CombinedCertificate extends PublicCertificate {
  phone: string;
  email: string;
  emailSentAt: string;
  waSentAt: string;
  sendError: string;
  liveScans: number;
}

export interface ExpenseRecord {
  id: string;
  spentOn: string;
  category: string;
  description: string;
  payee: string;
  method: PaymentMethod;
  amount: number;
  voidedAt: string;
  createdBy: string;
}

export interface PortalSettings {
  companyName: string;
  websiteUrl: string;
  publicBaseUrl: string;
  whatsappGroupInvite: string;
}

export interface ParsedSheetRow {
  name: string;
  college: string;
  course: string;
  type: string;
  duration: string;
  start: string;
  end: string;
  phone: string;
  email: string;
}
