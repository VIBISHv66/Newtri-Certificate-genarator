import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth';
import {
  auth,
  COMPANY_SENDER_EMAIL,
  FIREBASE_PROJECT_ID,
  isHostedOnAuthorizedDomain,
} from '../firebase';
import { PortalSettings } from '../types';

interface AdminLoginViewProps {
  settings: PortalSettings;
  pendingVerificationUser: User | null;
  authError: string;
  onGoogleSignIn: () => Promise<void>;
  onUserReloaded: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenStudentVerify: () => void;
}

function mapFirebaseAuthError(err: unknown): { message: string; providerDisabled: boolean } {
  const code = (err as { code?: string })?.code || '';
  if (code === 'auth/operation-not-allowed') {
    return {
      message:
        'Email/Password sign-in is not turned on yet in Firebase Console. Click "Sign in with Google" below to enter right away, or enable Email/Password in Firebase Console.',
      providerDisabled: true,
    };
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return {
      message:
        'Incorrect email or password. If this is your first time using Email/Password login, switch to "First-Time Activation" below or reset your password.',
      providerDisabled: false,
    };
  }
  if (code === 'auth/user-not-found') {
    return {
      message:
        'No Email/Password account exists yet for this email. Click "First-Time Activation" below to register it, or sign in with Google.',
      providerDisabled: false,
    };
  }
  if (code === 'auth/email-already-in-use') {
    return {
      message: 'This email is already registered. Switch back to Sign In and enter your password.',
      providerDisabled: false,
    };
  }
  if (code === 'auth/weak-password') {
    return {
      message: 'Password should be at least 6 characters long.',
      providerDisabled: false,
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      message: 'Too many attempts. Please wait a moment and try again.',
      providerDisabled: false,
    };
  }
  return {
    message: err instanceof Error ? err.message : 'Unable to sign in right now.',
    providerDisabled: false,
  };
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  settings,
  pendingVerificationUser,
  authError,
  onGoogleSignIn,
  onUserReloaded,
  onSignOut,
  onOpenStudentVerify,
}) => {
  const [mode, setMode] = useState<'signin' | 'activate'>('signin');
  const [email, setEmail] = useState(COMPANY_SENDER_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [formError, setFormError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [providerDisabled, setProviderDisabled] = useState(false);
  const [verifyingRefresh, setVerifyingRefresh] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const authorizedDomain = isHostedOnAuthorizedDomain();
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
    setFormError('');
    try {
      await onGoogleSignIn();
    } finally {
      setSigningInGoogle(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setFormError('Enter both your admin email address and password.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setInfoMsg('');
    setProviderDisabled(false);

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        try {
          await sendEmailVerification(cred.user);
          setInfoMsg(
            `Account created and verification email sent to ${cleanEmail}. Please click the link in your inbox, then click Refresh Status.`
          );
        } catch {
          setInfoMsg('Account created. Click Send Verification Email to confirm your address.');
        }
      }
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setFormError(mapped.message);
      setProviderDisabled(mapped.providerDisabled);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError('Enter your admin email address first, then click Forgot Password.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setInfoMsg('');
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfoMsg(`Password reset email sent to ${cleanEmail}. Check your inbox.`);
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setFormError(mapped.message);
      setProviderDisabled(mapped.providerDisabled);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendVerification = async () => {
    if (!pendingVerificationUser) return;
    setSubmitting(true);
    setFormError('');
    setInfoMsg('');
    try {
      await sendEmailVerification(pendingVerificationUser);
      setInfoMsg(
        `Verification link sent to ${pendingVerificationUser.email}. Open your Gmail inbox, click the confirmation link, and press "I've Verified — Continue".`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not send verification email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckVerified = async () => {
    setVerifyingRefresh(true);
    setFormError('');
    try {
      await onUserReloaded();
    } finally {
      setVerifyingRefresh(false);
    }
  };

  return (
    <div className="portal-backdrop min-h-screen flex flex-col text-slate-900">
      {/* Top Bar (3-zone contract) */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-3">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <img
              src="/assets/newtri-logo.png"
              alt={`${settings.companyName} logo`}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white p-0.5 object-contain"
            />
            <span className="text-lg font-extrabold tracking-tight text-[#0B2A5B]">
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

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenStudentVerify}
              className="btn-tactile rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Student Verify Portal
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

          {/* Right Form Column */}
          <div className="p-8 md:col-span-7">
            {pendingVerificationUser ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Verify Admin Email Address</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Signed in as{' '}
                    <span className="font-mono font-semibold text-[#0B2A5B]">
                      {pendingVerificationUser.email}
                    </span>
                    . Firebase requires your email address to be verified before accessing certificate records.
                  </p>
                </div>

                {infoMsg && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{infoMsg}</span>
                  </div>
                )}

                {formError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={submitting}
                    className="btn-tactile inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B2A5B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123a7d] disabled:opacity-60 cursor-pointer"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{submitting ? 'Sending...' : 'Send Verification Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckVerified}
                    disabled={verifyingRefresh}
                    className="btn-tactile inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${verifyingRefresh ? 'animate-spin' : ''}`} />
                    <span>I&rsquo;ve Verified — Continue to Console</span>
                  </button>

                  <div className="relative my-2 flex items-center">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="mx-3 text-xs text-slate-400">or instant verified access</span>
                    <div className="flex-grow border-t border-slate-200" />
                  </div>

                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="btn-tactile inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign in with Google ({pendingVerificationUser.email})</span>
                  </button>

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 pt-1 cursor-pointer"
                  >
                    Use a different account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Admin Sign In</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Sign in with your authorized Google account (<span className="font-mono">{COMPANY_SENDER_EMAIL}</span>) to manage certificates.
                  </p>
                </div>

                {(!authorizedDomain || Boolean(unauthorizedHostFromErr)) && currentHost && (
                  <div className="space-y-2.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
                    <div className="font-bold">
                      Authorize Domain for Sign-In ({currentHost})
                    </div>
                    <p className="leading-relaxed text-amber-900">
                      Firebase blocks sign-in on newly deployed domains until{' '}
                      <span className="font-mono font-semibold">{currentHost}</span> is listed in{' '}
                      <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>.
                      You can add it in 10 seconds below, or open your pre-authorized AI Studio App URL.
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
                        {copiedHost ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
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

                {(formError || displayAuthError) && (
                  <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                      <span>{formError || displayAuthError}</span>
                    </div>
                    {providerDisabled && (
                      <div className="pl-6 pt-1 text-[11px] text-red-800">
                        Open{' '}
                        <a
                          href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold underline"
                        >
                          Firebase Authentication → Sign-in method
                        </a>{' '}
                        and enable <strong>Email/Password</strong>, or click <strong>Sign in with Google</strong> below.
                      </div>
                    )}
                  </div>
                )}

                {infoMsg && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{infoMsg}</span>
                  </div>
                )}

                {/* Primary Google Sign-In Button */}
                <button
                  type="button"
                  disabled={signingInGoogle}
                  onClick={() => void handleGoogleClick()}
                  className="btn-tactile flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xs hover:border-[#0B2A5B]/40 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
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
                  <span>
                    {signingInGoogle
                      ? 'Signing in...'
                      : `Sign in with Google (${COMPANY_SENDER_EMAIL})`}
                  </span>
                </button>

                {/* Collapsible Secondary Email & Password Option */}
                <div className="border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm((v) => !v)}
                    className="flex w-full items-center justify-between text-xs font-semibold text-slate-600 hover:text-[#0B2A5B] cursor-pointer"
                  >
                    <span>Email &amp; Password Sign-In (requires Email/Password enabled in Firebase)</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showEmailForm ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showEmailForm && (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {mode === 'signin' ? 'Sign in with password' : 'First-time password activation'}
                        </span>
                        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMode('signin');
                              setFormError('');
                              setInfoMsg('');
                            }}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                              mode === 'signin'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Sign In
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMode('activate');
                              setFormError('');
                              setInfoMsg('');
                            }}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                              mode === 'activate'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Activate
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <label className="block text-xs font-semibold text-slate-700">
                          Admin Email ID
                          <div className="relative mt-1.5">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="email"
                              required
                              autoComplete="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="newtritechnologies@gmail.com"
                              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 transition-colors focus:border-[#1f6feb] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/20"
                            />
                          </div>
                        </label>

                        <div>
                          <div className="flex items-center justify-between">
                            <label htmlFor="admin-password" className="text-xs font-semibold text-slate-700">
                              Password
                            </label>
                            {mode === 'signin' && (
                              <button
                                type="button"
                                onClick={handleResetPassword}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#1f6feb] hover:underline cursor-pointer"
                              >
                                <KeyRound className="h-3 w-3" />
                                <span>Forgot password?</span>
                              </button>
                            )}
                          </div>
                          <div className="relative mt-1.5">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="admin-password"
                              type={showPassword ? 'text' : 'password'}
                              required
                              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter admin password"
                              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 transition-colors focus:border-[#1f6feb] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/20"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="btn-tactile flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B2A5B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123a7d] disabled:opacity-60 cursor-pointer"
                        >
                          <span>
                            {submitting
                              ? 'Please wait...'
                              : mode === 'signin'
                                ? 'Sign In with Password'
                                : 'Create & Verify Admin Account'}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
