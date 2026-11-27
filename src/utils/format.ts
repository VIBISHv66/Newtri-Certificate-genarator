import { CertType } from '../types';

export function fmtDate(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function normalizeDate(val: unknown): string {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number' && Number.isFinite(val) && val > 20000 && val < 90000) {
    // Excel serial date (days since 1899-12-30)
    const utcMs = Math.round((val - 25569) * 86400 * 1000);
    const dt = new Date(utcMs);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 10);
    }
  }
  const s = String(val ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return isValidIsoDate(s) ? s : '';
  if (/^\d{5}$/.test(s)) {
    const num = Number(s);
    if (num > 20000 && num < 90000) {
      const utcMs = Math.round((num - 25569) * 86400 * 1000);
      const dt = new Date(utcMs);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    }
  }
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return '';
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  const p1 = Number(m[1]);
  const p2 = Number(m[2]);
  // Prefer DD/MM/YYYY (standard in India), fallback to MM/DD/YYYY if p2 > 12
  if (p2 > 12 && p1 <= 12) {
    const mm = String(p1).padStart(2, '0');
    const dd = String(p2).padStart(2, '0');
    return isValidIsoDate(`${year}-${mm}-${dd}`) ? `${year}-${mm}-${dd}` : '';
  }
  const day = String(p1).padStart(2, '0');
  const month = String(p2).padStart(2, '0');
  return isValidIsoDate(`${year}-${month}-${day}`) ? `${year}-${month}-${day}` : '';
}

export function isValidIsoDate(s: string): boolean {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

export function computeDuration(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  if (days <= 0) return '';
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} Week${weeks > 1 ? 's' : ''}`;
  }
  return `${days} Day${days > 1 ? 's' : ''}`;
}

export function last10(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateCertId(endDate: string): string {
  const year = /^\d{4}/.test(endDate) ? endDate.slice(0, 4) : String(new Date().getFullYear());
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alpha[arr[i] % alpha.length];
  }
  return `NT-${year}-${suffix}`;
}

export function generateQrToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeCertType(raw: string, fallback: CertType): CertType {
  const lower = String(raw || '').trim().toLowerCase();
  if (lower === 'course' || lower === 'training') return 'Course';
  if (lower === 'value-added' || lower === 'value added' || lower === 'valueadded') return 'Value-added';
  if (lower === 'internship' || lower === 'intern') return 'Internship';
  if (lower === 'workshop' || lower === 'workshops' || lower === 'participation') return 'Workshop';
  return fallback;
}

export function formatWorkshopDatePhrase(startIso: string, endIso: string): string {
  if (!startIso) return '';
  if (!endIso || startIso === endIso) return `on ${fmtDate(startIso)}`;
  return `from ${fmtDate(startIso)} to ${fmtDate(endIso)}`;
}

export function isPrivateDevOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('ais-dev-');
}

export function cleanPublicUrl(raw?: string): string {
  let trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.hostname === 'www.google.com' || parsed.hostname === 'google.com') &&
      parsed.pathname === '/url'
    ) {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target && /^https?:\/\//i.test(target)) {
        trimmed = target.trim();
      }
    }
  } catch {
    // Keep original string if incomplete while typing
  }
  return trimmed.replace(/\/+$/, '');
}

export function resolveBaseUrl(configured?: string): string {
  const trimmed = cleanPublicUrl(configured);
  if (trimmed && /^https?:\/\//i.test(trimmed)) {
    return trimmed.replace('://ais-dev-', '://ais-pre-');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace('://ais-dev-', '://ais-pre-');
  }
  return 'https://newtritechnologies.com';
}

export function buildVerifyLink(qrToken: string, configuredBaseUrl?: string): string {
  return `${resolveBaseUrl(configuredBaseUrl)}/?t=${encodeURIComponent(qrToken)}`;
}

export function buildLookupLink(configuredBaseUrl?: string): string {
  return `${resolveBaseUrl(configuredBaseUrl)}/?verify=1`;
}

export function buildStudentWhatsAppMessage(
  studentName: string,
  course: string,
  link: string,
  companyName = 'NEWTRI Technologies'
): string {
  return `Hello ${studentName}, your ${companyName} certificate for ${course} is ready. Click here to view and download your PDF certificate: ${link}`;
}

export function buildWhatsAppDirectUrl(phone10: string, message: string): string {
  return `https://wa.me/91${phone10}?text=${encodeURIComponent(message)}`;
}

export function buildGroupWhatsAppDigest(
  certs: Array<{ studentName: string; course: string; certificateId: string; qrToken: string }>,
  baseUrl?: string,
  companyName = 'NEWTRI Technologies',
  websiteUrl = 'https://newtritechnologies.com/'
): string {
  const lines = [
    `*${companyName} — Certificates Ready*`,
    `Click your link anytime to view & download your PDF certificate (with QR verification):`,
    '',
  ];
  for (const c of certs) {
    lines.push(`• *${c.studentName}* (${c.certificateId}) — ${buildVerifyLink(c.qrToken, baseUrl)}`);
  }
  lines.push('');
  lines.push(`Verify any certificate at: ${buildLookupLink(baseUrl)}`);
  lines.push(`Website: ${websiteUrl}`);
  return lines.join('\n');
}

export function csvSafeCell(value: unknown): string {
  const s = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const content = [
    headers.map(csvSafeCell).join(','),
    ...rows.map((r) => r.map(csvSafeCell).join(',')),
  ].join('\r\n');
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function formatInr(amount: number): string {
  const fixed = Number(amount || 0).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const neg = intPart.startsWith('-') ? '-' : '';
  const digits = intPart.replace('-', '');
  if (digits.length <= 3) return `₹${neg}${digits}.${decPart}`;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${neg}${rest},${lastThree}.${decPart}`;
}
