import React, { useEffect, useState } from 'react';
import {
  Award,
  ExternalLink,
  History,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  auth,
  clearCompanyGmailSession,
  db,
  googleProvider,
  isBootstrapAdminEmail,
} from './firebase';
import {
  DEFAULT_SETTINGS,
  fetchPortalSettings,
  subscribeAdminCertificates,
  subscribeExpenses,
} from './services/certService';
import { fetchServerCapabilities, ServerCapabilities } from './services/deliveryService';
import { CombinedCertificate, ExpenseRecord, PortalSettings } from './types';
import { AdminLoginView } from './components/AdminLoginView';
import { CertificateView } from './components/CertificateView';
import { CertificatesDashboard } from './components/CertificatesDashboard';
import { HistoryView } from './components/HistoryView';
import { ExpensesView } from './components/ExpensesView';
import { SettingsView } from './components/SettingsView';

type AdminTab = 'certificates' | 'history' | 'expenses' | 'settings';

function parseRouteFromLocation(): {
  mode: 'public' | 'admin';
  token: string;
  certId: string;
} {
  if (typeof window === 'undefined') {
    return { mode: 'public', token: '', certId: '' };
  }
  const params = new URLSearchParams(window.location.search);
  const token = (params.get('t') || '').trim();
  const certId = (params.get('id') || '').trim();
  const verifyFlag = params.get('verify');
  const path = window.location.pathname;

  if (token) return { mode: 'public', token, certId: '' };
  if (path.startsWith('/v/')) {
    const pathToken = path.slice(3).replace(/\/+$/, '');
    if (pathToken) return { mode: 'public', token: pathToken, certId: '' };
  }
  if (certId || verifyFlag || path === '/verify') {
    return { mode: 'public', token: '', certId };
  }
  return { mode: 'admin', token: '', certId: '' };
}

