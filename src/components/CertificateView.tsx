import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  History,
  Printer,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { PortalSettings, PublicCertificate } from '../types';
import {
  buildStudentWhatsAppMessage,
  buildVerifyLink,
  fmtDate,
  fmtDateTime,
  formatWorkshopDatePhrase,
} from '../utils/format';
import { generateCertificatePdf } from '../utils/pdf';
import {
  fetchCertificateById,
  fetchCertificateByToken,
  recordPublicScan,
} from '../services/certService';

interface VerifyHistoryItem {
  certificateId: string;
  qrToken: string;
  studentName: string;
  course: string;
  certType: string;
  status: string;
  issueDate: string;
  verifiedAt: string;
}

const HISTORY_STORAGE_KEY = 'newtri_verify_history_v1';

function readVerifyHistory(): VerifyHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVerifyHistory(items: VerifyHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 25)));
  } catch {
    // Ignore storage quota restrictions
  }
}

interface CertificateViewProps {
  initialToken: string;
  initialCertId?: string;
  settings: PortalSettings;
  onOpenAdmin: () => void;
  onOpenAdminHistory?: () => void;
  isAdmin: boolean;
}

export const CertificateView: React.FC<CertificateViewProps> = ({
  initialToken,
  initialCertId,
  settings,
  onOpenAdmin,
  onOpenAdminHistory,
  isAdmin,
}) => {
  const [cert, setCert] = useState<PublicCertificate | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(initialToken || initialCertId));
  const [error, setError] = useState<string>('');
  const [lookupId, setLookupId] = useState<string>(initialCertId || '');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<VerifyHistoryItem[]>(() => readVerifyHistory());
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const pushToHistory = (record: PublicCertificate) => {
    setHistoryItems((prev) => {
      const entry: VerifyHistoryItem = {
        certificateId: record.certificateId,
        qrToken: record.qrToken,
        studentName: record.studentName,
        course: record.course,
        certType: record.certType,
        status: record.status,
        issueDate: record.issueDate,
        verifiedAt: new Date().toISOString(),
      };
      const next = [entry, ...prev.filter((i) => i.qrToken !== record.qrToken)].slice(0, 25);
      saveVerifyHistory(next);
      return next;
    });
  };

  const removeHistoryItem = (qrToken: string) => {
    setHistoryItems((prev) => {
      const next = prev.filter((i) => i.qrToken !== qrToken);
      saveVerifyHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    saveVerifyHistory([]);
    setHistoryItems([]);
  };

  const loadByToken = async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const found = await fetchCertificateByToken(token);
      if (!found) {
        setCert(null);
        setError('No certificate record matches this verification link.');
      } else {
        setCert(found);
        pushToHistory(found);
        const nextUrl = `${window.location.pathname}?t=${encodeURIComponent(found.qrToken)}`;
        window.history.replaceState(null, '', nextUrl);
        if (found.status === 'approved') {
          void recordPublicScan(found.certificateId);
        }
      }
    } catch {
      setCert(null);
      setError('Unable to reach verification records right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadById = async (idInput: string) => {
    const clean = idInput.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      const found = await fetchCertificateById(clean);
      if (!found) {
        setCert(null);
        setError(`No certificate found with ID "${clean}". Check the ID printed on the certificate.`);
      } else {
        setCert(found);
        pushToHistory(found);
        const nextUrl = `${window.location.pathname}?t=${encodeURIComponent(found.qrToken)}`;
        window.history.replaceState(null, '', nextUrl);
        if (found.status === 'approved') {
          void recordPublicScan(found.certificateId);
        }
      }
    } catch {
      setCert(null);
      setError('Unable to verify that certificate ID right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      void loadByToken(initialToken);
    } else if (initialCertId) {
      void loadById(initialCertId);
    }
  }, [initialToken, initialCertId]);

  const verifyUrl = cert ? buildVerifyLink(cert.qrToken, settings.publicBaseUrl) : '';

  useEffect(() => {
    if (!verifyUrl) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(verifyUrl, {
      width: 280,
      margin: 1,
      color: { dark: '#0B2A5B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [verifyUrl]);

  const handleDownloadPdf = async () => {
    if (!cert || !verifyUrl) return;
    setDownloadingPdf(true);
    try {
      await generateCertificatePdf(cert, verifyUrl, settings.companyName, settings.websiteUrl);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopy = async () => {
    if (!verifyUrl) return;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadById(lookupId);
  };

  const isWorkshop = String(cert?.certType || '').trim().toLowerCase() === 'workshop';

  const certHeading =
    cert?.certType === 'Internship'
      ? 'Certificate of Internship'
      : cert?.certType === 'Value-added'
        ? 'Value-Added Programme Certificate'
        : isWorkshop
          ? 'Certificate of Participation'
          : 'Certificate of Completion';

  return (
    <div className="portal-backdrop min-h-screen text-slate-900">
      {/* Top Bar (3-zone contract) */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-3">
          <a
            href="/?verify=1"
            className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#0B2A5B] whitespace-nowrap shrink-0"
          >
            <img
              src="/assets/newtri-logo.png"
              alt={`${settings.companyName} logo`}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white p-0.5 object-contain"
            />
            <span>{settings.companyName}</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="/?verify=1"
              className="hover:text-[#0B2A5B] transition-colors whitespace-nowrap shrink-0"
            >
              Verify Certificate
            </a>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showHistory ? 'text-[#0B2A5B] font-semibold' : 'hover:text-[#0B2A5B]'
              }`}
            >
              <span>History</span>
              {historyItems.length > 0 && (
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  ({historyItems.length})
                </span>
              )}
            </button>
            <a
              href={settings.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#0B2A5B] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Official Website</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenAdmin}
              className="btn-tactile px-4 py-2 text-xs font-semibold text-white bg-[#0B2A5B] rounded-lg hover:bg-[#123a7d] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAdmin ? 'Admin Console' : 'Admin Sign In'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Verification Search Bar */}
        <section className="no-print animate-fade-up mb-6 rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3.5">
              <img
                src="/assets/newtri-logo.png"
                alt={`${settings.companyName} logo`}
                className="hidden sm:block h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-white p-1 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#0B2A5B]">
                  Certificate Verification &amp; Download Portal
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Enter a Certificate ID (e.g. <span className="font-mono text-slate-800">NT-2026-A7K9M2</span>) or scan any {settings.companyName} QR code.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form onSubmit={handleLookupSubmit} className="flex flex-1 gap-2 md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    placeholder="Enter Certificate ID"
                    aria-label="Certificate ID"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 font-mono text-sm uppercase text-slate-900 transition-colors focus:border-[#1f6feb] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/20"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-tactile rounded-lg bg-[#1f6feb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1558c0] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Verify ID
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                aria-expanded={showHistory}
                className={`btn-tactile inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  showHistory
                    ? 'border-[#0B2A5B] bg-[#0B2A5B] text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <History className="h-4 w-4" />
                <span>History</span>
                <span className={`font-mono text-xs tabular-nums ${showHistory ? 'text-blue-100' : 'text-slate-500'}`}>
                  ({historyItems.length})
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Verification History Drawer / Section */}
        {showHistory && (
          <section className="no-print animate-fade-up mb-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-[#0B2A5B]">Recent Verification History</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Certificates scanned or verified in this browser. Click any record to re-verify live status and download.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && onOpenAdminHistory && (
                  <button
                    type="button"
                    onClick={onOpenAdminHistory}
                    className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0B2A5B] hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Full Student History</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {historyItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  aria-label="Close history"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {historyItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No verified certificates saved yet. Enter a Certificate ID above or scan a certificate QR code to record it here.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {historyItems.map((item) => {
                  const isActive = cert?.qrToken === item.qrToken;
                  return (
                    <div
                      key={item.qrToken}
                      className={`flex flex-col gap-2 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                        isActive ? 'bg-slate-50/80 -mx-3 px-3 rounded-lg' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowHistory(false);
                          void loadByToken(item.qrToken);
                        }}
                        className="min-w-0 flex-1 text-left cursor-pointer group"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-[#1f6feb] transition-colors">
                            {item.studentName}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#0B2A5B] tabular-nums">
                            {item.certificateId}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 tabular-nums">
                          <span>{item.course}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.certType}</span>
                          <span aria-hidden="true">·</span>
                          <span>Checked {fmtDateTime(item.verifiedAt)}</span>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHistory(false);
                            void loadByToken(item.qrToken);
                          }}
                          className="btn-tactile rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#1f6feb] hover:text-[#1f6feb] whitespace-nowrap cursor-pointer"
                        >
                          {isActive ? 'Viewing' : 'Open Certificate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryItem(item.qrToken)}
                          aria-label={`Remove ${item.certificateId} from history`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {loading && (
          <div className="animate-fade-up rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1f6feb]" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              Verifying certificate record...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="animate-fade-up rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              <div>
                <h2 className="text-base font-bold">Certificate Not Verified</h2>
                <p className="mt-1 text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !cert && (
          <div className="animate-fade-up space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
                <img
                  src="/assets/newtri-logo.png"
                  alt={`${settings.companyName} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Verify an Official {settings.companyName} Credential
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Open your personal WhatsApp or Email certificate link to view and download your official PDF, or enter a Certificate ID above to verify authenticity in real time.
              </p>

              <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-4 border-t border-slate-100 pt-6 text-left sm:grid-cols-3">
                <div className="card-interactive rounded-lg border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="text-xs font-bold text-[#0B2A5B]">01. Instant Lookup</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Search any <span className="font-mono">NT-YYYY-XXXXXX</span> ID to verify live status.
                  </p>
                </div>
                <div className="card-interactive rounded-lg border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="text-xs font-bold text-[#0B2A5B]">02. QR Authenticity</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Every PDF carries a tamper-proof token linked directly to issuer records.
                  </p>
                </div>
                <div className="card-interactive rounded-lg border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="text-xs font-bold text-[#0B2A5B]">03. Saved History</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Re-open any recently checked certificate anytime from History.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && cert && (
          <>
            {/* Verification Status Banner */}
            {cert.status === 'approved' && (
              <section className="no-print mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                    <div>
                      <h2 className="text-base font-bold text-emerald-950">
                        Verified Official Certificate — Issued by {settings.companyName}
                      </h2>
                      <p className="mt-1 text-sm text-emerald-900">
                        This certificate confirms that <strong>{cert.studentName}</strong>
                        {cert.college && cert.college !== 'Workshop Participant'
                          ? ` (${cert.college})`
                          : ''}{' '}
                        {isWorkshop
                          ? 'actively participated in the workshop on'
                          : `attended and completed the ${cert.certType} programme in`}{' '}
                        <strong>{cert.course}</strong>{' '}
                        {isWorkshop
                          ? formatWorkshopDatePhrase(cert.startDate, cert.endDate)
                          : `(${cert.duration || `${fmtDate(cert.startDate)} – ${fmtDate(cert.endDate)}`})`}{' '}
                        conducted by{' '}
                        <a
                          href={settings.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-semibold"
                        >
                          {settings.companyName}
                        </a>
                        .
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-800 font-mono tabular-nums">
                        <span>ID: {cert.certificateId}</span>
                        <span aria-hidden="true">·</span>
                        <span>Period: {fmtDate(cert.startDate)} – {fmtDate(cert.endDate)}</span>
                        <span aria-hidden="true">·</span>
                        <span>Issued: {fmtDate(cert.issueDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {cert.status === 'pending' && (
              <section className="no-print mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <h2 className="text-base font-bold">Pending Administrative Approval</h2>
                    <p className="mt-1 text-sm text-amber-900">
                      This certificate record (<span className="font-mono">{cert.certificateId}</span>) has been uploaded but is not yet approved for public download or official verification.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {cert.status === 'revoked' && (
              <section className="no-print mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-950">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                  <div>
                    <h2 className="text-base font-bold">Certificate Revoked</h2>
                    <p className="mt-1 text-sm text-red-900">
                      Certificate <span className="font-mono">{cert.certificateId}</span> for <strong>{cert.studentName}</strong> was revoked by {settings.companyName} and is no longer valid.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Download & Share Action Strip */}
            {cert.status === 'approved' && (
              <div className="no-print animate-fade-up mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="text-sm text-slate-600">
                  Save your PDF certificate below—scanning its QR code always opens this verification record.
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="btn-tactile inline-flex items-center gap-2 rounded-lg bg-[#0B2A5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123a7d] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-tactile inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-tactile inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Copy className="h-4 w-4" />
                    <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      buildStudentWhatsAppMessage(
                        cert.studentName,
                        cert.course,
                        verifyUrl,
                        settings.companyName
                      )
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-tactile inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 whitespace-nowrap shrink-0"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share WhatsApp</span>
                  </a>
                </div>
              </div>
            )}

            {/* Formal Certificate Preview Sheet — 100% Canva A4 Landscape (297:210) proportions */}
            {cert.status === 'approved' && isWorkshop && (
              <div
                className="print-only-sheet animate-cert-reveal cert-stage-shadow relative mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
                style={{ aspectRatio: '297 / 210', containerType: 'inline-size' }}
              >
                {/* Authentic 9% Center Watermark */}
                <img
                  src="/assets/workshop/watermark.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute select-none"
                  style={{ left: '29.97%', top: '24.48%', width: '40.07%', height: 'auto' }}
                />

                {/* Top-Left Navy Bookmark Ribbon (#0D3B66) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 35.8 77.7"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute top-0"
                  style={{ left: '4.11%', width: '12.05%', height: '37.02%' }}
                >
                  <polygon points="0,0 35.8,0 35.8,57.5 17.9,77.7 0,57.5" fill="#0D3B66" />
                </svg>

                {/* Authentic 3D Gold Rosette Medal */}
                <img
                  src="/assets/workshop/medal.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute select-none"
                  style={{ left: '5.31%', top: '8.80%', width: '9.89%', height: 'auto' }}
                />

                {/* Top-Right Geometric L-Corner (#0D3B66) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 220 140"
                  className="pointer-events-none absolute"
                  style={{ right: '4.8%', top: '5.5%', width: '22%', height: '21%' }}
                >
                  <polyline points="10,12 204,12 204,128" fill="none" stroke="#0D3B66" strokeWidth="3.5" />
                  <polygon points="10,5 17,12 10,19 3,12" fill="#0D3B66" />
                  <polygon points="10,8.5 13.5,12 10,15.5 6.5,12" fill="#fff" />
                  <polygon points="196,5 203,12 196,19 189,12" fill="#0D3B66" />
                  <polygon points="196,8.5 199.5,12 196,15.5 192.5,12" fill="#fff" />
                  <polygon points="204,14 211,21 204,28 197,21" fill="#0D3B66" />
                  <polygon points="204,17.5 207.5,21 204,24.5 200.5,21" fill="#fff" />
                  <polygon points="204,121 211,128 204,135 197,128" fill="#0D3B66" />
                  <polygon points="204,124.5 207.5,128 204,131.5 200.5,128" fill="#fff" />
                </svg>

                {/* Authentic Stacked Top-Right NEWTRI Logo */}
                <img
                  src="/assets/workshop/logo_square.png"
                  alt={settings.companyName}
                  className="pointer-events-none absolute select-none"
                  style={{ left: '81.47%', top: '8.54%', width: '10.42%', height: 'auto' }}
                />

                {/* Bottom-Left Geometric L-Corner (#0D3B66) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 220 140"
                  className="pointer-events-none absolute"
                  style={{ left: '5.0%', bottom: '5.5%', width: '22%', height: '21%' }}
                >
                  <polyline points="16,12 16,128 208,128" fill="none" stroke="#0D3B66" strokeWidth="3.5" />
                  <polygon points="16,5 23,12 16,19 9,12" fill="#0D3B66" />
                  <polygon points="16,8.5 19.5,12 16,15.5 12.5,12" fill="#fff" />
                  <polygon points="16,112 23,119 16,126 9,119" fill="#0D3B66" />
                  <polygon points="16,115.5 19.5,119 16,122.5 12.5,119" fill="#fff" />
                  <polygon points="25,121 32,128 25,135 18,128" fill="#0D3B66" />
                  <polygon points="25,124.5 28.5,128 25,131.5 21.5,128" fill="#fff" />
                  <polygon points="208,121 215,128 208,135 201,128" fill="#0D3B66" />
                  <polygon points="208,124.5 211.5,128 208,131.5 204.5,128" fill="#fff" />
                </svg>

                {/* Exact Canva Bottom-Right Sweeping Wave Corner */}
                <svg
                  aria-hidden="true"
                  viewBox="220 140 77 70"
                  className="pointer-events-none absolute bottom-0 right-0"
                  style={{ width: '25.93%', height: '33.33%' }}
                >
                  <path d="M 220.46,220.83 L 220.46,220.63 C 261.21,217.76 294.18,184.39 299.67,141.62 L 299.67,220.83 Z" fill="#3071AD" />
                  <path d="M 226.32,220.83 C 258.82,215.72 285.82,198.96 299.67,176.46 L 299.67,220.83 Z" fill="#CE9D43" />
                  <path d="M 228.23,220.83 C 259.89,217.01 286.19,204.49 299.67,187.68 L 299.67,220.83 Z" fill="#0D3B66" />
                </svg>

                {/* Center Headings */}
                <div
                  className="absolute left-0 right-0 text-center"
                  style={{ top: '13.5%', color: '#0D3B66' }}
                >
                  <h2
                    className="font-extrabold tracking-wide leading-none"
                    style={{ fontSize: '4.5cqw' }}
                  >
                    CERTIFICATE
                  </h2>
                  <div
                    className="font-normal tracking-[0.28em]"
                    style={{ marginTop: '0.8cqw', fontSize: '1.65cqw' }}
                  >
                    OF PARTICIPATION
                  </div>
                </div>

                {/* Student Name (Regular Serif matching Canva Caladea Regular) */}
                <div
                  className="absolute truncate font-normal leading-tight"
                  style={{
                    left: '16.16%',
                    top: '33.8%',
                    width: '63%',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '4.1cqw',
                    color: '#0D3B66',
                  }}
                >
                  {cert.studentName}
                </div>

                {/* Gold Rule 1 */}
                <div
                  className="absolute"
                  style={{
                    left: '16.16%',
                    top: '44.59%',
                    width: '62.14%',
                    height: '0.28cqw',
                    backgroundColor: '#CE9D43',
                  }}
                />

                {/* Workshop Attestation Body */}
                <p
                  className="absolute m-0 leading-[1.52]"
                  style={{
                    left: '16.16%',
                    top: '48.0%',
                    width: '63.3%',
                    fontSize: '1.46cqw',
                    color: '#0D3B66',
                  }}
                >
                  For actively participating in the workshop on{' '}
                  <span className="font-semibold">{cert.course}</span> conducted by{' '}
                  <span>{settings.companyName}</span>{' '}
                  {formatWorkshopDatePhrase(cert.startDate, cert.endDate)}.
                  <br />
                  We appreciate their enthusiasm and active participation throughout the workshop.
                </p>

                {/* Dynamic QR Code */}
                <div
                  className="absolute bg-white"
                  style={{ left: '8.55%', top: '75.70%', width: '7.6%', height: '10.7%' }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR verification code for ${cert.certificateId}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      QR
                    </div>
                  )}
                </div>

                {/* Certificate ID & Issued Date */}
                <div
                  className="absolute whitespace-nowrap text-left"
                  style={{ left: '17.07%', top: '76.5%', color: '#0D3B66' }}
                >
                  <div style={{ fontSize: '1.08cqw', letterSpacing: '0.04em' }}>
                    CERTIFICATE ID
                  </div>
                  <div
                    className="font-mono font-bold"
                    style={{ marginTop: '0.25cqw', fontSize: '1.12cqw' }}
                  >
                    {cert.certificateId}
                  </div>
                  <div className="font-bold" style={{ marginTop: '0.45cqw', fontSize: '1.08cqw' }}>
                    Issued: {fmtDate(cert.issueDate)}
                  </div>
                </div>

                {/* Authentic 56% Cornflower-Blue Kanyakumari Seal */}
                <img
                  src="/assets/workshop/seal_muted.png"
                  alt="NEWTRI Technologies Kanyakumari Seal"
                  className="pointer-events-none absolute select-none object-contain"
                  style={{ left: '44.69%', top: '77.47%', width: '10.51%', height: 'auto' }}
                />

                {/* Authentic Handwritten Signature */}
                <img
                  src="/assets/workshop/signature.png"
                  alt="Corporate Trainer Signature"
                  className="pointer-events-none absolute select-none object-contain"
                  style={{ left: '69.09%', top: '73.5%', width: '9.32%', height: 'auto' }}
                />

                {/* Gold Rule 2 */}
                <div
                  className="absolute"
                  style={{
                    left: '64.94%',
                    top: '80.05%',
                    width: '17.94%',
                    height: '0.24cqw',
                    backgroundColor: '#CE9D43',
                  }}
                />

                {/* Signatory Title */}
                <div
                  className="absolute text-center leading-snug"
                  style={{
                    left: '64.94%',
                    top: '81.6%',
                    width: '17.94%',
                    fontSize: '0.98cqw',
                    color: '#0D3B66',
                  }}
                >
                  CORPORATE TRAINER &amp;
                  <br />
                  PROGRAM LEAD
                </div>
              </div>
            )}

            {cert.status === 'approved' && !isWorkshop && (
              <div className="print-only-sheet animate-cert-reveal cert-stage-shadow mx-auto rounded-xl border border-slate-200 bg-[#fdfcf8] p-4 sm:p-8">
                <div className="relative border-[3px] border-[#0B2A5B] p-2 sm:p-3">
                  <div className="border border-[#B88C38] px-6 py-8 sm:px-12 sm:py-12">
                    {/* Header */}
                    <div className="text-center">
                      <img
                        src="/assets/newtri-logo.png"
                        alt={`${settings.companyName} logo`}
                        className="mx-auto mb-2.5 h-12 w-12 object-contain"
                      />
                      <div className="text-xl font-extrabold tracking-[0.18em] text-[#0B2A5B] sm:text-2xl">
                        {settings.companyName.toUpperCase()}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Karangad, Kanyakumari District, Tamil Nadu · {settings.websiteUrl.replace(/\/$/, '')}
                      </p>
                      <div className="mx-auto my-5 h-px w-48 bg-slate-300" />
                      <h2
                        className="text-2xl font-bold text-[#123a7d] sm:text-3xl"
                        style={{ fontFamily: 'var(--font-serif)' }}
                      >
                        {certHeading}
                      </h2>
                    </div>

                    {/* Recipient & Program Body */}
                    <div className="mt-8 text-center">
                      <p className="text-sm text-slate-600">This is to proudly certify that</p>
                      <p
                        className="mt-3 text-3xl font-bold italic text-slate-900 sm:text-4xl"
                        style={{ fontFamily: 'var(--font-serif)' }}
                      >
                        {cert.studentName}
                      </p>
                      <div className="mx-auto mt-2 h-0.5 w-64 bg-[#B88C38]" />
                      <p className="mt-3 text-sm font-medium text-slate-700 sm:text-base">
                        of {cert.college}
                      </p>
                      <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base">
                        has successfully attended and completed the{' '}
                        <span className="font-semibold text-slate-900">{cert.certType}</span>{' '}
                        programme in{' '}
                        <span className="font-semibold text-slate-900">{cert.course}</span>
                        {cert.duration ? ` (${cert.duration})` : ''}, conducted by{' '}
                        <span className="font-semibold text-[#0B2A5B]">{settings.companyName}</span>{' '}
                        from <span className="font-medium">{fmtDate(cert.startDate)}</span> to{' '}
                        <span className="font-medium">{fmtDate(cert.endDate)}</span>.
                      </p>
                    </div>

                    {/* Footer: Metadata + QR Code + Signatory */}
                    <div className="mt-12 grid grid-cols-1 items-end gap-8 border-t border-slate-200 pt-8 sm:grid-cols-3">
                      <div className="text-left text-xs text-slate-600 space-y-1">
                        <div className="font-mono font-semibold text-[#0B2A5B]">
                          ID: {cert.certificateId}
                        </div>
                        <div>Issued: {fmtDate(cert.issueDate)}</div>
                        <div>
                          Verified at:{' '}
                          <span className="text-slate-800">{settings.websiteUrl.replace(/\/$/, '')}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="rounded-lg border border-slate-200 bg-white p-2">
                          {qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              alt={`QR verification code for ${cert.certificateId}`}
                              className="h-24 w-24"
                            />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center text-xs text-slate-400">
                              QR
                            </div>
                          )}
                        </div>
                        <span className="mt-2 text-[10px] font-bold tracking-wider text-[#0B2A5B]">
                          SCAN TO VERIFY AUTHENTICITY
                        </span>
                      </div>

                      <div className="text-center sm:text-right">
                        <div className="ml-auto w-44 border-b border-slate-400 pb-1 text-center">
                          <span
                            className="text-lg italic text-[#0B2A5B]"
                            style={{ fontFamily: 'var(--font-serif)' }}
                          >
                            NEWTRI Admin
                          </span>
                        </div>
                        <div className="mt-1.5 text-xs font-semibold text-slate-900">
                          Authorized Signatory
                        </div>
                        <div className="text-[11px] text-slate-500">{settings.companyName}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
