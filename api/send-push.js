// api/send-push.js
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function formatPrivateKey(key) {
  if (!key) return undefined;
  let formatted = key.replace(/\\n/g, '\n');
  if (formatted.startsWith('"') && formatted.endsWith('"')) {
    formatted = formatted.slice(1, -1);
  }
  return formatted;
}

function initAdmin() {
  if (getApps().length > 0) {
    return getApp();
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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    initAdmin();
  } catch (initErr) {
    console.error('Firebase Admin init error:', initErr);
    return res.status(500).json({ 
      error: 'Firebase Admin initialization failed', 
      details: initErr.message 
    });
  }

  const { recipientId, title = 'RoomSplit', message = 'New activity', groupId = '' } = req.body || {};

  if (!recipientId) {
    return res.status(400).json({ error: 'recipientId is required' });
  }

  try {
    const db = getFirestore();
    const messaging = getMessaging();

    const userDoc = await db.collection('users').doc(recipientId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    const user = userDoc.data();
    if (groupId && Array.isArray(user?.mutedGroupIds) && user.mutedGroupIds.includes(groupId)) {
      return res.status(200).json({ success: true, muted: true, count: 0 });
    }

    if (groupId) {
      const groupDoc = await db.collection('groups').doc(groupId).get();
      if (!groupDoc.exists || !groupDoc.data()?.members?.includes(recipientId)) {
        return res.status(403).json({ error: 'Recipient is not a member of this group' });
      }
    }

    const fcmTokens = [...new Set(
      (Array.isArray(user?.fcmTokens) ? user.fcmTokens : [])
        .filter((token) => typeof token === 'string' && token.length > 0)
    )];

    if (!fcmTokens.length) {
      return res.status(200).json({ message: 'No registered device tokens found' });
    }

    const uniquelyOwnedTokens = (await Promise.all(fcmTokens.map(async (token) => {
      const owners = await db.collection('users')
        .where('fcmTokens', 'array-contains', token)
        .get();
      return owners.size === 1 && owners.docs[0].id === recipientId ? token : null;
    }))).filter(Boolean);

    if (!uniquelyOwnedTokens.length) {
      return res.status(200).json({ message: 'No uniquely owned device tokens found' });
    }

    const pushMessage = {
      notification: { title, body: message },
      data: { groupId, recipientId, url: '/' },
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            alert: { title, body: message },
          },
        },
      },
    };

    const deadTokens = [];
    let successCount = 0;
    for (let offset = 0; offset < uniquelyOwnedTokens.length; offset += 500) {
      const batchTokens = uniquelyOwnedTokens.slice(offset, offset + 500);
      const response = await messaging.sendEachForMulticast({
        ...pushMessage,
        tokens: batchTokens,
      });
      successCount += response.successCount;
      response.responses.forEach((result, idx) => {
        if (!result.success) {
          const code = result.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            deadTokens.push(batchTokens[idx]);
          }
        }
      });
    }

    const recipientRef = db.collection('users').doc(recipientId);
    for (let offset = 0; offset < deadTokens.length; offset += 500) {
      await recipientRef.update({
        fcmTokens: FieldValue.arrayRemove(...deadTokens.slice(offset, offset + 500)),
      });
    }

    return res.status(200).json({ success: true, count: successCount });
  } catch (error) {
    console.error('Push dispatch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
