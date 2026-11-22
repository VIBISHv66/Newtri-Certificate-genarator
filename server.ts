import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

interface ScanRecord {
  count: number;
  lastScanAt: string;
}

const scanCounts = new Map<string, ScanRecord>();

function normalizePhone10(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

function escapeHtml(s: unknown): string {
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/capabilities', (_req, res) => {
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASS || '').trim();
    const waToken = (process.env.WA_TOKEN || '').trim();
    const waPhoneId = (process.env.WA_PHONE_ID || '').trim();
    res.json({
      smtpConfigured: Boolean(smtpUser && smtpPass && !smtpPass.includes('PUT_16_LETTER')),
      smtpUser: smtpUser || null,
      waConfigured: Boolean(waToken && waPhoneId),
    });
  });

  app.post('/api/scans', (req, res) => {
    const certId = String(req.body?.certificateId ?? '').trim();
    if (!/^[A-Z0-9-]{6,30}$/.test(certId)) {
      res.status(400).json({ error: 'Invalid certificateId' });
      return;
    }
    const now = new Date().toISOString();
    const prev = scanCounts.get(certId);
    const next: ScanRecord = {
      count: (prev?.count || 0) + 1,
      lastScanAt: now,
    };
    scanCounts.set(certId, next);
    res.json({ ok: true, certificateId: certId, ...next });
  });

  app.get('/api/scans', (_req, res) => {
    const out: Record<string, ScanRecord> = {};
    for (const [k, v] of scanCounts.entries()) {
      out[k] = v;
    }
    res.json({ scans: out });
  });

  app.post('/api/send-email', async (req, res) => {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASS || '').trim();
    const fromName = (process.env.SMTP_FROM_NAME || 'NEWTRI Technologies').trim();

    if (!smtpUser || !smtpPass || smtpPass.includes('PUT_16_LETTER')) {
      res.status(400).json({
        error:
          'Server Gmail SMTP is not configured. Add SMTP_USER=newtritechnologies@gmail.com and a Gmail App Password in SMTP_PASS inside Secrets.',
      });
      return;
    }

    if (smtpUser.toLowerCase() !== 'newtritechnologies@gmail.com') {
      res.status(400).json({
        error: `SMTP_USER must be set to newtritechnologies@gmail.com (currently "${smtpUser}").`,
      });
      return;
    }

    const to = String(req.body?.to ?? '').trim();
    const studentName = String(req.body?.studentName ?? '').trim();
    const course = String(req.body?.course ?? '').trim();
    const certType = String(req.body?.certType ?? 'Course').trim();
    const duration = String(req.body?.duration ?? '').trim();
    const period = String(req.body?.period ?? '').trim();
    const link = String(req.body?.link ?? '').trim();

    if (!to || !studentName || !course || !link) {
      res.status(400).json({ error: 'Missing required email fields.' });
      return;
    }

    const subject = `Your NEWTRI Technologies certificate - ${course}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #CFE5FF;border-radius:12px;overflow:hidden">
        <div style="background:#0B2F6B;color:#fff;padding:18px 22px;font-size:20px;letter-spacing:2px"><b>NEWTRI</b> TECHNOLOGIES</div>
        <div style="padding:22px;color:#1B2638;font-size:15px;line-height:1.6">
          <p>Dear <b>${escapeHtml(studentName)}</b>,</p>
          <p>Congratulations! Your <b>${escapeHtml(certType)}</b> certificate for <b>${escapeHtml(course)}</b> (${escapeHtml(duration)}, ${escapeHtml(period)}) is ready.</p>
          <p style="text-align:center;margin:26px 0">
            <a href="${escapeHtml(link)}" style="background:#1E6FE0;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:bold">View &amp; Download Certificate</a>
          </p>
          <p style="color:#55657F;font-size:13px">Click the button anytime to open and download your PDF certificate. Anyone can scan the QR code on the certificate to verify it was issued by NEWTRI Technologies (https://newtritechnologies.com/).</p>
          <p>Regards,<br><b>NEWTRI Technologies</b><br>Karangad, Kanyakumari District, Tamil Nadu</p>
        </div>
      </div>`;
    const text = `Dear ${studentName},\n\nCongratulations! Your ${certType} certificate for ${course} (${period}) is ready.\nView & download: ${link}\n\nNEWTRI Technologies\nhttps://newtritechnologies.com/`;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        to,
        subject,
        text,
        html,
      });
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SMTP delivery failed';
      res.status(500).json({ error: message.slice(0, 200) });
    }
  });

  app.post('/api/send-whatsapp', async (req, res) => {
    const waToken = (process.env.WA_TOKEN || '').trim();
    const waPhoneId = (process.env.WA_PHONE_ID || '').trim();
    const waTemplate = (process.env.WA_TEMPLATE || 'certificate_ready').trim();
    const waLang = (process.env.WA_LANG || 'en').trim();

    if (!waToken || !waPhoneId) {
      res.status(400).json({
        error: 'WhatsApp Business Cloud API is not configured. Use 1-click WhatsApp links or add WA_TOKEN and WA_PHONE_ID.',
      });
      return;
    }

    const phone10 = normalizePhone10(req.body?.phone);
    const name = String(req.body?.studentName ?? '').trim();
    const course = String(req.body?.course ?? '').trim();
    const link = String(req.body?.link ?? '').trim();

    if (!phone10 || !name || !course || !link) {
      res.status(400).json({ error: 'Missing valid 10-digit phone, studentName, course, or link.' });
      return;
    }

    try {
      const resp = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(waPhoneId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: `91${phone10}`,
            type: 'template',
            template: {
              name: waTemplate,
              language: { code: waLang },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: name },
                    { type: 'text', text: course },
                    { type: 'text', text: link },
                  ],
                },
              ],
            },
          }),
        }
      );

      if (!resp.ok) {
        const errJson = (await resp.json().catch(() => ({}))) as { error?: { message?: string } };
        res.status(resp.status).json({
          error: errJson?.error?.message || `WhatsApp API HTTP ${resp.status}`,
        });
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'WhatsApp delivery failed';
      res.status(500).json({ error: message.slice(0, 200) });
    }
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

  if (!IS_PROD || !hasDist) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEWTRI Certificates server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
