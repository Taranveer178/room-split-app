import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

initializeApp();

const APP_URL = 'https://roomsplit.pages.dev/';
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

export const notifyGroupOnExpenseCreated = onDocumentCreated('expenses/{expenseId}', async (event) => {
  const expense = event.data?.data();
  if (!expense?.groupId) return;

  const firestore = getFirestore();
  const groupSnapshot = await firestore.collection('groups').doc(expense.groupId).get();
  if (!groupSnapshot.exists) return;

  const group = groupSnapshot.data();
  const recipientIds = [...new Set(Array.isArray(group.members) ? group.members : [])]
    .filter((memberId) => memberId !== expense.createdBy);
  const memberSnapshots = await Promise.all(recipientIds.map((memberId) => (
    firestore.collection('users').doc(memberId).get()
  )));
  const tokenOwners = memberSnapshots.flatMap((member) => (
    (member.data()?.fcmTokens || []).map((token) => ({ token, userId: member.id }))
  ));

  if (tokenOwners.length === 0) return;

  const amount = Number(expense.totalAmount);
  const message = {
    notification: {
      title: `New expense in ${group.name || 'your group'}`,
      body: `${expense.title || 'Expense'} - ₹${Number.isFinite(amount) ? amount.toFixed(2) : expense.totalAmount}`,
    },
    webpush: {
      notification: {
        icon: `${APP_URL}roomsplit-icon-192.png`,
        badge: `${APP_URL}roomsplit-icon-192.png`,
      },
      fcmOptions: { link: APP_URL },
    },
    apns: {
      headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
      payload: { aps: { sound: 'default' } },
    },
    data: {
      groupId: String(expense.groupId),
      expenseId: String(event.params.expenseId),
      link: APP_URL,
    },
  };
  const tokensToRemove = new Map();

  for (let index = 0; index < tokenOwners.length; index += 500) {
    const batch = tokenOwners.slice(index, index + 500);
    const result = await getMessaging().sendEachForMulticast({
      ...message,
      tokens: batch.map(({ token }) => token),
    });

    result.responses.forEach((response, responseIndex) => {
      if (response.success || !INVALID_TOKEN_CODES.has(response.error?.code)) return;
      const { token, userId } = batch[responseIndex];
      const invalidTokens = tokensToRemove.get(userId) || [];
      invalidTokens.push(token);
      tokensToRemove.set(userId, invalidTokens);
    });
  }

  await Promise.all([...tokensToRemove].map(([userId, tokens]) => (
    firestore.collection('users').doc(userId).update({
      fcmTokens: FieldValue.arrayRemove(...tokens),
    })
  )));
});