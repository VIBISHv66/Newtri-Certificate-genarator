import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Download,
  Globe,
  Mail,
  MessageCircle,
  Save,
} from 'lucide-react';
import { PortalSettings } from '../types';
import {
  COMPANY_SENDER_EMAIL,
  connectCompanyGmail,
  getCompanyGmailSenderEmail,
} from '../firebase';
import { savePortalSettings } from '../services/certService';
import { isCompanySmtpReady, ServerCapabilities } from '../services/deliveryService';
import { cleanPublicUrl, isPrivateDevOrigin, resolveBaseUrl } from '../utils/format';
import { downloadStandaloneVerifierHtml } from '../utils/standaloneHtml';

interface SettingsViewProps {
  settings: PortalSettings;
  capabilities: ServerCapabilities;
  onSettingsUpdated: (next: PortalSettings) => void;
  onNotify: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  capabilities,
  onSettingsUpdated,
  onNotify,
}) => {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [websiteUrl, setWebsiteUrl] = useState(settings.websiteUrl);
  const [publicBaseUrl, setPublicBaseUrl] = useState(settings.publicBaseUrl);
  const [whatsappGroupInvite, setWhatsappGroupInvite] = useState(settings.whatsappGroupInvite);
  const [saving, setSaving] = useState(false);
  const [gmailSender, setGmailSender] = useState<string | null>(() => getCompanyGmailSenderEmail());
  const [connectingGmail, setConnectingGmail] = useState(false);

  const effectiveOrigin = resolveBaseUrl(publicBaseUrl);
  const usingUnconfiguredDevPreview = isPrivateDevOrigin() && !publicBaseUrl.trim();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanedBase = cleanPublicUrl(publicBaseUrl);
      setPublicBaseUrl(cleanedBase);
      const next: PortalSettings = {
        companyName: companyName.trim() || 'NEWTRI Technologies',
        websiteUrl: websiteUrl.trim() || 'https://newtritechnologies.com/',
        publicBaseUrl: cleanedBase,
        whatsappGroupInvite: whatsappGroupInvite.trim(),
      };
      await savePortalSettings(next);
      onSettingsUpdated(next);
      onNotify('Portal settings saved.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fixing Google 403 / 404 & Hosting on newtritechnologies.com */}
      <section className="rounded-xl border border-amber-300 bg-amber-50/70 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="space-y-2">
            <h2 className="text-base font-bold text-amber-950">
              Make Student Links Public (Fix 403 &amp; 404 Errors)
            </h2>
            <p className="text-sm text-amber-900 leading-relaxed">
              The editor URL (<span className="font-mono text-xs">ais-dev-...</span>) returns <strong>403</strong> for students, and the <span className="font-mono text-xs">ais-pre-...</span> URL returns <strong>404</strong> until you click <strong>Share / Deploy</strong> in AI Studio. To make every link work permanently for all students:
            </p>
            <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
              <div className="rounded-lg border border-amber-200 bg-white p-4 space-y-2">
                <div className="text-xs font-bold text-[#0B2A5B]">
                  Option A (Recommended): Host on newtritechnologies.com
                </div>
                <p className="text-xs text-slate-600">
                  Download this single static <span className="font-mono">index.html</span> file and place it inside <span className="font-mono">newtri-certs/certs/index.html</span> on your hosting / Netlify Drop. Set <strong>Public App Base URL</strong> below to <span className="font-mono">https://newtritechnologies.com/certs</span>. <strong>Note:</strong> Whenever a certificate format is updated here, download this <span className="font-mono">index.html</span> again and re-drop <span className="font-mono">newtri-certs</span> onto Netlify so QR scans show the latest format.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    downloadStandaloneVerifierHtml(settings);
                    onNotify('Downloaded updated index.html for newtritechnologies.com/certs/');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Updated index.html for newtritechnologies.com</span>
                </button>
              </div>

              <div className="rounded-lg border border-amber-200 bg-white p-4 space-y-2">
                <div className="text-xs font-bold text-[#0B2A5B]">
                  Option B: Deploy / Share Publicly in AI Studio
                </div>
                <p className="text-xs text-slate-600">
                  Click the <strong>Deploy</strong> (rocket) or <strong>Share</strong> button in the top-right bar of Google AI Studio and allow public access. Once deployed, your live Cloud Run / <span className="font-mono">ais-pre-...</span> URL stops returning 404 and works for every student.
                </p>
                <div className="rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-700 break-all">
                  Active Link Base: {effectiveOrigin}/?t=&lt;qr_token&gt;
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Branding & Base URL Form */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-[#1f6feb]" />
          <h2 className="text-base font-bold text-slate-900">Company &amp; Public Link Configuration</h2>
        </div>

        {usingUnconfiguredDevPreview && (
          <p className="mt-2 text-xs font-medium text-amber-800">
            Currently defaulting to your <span className="font-mono">ais-pre-...</span> URL. Make sure your AI Studio app is shared publicly, or upload the downloaded <span className="font-mono">index.html</span> to <span className="font-mono">https://newtritechnologies.com/certs</span> and paste that URL below.
          </p>
        )}

        <form onSubmit={handleSave} className="mt-4 max-w-2xl space-y-4">
          <label className="block text-xs font-medium text-slate-600">
            Company Name (printed on certificates &amp; verification page)
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Official Company Website
            <input
              required
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://newtritechnologies.com/"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">
              Public App Base URL (your active Netlify URL like https://certificatesforstudents.netlify.app, or your deployed Cloud Run URL)
              <input
                type="url"
                value={publicBaseUrl}
                onChange={(e) => setPublicBaseUrl(cleanPublicUrl(e.target.value))}
                placeholder="https://certificatesforstudents.netlify.app"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
              />
            </label>
            {typeof window !== 'undefined' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPublicBaseUrl(window.location.origin.replace('://ais-dev-', '://ais-pre-'))
                  }
                  className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-[#0B2A5B] hover:bg-slate-100 cursor-pointer"
                >
                  Use Current Site URL ({window.location.origin.replace('://ais-dev-', '://ais-pre-')})
                </button>
                {publicBaseUrl && (
                  <button
                    type="button"
                    onClick={() => setPublicBaseUrl('')}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Clear (Auto-detect)
                  </button>
                )}
              </div>
            )}
          </div>

          <label className="block text-xs font-medium text-slate-600">
            Optional Student WhatsApp Group Invite Link
            <input
              type="url"
              value={whatsappGroupInvite}
              onChange={(e) => setWhatsappGroupInvite(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B2A5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </form>
      </section>

      {/* Delivery Channels Status */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Mail className="h-4 w-4 text-[#1f6feb]" />
            <span>Email Delivery ({COMPANY_SENDER_EMAIL})</span>
          </div>
          {gmailSender ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>Gmail connected — sends directly from {gmailSender}</span>
            </div>
          ) : isCompanySmtpReady(capabilities) ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>Server Gmail SMTP active ({capabilities.smtpUser})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              <span>Connect {COMPANY_SENDER_EMAIL} to send student certificates</span>
            </div>
          )}
          <p className="text-xs text-slate-600 leading-relaxed">
            Student emails send strictly from <strong>{COMPANY_SENDER_EMAIL}</strong>. For permanent 1-click batch sending without OAuth Testing blocks, create a 16-letter{' '}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#1f6feb] underline"
            >
              Gmail App Password
            </a>{' '}
            on <strong>{COMPANY_SENDER_EMAIL}</strong> and add <span className="font-mono">SMTP_USER={COMPANY_SENDER_EMAIL}</span> and <span className="font-mono">SMTP_PASS</span> in AI Studio <strong>Secrets</strong> (or use <strong>Compose in Gmail</strong> inside Send Email anytime).
          </p>
          {!gmailSender && !isCompanySmtpReady(capabilities) && (
            <button
              type="button"
              disabled={connectingGmail}
              onClick={async () => {
                setConnectingGmail(true);
                try {
                  const res = await connectCompanyGmail();
                  setGmailSender(res.email);
                  onNotify(`Connected Gmail sender: ${res.email}`);
                } catch (err) {
                  onNotify(err instanceof Error ? err.message : 'Could not connect Gmail.');
                } finally {
                  setConnectingGmail(false);
                }
              }}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#123a7d] disabled:opacity-50 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{connectingGmail ? 'Connecting...' : `Connect ${COMPANY_SENDER_EMAIL} Gmail`}</span>
            </button>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <MessageCircle className="h-4 w-4 text-emerald-700" />
            <span>WhatsApp Delivery</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <Globe className="h-4 w-4" />
            <span>
              {capabilities.waConfigured
                ? 'WhatsApp Business Cloud API + 1-Click & Group Digest active'
                : '1-Click Individual WhatsApp, 50+ Queue & Group Digest active'}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Send individual messages directly via WhatsApp or copy a formatted batch message for your student WhatsApp group. Add WA_TOKEN and WA_PHONE_ID in Secrets if you connect Meta&rsquo;s automated Cloud API later.
          </p>
        </div>
      </section>
    </div>
  );
};
