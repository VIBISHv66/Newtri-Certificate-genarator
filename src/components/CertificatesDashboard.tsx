import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Mail,
  MessageCircle,
  Pencil,
  QrCode,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  CERT_TYPES,
  CertStatus,
  CombinedCertificate,
  PortalSettings,
} from '../types';
import {
  buildGroupWhatsAppDigest,
  buildLookupLink,
  buildStudentWhatsAppMessage,
  buildVerifyLink,
  buildWhatsAppDirectUrl,
  downloadCsv,
  fmtDate,
  isPrivateDevOrigin,
  last10,
} from '../utils/format';
import {
  deleteCertificates,
  resetContactsSendStatus,
  savePortalSettings,
  updateCertificatesStatus,
  updateContactDelivery,
} from '../services/certService';
import { ServerCapabilities } from '../services/deliveryService';
import { generateCertificatePdf } from '../utils/pdf';
import { UploadSheetPanel } from './UploadSheetPanel';
import { EditCertificateModal } from './EditCertificateModal';
import { BulkDispatchModal } from './BulkDispatchModal';

interface CertificatesDashboardProps {
  certs: CombinedCertificate[];
  loading: boolean;
  settings: PortalSettings;
  capabilities: ServerCapabilities;
  adminEmail: string;
  onSettingsUpdated: (next: PortalSettings) => void;
  onPreviewCertificate: (qrToken: string) => void;
  onNotify: (message: string) => void;
}

