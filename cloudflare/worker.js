const SESSION_COOKIE = 'roomsplit_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_RECORD_BYTES = 850 * 1024;
const MAX_LIST_SIZE = 500;
const ALLOWED_COLLECTIONS = new Set([
  'users',
  'groups',
  'expenses',
  'notifications',
  'messages',
  'calls',
  'settings',
]);

let tokenCache = null;

function getServiceAccount(env) {
  if (env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const account = typeof env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
        : env.FIREBASE_SERVICE_ACCOUNT;
      if (account?.project_id && account?.client_email && account?.private_key) {
        return {
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: account.private_key,
        };
      }
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid service-account JSON');
    }
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email, or private_key');
  }

  return {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY,
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function encodeBase64Url(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function equalStrings(left, right) {
  return equalBytes(new TextEncoder().encode(String(left || '')), new TextEncoder().encode(String(right || '')));
}

function parseCookies(request) {
  return (request.headers.get('Cookie') || '').split(';').reduce((cookies, entry) => {
    const separator = entry.indexOf('=');
    if (separator > 0) cookies.set(entry.slice(0, separator).trim(), entry.slice(separator + 1).trim());
    return cookies;
  }, new Map());
}

function hasAdminCredentials(env) {
  return Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD && env.ADMIN_SESSION_SECRET?.length >= 32);
}

async function signSession(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

async function getAdminSession(request, env) {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (!token || !env.ADMIN_SESSION_SECRET) return null;
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;

  const payload = token.slice(0, separator);
  let providedSignature;
  let session;
  try {
    providedSignature = decodeBase64Url(token.slice(separator + 1));
    session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
  } catch {
    return null;
  }

  const expectedSignature = await signSession(payload, env.ADMIN_SESSION_SECRET);
  if (!equalBytes(expectedSignature, providedSignature)) return null;
  if (session.sub !== env.ADMIN_USERNAME || session.exp <= Date.now() / 1000) return null;
  return { username: session.sub };
}

function sessionCookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${secure}`;
}

function isSameOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)])) } };
  }
  throw new Error('Unsupported Firestore field value');
}

function fromFirestoreValue(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

function toFirestoreFields(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, toFirestoreValue(value)]));
}

function documentFromFirestore(document) {
  const id = document.name.split('/').pop();
  return { ...fromFirestoreFields(document.fields), id };
}

function sanitizeRecord(collectionName, record) {
  const sanitized = { ...record };
  if (collectionName === 'users') {
    delete sanitized.password;
    delete sanitized.fcmTokens;
    delete sanitized.photoDataUrl;
  }
  return sanitized;
}

function pemToBytes(pem) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getAccessToken(env) {
  const serviceAccount = getServiceAccount(env);
  const cacheKey = `${serviceAccount.projectId}:${serviceAccount.clientEmail}`;
  if (tokenCache?.key === cacheKey && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase Admin credentials are not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    encodeBase64Url(JSON.stringify({
      iss: serviceAccount.clientEmail,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })),
  ].join('.');
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(serviceAccount.privateKey.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(unsignedToken));
  const assertion = `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error('Could not authenticate with Firebase Admin');
  tokenCache = { key: cacheKey, value: result.access_token, expiresAt: Date.now() + result.expires_in * 1000 };
  return tokenCache.value;
}

async function firestoreRequest(env, path, options = {}) {
  const { projectId } = getServiceAccount(env);
  const accessToken = await getAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Firestore request failed');
  return payload;
}

async function parseRequestJson(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_RECORD_BYTES) throw new Error('Record is too large for the admin editor');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('A valid JSON body is required');
  }
}

