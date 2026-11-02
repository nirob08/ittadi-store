import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'ittadi_admin_session';
export const ADMIN_SESSION_TTL = 60 * 60 * 8;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : 'ittadi');
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : getAdminPassword());
}

function sign(value) {
  const secret = getSessionSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function isAdminConfigurationReady() {
  return Boolean(getAdminPassword() && getSessionSecret());
}

export function isValidAdminPassword(password) {
  const adminPassword = getAdminPassword();
  if (typeof password !== 'string' || !adminPassword || !getSessionSecret()) return false;
  const expected = Buffer.from(adminPassword);
  const provided = Buffer.from(password);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL;
  const nonce = randomBytes(16).toString('base64url');
  const payload = `${expiresAt}.${nonce}`;
  const signature = sign(payload);
  if (!signature) throw new Error('Admin session secret is not configured.');
  return `${payload}.${signature}`;
}

export function isAdminSessionValid(token) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [expiresAtValue, nonce, signature] = parts;
  const expiresAt = Number(expiresAtValue);
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + ADMIN_SESSION_TTL + 60 ||
    !/^[A-Za-z0-9_-]{20,24}$/.test(nonce) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return false;
  }

  const payload = `${expiresAtValue}.${nonce}`;
  const signatureValue = sign(payload);
  if (!signatureValue) return false;
  const expected = Buffer.from(signatureValue);
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function isAdminRequest(request) {
  return isAdminSessionValid(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}
