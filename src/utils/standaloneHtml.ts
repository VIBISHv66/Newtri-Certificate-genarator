import firebaseConfig from '../../firebase-applet-config.json';
import { PortalSettings } from '../types';
import { WORKSHOP_ASSETS } from './workshopAssets';

export function downloadStandaloneVerifierHtml(settings: PortalSettings): void {
  const companyName = settings.companyName || 'NEWTRI Technologies';
  const websiteUrl = settings.websiteUrl || 'https://newtritechnologies.com/';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- NEWTRI Verifier · Canva Workshop Format -->
  <link rel="icon" type="image/png" href="${WORKSHOP_ASSETS.logoSquareDataUrl}" />
  <link rel="shortcut icon" type="image/png" href="${WORKSHOP_ASSETS.logoSquareDataUrl}" />
  <link rel="apple-touch-icon" href="${WORKSHOP_ASSETS.logoSquareDataUrl}" />
  <title>${escapeHtml(companyName)} — Certificate Verification & Download</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    html, body { overflow-x: hidden; }
    body {
      margin: 0; font-family: 'DM Sans', system-ui, sans-serif; color: #0f172a;
      background-color: #f8fafc;
      background-image:
        radial-gradient(at 15% 0%, rgba(11,42,91,0.045) 0px, transparent 52%),
        radial-gradient(at 88% 8%, rgba(206,157,67,0.05) 0px, transparent 46%),
        linear-gradient(to right, rgba(15,23,42,0.024) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(15,23,42,0.024) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 36px 36px, 36px 36px;
      min-height: 100vh;
    }
    header { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,0.92); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(226,232,240,0.85); }
    .top { max-width: 1080px; margin: 0 auto; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .brand { display: inline-flex; align-items: center; gap: 9px; font-weight: 800; font-size: 17px; color: #0B2A5B; text-decoration: none; min-width: 0; }
    .brand span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .brand-logo { width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; padding: 2px; object-fit: contain; }
    .nav-links { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
    .site-link { font-size: 13px; font-weight: 600; color: #475569; text-decoration: none; background: none; border: 0; padding: 6px 2px; cursor: pointer; font-family: inherit; transition: color 150ms ease; white-space: nowrap; }
    .site-link:hover { color: #0B2A5B; }
    main { max-width: 980px; margin: 22px auto; padding: 0 14px 56px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 18px; animation: fadeUp 220ms cubic-bezier(0.16, 1, 0.3, 1) both; }
    .search-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
    .search-form { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; max-width: 470px; align-items: center; }
    input[type="text"] { flex: 1; min-width: 0; width: 100%; min-height: 42px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; text-transform: uppercase; transition: border-color 150ms ease, box-shadow 150ms ease; }
    input[type="text"]:focus { outline: none; border-color: #1f6feb; box-shadow: 0 0 0 3px rgba(31,111,235,0.16); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 42px; padding: 9px 15px; border-radius: 8px; border: 1px solid transparent; font: 600 13px 'DM Sans', sans-serif; cursor: pointer; text-decoration: none; transition: transform 140ms cubic-bezier(0.16,1,0.3,1), background-color 150ms ease, border-color 150ms ease; white-space: nowrap; }
    .btn:active { transform: scale(0.98); }
    .btn-primary { background: #0B2A5B; color: #fff; }
    .btn-primary:hover { background: #123a7d; }
    .btn-blue { background: #1f6feb; color: #fff; }
    .btn-blue:hover { background: #1558c0; }
    .btn-outline { background: #fff; color: #334155; border-color: #cbd5e1; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
    .btn-wa { background: #ecfdf5; color: #065f46; border-color: #6ee7b7; }
    .btn-wa:hover { background: #d1fae5; }
    .banner-ok { background: #ecfdf5; border: 1px solid #a7f3d0; color: #064e3b; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; animation: fadeUp 220ms cubic-bezier(0.16,1,0.3,1) both; }
    .banner-row { display: flex; align-items: flex-start; gap: 12px; }
    .banner-logo { width: 40px; height: 40px; flex-shrink: 0; border-radius: 8px; border: 1px solid #a7f3d0; background: #fff; padding: 3px; object-fit: contain; }
    .banner-warn { background: #fffbeb; border: 1px solid #fde68a; color: #78350f; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; animation: fadeUp 220ms cubic-bezier(0.16,1,0.3,1) both; }
    .banner-err { background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; animation: fadeUp 220ms cubic-bezier(0.16,1,0.3,1) both; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
    .action-btns { display: flex; flex-wrap: wrap; gap: 8px; }
    .sheet { background: #fdfcf8; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 20px 44px -22px rgba(11,42,91,0.22), 0 2px 6px -1px rgba(15,23,42,0.06); transition: box-shadow 220ms cubic-bezier(0.16,1,0.3,1); animation: certReveal 260ms cubic-bezier(0.16,1,0.3,1) both; }
    .sheet:hover { box-shadow: 0 24px 52px -20px rgba(11,42,91,0.28), 0 4px 10px -2px rgba(15,23,42,0.08); }
    .hist-item { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 12px 0; border-top: 1px solid #f1f5f9; }
    .hist-item:first-child { border-top: 0; }
    .hist-meta { font-size: 12px; color: #64748b; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .frame-outer { border: 3px solid #0B2A5B; padding: 10px; }
    .frame-inner { border: 1px solid #B88C38; padding: 36px 28px; text-align: center; }
    .co { font-size: 22px; font-weight: 800; letter-spacing: 0.16em; color: #0B2A5B; }
    .co-sub { margin-top: 4px; font-size: 12px; color: #64748b; word-break: break-word; }
    .rule { width: min(180px, 65%); height: 1px; background: #cbd5e1; margin: 18px auto; }
    .title { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: #123a7d; margin: 0; }
    .student { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 36px; font-weight: 700; color: #0f172a; margin: 12px 0 6px; word-break: break-word; }
    .name-rule { width: min(240px, 78%); height: 2px; background: #B88C38; margin: 0 auto 12px; }
    .body-text { max-width: 660px; margin: 18px auto 0; font-size: 15px; line-height: 1.65; color: #334155; }
    .foot { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: end; }
    .foot-left { text-align: left; font-size: 12px; color: #475569; line-height: 1.7; }
    .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
    .qr-box { display: inline-block; padding: 8px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; }
    .qr-box img { display: block; width: 96px; height: 96px; }
    .qr-cap { margin-top: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #0B2A5B; }
    .sig { text-align: right; }
    .sig-line { display: inline-block; width: 170px; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; font-family: 'Playfair Display', serif; font-style: italic; font-size: 18px; color: #0B2A5B; text-align: center; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes certReveal { from { opacity: 0; transform: translateY(12px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media (prefers-reduced-motion: reduce) { .card, .banner-ok, .banner-warn, .banner-err, .sheet { animation: none !important; transition: none !important; } }
    @media (max-width: 680px) {
      .top { padding: 10px 12px; gap: 8px; }
      .brand { font-size: 14px; gap: 7px; max-width: 52%; }
      .brand-logo { width: 28px; height: 28px; }
      .nav-links { gap: 10px; }
      .site-link { font-size: 12px; }
      main { margin: 16px auto; padding: 0 12px 48px; }
      .card { padding: 16px; }
      .search-form { width: 100%; max-width: 100%; }
      .search-form input[type="text"] { flex: 1 1 100%; }
      .search-form .btn { flex: 1; }
      .actions { flex-direction: column; align-items: stretch; }
      .action-btns { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
      .action-btns .btn:last-child { grid-column: 1 / -1; }
      .sheet { padding: 12px; }
      .frame-outer { padding: 6px; }
      .frame-inner { padding: 24px 14px; }
      .co { font-size: 16px; letter-spacing: 0.1em; }
      .title { font-size: 22px; }
      .student { font-size: 28px; }
      .body-text { font-size: 13.5px; }
      .foot { grid-template-columns: 1fr; text-align: center; margin-top: 26px; padding-top: 18px; gap: 16px; }
      .foot-left, .sig { text-align: center; }
    }
    @media print {
      @page { size: A4 landscape; margin: 8mm; }
      header, .no-print { display: none !important; }
      body { background: #fff; }
      .sheet { border: 0; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <header class="no-print">
    <div class="top">
      <a class="brand" href="?verify=1">
        <img class="brand-logo" src="${WORKSHOP_ASSETS.logoSquareDataUrl}" alt="${escapeHtml(companyName)} logo" />
        <span>${escapeHtml(companyName)}</span>
      </a>
      <div class="nav-links">
        <button type="button" class="site-link" id="topHistBtn">History (<span id="histCountTop">0</span>)</button>
        <a class="site-link" href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">Official Website</a>
      </div>
    </div>
  </header>

  <main>
    <div class="card no-print">
      <div class="search-row">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="${WORKSHOP_ASSETS.logoSquareDataUrl}" alt="${escapeHtml(companyName)} logo" style="width:44px;height:44px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;padding:3px;object-fit:contain;flex-shrink:0" />
          <div>
            <h1 style="margin:0;font-size:19px;color:#0B2A5B">Certificate Verification &amp; Download</h1>
            <p style="margin:4px 0 0;font-size:13px;color:#64748b">Enter a Certificate ID or scan the QR code on any ${escapeHtml(companyName)} certificate.</p>
          </div>
        </div>
        <form class="search-form" id="lookupForm">
          <input type="text" id="lookupInput" placeholder="NT-2026-XXXXXX" required />
          <button type="submit" class="btn btn-blue">Verify</button>
          <button type="button" class="btn btn-outline" id="histToggleBtn">History (<span id="histCountBtn">0</span>)</button>
        </form>
      </div>
    </div>

    <div class="card no-print" id="historyPanel" style="display:none"></div>
    <div id="app"></div>
  </main>

  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
    import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
    import QRCode from 'https://esm.sh/qrcode@1.5.4';
    import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';

    const firebaseConfig = ${JSON.stringify({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
    })};
    const DATABASE_ID = ${JSON.stringify(
      (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || ''
    )};
    const COMPANY_NAME = ${JSON.stringify(companyName)};
    const WEBSITE_URL = ${JSON.stringify(websiteUrl)};
    const WS_MEDAL = ${JSON.stringify(WORKSHOP_ASSETS.medalDataUrl)};
    const WS_LOGO = ${JSON.stringify(WORKSHOP_ASSETS.logoSquareDataUrl)};
    const WS_WM = ${JSON.stringify(WORKSHOP_ASSETS.watermarkDataUrl)};
    const WS_SEAL = ${JSON.stringify(WORKSHOP_ASSETS.sealDataUrl)};
    const WS_SIG = ${JSON.stringify(WORKSHOP_ASSETS.signatureDataUrl)};

    const app = initializeApp(firebaseConfig);
    const db = DATABASE_ID ? getFirestore(app, DATABASE_ID) : getFirestore(app);
    const root = document.getElementById('app');
    const historyPanel = document.getElementById('historyPanel');
    const HIST_KEY = 'newtri_verify_history_v1';
    let showHistory = false;

    const readHistory = () => {
      try {
        const raw = localStorage.getItem(HIST_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    };
    const writeHistory = (items) => {
      try { localStorage.setItem(HIST_KEY, JSON.stringify(items.slice(0, 25))); } catch {}
      updateHistCounts(items.length);
    };
    const updateHistCounts = (n) => {
      const a = document.getElementById('histCountTop');
      const b = document.getElementById('histCountBtn');
      if (a) a.textContent = String(n);
      if (b) b.textContent = String(n);
    };
    const pushHistory = (cert) => {
      if (!cert || !cert.qrToken) return;
      const entry = {
        certificateId: cert.certificateId,
        qrToken: cert.qrToken,
        studentName: cert.studentName,
        course: cert.course,
        certType: cert.certType,
        verifiedAt: new Date().toISOString(),
      };
      const next = [entry, ...readHistory().filter((i) => i.qrToken !== cert.qrToken)].slice(0, 25);
      writeHistory(next);
      if (showHistory) renderHistory();
    };
    const fmtWhen = (iso) => {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    const fmtDate = (iso) => {
      const m = String(iso || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
      if (!m) return iso || '';
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const workshopDatePhrase = (s, e) => (!e || s === e) ? ('on ' + fmtDate(s)) : ('from ' + fmtDate(s) + ' to ' + fmtDate(e));

    async function loadByToken(token) {
      const clean = String(token || '').trim().toLowerCase();
      if (!/^[a-f0-9]{16,64}$/.test(clean)) return null;
      const snap = await getDoc(doc(db, 'public_certificates', clean));
      return snap.exists() ? snap.data() : null;
    }

    async function loadById(certId) {
      const clean = String(certId || '').trim().toUpperCase();
      if (!/^[A-Z0-9-]{6,30}$/.test(clean)) return null;
      const idx = await getDoc(doc(db, 'cert_id_index', clean));
      if (!idx.exists() || !idx.data().qrToken) return null;
      return await loadByToken(idx.data().qrToken);
    }

    function drawDiamond(pdf, cx, cy, r) {
      pdf.setFillColor(8, 43, 89);
      pdf.triangle(cx, cy - r, cx + r, cy, cx - r, cy, 'F');
      pdf.triangle(cx, cy + r, cx + r, cy, cx - r, cy, 'F');
      const ir = r * 0.45;
      pdf.setFillColor(255, 255, 255);
      pdf.triangle(cx, cy - ir, cx + ir, cy, cx - ir, cy, 'F');
      pdf.triangle(cx, cy + ir, cx + ir, cy, cx - ir, cy, 'F');
    }

    async function downloadPdf(cert, verifyUrl) {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();

      if (String(cert.certType || '').trim().toLowerCase() === 'workshop') {
        pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, w, h, 'F');
        pdf.addImage(WS_WM, 'PNG', 89, 51.4, 119, 119);

        pdf.setFillColor(48, 113, 173);
        pdf.lines([[0, -0.2], [40.75, -2.87, 73.72, -36.24, 79.21, -79.01], [0, 79.21]], 220.46, 220.83, [1, 1], 'F', true);
        pdf.setFillColor(206, 157, 67);
        pdf.lines([[32.5, -5.11, 59.5, -21.87, 73.35, -44.37], [0, 44.37]], 226.32, 220.83, [1, 1], 'F', true);
        pdf.setFillColor(13, 59, 102);
        pdf.lines([[31.66, -3.82, 57.96, -16.34, 71.44, -33.15], [0, 33.15]], 228.23, 220.83, [1, 1], 'F', true);

        pdf.setFillColor(13, 59, 102); pdf.rect(12.2, 0, 35.8, 57.5, 'F'); pdf.triangle(12.2, 57.5, 48.0, 57.5, 30.1, 77.7, 'F');
        pdf.addImage(WS_MEDAL, 'PNG', 15.8, 18.5, 29.4, 37.3);

        pdf.setDrawColor(13, 59, 102); pdf.setLineWidth(0.85);
        pdf.line(221.2, 15.0, 280.9, 15.0); pdf.line(280.9, 15.0, 280.9, 55.5);
        drawDiamond(pdf, 221.2, 15.0, 1.8); drawDiamond(pdf, 277.8, 15.0, 1.7); drawDiamond(pdf, 280.9, 18.1, 1.7); drawDiamond(pdf, 280.9, 55.5, 1.8);
        pdf.addImage(WS_LOGO, 'PNG', 242.0, 17.9, 30.9, 30.9);

        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(36); pdf.setTextColor(13, 59, 102);
        pdf.text('CERTIFICATE', w / 2, 43.7, { align: 'center' });
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(14); pdf.setTextColor(13, 59, 102);
        pdf.text('O F   P A R T I C I P A T I O N', w / 2, 53.4, { align: 'center' });

        pdf.setFont('times', 'normal'); pdf.setFontSize(35); pdf.setTextColor(13, 59, 102);
        pdf.text(cert.studentName, 48.0, 87.0, { maxWidth: 185 });
        pdf.setDrawColor(206, 157, 67); pdf.setLineWidth(0.65); pdf.line(48.0, 93.6, 232.5, 93.6);

        const wsBody = 'For actively participating in the workshop on ' + cert.course + ' conducted by ' + COMPANY_NAME + ' ' + workshopDatePhrase(cert.startDate, cert.endDate) + '.\\nWe appreciate their enthusiasm and active participation throughout the workshop.';
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12.5); pdf.setTextColor(13, 59, 102);
        pdf.text(pdf.splitTextToSize(wsBody, 185), 48.0, 106.0, { lineHeightFactor: 1.52 });

        pdf.setDrawColor(13, 59, 102); pdf.setLineWidth(0.85);
        pdf.line(17.8, 155.6, 17.8, 196.1); pdf.line(17.8, 196.1, 77.5, 196.1);
        drawDiamond(pdf, 17.8, 155.6, 1.8); drawDiamond(pdf, 17.8, 193.0, 1.7); drawDiamond(pdf, 20.9, 196.1, 1.7); drawDiamond(pdf, 77.5, 196.1, 1.8);

        const qrWs = await QRCode.toDataURL(verifyUrl, { width: 360, margin: 1, color: { dark: '#0D3B66', light: '#FFFFFF' } });
        pdf.setFillColor(255, 255, 255); pdf.rect(25.0, 158.6, 23.2, 23.2, 'F');
        pdf.addImage(qrWs, 'PNG', 25.4, 159.0, 22.4, 22.4);

        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.8); pdf.setTextColor(13, 59, 102); pdf.text('CERTIFICATE ID', 50.7, 165.5);
        pdf.setFont('courier', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(13, 59, 102); pdf.text(cert.certificateId, 50.7, 171.0);
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.8); pdf.text('Issued: ' + fmtDate(cert.issueDate), 50.7, 176.8);

        pdf.addImage(WS_SEAL, 'PNG', 132.7, 162.7, 31.2, 30.9);
        pdf.addImage(WS_SIG, 'PNG', 205.2, 155.0, 27.7, 11.1);
        pdf.setDrawColor(206, 157, 67); pdf.setLineWidth(0.55); pdf.line(192.9, 168.1, 246.2, 168.1);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.8);
        pdf.text('CORPORATE TRAINER &', 219.5, 175.1, { align: 'center' });
        pdf.text('PROGRAM LEAD', 219.5, 180.6, { align: 'center' });

        pdf.save(cert.certificateId + '_' + cert.studentName.replace(/[^\\w]+/g, '_') + '.pdf');
        return;
      }

      pdf.setFillColor(253, 252, 248); pdf.rect(0, 0, w, h, 'F');
      pdf.setDrawColor(11, 42, 91); pdf.setLineWidth(1.6); pdf.rect(10, 10, w - 20, h - 20);
      pdf.setDrawColor(184, 140, 56); pdf.setLineWidth(0.6); pdf.rect(14, 14, w - 28, h - 28);

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(11, 42, 91);
      pdf.text(COMPANY_NAME.toUpperCase(), w / 2, 31, { align: 'center' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(85, 101, 127);
      pdf.text('Karangad, Kanyakumari District, Tamil Nadu  ·  ' + WEBSITE_URL.replace(/\\/$/, ''), w / 2, 37.5, { align: 'center' });
      pdf.setDrawColor(203, 213, 225); pdf.setLineWidth(0.35); pdf.line(68, 43, w - 68, 43);

      const heading = cert.certType === 'Internship' ? 'CERTIFICATE OF INTERNSHIP'
        : cert.certType === 'Value-added' ? 'VALUE-ADDED PROGRAMME CERTIFICATE' : 'CERTIFICATE OF COMPLETION';
      pdf.setFont('times', 'bold'); pdf.setFontSize(25); pdf.setTextColor(18, 58, 125);
      pdf.text(heading, w / 2, 57, { align: 'center' });

      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(71, 85, 105);
      pdf.text('This is to proudly certify that', w / 2, 70, { align: 'center' });

      pdf.setFont('times', 'bolditalic'); pdf.setFontSize(31); pdf.setTextColor(15, 23, 42);
      pdf.text(cert.studentName, w / 2, 86, { align: 'center', maxWidth: 230 });
      pdf.setDrawColor(184, 140, 56); pdf.setLineWidth(0.5); pdf.line(78, 90, w - 78, 90);

      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12); pdf.setTextColor(51, 65, 85);
      pdf.text('of ' + cert.college, w / 2, 99, { align: 'center', maxWidth: 230 });

      const dur = cert.duration ? ' (' + cert.duration + ')' : '';
      const body = 'has successfully attended and completed the ' + cert.certType + ' programme in ' + cert.course + dur + ', conducted by ' + COMPANY_NAME + ' from ' + fmtDate(cert.startDate) + ' to ' + fmtDate(cert.endDate) + '.';
      pdf.setFontSize(12); pdf.setTextColor(30, 41, 59);
      pdf.text(pdf.splitTextToSize(body, 210), w / 2, 113, { align: 'center', lineHeightFactor: 1.55 });

      const qrData = await QRCode.toDataURL(verifyUrl, { width: 360, margin: 1, color: { dark: '#0B2A5B', light: '#FFFFFF' } });
      pdf.setFont('courier', 'bold'); pdf.setFontSize(10); pdf.setTextColor(11, 42, 91);
      pdf.text('Certificate ID: ' + cert.certificateId, 26, 162);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(85, 101, 127);
      pdf.text('Issued on: ' + fmtDate(cert.issueDate), 26, 168.5);
      pdf.text('Status: Verified & Active', 26, 174.5);

      pdf.setFillColor(255, 255, 255); pdf.setDrawColor(203, 213, 225); pdf.roundedRect(w / 2 - 20, 143, 40, 40, 2, 2, 'FD');
      pdf.addImage(qrData, 'PNG', w / 2 - 17.5, 145.5, 35, 35);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(11, 42, 91);
      pdf.text('SCAN QR TO VERIFY AUTHENTICITY', w / 2, 188.5, { align: 'center' });

      pdf.setDrawColor(100, 116, 139); pdf.line(w - 86, 170, w - 26, 170);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5); pdf.setTextColor(15, 23, 42);
      pdf.text('Authorized Signatory', w - 56, 176, { align: 'center' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(85, 101, 127);
      pdf.text(COMPANY_NAME, w - 56, 181.5, { align: 'center' });

      pdf.save(cert.certificateId + '_' + cert.studentName.replace(/[^\\w]+/g, '_') + '.pdf');
    }

    async function renderCert(cert) {
      if (!cert) {
        root.innerHTML = '<div class="banner-err"><b>Certificate Not Found</b><p style="margin:6px 0 0;font-size:14px">No certificate record matched that link or ID.</p></div>';
        return;
      }
      pushHistory(cert);
      if (cert.status === 'revoked') {
        root.innerHTML = '<div class="banner-err"><b>Certificate Revoked</b><p style="margin:6px 0 0;font-size:14px">Certificate ' + esc(cert.certificateId) + ' for ' + esc(cert.studentName) + ' was revoked by ' + esc(COMPANY_NAME) + '.</p></div>';
        return;
      }
      if (cert.status !== 'approved') {
        root.innerHTML = '<div class="banner-warn"><b>Pending Approval</b><p style="margin:6px 0 0;font-size:14px">Certificate ' + esc(cert.certificateId) + ' is awaiting administrative approval.</p></div>';
        return;
      }

      const verifyUrl = window.location.origin + window.location.pathname + '?t=' + encodeURIComponent(cert.qrToken);
      const qrData = await QRCode.toDataURL(verifyUrl, { width: 260, margin: 1, color: { dark: '#082B59', light: '#FFFFFF' } });
      const isWs = String(cert.certType || '').trim().toLowerCase() === 'workshop';
      const title = cert.certType === 'Internship' ? 'Certificate of Internship'
        : cert.certType === 'Value-added' ? 'Value-Added Programme Certificate'
        : isWs ? 'Certificate of Participation' : 'Certificate of Completion';
      const waMsg = 'Hello ' + cert.studentName + ', your ' + COMPANY_NAME + ' certificate for ' + cert.course + ' is ready: ' + verifyUrl;
      const hasCollege = cert.college && cert.college !== 'Workshop Participant';
      const bannerSummary = isWs
        ? 'This certificate confirms that <b>' + esc(cert.studentName) + '</b>' + (hasCollege ? ' (' + esc(cert.college) + ')' : '') + ' actively participated in the workshop on <b>' + esc(cert.course) + '</b> ' + esc(workshopDatePhrase(cert.startDate, cert.endDate)) + ' conducted by <a href="' + esc(WEBSITE_URL) + '" target="_blank" style="color:inherit;font-weight:700">' + esc(COMPANY_NAME) + '</a>.'
        : 'This certificate confirms that <b>' + esc(cert.studentName) + '</b> (' + esc(cert.college) + ') attended and completed <b>' + esc(cert.course) + '</b> (' + esc(cert.certType) + ') conducted by <a href="' + esc(WEBSITE_URL) + '" target="_blank" style="color:inherit;font-weight:700">' + esc(COMPANY_NAME) + '</a>.';

      const workshopSheet =
        '<div class="sheet" style="background:#fff;position:relative;overflow:hidden;padding:0;width:100%;aspect-ratio:297/210;container-type:inline-size">' +
          '<img src="' + WS_WM + '" alt="" style="position:absolute;left:29.97%;top:24.48%;width:40.07%;height:auto;pointer-events:none" />' +
          '<svg viewBox="0 0 35.8 77.7" preserveAspectRatio="none" style="position:absolute;left:4.11%;top:0;width:12.05%;height:37.02%;pointer-events:none"><polygon points="0,0 35.8,0 35.8,57.5 17.9,77.7 0,57.5" fill="#0D3B66"/></svg>' +
          '<img src="' + WS_MEDAL + '" alt="" style="position:absolute;left:5.31%;top:8.80%;width:9.89%;height:auto;pointer-events:none" />' +
          '<svg viewBox="0 0 220 140" style="position:absolute;right:4.8%;top:5.5%;width:22%;height:21%;pointer-events:none">' +
            '<polyline points="10,12 204,12 204,128" fill="none" stroke="#0D3B66" stroke-width="3.5"/>' +
            '<polygon points="10,5 17,12 10,19 3,12" fill="#0D3B66"/><polygon points="10,8.5 13.5,12 10,15.5 6.5,12" fill="#fff"/>' +
            '<polygon points="196,5 203,12 196,19 189,12" fill="#0D3B66"/><polygon points="196,8.5 199.5,12 196,15.5 192.5,12" fill="#fff"/>' +
            '<polygon points="204,14 211,21 204,28 197,21" fill="#0D3B66"/><polygon points="204,17.5 207.5,21 204,24.5 200.5,21" fill="#fff"/>' +
            '<polygon points="204,121 211,128 204,135 197,128" fill="#0D3B66"/><polygon points="204,124.5 207.5,128 204,131.5 200.5,128" fill="#fff"/>' +
          '</svg>' +
          '<img src="' + WS_LOGO + '" alt="' + esc(COMPANY_NAME) + '" style="position:absolute;left:81.47%;top:8.54%;width:10.42%;height:auto;pointer-events:none" />' +
          '<svg viewBox="0 0 220 140" style="position:absolute;left:5.0%;bottom:5.5%;width:22%;height:21%;pointer-events:none">' +
            '<polyline points="16,12 16,128 208,128" fill="none" stroke="#0D3B66" stroke-width="3.5"/>' +
            '<polygon points="16,5 23,12 16,19 9,12" fill="#0D3B66"/><polygon points="16,8.5 19.5,12 16,15.5 12.5,12" fill="#fff"/>' +
            '<polygon points="16,112 23,119 16,126 9,119" fill="#0D3B66"/><polygon points="16,115.5 19.5,119 16,122.5 12.5,119" fill="#fff"/>' +
            '<polygon points="25,121 32,128 25,135 18,128" fill="#0D3B66"/><polygon points="25,124.5 28.5,128 25,131.5 21.5,128" fill="#fff"/>' +
            '<polygon points="208,121 215,128 208,135 201,128" fill="#0D3B66"/><polygon points="208,124.5 211.5,128 208,131.5 204.5,128" fill="#fff"/>' +
          '</svg>' +
          '<svg viewBox="220 140 77 70" style="position:absolute;right:0;bottom:0;width:25.93%;height:33.33%;pointer-events:none">' +
            '<path d="M 220.46,220.83 L 220.46,220.63 C 261.21,217.76 294.18,184.39 299.67,141.62 L 299.67,220.83 Z" fill="#3071AD"/>' +
            '<path d="M 226.32,220.83 C 258.82,215.72 285.82,198.96 299.67,176.46 L 299.67,220.83 Z" fill="#CE9D43"/>' +
            '<path d="M 228.23,220.83 C 259.89,217.01 286.19,204.49 299.67,187.68 L 299.67,220.83 Z" fill="#0D3B66"/>' +
          '</svg>' +
          '<div style="position:absolute;left:0;right:0;top:13.5%;text-align:center;color:#0D3B66">' +
            '<div style="font-size:4.5cqw;font-weight:800;letter-spacing:.03em;line-height:1">CERTIFICATE</div>' +
            '<div style="font-size:1.65cqw;letter-spacing:.28em;margin-top:0.8cqw">OF PARTICIPATION</div>' +
          '</div>' +
          '<div style="position:absolute;left:16.16%;top:33.8%;width:63%;font-family:\\'Playfair Display\\',Georgia,serif;font-size:4.1cqw;font-weight:400;color:#0D3B66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(cert.studentName) + '</div>' +
          '<div style="position:absolute;left:16.16%;top:44.59%;width:62.14%;height:0.28cqw;background:#CE9D43"></div>' +
          '<p style="position:absolute;left:16.16%;top:48.0%;width:63.3%;margin:0;font-size:1.46cqw;line-height:1.52;color:#0D3B66">For actively participating in the workshop on <b>' + esc(cert.course) + '</b> conducted by ' + esc(COMPANY_NAME) + ' ' + esc(workshopDatePhrase(cert.startDate, cert.endDate)) + '.<br/>We appreciate their enthusiasm and active participation throughout the workshop.</p>' +
          '<div style="position:absolute;left:8.55%;top:75.70%;width:7.6%;height:10.7%;background:#fff"><img src="' + qrData + '" alt="QR verification" style="width:100%;height:100%;object-fit:contain" /></div>' +
          '<div style="position:absolute;left:17.07%;top:76.5%;text-align:left;color:#0D3B66;white-space:nowrap"><div style="font-size:1.08cqw;letter-spacing:.04em">CERTIFICATE ID</div><div class="mono" style="font-weight:700;font-size:1.12cqw;margin-top:0.25cqw">' + esc(cert.certificateId) + '</div><div style="font-weight:700;font-size:1.08cqw;margin-top:0.45cqw">Issued: ' + esc(fmtDate(cert.issueDate)) + '</div></div>' +
          '<img src="' + WS_SEAL + '" alt="Kanyakumari Seal" style="position:absolute;left:44.69%;top:77.47%;width:10.51%;height:auto;pointer-events:none" />' +
          '<img src="' + WS_SIG + '" alt="Signature" style="position:absolute;left:69.09%;top:73.5%;width:9.32%;height:auto;pointer-events:none" />' +
          '<div style="position:absolute;left:64.94%;top:80.05%;width:17.94%;height:0.24cqw;background:#CE9D43"></div>' +
          '<div style="position:absolute;left:64.94%;top:81.6%;width:17.94%;text-align:center;font-size:0.98cqw;line-height:1.35;color:#0D3B66">CORPORATE TRAINER &amp;<br/>PROGRAM LEAD</div>' +
        '</div>';

      const standardSheet =
        '<div class="sheet"><div class="frame-outer"><div class="frame-inner">' +
          '<img src="' + WS_LOGO + '" alt="' + esc(COMPANY_NAME) + ' logo" style="width:46px;height:46px;object-fit:contain;margin:0 auto 10px;display:block" />' +
          '<div class="co">' + esc(COMPANY_NAME.toUpperCase()) + '</div>' +
          '<div class="co-sub">Karangad, Kanyakumari District, Tamil Nadu · ' + esc(WEBSITE_URL.replace(/\\/$/, '')) + '</div>' +
          '<div class="rule"></div>' +
          '<h2 class="title">' + esc(title) + '</h2>' +
          '<p style="margin:24px 0 0;font-size:14px;color:#475569">This is to proudly certify that</p>' +
          '<div class="student">' + esc(cert.studentName) + '</div>' +
          '<div class="name-rule"></div>' +
          '<div style="font-size:15px;font-weight:600;color:#334155">of ' + esc(cert.college) + '</div>' +
          '<p class="body-text">has successfully attended and completed the <b>' + esc(cert.certType) + '</b> programme in <b>' + esc(cert.course) + '</b>' + (cert.duration ? ' (' + esc(cert.duration) + ')' : '') + ', conducted by <b style="color:#0B2A5B">' + esc(COMPANY_NAME) + '</b> from ' + esc(fmtDate(cert.startDate)) + ' to ' + esc(fmtDate(cert.endDate)) + '.</p>' +
          '<div class="foot">' +
            '<div class="foot-left"><div class="mono" style="font-weight:700;color:#0B2A5B">ID: ' + esc(cert.certificateId) + '</div><div>Issued: ' + esc(fmtDate(cert.issueDate)) + '</div></div>' +
            '<div><div class="qr-box"><img src="' + qrData + '" alt="QR verification" /></div><div class="qr-cap">SCAN TO VERIFY AUTHENTICITY</div></div>' +
            '<div class="sig"><div class="sig-line">NEWTRI Admin</div><div style="font-size:12px;font-weight:700;margin-top:4px">Authorized Signatory</div><div style="font-size:11px;color:#64748b">' + esc(COMPANY_NAME) + '</div></div>' +
          '</div>' +
        '</div></div></div>';

      root.innerHTML =
        '<div class="banner-ok no-print">' +
          '<div class="banner-row">' +
            '<img class="banner-logo" src="' + WS_LOGO + '" alt="' + esc(COMPANY_NAME) + ' logo" />' +
            '<div>' +
              '<b>Verified Official Certificate — Issued by ' + esc(COMPANY_NAME) + '</b>' +
              '<p style="margin:6px 0 0;font-size:13.5px;line-height:1.55">' + bannerSummary + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card no-print actions">' +
          '<span style="font-size:13px;color:#475569">Download your PDF certificate below—scanning its QR code always verifies this record.</span>' +
          '<div class="action-btns">' +
            '<button class="btn btn-primary" id="dlBtn">Download PDF</button>' +
            '<button class="btn btn-outline" onclick="window.print()">Print</button>' +
            '<a class="btn btn-wa" target="_blank" href="https://wa.me/?text=' + encodeURIComponent(waMsg) + '">Share WhatsApp</a>' +
          '</div>' +
        '</div>' +
        (isWs ? workshopSheet : standardSheet);

      document.getElementById('dlBtn').addEventListener('click', () => downloadPdf(cert, verifyUrl));
    }

    function renderHistory() {
      const items = readHistory();
      updateHistCounts(items.length);
      if (!showHistory) { historyPanel.style.display = 'none'; return; }
      historyPanel.style.display = 'block';
      let rowsHtml = '';
      if (!items.length) {
        rowsHtml = '<div style="padding:22px 0;text-align:center;color:#64748b;font-size:13px">No verified certificates saved in this browser yet. Verify a Certificate ID or scan a QR code to record it here.</div>';
      } else {
        rowsHtml = items.map((it) =>
          '<div class="hist-item">' +
            '<div>' +
              '<div style="font-weight:700;color:#0f172a;font-size:14px">' + esc(it.studentName) + ' <span class="mono" style="font-size:12px;color:#0B2A5B;margin-left:6px">' + esc(it.certificateId) + '</span></div>' +
              '<div class="hist-meta">' + esc(it.course) + ' · ' + esc(it.certType) + ' · Checked ' + esc(fmtWhen(it.verifiedAt)) + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px">' +
              '<button type="button" class="btn btn-outline hist-open" data-tok="' + esc(it.qrToken) + '" style="padding:6px 12px;font-size:12px">Open</button>' +
              '<button type="button" class="btn btn-outline hist-del" data-tok="' + esc(it.qrToken) + '" style="padding:6px 10px;font-size:12px;color:#b91c1c" aria-label="Remove">×</button>' +
            '</div>' +
          '</div>'
        ).join('');
      }
      historyPanel.innerHTML =
        '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:8px">' +
          '<div><h2 style="margin:0;font-size:16px;color:#0B2A5B">Recent Verification History</h2><p style="margin:2px 0 0;font-size:12px;color:#64748b">Click any previously checked certificate to re-verify and download.</p></div>' +
          '<div style="display:flex;gap:8px">' +
            (items.length ? '<button type="button" class="btn btn-outline" id="histClearBtn" style="padding:6px 12px;font-size:12px;color:#b91c1c">Clear All</button>' : '') +
            '<button type="button" class="btn btn-outline" id="histCloseBtn" style="padding:6px 12px;font-size:12px">Close</button>' +
          '</div>' +
        '</div>' +
        rowsHtml;

      document.getElementById('histCloseBtn').addEventListener('click', () => { showHistory = false; renderHistory(); });
      const clrBtn = document.getElementById('histClearBtn');
      if (clrBtn) clrBtn.addEventListener('click', () => { writeHistory([]); renderHistory(); });
      historyPanel.querySelectorAll('.hist-open').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const tok = btn.getAttribute('data-tok');
          showHistory = false;
          renderHistory();
          root.innerHTML = '<div class="card">Loading certificate...</div>';
          const c = await loadByToken(tok);
          if (c) history.replaceState(null, '', '?t=' + encodeURIComponent(c.qrToken));
          await renderCert(c);
        });
      });
      historyPanel.querySelectorAll('.hist-del').forEach((btn) => {
        btn.addEventListener('click', () => {
          const tok = btn.getAttribute('data-tok');
          writeHistory(readHistory().filter((i) => i.qrToken !== tok));
          renderHistory();
        });
      });
    }

    const toggleHist = () => { showHistory = !showHistory; renderHistory(); };
    document.getElementById('topHistBtn').addEventListener('click', toggleHist);
    document.getElementById('histToggleBtn').addEventListener('click', toggleHist);
    updateHistCounts(readHistory().length);

    document.getElementById('lookupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('lookupInput').value.trim();
      if (!id) return;
      root.innerHTML = '<div class="card">Verifying certificate...</div>';
      const cert = await loadById(id);
      if (cert) history.replaceState(null, '', '?t=' + encodeURIComponent(cert.qrToken));
      await renderCert(cert);
    });

    const params = new URLSearchParams(window.location.search);
    const t = params.get('t');
    const id = params.get('id');
    if (t) {
      root.innerHTML = '<div class="card">Loading certificate...</div>';
      renderCert(await loadByToken(t));
    } else if (id) {
      document.getElementById('lookupInput').value = id;
      root.innerHTML = '<div class="card">Verifying certificate...</div>';
      renderCert(await loadById(id));
    } else {
      root.innerHTML = '<div class="card" style="text-align:center;color:#475569">Enter a Certificate ID above or open your personal WhatsApp / Email certificate link. Previously checked certificates are saved under <b>History</b>.</div>';
    }
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'index.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
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
