import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return NextResponse.json({ enabled: Boolean(publicKey), publicKey: publicKey || null });
}
