import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import dbConnect from '@/lib/mongodb';
import { ORDER_STATUSES, default as Order } from '@/models/Order';

export async function PATCH(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
  const status = typeof body?.status === 'string' ? body.status : '';
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : '';
  if (!/^[a-f\d]{24}$/i.test(orderId) || !ORDER_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Provide a valid order and delivery status.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      return NextResponse.json({ error: 'Delivered or cancelled orders cannot be changed.' }, { status: 409 });
    }

    order.status = status;
    order.statusHistory.push({ status, note });
    await order.save();
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Order status could not be updated:', error);
    return NextResponse.json({ error: 'Order status could not be updated.' }, { status: 500 });
  }
}
