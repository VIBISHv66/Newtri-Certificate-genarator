import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Plus, Upload, X } from 'lucide-react';
import {
  CERT_TYPES,
  CertStatus,
  CertType,
  CombinedCertificate,
  ParsedSheetRow,
} from '../types';
import { createCertificatesBatch } from '../services/certService';
import { computeDuration, normalizeCertType, normalizeDate } from '../utils/format';

interface UploadSheetPanelProps {
  existingCerts: CombinedCertificate[];
  onCompleted: (msg: string) => void;
}

const cleanKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const pickVal = (obj: Record<string, unknown>, names: string[]): string => {
  for (const n of names) {
    const val = obj[n];
    if (val !== undefined && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
};

export const UploadSheetPanel: React.FC<UploadSheetPanelProps> = ({
  existingCerts,
  onCompleted,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedSheetRow[]>([]);
  const [defaultType, setDefaultType] = useState<CertType>('Course');
  const [initialStatus, setInitialStatus] = useState<CertStatus>('approved');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string; details?: string[] }>({});

  const [showSingle, setShowSingle] = useState(false);
  const [singleForm, setSingleForm] = useState({
    name: '',
    college: '',
    course: '',
    type: 'Course' as CertType,
    duration: '',
    start: '',
    end: '',
    phone: '',
    email: '',
    status: 'approved' as CertStatus,
  });

  const parseFile = async (file: File) => {
    setFeedback({});
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        raw: false,
        dateNF: 'yyyy-mm-dd',
        defval: '',
      });

      const parsed: ParsedSheetRow[] = raw
        .map((r) => {
          const normalized: Record<string, unknown> = {};
          for (const k of Object.keys(r)) {
            normalized[cleanKey(k)] = r[k];
          }
          const start = normalizeDate(
            pickVal(normalized, [
              'startdate',
              'start',
              'from',
              'fromdate',
              'date',
              'workshopdate',
              'eventdate',
            ])
          );
          const endRaw = normalizeDate(
            pickVal(normalized, ['enddate', 'end', 'to', 'todate'])
          );
          const end = endRaw || start;
          const duration =
            pickVal(normalized, ['duration', 'period']) ||
            (start && end ? computeDuration(start, end) : '');
          return {
            name: pickVal(normalized, [
              'studentname',
              'name',
              'nameofstudent',
              'student',
              'fullname',
              'candidatename',
              'participant',
              'participantname',
              'traineename',
            ]),
            college: pickVal(normalized, [
              'college',
              'collegename',
              'institution',
              'collegeinstitution',
              'organization',
              'department',
              'collegenamecity',
            ]),
            course: pickVal(normalized, [
              'course',
              'workshop',
              'workshoptitle',
              'workshopname',
              'topic',
              'event',
              'programme',
              'program',
              'role',
              'coursename',
            ]),
            type: pickVal(normalized, ['type', 'certificatetype', 'certtype']),
            duration,
            start,
            end,
            phone: pickVal(normalized, [
              'phone',
              'mobile',
              'mobilenumber',
              'phonenumber',
              'whatsapp',
              'contact',
            ]),
            email: pickVal(normalized, ['email', 'emailid', 'emailaddress', 'mail']),
          };
        })
        .filter(
          (r) =>
            (r.name || r.college || r.course || r.email) &&
            r.name.toLowerCase() !== 'example student'
        );

      setRows(parsed);
      if (!parsed.length) {
        setFeedback({ err: 'No student rows found. Verify the first-row column headers.' });
      }
    } catch {
      setRows([]);
      setFeedback({ err: 'Could not read that spreadsheet. Use .xlsx, .xls, or .csv.' });
    }
  };

  const updatePreviewRow = (index: number, field: keyof ParsedSheetRow, value: string) => {
    setRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const removePreviewRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveBatch = async () => {
    if (!rows.length) return;
    setSaving(true);
    setFeedback({});
    try {
      const res = await createCertificatesBatch(rows, defaultType, existingCerts, initialStatus);
      setFeedback({
        ok: `Generated ${res.inserted} unique QR certificate(s)${
          res.skipped ? `, skipped ${res.skipped} duplicate(s)` : ''
        }.`,
        details: res.errors,
      });
      if (res.inserted > 0) {
        setRows([]);
        setFileName('');
        onCompleted(`Generated ${res.inserted} unique QR certificate(s).`);
      }
    } catch (err) {
      setFeedback({ err: err instanceof Error ? err.message : 'Batch upload failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSample = () => {
    const sample =
      defaultType === 'Workshop'
        ? [
            {
              'Student Name': 'Rashika K',
              College: 'Amrita Institute of Technology, Nagercoil',
              'Workshop Title': 'Generative AI & Prompt Engineering',
              Type: 'Workshop',
              Duration: '1 Day',
              'Start Date': '2026-11-16',
              'End Date': '2026-11-16',
              Phone: '9344154195',
              Email: 'student@example.com',
            },
          ]
        : [
            {
              'Student Name': 'Bhargavi M',
              College: 'Sasurie College of Engineering, Tiruppur',
              Course: 'Full-Stack Web Development',
              Type: 'Course',
              Duration: '1 Month',
              'Start Date': '2026-06-01',
              'End Date': '2026-06-30',
              Phone: '9344154195',
              Email: 'mce.ece.bhargavi22@gmail.com',
            },
            {
              'Student Name': 'Rashika K',
              College: 'Amrita Institute of Technology, Nagercoil',
              Course: 'Generative AI Workshop',
              Type: 'Workshop',
              Duration: '1 Day',
              'Start Date': '2026-11-16',
              'End Date': '2026-11-16',
              Phone: '9597471615',
              Email: 'rashika@example.com',
            },
          ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(
      wb,
      defaultType === 'Workshop'
        ? 'newtri_workshop_template.xlsx'
        : 'newtri_students_template.xlsx'
    );
  };

  const handleSingleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({});
    try {
      const res = await createCertificatesBatch(
        [
          {
            name: singleForm.name,
            college: singleForm.college,
            course: singleForm.course,
            type: singleForm.type,
            duration: singleForm.duration,
            start: singleForm.start,
            end: singleForm.end,
            phone: singleForm.phone,
            email: singleForm.email,
          },
        ],
        singleForm.type,
        existingCerts,
        singleForm.status
      );
      if (res.errors.length) {
        setFeedback({ err: res.errors[0] });
      } else if (res.skipped) {
        setFeedback({
          err: 'A certificate for this student, course, college, and start date already exists.',
        });
      } else {
        setShowSingle(false);
        setSingleForm({
          name: '',
          college: '',
          course: '',
          type: 'Course',
          duration: '',
          start: '',
          end: '',
          phone: '',
          email: '',
          status: 'approved',
        });
        onCompleted(`Generated unique QR certificate for ${singleForm.name}.`);
      }
    } catch (err) {
      setFeedback({ err: err instanceof Error ? err.message : 'Failed to create certificate.' });
    } finally {
      setSaving(false);
    }
  };

  const invalidRows = rows.filter((r) => {
    const resolvedType = normalizeCertType(r.type, defaultType);
    const missingCollege = resolvedType !== 'Workshop' && !r.college.trim();
    return !r.name.trim() || missingCollege || !r.course.trim() || !r.start || !(r.end || r.start);
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            1. Upload Student Excel Sheet &amp; Generate Unique QR Certificates
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Columns:{' '}
            <span className="font-medium text-slate-800">
              Student Name, College, Course, Type, Duration, Start Date, End Date, Phone, Email
            </span>
            . Supports <span className="font-mono text-xs">YYYY-MM-DD</span> and{' '}
            <span className="font-mono text-xs">DD/MM/YYYY</span> dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Sample Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSingle(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#123a7d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Single Student</span>
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void parseFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        className={`mt-4 flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-5 transition-colors ${
          dragging
            ? 'border-[#1f6feb] bg-blue-50/70'
            : 'border-slate-300 bg-slate-50/60 hover:border-[#1f6feb]'
        }`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#1f6feb]">
          <Upload className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {fileName || 'Drop your Excel or CSV file here'}
          </p>
          <p className="text-xs text-slate-500">Click to select a .xlsx, .xls, or .csv sheet</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void parseFile(f);
          }}
        />
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>Default type</span>
          <select
            value={defaultType}
            onChange={(e) => setDefaultType(e.target.value as CertType)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
          >
            {CERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>Generate as</span>
          <select
            value={initialStatus}
            onChange={(e) => setInitialStatus(e.target.value as CertStatus)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
          >
            <option value="approved">Approved &amp; Active QR Immediately</option>
            <option value="pending">Pending Approval</option>
          </select>
        </label>

        <button
          type="button"
          disabled={!rows.length || saving}
          onClick={handleSaveBatch}
          className="ml-auto rounded-lg bg-[#1f6feb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1558c0] disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {saving
            ? 'Generating Unique QR Certificates...'
            : `Generate ${rows.length || ''} QR Certificates`}
        </button>
      </div>

      {defaultType === 'Workshop' && (
        <p className="mt-2.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-[#0B2A5B]">
          <strong>Workshop Certificate of Participation mode:</strong> Uses the blue &amp; gold medal template with the student&rsquo;s name, workshop title, date, Kanyakumari stamp, and unique QR verification code from your Excel rows.
        </p>
      )}

      {/* Interactive Preview Table */}
      {rows.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900">
              Previewing {rows.length} row(s) — review or fill in any missing fields before generating
            </span>
            {invalidRows.length > 0 && (
              <span className="font-semibold text-amber-700">
                {invalidRows.length} row(s) missing Student Name, College, Course, or Date
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[960px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-2.5 py-2 font-semibold">#</th>
                  <th className="px-2.5 py-2 font-semibold">Student Name *</th>
                  <th className="px-2.5 py-2 font-semibold">College *</th>
                  <th className="px-2.5 py-2 font-semibold">Course *</th>
                  <th className="px-2.5 py-2 font-semibold">Type</th>
                  <th className="px-2.5 py-2 font-semibold">Duration</th>
                  <th className="px-2.5 py-2 font-semibold">Start *</th>
                  <th className="px-2.5 py-2 font-semibold">End *</th>
                  <th className="px-2.5 py-2 font-semibold">Phone</th>
                  <th className="px-2.5 py-2 font-semibold">Email</th>
                  <th className="px-2.5 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.slice(0, 50).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-2.5 py-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-2.5 py-1.5">
                      <input
                        value={r.name}
                        placeholder="Required"
                        onChange={(e) => updatePreviewRow(idx, 'name', e.target.value)}
                        className={`w-36 rounded border px-2 py-1 text-xs ${
                          !r.name.trim() ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-white'
                        }`}
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <input
                        value={r.college}
                        onChange={(e) => updatePreviewRow(idx, 'college', e.target.value)}
                        className={`w-48 rounded border px-2 py-1 text-xs ${
                          !r.college.trim()
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-300 bg-white'
                        }`}
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <input
                        value={r.course}
                        onChange={(e) => updatePreviewRow(idx, 'course', e.target.value)}
                        className={`w-40 rounded border px-2 py-1 text-xs ${
                          !r.course.trim()
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-300 bg-white'
                        }`}
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <select
                        value={r.type ? normalizeCertType(r.type, defaultType) : ''}
                        onChange={(e) => updatePreviewRow(idx, 'type', e.target.value)}
                        className="w-28 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
                      >
                        <option value="">Default ({defaultType})</option>
                        {CERT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <input
                        value={r.duration}
                        onChange={(e) => updatePreviewRow(idx, 'duration', e.target.value)}
                        className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <input
                        type="date"
                        value={r.start}
                        onChange={(e) => updatePreviewRow(idx, 'start', e.target.value)}
                        className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <input
                        type="date"
                        value={r.end}
                        onChange={(e) => updatePreviewRow(idx, 'end', e.target.value)}
                        className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <input
                        value={r.phone}
                        onChange={(e) => updatePreviewRow(idx, 'phone', e.target.value)}
                        className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <input
                        value={r.email}
                        onChange={(e) => updatePreviewRow(idx, 'email', e.target.value)}
                        className="w-44 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => removePreviewRow(idx)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer"
                        title="Remove row"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 50 && (
            <p className="text-[11px] text-slate-500">
              Showing first 50 rows in preview; all {rows.length} rows will be imported.
            </p>
          )}
        </div>
      )}

      {(feedback.ok || feedback.err) && (
        <div className="mt-3 text-xs">
          {feedback.ok && <p className="font-semibold text-emerald-700">{feedback.ok}</p>}
          {feedback.err && <p className="font-semibold text-red-700">{feedback.err}</p>}
          {feedback.details && feedback.details.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-red-700 space-y-0.5">
              {feedback.details.slice(0, 6).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Single Certificate Modal */}
      {showSingle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Issue Single Certificate</h3>
              <button
                type="button"
                onClick={() => setShowSingle(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSingleCreate} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                  Student Name *
                  <input
                    required
                    value={singleForm.name}
                    onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                  College / Institution {singleForm.type === 'Workshop' ? '(optional)' : '*'}
                  <input
                    required={singleForm.type !== 'Workshop'}
                    placeholder={singleForm.type === 'Workshop' ? 'Optional for Workshop' : ''}
                    value={singleForm.college}
                    onChange={(e) => setSingleForm({ ...singleForm, college: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                  {singleForm.type === 'Workshop' ? 'Workshop Title *' : 'Course / Programme *'}
                  <input
                    required
                    value={singleForm.course}
                    onChange={(e) => setSingleForm({ ...singleForm, course: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Type
                  <select
                    value={singleForm.type}
                    onChange={(e) => setSingleForm({ ...singleForm, type: e.target.value as CertType })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {CERT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Duration (optional)
                  <input
                    placeholder="e.g. 1 Day or 1 Month"
                    value={singleForm.duration}
                    onChange={(e) => setSingleForm({ ...singleForm, duration: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  {singleForm.type === 'Workshop' ? 'Workshop / Start Date *' : 'Start Date *'}
                  <input
                    type="date"
                    required
                    value={singleForm.start}
                    onChange={(e) =>
                      setSingleForm({
                        ...singleForm,
                        start: e.target.value,
                        end:
                          singleForm.type === 'Workshop' && !singleForm.end
                            ? e.target.value
                            : singleForm.end,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  End Date *
                  <input
                    type="date"
                    required
                    value={singleForm.end}
                    onChange={(e) => setSingleForm({ ...singleForm, end: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  WhatsApp Phone (10 digits)
                  <input
                    placeholder="9876543210"
                    value={singleForm.phone}
                    onChange={(e) => setSingleForm({ ...singleForm, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Email
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={singleForm.email}
                    onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={singleForm.status === 'approved'}
                  onChange={(e) =>
                    setSingleForm({
                      ...singleForm,
                      status: e.target.checked ? 'approved' : 'pending',
                    })
                  }
                />
                <span>Approve immediately (makes download &amp; QR link active right away)</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSingle(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#0B2A5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Generate QR Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
