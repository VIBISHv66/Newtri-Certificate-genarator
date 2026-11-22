import {
  clearCompanyGmailSession,
  COMPANY_SENDER_EMAIL,
  getCompanyGmailToken,
} from '../firebase';
import { CombinedCertificate, PortalSettings } from '../types';
import { fmtDate } from '../utils/format';

export interface ServerCapabilities {
  smtpConfigured: boolean;
  smtpUser: string | null;
  waConfigured: boolean;
}

export async function fetchServerCapabilities(): Promise<ServerCapabilities> {
  try {
    const res = await fetch('/api/capabilities');
    if (!res.ok) return { smtpConfigured: false, smtpUser: null, waConfigured: false };
    return (await res.json()) as ServerCapabilities;
  } catch {
    return { smtpConfigured: false, smtpUser: null, waConfigured: false };
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] || c;
  });
}

function toBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeRfc2047Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function sanitizeHeaderValue(v: string): string {
  return String(v || '').replace(/[\r\n]+/g, ' ').trim();
}

function buildCertificateEmailContent(
  cert: CombinedCertificate,
  link: string,
  settings: PortalSettings
): { subject: string; html: string } {
  const company = settings.companyName || 'NEWTRI Technologies';
  const website = settings.websiteUrl || 'https://newtritechnologies.com/';
  const period =
    cert.startDate && cert.endDate && cert.startDate !== cert.endDate
      ? `${fmtDate(cert.startDate)} to ${fmtDate(cert.endDate)}`
      : fmtDate(cert.startDate || cert.issueDate);
  const subject = `Your ${company} Certificate - ${cert.course}`;
  const isWorkshop = String(cert.certType || '').trim().toLowerCase() === 'workshop';
  const detailLine = isWorkshop
    ? `Your official <b>Workshop Certificate of Participation</b> for <b>${escapeHtml(cert.course)}</b> (${escapeHtml(period)}) is ready.`
    : `Congratulations! Your <b>${escapeHtml(cert.certType)}</b> certificate for <b>${escapeHtml(cert.course)}</b>${
        cert.duration ? ` (${escapeHtml(cert.duration)})` : ''
      } (${escapeHtml(period)}) is ready.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #CFE5FF;border-radius:12px;overflow:hidden;background:#ffffff">
      <div style="background:#0B2F6B;color:#ffffff;padding:18px 22px;font-size:19px;letter-spacing:1.5px"><b>NEWTRI</b> TECHNOLOGIES</div>
      <div style="padding:22px;color:#1B2638;font-size:15px;line-height:1.6">
        <p style="margin-top:0">Dear <b>${escapeHtml(cert.studentName)}</b>,</p>
        <p>${detailLine}</p>
        <p style="font-size:13px;color:#475569">Certificate ID: <b style="font-family:monospace;color:#0B2A5B">${escapeHtml(cert.certificateId)}</b></p>
        <p style="text-align:center;margin:26px 0">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#1E6FE0;color:#ffffff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:bold">View &amp; Download Certificate</a>
        </p>
        <p style="color:#55657F;font-size:13px">Click the button anytime to open and download your PDF certificate. Anyone can scan the QR code on the certificate to verify it was issued by ${escapeHtml(company)} (${escapeHtml(website)}).</p>
        <p style="margin-bottom:0">Regards,<br/><b>${escapeHtml(company)}</b><br/>Karangad, Kanyakumari District, Tamil Nadu</p>
      </div>
    </div>`.trim();

  return { subject, html };
}

async function sendViaGmailApi(
  cert: CombinedCertificate,
  link: string,
  settings: PortalSettings,
  accessToken: string
): Promise<{ ok: boolean; error?: string }> {
  const { subject, html } = buildCertificateEmailContent(cert, link, settings);
  const companyHeader = sanitizeHeaderValue(settings.companyName || 'NEWTRI Technologies').replace(/"/g, '');
  const toHeader = sanitizeHeaderValue(cert.email);

  const rawMime = [
    `From: "${companyHeader}" <${COMPANY_SENDER_EMAIL}>`,
    `To: ${toHeader}`,
    `Subject: ${encodeRfc2047Utf8(sanitizeHeaderValue(subject))}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: toBase64UrlUtf8(rawMime) }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearCompanyGmailSession();
    }
    const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const detail = errJson?.error?.message || `Gmail API HTTP ${res.status}`;
    return {
      ok: false,
      error:
        res.status === 401 || res.status === 403
          ? `Gmail session expired or missing permission. Click "Connect ${COMPANY_SENDER_EMAIL}" and retry. (${detail})`
          : detail.slice(0, 200),
    };
  }

  return { ok: true };
}

export function isCompanySmtpReady(capabilities: ServerCapabilities): boolean {
  return (
    capabilities.smtpConfigured &&
    (capabilities.smtpUser || '').trim().toLowerCase() === COMPANY_SENDER_EMAIL
  );
}

export async function sendCertificateEmail(
  cert: CombinedCertificate,
  link: string,
  settings: PortalSettings,
  capabilities: ServerCapabilities
): Promise<{ ok: boolean; error?: string; via: 'gmail' | 'smtp' }> {
  const gmailToken = getCompanyGmailToken();
  if (gmailToken) {
    try {
      const res = await sendViaGmailApi(cert, link, settings, gmailToken);
      return { ...res, via: 'gmail' };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Gmail API delivery failed',
        via: 'gmail',
      };
    }
  }

  if (isCompanySmtpReady(capabilities)) {
    const period = `${fmtDate(cert.startDate)} to ${fmtDate(cert.endDate)}`;
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cert.email,
          studentName: cert.studentName,
          course: cert.course,
          certType: cert.certType,
          duration: cert.duration,
          period,
          link,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || `HTTP ${res.status}`, via: 'smtp' };
      }
      return { ok: true, via: 'smtp' };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'SMTP request failed',
        via: 'smtp',
      };
    }
  }

  return {
    ok: false,
    error: `Connect ${COMPANY_SENDER_EMAIL} via Gmail first so certificates send strictly from your official company email (never from personal EmailJS).`,
    via: 'gmail',
  };
}

export async function sendCertificateWhatsAppApi(
  cert: CombinedCertificate,
  link: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cert.phone,
        studentName: cert.studentName,
        course: cert.course,
        link,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'WhatsApp API failed',
    };
  }
}
