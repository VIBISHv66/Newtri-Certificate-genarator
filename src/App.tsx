import React, { useEffect, useState } from 'react';
import {
  Award,
  ExternalLink,
  History,
  LogIn,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isBootstrapAdminEmail } from './firebase';
import {
  DEFAULT_SETTINGS,
  fetchPortalSettings,
  subscribeAdminCertificates,
  subscribeExpenses,
} from './services/certService';
import { fetchServerCapabilities, ServerCapabilities } from './services/deliveryService';
import { CombinedCertificate, ExpenseRecord, PortalSettings } from './types';
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
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

  const handleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
      setViewMode('admin');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in could not be completed.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsAdmin(false);
    setViewMode('public');
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

  // Show Public Certificate View whenever a token/verify route is active OR unauthenticated user visits /
  if (viewMode === 'public' || (authReady && !user && !previewToken)) {
    return (
      <CertificateView
        initialToken={previewToken}
        initialCertId={previewCertId}
        settings={settings}
        isAdmin={isAdmin}
        onOpenAdmin={() => {
          if (isAdmin) {
            openAdminConsole();
          } else {
            void handleSignIn();
          }
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0B2A5B]" />
          <p className="mt-3 text-sm font-medium text-slate-600">Loading NEWTRI Certificates...</p>
        </div>
      </div>
    );
  }

  // Signed in with non-admin email
  if (user && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center space-y-4">
          <ShieldCheck className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="text-lg font-bold text-slate-900">Admin Access Required</h1>
          <p className="text-sm text-slate-600">
            You are signed in as <span className="font-mono font-medium">{user.email}</span>, which is not authorized for the {settings.companyName} admin console.
          </p>
          {authError && <p className="text-xs font-medium text-red-700">{authError}</p>}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => openPublicPreview('')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Public Verify Portal
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg bg-[#0B2A5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback sign-in prompt if someone clicks Admin Console while signed out
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center space-y-4">
          <h1 className="text-lg font-bold text-[#0B2A5B]">{settings.companyName} Admin</h1>
          <p className="text-sm text-slate-600">
            Sign in with your authorized Google admin account to upload sheets, approve certificates, and send links via Email and WhatsApp.
          </p>
          {authError && <p className="text-xs font-medium text-red-700">{authError}</p>}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSignIn}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B2A5B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123a7d] cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in with Google</span>
            </button>
            <button
              type="button"
              onClick={() => openPublicPreview('')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Open Student Verification Portal
            </button>
          </div>
        </div>
      </div>
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
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-base font-extrabold tracking-tight text-[#0B2A5B]">
              {settings.companyName}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Certificate Console</div>
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
                <span className="font-bold text-[#0B2A5B]">{settings.companyName}</span>
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