async function handleDataRequest(request, env, collectionName) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const collectionPath = encodeURIComponent(collectionName);

  if (request.method === 'GET') {
    if (id) {
      const document = await firestoreRequest(env, `${collectionPath}/${encodeURIComponent(id)}`);
      return jsonResponse({ record: sanitizeRecord(collectionName, documentFromFirestore(document)) });
    }

    const result = await firestoreRequest(env, `${collectionPath}?pageSize=${MAX_LIST_SIZE + 1}`);
    const documents = result.documents || [];
    return jsonResponse({
      records: documents.slice(0, MAX_LIST_SIZE).map(documentFromFirestore).map((record) => sanitizeRecord(collectionName, record)),
      truncated: documents.length > MAX_LIST_SIZE || Boolean(result.nextPageToken),
    });
  }

  if (request.method === 'POST') {
    const payload = await parseRequestJson(request);
    if (!payload.record || typeof payload.record !== 'object' || Array.isArray(payload.record)) {
      return jsonResponse({ error: 'A JSON record is required' }, 400);
    }
    const id = typeof payload.record.id === 'string' && payload.record.id.trim()
      ? payload.record.id.trim()
      : crypto.randomUUID();
    const record = { ...payload.record, id };
    const document = await firestoreRequest(env, `${collectionPath}?documentId=${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ fields: toFirestoreFields(record) }),
    });
    return jsonResponse({ record: sanitizeRecord(collectionName, documentFromFirestore(document)) }, 201);
  }

  if (!id) return jsonResponse({ error: 'A record id is required' }, 400);
  const documentPath = `${collectionPath}/${encodeURIComponent(id)}`;
  if (request.method === 'DELETE') {
    await firestoreRequest(env, documentPath, { method: 'DELETE' });
    return jsonResponse({ deleted: true, id });
  }

  const existing = await firestoreRequest(env, documentPath);
  const payload = await parseRequestJson(request);
  if (!payload.record || typeof payload.record !== 'object' || Array.isArray(payload.record)) {
    return jsonResponse({ error: 'A JSON record is required' }, 400);
  }
  const record = { ...documentFromFirestore(existing), ...payload.record, id };
  const updated = await firestoreRequest(env, documentPath, {
    method: 'PATCH',
    body: JSON.stringify({ fields: toFirestoreFields(record) }),
  });
  return jsonResponse({ record: sanitizeRecord(collectionName, documentFromFirestore(updated)) });
}

async function handleAdminRequest(request, env) {
  const url = new URL(request.url);
  const route = url.pathname;
  const method = request.method;

  if (method !== 'GET' && !isSameOrigin(request)) return jsonResponse({ error: 'Origin not allowed' }, 403);
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

  if (route === '/api/admin/login' && method === 'POST') {
    if (!hasAdminCredentials(env)) return jsonResponse({ error: 'Admin login is not configured' }, 503);
    let payload;
    try {
      payload = await parseRequestJson(request);
    } catch (error) {
      return jsonResponse({ error: error.message }, 400);
    }
    if (!payload || typeof payload !== 'object'
      || !equalStrings(payload.username, env.ADMIN_USERNAME)
      || !equalStrings(payload.password, env.ADMIN_PASSWORD)) {
      return jsonResponse({ error: 'Invalid admin credentials' }, 401);
    }
    const sessionPayload = encodeBase64Url(JSON.stringify({ sub: env.ADMIN_USERNAME, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }));
    const signature = encodeBase64Url(await signSession(sessionPayload, env.ADMIN_SESSION_SECRET));
    return jsonResponse(
      { authenticated: true, username: env.ADMIN_USERNAME },
      200,
      { 'Set-Cookie': sessionCookie(request, `${sessionPayload}.${signature}`, SESSION_SECONDS) },
    );
  }

  if (route === '/api/admin/session' && method === 'GET') {
    if (!hasAdminCredentials(env)) return jsonResponse({ error: 'Admin login is not configured' }, 503);
    const session = await getAdminSession(request, env);
    return jsonResponse(session ? { authenticated: true, ...session } : { authenticated: false });
  }

  if (route === '/api/admin/logout' && method === 'POST') {
    return jsonResponse(
      { authenticated: false },
      200,
      { 'Set-Cookie': sessionCookie(request, '', 0) },
    );
  }

  if (route === '/api/admin/data') {
    const session = await getAdminSession(request, env);
    if (!session) return jsonResponse({ error: 'Admin authentication required' }, 401);
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
      return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, PATCH, DELETE, OPTIONS' });
    }
    const collectionName = url.searchParams.get('collection');
    if (!ALLOWED_COLLECTIONS.has(collectionName)) return jsonResponse({ error: 'Unsupported collection' }, 400);
    try {
      return await handleDataRequest(request, env, collectionName);
    } catch (error) {
      console.error('Admin data request failed:', error);
      const status = error.message.includes('NOT_FOUND') || error.message.includes('Not found') ? 404 : 500;
      return jsonResponse({ error: status === 404 ? 'Record not found' : 'Could not complete the admin data request' }, status);
    }
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/admin/')) {
      return handleAdminRequest(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};