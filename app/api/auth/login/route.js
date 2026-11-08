import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { customerAuthConfigurationReady, setCustomerSessionCookie, verifyPassword } from '@/lib/customer-auth';
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

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length === 0 || password.length > 128) {
    return NextResponse.json({ error: 'Enter a valid email address and password.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const customer = await Customer.findOne({ email }).select('+passwordHash');
    if (!customer?.passwordHash || !(await verifyPassword(password, customer.passwordHash))) {
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }
    const response = NextResponse.json({
      success: true,
      customer: { id: customer.id, name: customer.name, email: customer.email, avatarUrl: customer.avatarUrl || '', phone: customer.phone, address: customer.address },
    });
    setCustomerSessionCookie(response, customer.id);
    return response;
  } catch (error) {
    console.error('Customer login failed:', error);
    return NextResponse.json({ error: 'Database connection failed. Check the MongoDB URI, database user credentials, and Atlas Network Access.' }, { status: 500 });
  }
}
