import { NextResponse } from 'next/server';
import { customerFromRequest } from '@/lib/customer-auth';
import SupportMessage from '@/models/SupportMessage';

export async function GET(request) {
  try {
    const customer = await customerFromRequest(request);
    if (!customer) return NextResponse.json({ error: 'Please sign in to contact support.' }, { status: 401 });
    const messages = await SupportMessage.find({ customerId: customer._id }).sort({ createdAt: 1 }).limit(200).lean();
    await SupportMessage.updateMany(
      { customerId: customer._id, sender: 'admin', readByCustomer: false },
      { $set: { readByCustomer: true } },
    );
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Support conversation could not be loaded:', error);
    return NextResponse.json({ error: 'Your support messages could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: 'Messages must contain between 1 and 2,000 characters.' }, { status: 400 });
  }

  try {
    const customer = await customerFromRequest(request);
    if (!customer) return NextResponse.json({ error: 'Please sign in to contact support.' }, { status: 401 });
    const message = await SupportMessage.create({
      customerId: customer._id,
      sender: 'customer',
      text,
    });
    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('Support message could not be sent:', error);
    return NextResponse.json({ error: 'Your message could not be sent. Please try again.' }, { status: 500 });
  }
}
