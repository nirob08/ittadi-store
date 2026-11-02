import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import SupportMessage from '@/models/SupportMessage';

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  try {
    await dbConnect();
    const messages = await SupportMessage.find({}).sort({ createdAt: -1 }).limit(300).lean();
    const customerIds = [...new Set(messages.map((message) => String(message.customerId)))];
    const customers = await Customer.find({ _id: { $in: customerIds } }).select('name email phone').lean();
    const customerById = new Map(customers.map((customer) => [String(customer._id), customer]));
    const conversations = new Map();
    for (const message of messages) {
      const customerId = String(message.customerId);
      if (!conversations.has(customerId)) conversations.set(customerId, []);
      conversations.get(customerId).push(message);
      if (message.sender === 'customer' && !message.readByAdmin) {
        await SupportMessage.updateOne({ _id: message._id }, { $set: { readByAdmin: true } });
      }
    }
    return NextResponse.json({
      conversations: [...conversations.entries()].map(([customerId, items]) => ({
        customer: customerById.get(customerId) || { _id: customerId, name: 'Customer', email: '', phone: '' },
        messages: items.reverse(),
      })),
    });
  } catch (error) {
    console.error('Admin support inbox could not be loaded:', error);
    return NextResponse.json(
      { error: 'Database connection failed. Check the MongoDB URI, database user credentials, and Atlas Network Access.' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const customerId = typeof body?.customerId === 'string' ? body.customerId : '';
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!/^[a-f\d]{24}$/i.test(customerId) || !text || text.length > 2000) {
    return NextResponse.json({ error: 'Choose a customer and enter a message of up to 2,000 characters.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const customer = await Customer.exists({ _id: customerId });
    if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    const message = await SupportMessage.create({ customerId, sender: 'admin', text, readByCustomer: false });
    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('Admin support reply could not be sent:', error);
    return NextResponse.json({ error: 'Your reply could not be sent.' }, { status: 500 });
  }
}