export const CertificatesDashboard: React.FC<CertificatesDashboardProps> = ({
  certs,
  loading,
  settings,
  capabilities,
  adminEmail,
  onSettingsUpdated,
  onPreviewCertificate,
  onNotify,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | CertStatus>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [collegeFilter, setCollegeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCert, setEditingCert] = useState<CombinedCertificate | null>(null);
  const [copiedToken, setCopiedToken] = useState<string>('');
  const [groupModalCerts, setGroupModalCerts] = useState<CombinedCertificate[] | null>(null);
  const [confirmDeleteCerts, setConfirmDeleteCerts] = useState<CombinedCertificate[] | null>(null);
  const [qrModal, setQrModal] = useState<{
    cert: CombinedCertificate;
    url: string;
    dataUrl: string;
  } | null>(null);
  const [dispatchModal, setDispatchModal] = useState<{
    targets: CombinedCertificate[];
    tab: 'email' | 'whatsapp';
  } | null>(null);

  const openQrModal = async (cert: CombinedCertificate) => {
    const url = buildVerifyLink(cert.qrToken, settings.publicBaseUrl);
    const dataUrl = await QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: '#0B2A5B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
    setQrModal({ cert, url, dataUrl });
  };

  const handleDirectPdf = async (cert: CombinedCertificate) => {
    const url = buildVerifyLink(cert.qrToken, settings.publicBaseUrl);
    await generateCertificatePdf(cert, url, settings.companyName, settings.websiteUrl);
    onNotify(`Downloaded ${cert.certificateId}.pdf`);
  };

  const colleges = useMemo(() => {
    const set = new Set<string>();
    certs.forEach((c) => {
      if (c.college) set.add(c.college);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [certs]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let revoked = 0;
    let sent = 0;
    let scans = 0;
    let unsent = 0;
    let failed = 0;

    for (const c of certs) {
      if (c.status === 'pending') pending++;
      else if (c.status === 'approved') approved++;
      else if (c.status === 'revoked') revoked++;

      if (c.emailSentAt) sent++;
      scans += c.liveScans || 0;
      if (c.sendError) failed++;
      if (c.status === 'approved' && !c.sendError && c.email && !c.emailSentAt) {
        unsent++;
      }
    }

    return {
      all: certs.length,
      pending,
      approved,
      revoked,
      sent,
      scans,
      unsent,
      failed,
    };
  }, [certs]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return certs.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter && c.certType !== typeFilter) return false;
      if (collegeFilter && c.college !== collegeFilter) return false;
      if (!q) return true;
      return (
        c.studentName.toLowerCase().includes(q) ||
        c.certificateId.toLowerCase().includes(q) ||
        c.course.toLowerCase().includes(q) ||
        c.college.toLowerCase().includes(q)
      );
    });
  }, [certs, statusFilter, typeFilter, collegeFilter, searchQuery]);

  const selectedCerts = useMemo(
    () => filtered.filter((c) => selectedIds.has(c.certificateId)),
    [filtered, selectedIds]
  );

  const toggleAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filtered.map((c) => c.certificateId)));
  };

  const toggleOne = (certId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(certId)) next.delete(certId);
      else next.add(certId);
      return next;
    });
  };

  const handleCopyLink = async (cert: CombinedCertificate) => {
    const url = buildVerifyLink(cert.qrToken, settings.publicBaseUrl);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(cert.certificateId);
      setTimeout(() => setCopiedToken(''), 1600);
    } catch {
      onNotify(`Copy link: ${url}`);
    }
  };

  const handleApproveAllAndOpenSend = async () => {
    const pendingCerts = certs.filter((c) => c.status === 'pending');
    if (pendingCerts.length) {
      await updateCertificatesStatus(pendingCerts, 'approved');
      onNotify(`Approved ${pendingCerts.length} pending certificate(s).`);
    }
    const queue = certs.map((c) =>
      c.status === 'pending' ? { ...c, status: 'approved' as CertStatus } : c
    );
    setDispatchModal({
      targets: queue.filter((c) => c.status === 'approved'),
      tab: 'email',
    });
  };

  const handleRetryFailed = async () => {
    const failedCerts = certs.filter((c) => Boolean(c.sendError));
    if (!failedCerts.length) return;
    await resetContactsSendStatus(failedCerts.map((c) => c.certificateId));
    setDispatchModal({
      targets: failedCerts.map((c) => ({ ...c, sendError: '', emailSentAt: '' })),
      tab: 'email',
    });
  };

  const handleBulkAction = async (
    action: 'approve' | 'bulk_email' | 'bulk_wa' | 'revoke' | 'resend' | 'delete' | 'wa_group'
  ) => {
    if (!selectedCerts.length) return;
    if (action === 'wa_group') {
      setGroupModalCerts(selectedCerts.filter((c) => c.status === 'approved'));
      return;
    }
    if (action === 'bulk_email') {
      const pendingInSel = selectedCerts.filter((c) => c.status === 'pending');
      if (pendingInSel.length) await updateCertificatesStatus(pendingInSel, 'approved');
      setDispatchModal({
        targets: selectedCerts.map((c) =>
          c.status === 'pending' ? { ...c, status: 'approved' as CertStatus } : c
        ),
        tab: 'email',
      });
      return;
    }
    if (action === 'bulk_wa') {
      const pendingInSel = selectedCerts.filter((c) => c.status === 'pending');
      if (pendingInSel.length) await updateCertificatesStatus(pendingInSel, 'approved');
      setDispatchModal({
        targets: selectedCerts.map((c) =>
          c.status === 'pending' ? { ...c, status: 'approved' as CertStatus } : c
        ),
        tab: 'whatsapp',
      });
      return;
    }
    if (action === 'delete') {
      setConfirmDeleteCerts(selectedCerts);
      return;
    }
    if (action === 'approve') {
      await updateCertificatesStatus(selectedCerts, 'approved');
      onNotify(`Approved ${selectedCerts.length} certificate(s).`);
      setSelectedIds(new Set());
      return;
    }
    if (action === 'revoke') {
      await updateCertificatesStatus(selectedCerts, 'revoked');
      onNotify(`Revoked ${selectedCerts.length} certificate(s).`);
      setSelectedIds(new Set());
      return;
    }
    if (action === 'resend') {
      await resetContactsSendStatus(selectedCerts.map((c) => c.certificateId));
      onNotify(`Reset delivery status for ${selectedCerts.length} certificate(s).`);
      setSelectedIds(new Set());
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Certificate ID',
      'Student',
      'College',
      'Course',
      'Type',
      'Duration',
      'Start',
      'End',
      'Status',
      'Phone',
      'Email',
      'Email sent',
      'Verify link',
    ];
    const rows = filtered.map((c) => [
      c.certificateId,
      c.studentName,
      c.college,
      c.course,
      c.certType,
      c.duration,
      c.startDate,
      c.endDate,
      c.status,
      c.phone,
      c.email,
      c.emailSentAt,
      buildVerifyLink(c.qrToken, settings.publicBaseUrl),
    ]);
    downloadCsv(`newtri_certificates_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const openGroupDigest = () => {
    const targets = (selectedCerts.length ? selectedCerts : filtered).filter(
      (c) => c.status === 'approved'
    );
    setGroupModalCerts(targets);
  };

  const groupDigestText = useMemo(() => {
    if (!groupModalCerts) return '';
    return buildGroupWhatsAppDigest(
      groupModalCerts,
      settings.publicBaseUrl,
      settings.companyName,
      settings.websiteUrl
    );
  }, [groupModalCerts, settings]);

  const [switchingBaseUrl, setSwitchingBaseUrl] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const configuredBase = (settings.publicBaseUrl || '').trim().replace(/\/+$/, '');
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const showBaseMismatchAlert = (() => {
    if (!configuredBase || !currentOrigin || isLocalHost || isPrivateDevOrigin()) return false;
    try {
      return new URL(configuredBase).origin !== currentOrigin;
    } catch {
      return true;
    }
  })();

  const handleUseCurrentSiteUrl = async () => {
    if (!currentOrigin) return;
    setSwitchingBaseUrl(true);
    try {
      const next: PortalSettings = {
        ...settings,
        publicBaseUrl: currentOrigin,
      };
      await savePortalSettings(next);
      onSettingsUpdated(next);
      onNotify(`All student & QR links switched to ${currentOrigin}`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update public URL.');
    } finally {
      setSwitchingBaseUrl(false);
    }
  };

  return (
    <div className="space-y-6">
      {showBaseMismatchAlert && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <div className="font-bold">
                  Certificate Links Point to <span className="font-mono">{configuredBase}</span>
                </div>
                <p className="mt-0.5 text-xs text-amber-900 leading-relaxed">
                  You are currently signed in on <span className="font-mono font-semibold">{currentOrigin}</span>, so clicking links pointing to <span className="font-mono">{configuredBase}</span> will show &ldquo;Page not found&rdquo; unless that old URL is hosted. Switch all QR codes and student links to your active site below.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={switchingBaseUrl}
              onClick={() => void handleUseCurrentSiteUrl()}
              className="btn-tactile shrink-0 rounded-lg bg-[#0B2A5B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] disabled:opacity-60 cursor-pointer"
            >
              {switchingBaseUrl ? 'Updating...' : `Use ${currentOrigin}`}
            </button>
          </div>
        </section>
      )}

      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Total Certificates</div>
          <div className="mt-1 text-2xl font-bold text-[#0B2A5B] tabular-nums">{counts.all}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Pending Approval</div>
          <div className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">{counts.pending}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Approved Active</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
            {counts.approved}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Emails Delivered</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{counts.sent}</div>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1">
          <div className="text-xs font-medium text-slate-500">QR &amp; Link Scans</div>
          <div className="mt-1 text-2xl font-bold text-[#1f6feb] tabular-nums">{counts.scans}</div>
        </div>
      </section>

      {/* Step 1: Upload / Single Add */}
      <UploadSheetPanel existingCerts={certs} onCompleted={(msg) => onNotify(msg)} />

      {/* Step 2: Approve, Send & Manage */}
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              2. Approve, Distribute &amp; Track
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Send certificates individually or to 50+ students at once so every recipient receives their own personal link.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDispatchModal({
                  targets: selectedCerts.length ? selectedCerts : filtered,
                  tab: 'whatsapp',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>
                Send WhatsApp Individually ({selectedCerts.length || filtered.filter((c) => c.status === 'approved').length})
              </span>
            </button>
            <button
              type="button"
              onClick={openGroupDigest}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Users className="h-4 w-4" />
              <span>WhatsApp Group List</span>
            </button>
          </div>
        </div>

        {/* Dispatch Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#0B2A5B] p-4 text-white">
          <div>
            <div className="text-sm font-semibold">
              Batch Individual Dispatch ({capabilities.smtpConfigured ? 'Gmail SMTP' : 'Gmail / Compose'})
            </div>
            <div className="mt-0.5 text-xs text-blue-100 tabular-nums">
              {counts.unsent} approved certificate(s) with email waiting · Select 50+ rows or send all filtered at once
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {counts.pending > 0 && (
              <button
                type="button"
                onClick={handleApproveAllAndOpenSend}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-[#0B2A5B] hover:bg-blue-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Approve Pending &amp; Send ({counts.pending})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setDispatchModal({
                  targets: selectedCerts.length ? selectedCerts : filtered,
                  tab: 'email',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>
                Send Email Batch ({selectedCerts.length || filtered.filter((c) => c.status === 'approved').length})
              </span>
            </button>
            {counts.failed > 0 && (
              <button
                type="button"
                onClick={handleRetryFailed}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry Failed ({counts.failed})</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                ['all', `All (${counts.all})`],
                ['pending', `Pending (${counts.pending})`],
                ['approved', `Approved (${counts.approved})`],
                ['revoked', `Revoked (${counts.revoked})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  toggleAllVisible(selectedCerts.length !== filtered.length)
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {selectedCerts.length === filtered.length
                  ? `Deselect All (${filtered.length})`
                  : `Select All Filtered (${filtered.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, ID, course, or college"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-[#1f6feb] focus:outline-none"
            />
          </div>

          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="max-w-[240px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
          >
            <option value="">All colleges</option>
            {colleges.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
          >
            <option value="">All types</option>
            {CERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {(searchQuery || collegeFilter || typeFilter || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCollegeFilter('');
                setTypeFilter('');
                setStatusFilter('all');
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sticky Bulk Selection Bar */}
        {selectedCerts.length > 0 && (
          <div className="sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg">
            <span className="mr-2 text-xs font-bold tabular-nums">
              {selectedCerts.length} selected
            </span>
            <button
              type="button"
              onClick={() => void handleBulkAction('approve')}
              className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => void handleBulkAction('bulk_email')}
              className="rounded-md bg-[#1f6feb] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#1558c0] cursor-pointer"
            >
              Send Email Individually
            </button>
            <button
              type="button"
              onClick={() => void handleBulkAction('bulk_wa')}
              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
            >
              Send WhatsApp Individually
            </button>
            <button
              type="button"
              onClick={() => void handleBulkAction('wa_group')}
              className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-600 cursor-pointer"
            >
              WhatsApp Group List
            </button>
            <button
              type="button"
              onClick={() => void handleBulkAction('revoke')}
              className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-600 cursor-pointer"
            >
              Revoke
            </button>
            <button
              type="button"
              onClick={() => void handleBulkAction('resend')}
              className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-600 cursor-pointer"
            >
              Mark Not Sent
            </button>
            <button
              type="button"
              onClick={() => void handleBulkAction('delete')}
              className="ml-auto rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}

        {/* Table (fits cleanly without clipping Certificate ID) */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="w-9 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all visible rows"
                    checked={filtered.length > 0 && selectedCerts.length === filtered.length}
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                  />
                </th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Certificate ID</th>
                <th className="px-3 py-3 font-semibold">Student &amp; College</th>
                <th className="px-3 py-3 font-semibold">Programme</th>
                <th className="px-3 py-3 font-semibold">Period</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Delivery</th>
                <th className="px-3 py-3 text-right font-semibold">Scans</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Loading certificates from cloud database...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <div className="font-semibold text-slate-800">
                      No certificates match your filters
                    </div>
                    <p className="mt-1">Upload a student spreadsheet or add a single student above.</p>
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((c) => {
                  const link = buildVerifyLink(c.qrToken, settings.publicBaseUrl);
                  const ph = last10(c.phone);
                  const waMsg = buildStudentWhatsAppMessage(
                    c.studentName,
                    c.course,
                    link,
                    settings.companyName
                  );
                  return (
                    <tr key={c.certificateId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.certificateId)}
                          onChange={() => toggleOne(c.certificateId)}
                          aria-label={`Select ${c.studentName}`}
                        />
                      </td>
                      <td className="px-3 py-3 align-top font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {c.certificateId}
                      </td>
                      <td className="px-3 py-3 align-top min-w-[160px]">
                        <div className="font-semibold text-slate-900">{c.studentName}</div>
                        <div className="text-slate-500">{c.college}</div>
                      </td>
                      <td className="px-3 py-3 align-top min-w-[130px]">
                        <div className="font-medium text-slate-800">{c.course}</div>
                        <div className="text-slate-500">{c.certType}</div>
                      </td>
                      <td className="px-3 py-3 align-top tabular-nums text-slate-600 whitespace-nowrap">
                        <div>{c.duration || '—'}</div>
                        <div className="text-[11px] text-slate-500">
                          {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {c.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approved
                          </span>
                        )}
                        {c.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            Pending
                          </span>
                        )}
                        {c.status === 'revoked' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-[11px] whitespace-nowrap">
                        {c.emailSentAt && (
                          <div className="font-medium text-emerald-700">Email sent</div>
                        )}
                        {c.waSentAt && (
                          <div className="font-medium text-emerald-700">WhatsApp sent</div>
                        )}
                        {!c.emailSentAt && !c.waSentAt && !c.sendError && (
                          <span className="text-slate-400">
                            {c.email || ph ? 'Not sent yet' : 'No contact'}
                          </span>
                        )}
                        {c.sendError && (
                          <div
                            className="max-w-[140px] truncate font-medium text-red-700"
                            title={c.sendError}
                          >
                            {c.sendError}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-right font-mono font-semibold text-slate-800 tabular-nums">
                        {c.liveScans}
                      </td>
                      <td className="px-3 py-3 align-top min-w-[230px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() =>
                                void updateCertificatesStatus([c], 'approved').then(() =>
                                  onNotify(`Approved ${c.studentName}.`)
                                )
                              }
                              className="rounded-md bg-[#1f6feb] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#1558c0] cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingCert(c)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            title="Edit details"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>

                          {c.status === 'approved' && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleDirectPdf(c)}
                                className="inline-flex items-center gap-1 rounded-md bg-[#0B2A5B] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
                                title="Download PDF Certificate with QR Code"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => void openQrModal(c)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                title="Inspect unique QR code"
                              >
                                <QrCode className="h-3 w-3" />
                                QR
                              </button>
                              <button
                                type="button"
                                onClick={() => onPreviewCertificate(c.qrToken)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                title="Open student certificate & PDF"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCopyLink(c)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                {copiedToken === c.certificateId ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    Link
                                  </>
                                )}
                              </button>
                              {ph ? (
                                <a
                                  href={buildWhatsAppDirectUrl(ph, waMsg)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() =>
                                    void updateContactDelivery(c.certificateId, {
                                      waSentAt: new Date().toISOString(),
                                      sendError: '',
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  WhatsApp
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onNotify(`Add a 10-digit phone number for ${c.studentName} in Edit.`);
                                    setEditingCert(c);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500 cursor-pointer"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  +Phone
                                </button>
                              )}
                              {c.email ? (
                                <button
                                  type="button"
                                  onClick={() => setDispatchModal({ targets: [c], tab: 'email' })}
                                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-[#0B2A5B] hover:bg-blue-100 cursor-pointer"
                                >
                                  <Mail className="h-3 w-3" />
                                  Email
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onNotify(`Add an email address for ${c.studentName} in Edit.`);
                                    setEditingCert(c);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500 cursor-pointer"
                                >
                                  <Mail className="h-3 w-3" />
                                  +Email
                                </button>
                              )}
                            </>
                          )}

                          {c.status !== 'revoked' && (
                            <button
                              type="button"
                              onClick={() =>
                                void updateCertificatesStatus([c], 'revoked').then(() =>
                                  onNotify(`Revoked ${c.certificateId}.`)
                                )
                              }
                              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50 cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCerts([c])}
                            className="inline-flex items-center rounded-md border border-red-200 bg-white p-1 text-red-700 hover:bg-red-50 cursor-pointer"
                            title="Delete permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Modal */}
      {editingCert && (
        <EditCertificateModal
          cert={editingCert}
          onClose={() => setEditingCert(null)}
          onSaved={() => onNotify(`Updated ${editingCert.certificateId}.`)}
        />
      )}

      {/* Individual & 50+ Batch Dispatch Modal */}
      {dispatchModal && (
        <BulkDispatchModal
          targets={dispatchModal.targets}
          initialTab={dispatchModal.tab}
          settings={settings}
          capabilities={capabilities}
          adminEmail={adminEmail}
          onClose={() => setDispatchModal(null)}
          onNotify={onNotify}
        />
      )}

      {/* WhatsApp Group Batch Share Modal */}
      {groupModalCerts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  WhatsApp Group &amp; Batch Link Share
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Paste this into any student WhatsApp group so each student can click their link and download their PDF anytime—or share the single lookup link below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGroupModalCerts(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {groupModalCerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-600">
                No approved certificates in the current selection. Approve certificates first to generate active download links.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">
                    Single Verification Portal Link (students can enter their Certificate ID):
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      readOnly
                      value={buildLookupLink(settings.publicBaseUrl)}
                      className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(buildLookupLink(settings.publicBaseUrl));
                        onNotify('Verification portal link copied.');
                      }}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      Copy Portal Link
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Batch WhatsApp Group Message ({groupModalCerts.length} student links)</span>
                  </div>
                  <textarea
                    readOnly
                    rows={10}
                    value={groupDigestText}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(groupDigestText);
                      onNotify('WhatsApp group message copied.');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Group Message</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(groupDigestText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Open in WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unique QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3 text-left">
              <div>
                <h3 className="text-base font-bold text-slate-900">{qrModal.cert.studentName}</h3>
                <p className="font-mono text-xs text-slate-500">{qrModal.cert.certificateId}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrModal(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={qrModal.dataUrl}
              alt={`QR code for ${qrModal.cert.certificateId}`}
              className="mx-auto mt-4 h-52 w-52 rounded-lg border border-slate-200 p-2"
            />
            <p className="mt-2 break-all font-mono text-[11px] text-slate-500">{qrModal.url}</p>
            <div className="mt-4 flex justify-center gap-2">
              <a
                href={qrModal.dataUrl}
                download={`${qrModal.cert.certificateId}_QR.png`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Save QR PNG
              </a>
              <button
                type="button"
                onClick={() => void handleDirectPdf(qrModal.cert)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteCerts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Delete {confirmDeleteCerts.length} Certificate(s) Permanently?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              If any of these certificates were already sent, their QR codes and download links will stop working. Use <strong>Revoke</strong> instead if you only want to invalidate them while keeping the record.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteCerts(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targets = confirmDeleteCerts;
                  setConfirmDeleteCerts(null);
                  void deleteCertificates(targets).then(() => {
                    setSelectedIds(new Set());
                    onNotify(`Deleted ${targets.length} certificate(s).`);
                  });
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