export default function App() {
  const initialRoute = parseRouteFromLocation();

  const [viewMode, setViewMode] = useState<'public' | 'admin'>(initialRoute.mode);
  const [previewToken, setPreviewToken] = useState<string>(initialRoute.token);
  const [previewCertId, setPreviewCertId] = useState<string>(initialRoute.certId);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const [adminTab, setAdminTab] = useState<AdminTab>('certificates');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [settings, setSettings] = useState<PortalSettings>(DEFAULT_SETTINGS);
  const [capabilities, setCapabilities] = useState<ServerCapabilities>({
    smtpConfigured: false,
    smtpUser: null,
    waConfigured: false,
  });

  const [certs, setCerts] = useState<CombinedCertificate[]>([]);
  const [certsLoading, setCertsLoading] = useState<boolean>(true);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expensesLoading, setExpensesLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<string>('');

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? '' : curr));
    }, 3000);
  };

  useEffect(() => {
    void fetchPortalSettings().then(setSettings);
    void fetchServerCapabilities().then(setCapabilities);
  }, []);

  const evaluateUserAdmin = async (u: User | null) => {
    setUser(u);
    setAuthError('');
    if (!u) {
      setIsAdmin(false);
      setAuthReady(true);
      return;
    }

    if (!u.emailVerified) {
      setIsAdmin(false);
      setAuthReady(true);
      return;
    }

    if (isBootstrapAdminEmail(u.email)) {
      setIsAdmin(true);
      setAuthReady(true);
      return;
    }

    try {
      const snap = await getDoc(doc(db, 'admins', u.uid));
      setIsAdmin(snap.exists());
    } catch {
      setIsAdmin(false);
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    void getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setViewMode('admin');
        }
      })
      .catch((err) => {
        const code = (err as { code?: string })?.code || '';
        if (code === 'auth/unauthorized-domain') {
          setAuthError(`UNAUTHORIZED_DOMAIN:${window.location.hostname}`);
        } else if (code && code !== 'auth/null-user') {
          setAuthError(err instanceof Error ? err.message : 'Google redirect sign-in failed.');
        }
      });

    const unsub = onAuthStateChanged(auth, (u) => {
      void evaluateUserAdmin(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !isAdmin) {
      setCerts([]);
      setExpenses([]);
      setCertsLoading(false);
      setExpensesLoading(false);
      return;
    }

    setCertsLoading(true);
    setExpensesLoading(true);

    const unsubCerts = subscribeAdminCertificates(
      (data) => {
        setCerts(data);
        setCertsLoading(false);
      },
      (err) => {
        setCertsLoading(false);
        notify(err.message);
      }
    );

    const unsubExpenses = subscribeExpenses(
      (data) => {
        setExpenses(data);
        setExpensesLoading(false);
      },
      (err) => {
        setExpensesLoading(false);
        notify(err.message);
      }
    );

    return () => {
      unsubCerts();
      unsubExpenses();
    };
  }, [authReady, isAdmin]);

  const handleGoogleRedirectSignIn = async () => {
    setAuthError('');
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setAuthError(`UNAUTHORIZED_DOMAIN:${window.location.hostname}`);
      } else {
        setAuthError(err instanceof Error ? err.message : 'Could not redirect to Google Sign-In.');
      }
    }
  };

  const handleSignIn = async () => {
    setAuthError('');
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    try {
      await signInWithPopup(auth, googleProvider);
      setViewMode('admin');
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setAuthError(`UNAUTHORIZED_DOMAIN:${window.location.hostname}`);
      } else if (
        !inIframe &&
        (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment')
      ) {
        await handleGoogleRedirectSignIn();
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Google sign-in popup was closed before finishing. Click Sign in with Google to try again.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'Browser blocked the Google sign-in popup inside this preview frame. Click "Open in Full Tab" below to sign in directly.'
        );
      } else {
        setAuthError(err instanceof Error ? err.message : 'Sign-in could not be completed.');
      }
    }
  };

  const handleUserReloaded = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    await evaluateUserAdmin(auth.currentUser);
  };

  const handleSignOut = async () => {
    clearCompanyGmailSession();
    await signOut(auth);
    setIsAdmin(false);
    setPreviewToken('');
    setPreviewCertId('');
    setViewMode('admin');
    window.history.replaceState(null, '', '/');
  };

  const openPublicPreview = (token = '') => {
    setPreviewToken(token);
    setPreviewCertId('');
    setViewMode('public');
    const url = token
      ? `${window.location.pathname}?t=${encodeURIComponent(token)}`
      : `${window.location.pathname}?verify=1`;
    window.history.replaceState(null, '', url);
  };

  const openAdminConsole = () => {
    setPreviewToken('');
    setPreviewCertId('');
    setViewMode('admin');
    window.history.replaceState(null, '', '/');
  };

  // Public verification routes (?t=..., ?id=..., ?verify=1, /v/..., /verify) remain accessible without login
  if (viewMode === 'public') {
    return (
      <CertificateView
        initialToken={previewToken}
        initialCertId={previewCertId}
        settings={settings}
        isAdmin={isAdmin}
        onOpenAdmin={() => {
          openAdminConsole();
        }}
        onOpenAdminHistory={() => {
          setAdminTab('history');
          openAdminConsole();
        }}
      />
    );
  }

  if (!authReady) {
    return (
      <div className="portal-backdrop flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <img
              src="/assets/newtri-logo.png"
              alt="NEWTRI Technologies"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#0B2A5B]" />
          <p className="mt-3 text-sm font-medium text-slate-600">Loading NEWTRI Certificates...</p>
        </div>
      </div>
    );
  }

  // Signed in with an unauthorized email (after verification)
  if (user && user.emailVerified && !isAdmin) {
    return (
      <div className="portal-backdrop flex min-h-screen items-center justify-center p-4">
        <div className="animate-fade-up w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
            <img
              src="/assets/newtri-logo.png"
              alt={settings.companyName}
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Admin Access Required</h1>
          <p className="text-sm text-slate-600">
            You are signed in as <span className="font-mono font-medium">{user.email}</span>, which is not authorized for the {settings.companyName} admin console.
          </p>
          {authError && <p className="text-xs font-medium text-red-700">{authError}</p>}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => openPublicPreview('')}
              className="btn-tactile rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Student Verify Portal
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-tactile rounded-lg bg-[#0B2A5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
            >
              Sign Out &amp; Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Login Page shown first at root URL when signed out or awaiting email verification
  if (!user || !user.emailVerified) {
    return (
      <AdminLoginView
        settings={settings}
        pendingVerificationUser={user && !user.emailVerified ? user : null}
        authError={authError}
        onGoogleSignIn={handleSignIn}
        onGoogleRedirectSignIn={handleGoogleRedirectSignIn}
        onUserReloaded={handleUserReloaded}
        onSignOut={handleSignOut}
        onOpenStudentVerify={() => openPublicPreview('')}
      />
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'certificates', label: 'Certificates', icon: <Award className="h-4 w-4" /> },
    { id: 'history', label: 'Student History', icon: <History className="h-4 w-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="h-4 w-4" /> },
    { id: 'settings', label: 'Hosting & Channels', icon: <Settings className="h-4 w-4" /> },
  ];

  const tabTitles: Record<AdminTab, string> = {
    certificates: 'Certificates',
    history: 'Student History',
    expenses: 'Expenses',
    settings: 'Hosting & Channels',
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar (240px) */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white lg:flex">
        <div>
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3.5">
            <img
              src="/assets/newtri-logo.png"
              alt={`${settings.companyName} logo`}
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 object-contain"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold tracking-tight text-[#0B2A5B]">
                {settings.companyName}
              </div>
              <div className="text-[11px] text-slate-500">Certificate Console</div>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAdminTab(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  adminTab === item.id
                    ? 'bg-[#0B2A5B] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}

            <div className="my-2 border-t border-slate-200 pt-2">
              <button
                type="button"
                onClick={() => openPublicPreview('')}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Verify Portal</span>
              </button>
            </div>
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4 space-y-3">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-900">
              {user.displayName || 'Admin'}
            </div>
            <div className="truncate text-[11px] text-slate-500">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col justify-between bg-white p-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src="/assets/newtri-logo.png"
                    alt={`${settings.companyName} logo`}
                    className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 object-contain"
                  />
                  <span className="truncate font-bold text-[#0B2A5B]">{settings.companyName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-500"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="mt-3 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAdminTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                      adminTab === item.id
                        ? 'bg-[#0B2A5B] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openPublicPreview('');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Verify Portal</span>
                </button>
              </nav>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <img
              src="/assets/newtri-logo.png"
              alt={settings.companyName}
              className="h-7 w-7 rounded-md border border-slate-200 bg-white p-0.5 object-contain lg:hidden"
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-500 hidden sm:inline">
                {settings.companyName}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-bold text-slate-900">{tabTitles[adminTab]}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openPublicPreview('')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#1f6feb]" />
              <span>Public Verify Page</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {adminTab === 'certificates' && (
            <CertificatesDashboard
              certs={certs}
              loading={certsLoading}
              settings={settings}
              capabilities={capabilities}
              adminEmail={user.email || ''}
              onPreviewCertificate={(token) => openPublicPreview(token)}
              onNotify={notify}
            />
          )}

          {adminTab === 'history' && (
            <HistoryView
              certs={certs}
              settings={settings}
              onPreviewCertificate={(token) => openPublicPreview(token)}
              onNotify={notify}
            />
          )}

          {adminTab === 'expenses' && (
            <ExpensesView expenses={expenses} loading={expensesLoading} onNotify={notify} />
          )}

          {adminTab === 'settings' && (
            <SettingsView
              settings={settings}
              capabilities={capabilities}
              onSettingsUpdated={setSettings}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      {/* Transient Notification Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
