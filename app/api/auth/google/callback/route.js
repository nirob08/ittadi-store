import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import {
  GOOGLE_STATE_COOKIE,
  setCustomerSessionCookie,
  verifyGoogleState,
} from '@/lib/customer-auth';
import Customer from '@/models/Customer';

function loginRedirect(request, reason) {
  return NextResponse.redirect(new URL(`/?google=${encodeURIComponent(reason)}#account`, request.url));
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const signedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || new URL('/api/auth/google/callback', request.url).toString();
  if (!code || !verifyGoogleState(state, signedState)) return loginRedirect(request, 'invalid_state');
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return loginRedirect(request, 'not_configured');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });
    if (!tokenResponse.ok) return loginRedirect(request, 'google_failed');
    const token = await tokenResponse.json();
    if (typeof token.access_token !== 'string') return loginRedirect(request, 'google_failed');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: 'no-store',
    });
    if (!profileResponse.ok) return loginRedirect(request, 'google_failed');
    const profile = await profileResponse.json();
    if (
      typeof profile.sub !== 'string' ||
      typeof profile.email !== 'string' ||
      profile.email_verified !== true ||
      typeof profile.name !== 'string'
    ) {
      return loginRedirect(request, 'unverified_email');
    }

    await dbConnect();
    let customer = await Customer.findOne({ $or: [{ googleId: profile.sub }, { email: profile.email.toLowerCase() }] });
    if (customer) {
      if (!customer.googleId) {
        customer.googleId = profile.sub;
        await customer.save();
      }
    } else {
      customer = await Customer.create({
        name: profile.name.trim().slice(0, 120),
        email: profile.email.toLowerCase(),
        googleId: profile.sub,
      });
    }

    const response = NextResponse.redirect(new URL('/?account=welcome#account', request.url));
    response.cookies.set(GOOGLE_STATE_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/google/callback',
      maxAge: 0,
    });
    setCustomerSessionCookie(response, customer.id);
    return response;
  } catch (error) {
    console.error('Google sign-in failed:', error);
    return loginRedirect(request, 'google_failed');
  }
}
