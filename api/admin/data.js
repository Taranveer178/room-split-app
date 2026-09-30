import { getAdminFirestore } from '../../server/firebaseAdmin.js';
import { getAdminSession, isSameOrigin } from '../../server/adminSession.js';

const ALLOWED_COLLECTIONS = new Set([
  'users',
  'groups',
  'expenses',
  'notifications',
  'messages',
  'calls',
]);
const MAX_RECORD_BYTES = 850 * 1024;
const MAX_LIST_SIZE = 500;

function getQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeRecord(collectionName, id, data) {
  const record = { ...data, id };
  if (collectionName === 'users') {
    delete record.password;
    delete record.fcmTokens;
    delete record.photoDataUrl;
  }
  return record;
}

function validRecord(record) {
  return record && typeof record === 'object' && !Array.isArray(record);
}

function recordSize(record) {
  return Buffer.byteLength(JSON.stringify(record), 'utf8');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const allowedMethods = 'GET, POST, PATCH, DELETE, OPTIONS';
  res.setHeader('Allow', allowedMethods);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getAdminSession(req);
  if (!session) return res.status(401).json({ error: 'Admin authentication required' });
  if (req.method !== 'GET' && !isSameOrigin(req)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const collectionName = getQueryValue(req.query?.collection);
  if (!ALLOWED_COLLECTIONS.has(collectionName)) {
    return res.status(400).json({ error: 'Unsupported collection' });
  }

  try {
    const firestore = getAdminFirestore();
    const collectionRef = firestore.collection(collectionName);
    const id = getQueryValue(req.query?.id);

    if (req.method === 'GET') {
      if (id) {
        const snapshot = await collectionRef.doc(id).get();
        if (!snapshot.exists) return res.status(404).json({ error: 'Record not found' });
        return res.status(200).json({ record: sanitizeRecord(collectionName, snapshot.id, snapshot.data()) });
      }

      const snapshot = await collectionRef.limit(MAX_LIST_SIZE + 1).get();
      const docs = snapshot.docs.slice(0, MAX_LIST_SIZE);
      return res.status(200).json({
        records: docs.map((item) => sanitizeRecord(collectionName, item.id, item.data())),
        truncated: snapshot.docs.length > MAX_LIST_SIZE,
      });
    }

    if (req.method === 'POST') {
      const record = req.body?.record;
      if (!validRecord(record)) return res.status(400).json({ error: 'A JSON record is required' });
      if (recordSize(record) > MAX_RECORD_BYTES) {
        return res.status(413).json({ error: 'Record is too large for the admin editor' });
      }

      const requestedId = typeof record.id === 'string' ? record.id.trim() : '';
      const documentRef = requestedId ? collectionRef.doc(requestedId) : collectionRef.doc();
      const savedRecord = { ...record, id: documentRef.id };
      await documentRef.set(savedRecord);
      return res.status(201).json({ record: sanitizeRecord(collectionName, documentRef.id, savedRecord) });
    }

    if (!id) return res.status(400).json({ error: 'A record id is required' });
    const documentRef = collectionRef.doc(id);
    const existingSnapshot = await documentRef.get();
    if (!existingSnapshot.exists) return res.status(404).json({ error: 'Record not found' });

    if (req.method === 'DELETE') {
      await documentRef.delete();
      return res.status(200).json({ deleted: true, id });
    }

    const record = req.body?.record;
    if (!validRecord(record)) return res.status(400).json({ error: 'A JSON record is required' });
    if (recordSize(record) > MAX_RECORD_BYTES) {
      return res.status(413).json({ error: 'Record is too large for the admin editor' });
    }

    const savedRecord = { ...record, id };
    await documentRef.set(savedRecord, { merge: true });
    const updatedSnapshot = await documentRef.get();
    return res.status(200).json({ record: sanitizeRecord(collectionName, id, updatedSnapshot.data()) });
  } catch (error) {
    console.error('Admin data request failed:', error);
    return res.status(500).json({ error: 'Could not complete the admin data request' });
  }
}
