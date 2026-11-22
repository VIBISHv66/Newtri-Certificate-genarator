import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  BOOTSTRAP_ADMIN_EMAILS,
  checkCurrentDomainAuthorized,
  FIREBASE_PROJECT_ID,
  isHostedOnAuthorizedDomain,
} from '../firebase';
import { PortalSettings } from '../types';

interface AdminLoginViewProps {
  settings: PortalSettings;
  pendingVerificationUser: User | null;
  authError: string;
  onGoogleSignIn: () => Promise<void>;
  onGoogleRedirectSignIn: () => Promise<void>;
  onUserReloaded: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenStudentVerify: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  settings,
  pendingVerificationUser,
  authError,
  onGoogleSignIn,
  onGoogleRedirectSignIn,
  onUserReloaded,
  onSignOut,
  onOpenStudentVerify,
}) => {
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [redirectingGoogle, setRedirectingGoogle] = useState(false);
  const [verifyingRefresh, setVerifyingRefresh] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);

  const [authorizedDomain, setAuthorizedDomain] = useState<boolean>(() =>
    isHostedOnAuthorizedDomain()
  );

  useEffect(() => {
    let active = true;
    void checkCurrentDomainAuthorized().then((ok) => {
      if (active) setAuthorizedDomain(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  const unauthorizedHostFromErr = authError.startsWith('UNAUTHORIZED_DOMAIN:')
    ? authError.slice('UNAUTHORIZED_DOMAIN:'.length)
    : '';
  const currentHost =
    unauthorizedHostFromErr || (typeof window !== 'undefined' ? window.location.hostname : '');
  const displayAuthError = unauthorizedHostFromErr ? '' : authError;

  const handleCopyHost = () => {
    if (!currentHost || typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(currentHost).then(() => {
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    });
  };

  const handleGoogleClick = async () => {
    setSigningInGoogle(true);
    try {
      await onGoogleSignIn();
    } finally {
      setSigningInGoogle(false);
    }
  };

  const handleRedirectClick = async () => {
    setRedirectingGoogle(true);
    try {
      await onGoogleRedirectSignIn();
    } finally {
      setRedirectingGoogle(false);
    }
  };

  const handleCheckVerified = async () => {
    setVerifyingRefresh(true);
    try {
      await onUserReloaded();
    } finally {
      setVerifyingRefresh(false);
    }
  };

  return (
    <div className="portal-backdrop min-h-screen overflow-x-hidden flex flex-col text-slate-900">
      {/* Top Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3.5 py-2.5 sm:gap-8 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 shrink-0">
            <img
              src="/assets/newtri-logo.png"
              alt={`${settings.companyName} logo`}
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 object-contain"
            />
            <span className="truncate max-w-[140px] sm:max-w-none text-sm sm:text-lg font-extrabold tracking-tight text-[#0B2A5B]">
              {settings.companyName}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={onOpenStudentVerify}
              className="hover:text-[#0B2A5B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Verify Certificate
            </button>
            <a
              href={settings.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0B2A5B] transition-colors whitespace-nowrap shrink-0"
            >
              Official Website
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href={settings.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="md:hidden inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <span>Website</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={onOpenStudentVerify}
              className="btn-tactile min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Verify Portal
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="animate-fade-up grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/5 md:grid-cols-12">
          {/* Left Architectural Brand Column */}
          <div className="flex flex-col justify-between bg-[#0B2A5B] p-8 text-white md:col-span-5">
            <div>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md">
                <img
                  src="/assets/newtri-logo.png"
                  alt={`${settings.companyName} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight">
                {settings.companyName}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-blue-100">
                Admin Certificate Console for Excel batch generation, Canva Workshop &amp; Training certificates, WhatsApp/Email delivery, and student verification history.
              </p>

              <div className="mt-8 space-y-3 border-t border-white/15 pt-6 text-xs text-blue-100">
                <div>01. Single &amp; Excel Batch Certificate Issuance</div>
                <div>02. Exact Workshop PDF + QR Verification</div>
                <div>03. Email, WhatsApp &amp; Student History Console</div>
              </div>
            </div>

            <div className="mt-8 border-t border-white/15 pt-4 text-xs text-blue-200">
              Authorized admin portal · Student QR links open directly without login
            </div>
          </div>

          {/* Right Google Sign-In Column */}
          <div className="flex flex-col justify-center p-8 md:col-span-7">
            {pendingVerificationUser ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Verify Admin Google Account</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Signed in as{' '}
                    <span className="font-mono font-semibold text-[#0B2A5B]">
                      {pendingVerificationUser.email}
                    </span>
                    . Please sign in directly with Google to confirm your verified email address.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => void handleGoogleClick()}
                    className="btn-tactile inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B2A5B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign in with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCheckVerified()}
                    disabled={verifyingRefresh}
                    className="btn-tactile inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${verifyingRefresh ? 'animate-spin' : ''}`} />
                    <span>Refresh Verification Status</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="pt-1 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Use a different Google account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Admin Sign In</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Sign in with your authorized NEWTRI Google account to open the certificate console.
                  </p>
                </div>

                {(!authorizedDomain || Boolean(unauthorizedHostFromErr)) && currentHost && (
                  <div className="space-y-2.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
                    <div className="font-bold">
                      Authorize Domain for Google Sign-In ({currentHost})
                    </div>
                    <p className="leading-relaxed text-amber-900">
                      Firebase blocks Google Sign-In on newly deployed domains until{' '}
                      <span className="font-mono font-semibold">{currentHost}</span> is added under{' '}
                      <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>.
                      Add it once below, or open your pre-authorized AI Studio URL.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <a
                        href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-3 py-1.5 font-semibold text-white hover:bg-[#123a7d]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Add Domain in Firebase Console</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyHost}
                        className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-semibold text-amber-950 hover:bg-amber-100 cursor-pointer"
                      >
                        {copiedHost ? (
                          <Check className="h-3.5 w-3.5 text-emerald-700" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedHost ? 'Copied Domain' : `Copy "${currentHost}"`}</span>
                      </button>
                      <a
                        href="https://ais-pre-mobd3bswkuprp4tc4ir7af-860549325467.asia-northeast1.run.app/"
                        className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-semibold text-amber-950 hover:bg-amber-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open AI Studio URL</span>
                      </a>
                    </div>
                  </div>
                )}

                {displayAuthError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                    <span>{displayAuthError}</span>
                  </div>
                )}

                {/* Primary Google Sign-In Button */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    disabled={signingInGoogle || redirectingGoogle}
                    onClick={() => void handleGoogleClick()}
                    className="btn-tactile flex w-full items-center justify-center gap-3 rounded-xl bg-[#0B2A5B] px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#123a7d] disabled:opacity-60 cursor-pointer"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-1">
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                    </span>
                    <span>{signingInGoogle ? 'Opening Google Sign-In...' : 'Sign in with Google'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {!inIframe ? (
                    <button
                      type="button"
                      disabled={signingInGoogle || redirectingGoogle}
                      onClick={() => void handleRedirectClick()}
                      className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>
                        {redirectingGoogle
                          ? 'Redirecting to Google...'
                          : 'Redirect in this Tab to Google Account'}
                      </span>
                    </button>
                  ) : (
                    typeof window !== 'undefined' && (
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open in Full Browser Tab (for Redirect Sign-In)</span>
                      </a>
                    )
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Authorized Admin Google Accounts</div>
                  <div className="mt-1 font-mono text-[11px] text-slate-700">
                    {BOOTSTRAP_ADMIN_EMAILS.join('  ·  ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
