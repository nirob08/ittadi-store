import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL,
  createAdminSession,
  isAdminConfigurationReady,
  isAdminRequest,
  isValidAdminPassword,
} from '@/lib/admin-auth';

export async function GET(request) {
  return NextResponse.json({
    authenticated: isAdminRequest(request),
    configured: isAdminConfigurationReady(),
  });
}

export async function POST(request) {
  if (!isAdminConfigurationReady()) {
    return NextResponse.json({ error: 'Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET to enable admin sign-in.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!isValidAdminPassword(body?.password)) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_TTL,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
