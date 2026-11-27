import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  CertStatus,
  CertType,
  CombinedCertificate,
  ExpenseRecord,
  ParsedSheetRow,
  PaymentMethod,
  PortalSettings,
  PublicCertificate,
  StudentContact,
} from '../types';
import {
  cleanPublicUrl,
  computeDuration,
  generateCertId,
  generateQrToken,
  isValidEmail,
  isValidIsoDate,
  last10,
  normalizeCertType,
} from '../utils/format';

export const DEFAULT_SETTINGS: PortalSettings = {
  companyName: 'NEWTRI Technologies',
  websiteUrl: 'https://newtritechnologies.com/',
  publicBaseUrl: '',
  whatsappGroupInvite: '',
};

export async function fetchPortalSettings(): Promise<PortalSettings> {
  const path = 'settings/portal';
  try {
    const snap = await getDoc(doc(db, 'settings', 'portal'));
    if (!snap.exists()) return DEFAULT_SETTINGS;
    const d = snap.data();
    return {
      companyName: String(d.companyName || DEFAULT_SETTINGS.companyName),
      websiteUrl: String(d.websiteUrl || DEFAULT_SETTINGS.websiteUrl),
      publicBaseUrl: String(d.publicBaseUrl || ''),
      whatsappGroupInvite: String(d.whatsappGroupInvite || ''),
    };
  } catch (err) {
    console.warn('Could not read portal settings, using defaults:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function savePortalSettings(settings: PortalSettings): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in.');
  const path = 'settings/portal';
  try {
    await setDoc(doc(db, 'settings', 'portal'), {
      companyName: settings.companyName.trim().slice(0, 80) || DEFAULT_SETTINGS.companyName,
      websiteUrl: settings.websiteUrl.trim().slice(0, 160) || DEFAULT_SETTINGS.websiteUrl,
      publicBaseUrl: cleanPublicUrl(settings.publicBaseUrl).slice(0, 200),
      whatsappGroupInvite: settings.whatsappGroupInvite.trim().slice(0, 200),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function recordPublicScan(certificateId: string): Promise<{ count: number; lastScanAt: string } | null> {
  try {
    const res = await fetch('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificateId }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { count: number; lastScanAt: string };
  } catch {
    return null;
  }
}

export async function fetchLiveScans(): Promise<Record<string, { count: number; lastScanAt: string }>> {
  try {
    const res = await fetch('/api/scans');
    if (!res.ok) return {};
    const data = (await res.json()) as { scans?: Record<string, { count: number; lastScanAt: string }> };
    return data.scans || {};
  } catch {
    return {};
  }
}

export async function fetchCertificateByToken(qrToken: string): Promise<PublicCertificate | null> {
  const clean = qrToken.trim().toLowerCase();
  if (!/^[a-f0-9]{16,64}$/.test(clean)) return null;
  const path = `public_certificates/${clean}`;
  try {
    const snap = await getDoc(doc(db, 'public_certificates', clean));
    if (!snap.exists()) return null;
    const cert = snap.data() as PublicCertificate;
    return cert;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function fetchCertificateById(certificateId: string): Promise<PublicCertificate | null> {
  const clean = certificateId.trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,30}$/.test(clean)) return null;
  const path = `cert_id_index/${clean}`;
  try {
    const idxSnap = await getDoc(doc(db, 'cert_id_index', clean));
    if (!idxSnap.exists()) return null;
    const idx = idxSnap.data() as { qrToken?: string };
    if (!idx.qrToken) return null;
    return await fetchCertificateByToken(idx.qrToken);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export function subscribeAdminCertificates(
  onData: (items: CombinedCertificate[]) => void,
  onError: (err: Error) => void
): () => void {
  let publicMap = new Map<string, PublicCertificate>();
  let contactMap = new Map<string, StudentContact>();
  let liveScans: Record<string, { count: number; lastScanAt: string }> = {};

  const emit = () => {
    const merged: CombinedCertificate[] = [];
    for (const cert of publicMap.values()) {
      const contact = contactMap.get(cert.certificateId);
      const scanInfo = liveScans[cert.certificateId];
      merged.push({
        ...cert,
        phone: contact?.phone || '',
        email: contact?.email || '',
        emailSentAt: contact?.emailSentAt || '',
        waSentAt: contact?.waSentAt || '',
        sendError: contact?.sendError || '',
        liveScans: (cert.scanCount || 0) + (scanInfo?.count || 0),
        lastScanAt: scanInfo?.lastScanAt || cert.lastScanAt || '',
      });
    }
    merged.sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.certificateId.localeCompare(a.certificateId));
    onData(merged);
  };

  void fetchLiveScans().then((s) => {
    liveScans = s;
    emit();
  });

  const unsubPublic = onSnapshot(
    query(collection(db, 'public_certificates'), orderBy('createdAt', 'desc')),
    (snap) => {
      const next = new Map<string, PublicCertificate>();
      snap.forEach((d) => {
        const data = d.data() as PublicCertificate;
        next.set(data.certificateId, data);
      });
      publicMap = next;
      emit();
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'public_certificates');
      } catch (e) {
        onError(e as Error);
      }
    }
  );

  const unsubContacts = onSnapshot(
    collection(db, 'student_contacts'),
    (snap) => {
      const next = new Map<string, StudentContact>();
      snap.forEach((d) => {
        const data = d.data() as StudentContact;
        next.set(data.certificateId, data);
      });
      contactMap = next;
      emit();
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'student_contacts');
      } catch (e) {
        onError(e as Error);
      }
    }
  );

  return () => {
    unsubPublic();
    unsubContacts();
  };
}

export async function createCertificatesBatch(
  rows: ParsedSheetRow[],
  defaultType: CertType,
  existingCerts: CombinedCertificate[],
  initialStatus: CertStatus = 'pending'
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in.');

  const dedupeKeys = new Set(
    existingCerts.map(
      (c) =>
        `${c.studentName.trim().toLowerCase()}|${c.course.trim().toLowerCase()}|${c.college.trim().toLowerCase()}|${c.startDate}`
    )
  );
  const usedIds = new Set(existingCerts.map((c) => c.certificateId));

  const today = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  interface PreparedRow {
    publicDoc: Record<string, unknown>;
    indexDoc: Record<string, unknown>;
    contactDoc: Record<string, unknown>;
    certId: string;
    qrToken: string;
  }

  const prepared: PreparedRow[] = [];

  rows.forEach((r, idx) => {
    const line = idx + 2;
    const certType = normalizeCertType(r.type, defaultType);
    const name = r.name.trim().slice(0, 120);
    const collegeRaw = r.college.trim().slice(0, 160);
    const college = collegeRaw || (certType === 'Workshop' ? 'Workshop Participant' : '');
    const course = r.course.trim().slice(0, 160);
    if (!name || !college || !course) {
      errors.push(`Row ${line}: name, college, or course/workshop title is empty`);
      return;
    }

    const startDate = r.start.trim();
    const endDate = (r.end.trim() || startDate).trim();
    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate) || endDate < startDate) {
      errors.push(`Row ${line} (${name}): start/end date is missing or invalid`);
      return;
    }

    const duration = (r.duration.trim() || computeDuration(startDate, endDate)).slice(0, 60);
    const phone = last10(r.phone);
    let email = r.email.trim().slice(0, 160);
    if (email && !isValidEmail(email)) {
      email = '';
      errors.push(`Row ${line} (${name}): invalid email left blank`);
    }

    const dedupeKey = `${name.toLowerCase()}|${course.toLowerCase()}|${college.toLowerCase()}|${startDate}`;
    if (dedupeKeys.has(dedupeKey)) {
      skipped++;
      return;
    }
    dedupeKeys.add(dedupeKey);

    let certId = generateCertId(endDate);
    let guard = 0;
    while (usedIds.has(certId) && guard < 12) {
      certId = generateCertId(endDate);
      guard++;
    }
    usedIds.add(certId);

    const qrToken = generateQrToken();
    const approvalNote = initialStatus === 'approved' ? `Approved ${today}` : '';

    prepared.push({
      certId,
      qrToken,
      publicDoc: {
        certificateId: certId,
        qrToken,
        studentName: name,
        college,
        course,
        certType,
        duration,
        startDate,
        endDate,
        issueDate: today,
        status: initialStatus,
        approvalNote,
        scanCount: 0,
        lastScanAt: '',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      indexDoc: {
        certificateId: certId,
        qrToken,
        status: initialStatus,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      contactDoc: {
        certificateId: certId,
        qrToken,
        phone,
        email,
        emailSentAt: '',
        waSentAt: '',
        sendError: '',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
  });

  // Firestore batch limit is 500 writes; 3 writes per certificate -> max 140 certs per batch.
  const chunkSize = 140;
  try {
    for (let i = 0; i < prepared.length; i += chunkSize) {
      const chunk = prepared.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.set(doc(db, 'public_certificates', item.qrToken), item.publicDoc);
        batch.set(doc(db, 'cert_id_index', item.certId), item.indexDoc);
        batch.set(doc(db, 'student_contacts', item.certId), item.contactDoc);
      }
      await batch.commit();
      inserted += chunk.length;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'public_certificates');
  }

  return { inserted, skipped, errors };
}

export async function updateCertificateDetails(
  cert: CombinedCertificate,
  updates: {
    studentName: string;
    college: string;
    course: string;
    certType: CertType;
    duration: string;
    startDate: string;
    endDate: string;
    phone: string;
    email: string;
    resetSend: boolean;
  }
): Promise<void> {
  const pubPath = `public_certificates/${cert.qrToken}`;
  const contactPath = `student_contacts/${cert.certificateId}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'public_certificates', cert.qrToken), {
      studentName: updates.studentName.trim().slice(0, 120),
      college: updates.college.trim().slice(0, 160),
      course: updates.course.trim().slice(0, 160),
      certType: updates.certType,
      duration: updates.duration.trim().slice(0, 60),
      startDate: updates.startDate,
      endDate: updates.endDate,
      updatedAt: serverTimestamp(),
    });

    const contactPayload: Record<string, unknown> = {
      phone: last10(updates.phone),
      email: updates.email.trim().slice(0, 160),
      updatedAt: serverTimestamp(),
    };
    if (updates.resetSend) {
      contactPayload.emailSentAt = '';
      contactPayload.waSentAt = '';
      contactPayload.sendError = '';
    }
    batch.update(doc(db, 'student_contacts', cert.certificateId), contactPayload);
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${pubPath} & ${contactPath}`);
  }
}

export async function updateCertificatesStatus(
  certs: CombinedCertificate[],
  status: CertStatus
): Promise<void> {
  if (!certs.length) return;
  const note = `${status === 'approved' ? 'Approved' : status === 'revoked' ? 'Revoked' : 'Pending'} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
  const chunkSize = 200;
  try {
    for (let i = 0; i < certs.length; i += chunkSize) {
      const chunk = certs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const c of chunk) {
        batch.update(doc(db, 'public_certificates', c.qrToken), {
          status,
          approvalNote: note.slice(0, 120),
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'cert_id_index', c.certificateId), {
          status,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'public_certificates');
  }
}

export async function deleteCertificates(certs: CombinedCertificate[]): Promise<void> {
  if (!certs.length) return;
  const chunkSize = 140;
  try {
    for (let i = 0; i < certs.length; i += chunkSize) {
      const chunk = certs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const c of chunk) {
        batch.delete(doc(db, 'public_certificates', c.qrToken));
        batch.delete(doc(db, 'cert_id_index', c.certificateId));
        batch.delete(doc(db, 'student_contacts', c.certificateId));
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'public_certificates');
  }
}

export async function resetContactsSendStatus(certIds: string[]): Promise<void> {
  if (!certIds.length) return;
  const chunkSize = 400;
  try {
    for (let i = 0; i < certIds.length; i += chunkSize) {
      const chunk = certIds.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.update(doc(db, 'student_contacts', id), {
          emailSentAt: '',
          waSentAt: '',
          sendError: '',
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'student_contacts');
  }
}

export async function updateContactDelivery(
  certificateId: string,
  payload: Partial<Pick<StudentContact, 'emailSentAt' | 'waSentAt' | 'sendError'>>
): Promise<void> {
  const path = `student_contacts/${certificateId}`;
  try {
    await updateDoc(doc(db, 'student_contacts', certificateId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// -------- Expenses --------

export function subscribeExpenses(
  onData: (items: ExpenseRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'expenses'), orderBy('spentOn', 'desc')),
    (snap) => {
      const items: ExpenseRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (!data.voidedAt) {
          items.push({
            id: d.id,
            spentOn: String(data.spentOn || ''),
            category: String(data.category || ''),
            description: String(data.description || ''),
            payee: String(data.payee || ''),
            method: (data.method as PaymentMethod) || 'Cash',
            amount: Number(data.amount || 0),
            voidedAt: String(data.voidedAt || ''),
            createdBy: String(data.createdBy || ''),
          });
        }
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'expenses');
      } catch (e) {
        onError(e as Error);
      }
    }
  );
}

export async function saveExpense(input: {
  id?: string;
  spentOn: string;
  category: string;
  description: string;
  payee: string;
  method: PaymentMethod;
  amount: number;
}): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in.');

  if (input.id) {
    const path = `expenses/${input.id}`;
    try {
      await updateDoc(doc(db, 'expenses', input.id), {
        spentOn: input.spentOn,
        category: input.category.slice(0, 40),
        description: input.description.trim().slice(0, 120),
        payee: input.payee.trim().slice(0, 80),
        method: input.method,
        amount: Number(input.amount.toFixed(2)),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
    return;
  }

  const newId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `expenses/${newId}`;
  try {
    await setDoc(doc(db, 'expenses', newId), {
      spentOn: input.spentOn,
      category: input.category.slice(0, 40),
      description: input.description.trim().slice(0, 120),
      payee: input.payee.trim().slice(0, 80),
      method: input.method,
      amount: Number(input.amount.toFixed(2)),
      voidedAt: '',
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function voidExpense(id: string): Promise<void> {
  const path = `expenses/${id}`;
  try {
    await updateDoc(doc(db, 'expenses', id), {
      voidedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
