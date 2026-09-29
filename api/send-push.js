// api/send-push.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function formatPrivateKey(key) {
  if (!key) return undefined;
  let formatted = key.replace(/\\n/g, '\n');
  if (formatted.startsWith('"') && formatted.endsWith('"')) {
    formatted = formatted.slice(1, -1);
  }
  return formatted;
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Missing env variables: projectId=${Boolean(projectId)}, clientEmail=${Boolean(clientEmail)}, privateKey=${Boolean(privateKey)}`
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let app;
  try {
    app = getFirebaseAdminApp();
  } catch (initErr) {
    console.error('Firebase Admin init error:', initErr);
    return res.status(500).json({ 
      error: 'Firebase Admin initialization failed', 
      details: initErr.message 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipientId, title = 'RoomSplit', message = 'New activity', groupId = '' } = req.body || {};

  if (!recipientId) {
    return res.status(400).json({ error: 'recipientId is required' });
  }

  try {
    const db = getFirestore(app);
    const messaging = getMessaging(app);

    const userDoc = await db.collection('users').doc(recipientId).get();
    const fcmTokens = userDoc.data()?.fcmTokens || [];

    if (!fcmTokens.length) {
      return res.status(200).json({ message: 'No registered device tokens found' });
    }

    const response = await messaging.sendEachForMulticast({
      notification: { title, body: message },
      data: { groupId, url: '/' },
      tokens: fcmTokens,
    });

    const deadTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          deadTokens.push(fcmTokens[idx]);
        }
      }
    });

    if (deadTokens.length > 0) {
      await db.collection('users').doc(recipientId).update({
        fcmTokens: FieldValue.arrayRemove(...deadTokens),
      });
    }

    return res.status(200).json({ success: true, count: response.successCount });
  } catch (error) {
    console.error('Push dispatch error:', error);
    return res.status(500).json({ error: error.message });
  }
}