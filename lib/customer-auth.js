import { createHmac, pbkdf2 as deriveKey, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';

export const CUSTOMER_COOKIE_NAME = 'ittadi_customer_session';
export const CUSTOMER_SESSION_TTL = 60 * 60 * 24 * 30;
export const GOOGLE_STATE_COOKIE = 'ittadi_google_state';
const pbkdf2 = promisify(deriveKey);

function sessionSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set CUSTOMER_SESSION_SECRET or ADMIN_SESSION_SECRET before deployment.');
  }
  return 'ittadi-local-development-session-secret';
}

export function customerAuthConfigurationReady() {
  return Boolean(
    process.env.CUSTOMER_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NODE_ENV !== 'production',
  );
}

function sign(value) {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = await pbkdf2(password, Buffer.from(salt, 'base64url'), 310000, 32, 'sha256');
  return `pbkdf2$310000$${salt}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password, encodedHash) {
  if (typeof encodedHash !== 'string') return false;
  const [algorithm, iterationsValue, salt, hashValue] = encodedHash.split('$');
  const iterations = Number(iterationsValue);
  if (algorithm !== 'pbkdf2' || !Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) {
    return false;
  }
  const expected = Buffer.from(hashValue || '', 'base64url');
  if (expected.length !== 32) return false;
  const actual = await pbkdf2(password, Buffer.from(salt, 'base64url'), iterations, 32, 'sha256');
  return timingSafeEqual(expected, actual);
}

export function createCustomerSession(customerId) {
  const expiresAt = Math.floor(Date.now() / 1000) + CUSTOMER_SESSION_TTL;
  const payload = `${customerId}.${expiresAt}.${randomBytes(16).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

export function readCustomerSession(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const [customerId, expiresAtValue, nonce, signature] = parts;
  const expiresAt = Number(expiresAtValue);
  const now = Math.floor(Date.now() / 1000);
  if (
    !/^[a-f\d]{24}$/i.test(customerId) ||
    !Number.isInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + CUSTOMER_SESSION_TTL + 60 ||
    !/^[A-Za-z0-9_-]{20,24}$/.test(nonce) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return null;
  }

  const payload = `${customerId}.${expiresAtValue}.${nonce}`;
  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided)
    ? customerId
    : null;
}

export function setCustomerSessionCookie(response, customerId) {
  response.cookies.set(CUSTOMER_COOKIE_NAME, createCustomerSession(customerId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CUSTOMER_SESSION_TTL,
  });
}

export function clearCustomerSessionCookie(response) {
  response.cookies.set(CUSTOMER_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function customerFromRequest(request) {
  const customerId = readCustomerSession(request.cookies.get(CUSTOMER_COOKIE_NAME)?.value);
  if (!customerId) return null;

  await dbConnect();
  return Customer.findById(customerId).select('-passwordHash -googleId').lean();
}

export function createGoogleState() {
  const state = randomBytes(24).toString('base64url');
  return { state, signedState: `${state}.${sign(state)}` };
}

export function verifyGoogleState(state, signedState) {
  if (
    typeof state !== 'string' ||
    typeof signedState !== 'string' ||
    !/^[A-Za-z0-9_-]{32}$/.test(state)
  ) {
    return false;
  }
  const [storedState, signature, ...extra] = signedState.split('.');
  if (extra.length || storedState !== state || !signature) return false;
  const expected = Buffer.from(sign(state));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
