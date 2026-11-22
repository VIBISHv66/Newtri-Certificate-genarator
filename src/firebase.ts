import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
export const auth = getAuth(app);

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_AUTH_DOMAIN = firebaseConfig.authDomain;
export const COMPANY_SENDER_EMAIL = 'newtritechnologies@gmail.com';
export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

export function isHostedOnAuthorizedDomain(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.web.app')
  );
}

// Keep standard Firebase Auth sign-in free of restricted Workspace scopes so login never triggers OAuth verification 403 blocks
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const gmailSendProvider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  gmailSendProvider.addScope(scope);
}
gmailSendProvider.setCustomParameters({
  prompt: 'select_account consent',
  login_hint: COMPANY_SENDER_EMAIL,
});

// In-memory Gmail OAuth access token cache (never stored in localStorage/sessionStorage)
let cachedGmailAccessToken: string | null = null;
let cachedGmailSenderEmail: string | null = null;

onAuthStateChanged(auth, (user) => {
  if (!user || user.email?.toLowerCase() !== COMPANY_SENDER_EMAIL) {
    cachedGmailAccessToken = null;
    cachedGmailSenderEmail = null;
  }
});

export async function connectCompanyGmail(): Promise<{ email: string }> {
  try {
    const result = await signInWithPopup(auth, gmailSendProvider);
    const chosenEmail = (result.user.email || '').trim().toLowerCase();
    if (chosenEmail !== COMPANY_SENDER_EMAIL) {
      throw new Error(
        `You selected ${result.user.email || 'another account'}. Please sign in with ${COMPANY_SENDER_EMAIL} so student emails are sent from your official company email.`
      );
    }
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Could not obtain Gmail send authorization token. Please allow Gmail send permission and try again.'
      );
    }
    cachedGmailAccessToken = credential.accessToken;
    cachedGmailSenderEmail = chosenEmail;
    return { email: chosenEmail };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code || '';
    if (
      msg.includes('access_denied') ||
      msg.includes('verification process') ||
      code === 'auth/popup-closed-by-user'
    ) {
      throw new Error(
        `Google blocked Gmail OAuth for ${COMPANY_SENDER_EMAIL} while the OAuth app is in Testing mode. For instant automated sending, add SMTP_USER=${COMPANY_SENDER_EMAIL} and a 16-letter Gmail App Password in SMTP_PASS inside AI Studio Secrets (or use the "Compose in Gmail" button on each student row below).`
      );
    }
    throw err instanceof Error ? err : new Error(msg);
  }
}

export function getCompanyGmailToken(): string | null {
  if (cachedGmailSenderEmail !== COMPANY_SENDER_EMAIL) return null;
  return cachedGmailAccessToken;
}

export function getCompanyGmailSenderEmail(): string | null {
  return cachedGmailAccessToken && cachedGmailSenderEmail === COMPANY_SENDER_EMAIL
    ? cachedGmailSenderEmail
    : null;
}

export function clearCompanyGmailSession(): void {
  cachedGmailAccessToken = null;
  cachedGmailSenderEmail = null;
}

export const BOOTSTRAP_ADMIN_EMAILS = [
  'vibishv66@gmail.com',
  'newtritechnologies@gmail.com',
];

export function isBootstrapAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.includes(email.toLowerCase());
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
