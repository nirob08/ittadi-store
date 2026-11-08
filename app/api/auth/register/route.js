import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { customerAuthConfigurationReady, hashPassword, setCustomerSessionCookie } from '@/lib/customer-auth';
import Customer from '@/models/Customer';

export async function POST(request) {
  if (!customerAuthConfigurationReady()) {
    return NextResponse.json({ error: 'Customer sign-in is not configured on this store yet.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (
    name.length < 2 ||
    name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 128
  ) {
    return NextResponse.json(
      { error: 'Enter your name, a valid email address, and a password of at least 8 characters.' },
      { status: 400 },
    );
  }

  try {
    await dbConnect();
    const customer = await Customer.create({ name, email, passwordHash: await hashPassword(password) });
    const response = NextResponse.json({
      success: true,
      customer: { id: customer.id, name: customer.name, email: customer.email, avatarUrl: customer.avatarUrl || '', phone: customer.phone, address: customer.address },
    }, { status: 201 });
    setCustomerSessionCookie(response, customer.id);
    return response;
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'An account already exists for this email. Please sign in.' }, { status: 409 });
    }
    console.error('Customer registration failed:', error);
    return NextResponse.json({ error: 'Database connection failed. Check the MongoDB URI, database user credentials, and Atlas Network Access.' }, { status: 500 });
  }
}
