import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'roomsplit_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function hasAdminCredentials() {
  return Boolean(
    process.env.ADMIN_USERNAME
    && process.env.ADMIN_PASSWORD
    && sessionSecret(),
  );
}

export function matchesAdminCredentials(username, password) {
  const configuredUsername = process.env.ADMIN_USERNAME || '';
  const configuredPassword = process.env.ADMIN_PASSWORD || '';
  const suppliedUsername = String(username || '');
  const suppliedPassword = String(password || '');

  const usernameMatches = Buffer.byteLength(suppliedUsername) === Buffer.byteLength(configuredUsername)
    && timingSafeEqual(Buffer.from(suppliedUsername), Buffer.from(configuredUsername));
  const passwordMatches = Buffer.byteLength(suppliedPassword) === Buffer.byteLength(configuredPassword)
    && timingSafeEqual(Buffer.from(suppliedPassword), Buffer.from(configuredPassword));

  return hasAdminCredentials() && usernameMatches && passwordMatches;
}

function makeCookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${secure}`;
}

export function setAdminSessionCookie(res) {
  const secret = sessionSecret();
  if (!secret) throw new Error('Admin session secret is not configured');

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = encode(JSON.stringify({ sub: process.env.ADMIN_USERNAME, exp: expiresAt }));
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  res.setHeader('Set-Cookie', makeCookie(`${payload}.${signature}`, SESSION_SECONDS));
}

export function clearAdminSessionCookie(res) {
  res.setHeader('Set-Cookie', makeCookie('', 0));
}

function getCookie(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return cookie?.slice(COOKIE_NAME.length + 1) || '';
}

export function getAdminSession(req) {
  const token = getCookie(req);
  const secret = sessionSecret();
  if (!token || !secret) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = createHmac('sha256', secret).update(payload).digest();
  let providedSignature;
  try {
    providedSignature = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.sub || session.sub !== process.env.ADMIN_USERNAME || session.exp <= Date.now() / 1000) {
      return null;
    }
    return { username: session.sub };
  } catch {
    return null;
  }
}

export function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = req.headers['x-forwarded-host'] || req.headers.host;
    return Boolean(requestHost && originHost === requestHost);
  } catch {
    return false;
  }
}
