import { NextResponse } from 'next/server';
import { createGoogleState, GOOGLE_STATE_COOKIE } from '@/lib/customer-auth';

export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/?google=not-configured#account', request.url));
  }

  const { state, signedState } = createGoogleState();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || new URL('/api/auth/google/callback', request.url).toString();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_STATE_COOKIE, signedState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google/callback',
    maxAge: 600,
  });
  return response;
}
