import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  LayoutGrid,
  List,
  Printer,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { CombinedCertificate, PortalSettings } from '../types';
import { buildVerifyLink, downloadCsv, fmtDate, fmtDateTime } from '../utils/format';

interface HistoryViewProps {
  certs: CombinedCertificate[];
  settings: PortalSettings;
  onPreviewCertificate: (qrToken: string) => void;
  onNotify: (msg: string) => void;
}

interface StudentGroup {
  key: string;
  name: string;
  college: string;
  phone: string;
  email: string;
  certs: CombinedCertificate[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  certs,
  settings,
  onPreviewCertificate,
  onNotify,
}) => {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'revoked'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'most' | 'az'>('recent');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [revealContact, setRevealContact] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveKey(null);
      } else if (
        e.key === '/' &&
        !['INPUT', 'SELECT', 'TEXTAREA'].includes((document.activeElement?.tagName || '').toUpperCase())
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const students = useMemo<StudentGroup[]>(() => {
    const map = new Map<string, StudentGroup>();
    for (const c of certs) {
      const k = `${c.studentName.trim().toLowerCase()}|${c.college.trim().toLowerCase()}`;
      let group = map.get(k);
      if (!group) {
        group = {
          key: k,
          name: c.studentName,
          college: c.college,
          phone: '',
          email: '',
          certs: [],
        };
        map.set(k, group);
      }
      if (!group.phone && c.phone) group.phone = c.phone;
      if (!group.email && c.email) group.email = c.email;
      group.certs.push(c);
    }
    return Array.from(map.values());
  }, [certs]);

  const colleges = useMemo(
    () => Array.from(new Set(students.map((s) => s.college))).sort((a, b) => a.localeCompare(b)),
    [students]
  );

  const types = useMemo(
    () => Array.from(new Set(certs.map((c) => c.certType))).sort(),
    [certs]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((s) => {
      const matchesStatusType = s.certs.some(
        (c) =>
          (statusFilter === 'all' || c.status === statusFilter) &&
          (typeFilter === 'all' || c.certType === typeFilter)
      );
      if (!matchesStatusType) return false;
      if (collegeFilter !== 'all' && s.college !== collegeFilter) return false;
      if (!q) return true;
      return (
        `${s.name} ${s.college}`.toLowerCase().includes(q) ||
        s.certs.some((c) => `${c.course} ${c.certificateId}`.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'most') return [...list].sort((a, b) => b.certs.length - a.certs.length);
    if (sortBy === 'az') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [students, query, statusFilter, typeFilter, collegeFilter, sortBy]);

  const activeStudent = useMemo(
    () => students.find((s) => s.key === activeKey) || null,
    [students, activeKey]
  );

  const openStudent = (key: string) => {
    setRevealContact(false);
    setActiveKey(key);
  };

  const maskPhone = (p: string) => (p ? `••••••${p.slice(-4)}` : '—');
  const maskEmail = (e: string) => (e ? e.replace(/^(.).*(@.*)$/, '$1•••$2') : '—');

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Search & Stats Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0B2A5B]">Student Certificate History</h2>
            <p className="mt-1 text-sm text-slate-600">
              Every student, issued credential, delivery timestamp, and QR verification scan.
            </p>
          </div>
          <div className="relative w-full lg:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, college, course, or ID (/)"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-[#1f6feb] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-500">Total Students</div>
            <div className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{students.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Certificates Issued</div>
            <div className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{certs.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Delivered</div>
            <div className="mt-0.5 text-xl font-bold text-emerald-700 tabular-nums">
              {certs.filter((c) => c.emailSentAt || c.waSentAt).length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Total Scans</div>
            <div className="mt-0.5 text-xl font-bold text-[#1f6feb] tabular-nums">
              {certs.reduce((acc, c) => acc + (c.liveScans || 0), 0)}
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            {(['all', 'approved', 'pending', 'revoked'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
          >
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 max-w-[220px]"
          >
            <option value="all">All colleges</option>
            {colleges.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'most' | 'az')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
          >
            <option value="recent">Latest first</option>
            <option value="most">Most certificates</option>
            <option value="az">Name A–Z</option>
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
              viewMode === 'cards' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
              viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      {/* Results */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No students match your current search or filter.
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.slice(0, 300).map((s) => {
            const delivered = s.certs.filter((c) => c.emailSentAt || c.waSentAt).length;
            const totalScans = s.certs.reduce((a, c) => a + (c.liveScans || 0), 0);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => openStudent(s.key)}
                className="card-interactive flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-[#1f6feb] cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{s.college}</p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                      {s.certs.length} cert{s.certs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {s.certs.slice(0, 2).map((c) => (
                      <div key={c.certificateId} className="text-xs text-slate-700 truncate">
                        {c.course} · <span className="text-slate-500">{c.status}</span>
                      </div>
                    ))}
                    {s.certs.length > 2 && (
                      <div className="text-xs text-slate-500">+{s.certs.length - 2} more</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 tabular-nums">
                  <span>
                    {delivered} delivered · {totalScans} scans
                  </span>
                  <span className="font-semibold text-[#1f6feb]">Open timeline →</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">College</th>
                <th className="px-4 py-3 text-right font-semibold">Certificates</th>
                <th className="px-4 py-3 text-right font-semibold">Delivered</th>
                <th className="px-4 py-3 text-right font-semibold">Scans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.slice(0, 300).map((s) => {
                const delivered = s.certs.filter((c) => c.emailSentAt || c.waSentAt).length;
                const scans = s.certs.reduce((a, c) => a + (c.liveScans || 0), 0);
                return (
                  <tr
                    key={s.key}
                    onClick={() => openStudent(s.key)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.college}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{s.certs.length}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {delivered} / {s.certs.length}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{scans}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over Student Timeline Drawer */}
      {activeStudent && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]"
          onClick={() => setActiveKey(null)}
        >
          <div
            className="animate-drawer-in h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#0B2A5B] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{activeStudent.name}</h3>
                  <p className="mt-1 text-xs text-blue-100">{activeStudent.college}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveKey(null)}
                  className="rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25 cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/10 p-2">
                  <div className="text-lg font-bold tabular-nums">{activeStudent.certs.length}</div>
                  <div className="text-[11px] text-blue-100">Certificates</div>
                </div>
                <div className="rounded-lg bg-white/10 p-2">
                  <div className="text-lg font-bold tabular-nums">
                    {activeStudent.certs.filter((c) => c.emailSentAt || c.waSentAt).length}
                  </div>
                  <div className="text-[11px] text-blue-100">Delivered</div>
                </div>
                <div className="rounded-lg bg-white/10 p-2">
                  <div className="text-lg font-bold tabular-nums">
                    {activeStudent.certs.reduce((a, c) => a + (c.liveScans || 0), 0)}
                  </div>
                  <div className="text-[11px] text-blue-100">Scans</div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Masked Contact Reveal */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">Phone: </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {revealContact
                        ? activeStudent.phone
                          ? `+91 ${activeStudent.phone}`
                          : '—'
                        : maskPhone(activeStudent.phone)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Email: </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {revealContact ? activeStudent.email || '—' : maskEmail(activeStudent.email)}
                    </span>
                  </div>
                </div>
                {(activeStudent.phone || activeStudent.email) && !revealContact && (
                  <button
                    type="button"
                    onClick={() => setRevealContact(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Show contact
                  </button>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Certificate Timeline
                </h4>
                {activeStudent.certs.map((c) => {
                  const link = buildVerifyLink(c.qrToken, settings.publicBaseUrl);
                  return (
                    <div
                      key={c.certificateId}
                      className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{c.course}</div>
                          <div className="text-xs text-slate-500">
                            {c.certType} · {c.duration || '—'} · {fmtDate(c.startDate)} –{' '}
                            {fmtDate(c.endDate)}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-600">
                          {c.certificateId}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {c.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                          </span>
                        )}
                        {c.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5" /> Pending
                          </span>
                        )}
                        {c.status === 'revoked' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                            <ShieldAlert className="h-3.5 w-3.5" /> Revoked
                          </span>
                        )}

                        {c.status === 'approved' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onPreviewCertificate(c.qrToken)}
                              className="ml-auto inline-flex items-center gap-1 rounded-md bg-[#1f6feb] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1558c0] cursor-pointer"
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard.writeText(link);
                                onNotify('Link copied.');
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Copy className="h-3 w-3" /> Copy
                            </button>
                          </>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500 space-y-0.5">
                        {c.emailSentAt && (
                          <div className="text-emerald-700">
                            Emailed: {fmtDateTime(c.emailSentAt)}
                          </div>
                        )}
                        {c.waSentAt && (
                          <div className="text-emerald-700">
                            WhatsApp shared: {fmtDateTime(c.waSentAt)}
                          </div>
                        )}
                        {c.sendError && <div className="text-red-700">{c.sendError}</div>}
                        {!c.emailSentAt && !c.waSentAt && !c.sendError && (
                          <div>Not delivered yet</div>
                        )}
                        {c.liveScans > 0 && (
                          <div className="text-[#0B2A5B] font-medium tabular-nums">
                            Verified {c.liveScans} time{c.liveScans === 1 ? '' : 's'}
                            {c.lastScanAt ? ` · last ${fmtDateTime(c.lastScanAt)}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    downloadCsv(
                      `${activeStudent.name.replace(/[^\w]+/g, '_')}_history.csv`,
                      ['Student', 'College', 'Certificate ID', 'Course', 'Type', 'Duration', 'Start', 'End', 'Status', 'Emailed', 'WhatsApp'],
                      activeStudent.certs.map((c) => [
                        activeStudent.name,
                        activeStudent.college,
                        c.certificateId,
                        c.course,
                        c.certType,
                        c.duration,
                        c.startDate,
                        c.endDate,
                        c.status,
                        c.emailSentAt,
                        c.waSentAt,
                      ])
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
