// api/send-push.js
import admin from 'firebase-admin';

// Initialize Firebase Admin once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

export default async function handler(req, res) {
  // CORS Headers so Cloudflare Pages can make requests to Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle browser pre-flight check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipientId, title = 'RoomSplit', message = 'New activity', groupId = '' } = req.body || {};

  if (!recipientId) {
    return res.status(400).json({ error: 'recipientId is required' });
  }

  try {
    // 1. Fetch user's registered FCM tokens
    const userDoc = await db.collection('users').doc(recipientId).get();
    const fcmTokens = userDoc.data()?.fcmTokens || [];

    if (!fcmTokens.length) {
      return res.status(200).json({ message: 'No registered device tokens found' });
    }

    // 2. Multicast to all active devices
    const response = await messaging.sendEachForMulticast({
      notification: {
        title,
        body: message,
      },
      data: {
        groupId,
        url: '/',
      },
      tokens: fcmTokens,
    });

    // 3. Clean up uninstalled or invalid tokens
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
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...deadTokens),
      });
    }

    return res.status(200).json({ success: true, count: response.successCount });
  } catch (error) {
    console.error('Push notification dispatch error:', error);
    return res.status(500).json({ error: error.message });
  }
}