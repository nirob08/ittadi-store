import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import dbConnect from '@/lib/mongodb';
import { ORDER_STATUSES, default as Order } from '@/models/Order';
import Product from '@/models/Product';
import { nextOrderStatuses } from '@/lib/order-workflow';

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
  const action = typeof body?.action === 'string' ? body.action : '';
  const status = typeof body?.status === 'string' ? body.status : '';
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : '';
  const verifyingPayment = action === 'verify-payment';
  const updatingTracking = action === 'update-tracking';
  const currentLocation = typeof body?.currentLocation === 'string' ? body.currentLocation.trim() : '';
  const trackingNote = typeof body?.trackingNote === 'string' ? body.trackingNote.trim() : '';
  if (
    updatingTracking &&
    ((body?.currentLocation != null && typeof body.currentLocation !== 'string') ||
      (body?.trackingNote != null && typeof body.trackingNote !== 'string') ||
      currentLocation.length > 160 ||
      trackingNote.length > 500)
  ) {
    return NextResponse.json({ error: 'Location must be 160 characters or fewer and tracking updates 500 characters or fewer.' }, { status: 400 });
  }
  if (
    !/^[a-f\d]{24}$/i.test(orderId) ||
    (!verifyingPayment && !updatingTracking && !ORDER_STATUSES.includes(status))
  ) {
    return NextResponse.json({ error: 'Provide a valid order and delivery status.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const session = await mongoose.startSession();
    let updatedOrder;
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          const missingOrder = new Error('Order not found.');
          missingOrder.status = 404;
          throw missingOrder;
        }
        if (updatingTracking) {
          order.currentLocation = currentLocation;
          order.trackingNote = trackingNote;
          await order.save({ session });
          updatedOrder = order.toObject();
          return;
        }
        if (verifyingPayment) {
          const manualPayment = order.paymentMethod === 'Manual bKash' || order.paymentMethod === 'Manual Nagad';
          const gatewayNeedsReview = order.paymentMethod === 'SSLCOMMERZ' && order.paymentStatus === 'review';
          if ((!manualPayment && !gatewayNeedsReview) || !['pending', 'review'].includes(order.paymentStatus) || order.status === 'Cancelled') {
            const invalidPayment = new Error('This payment cannot be confirmed manually.');
            invalidPayment.status = 409;
            throw invalidPayment;
          }
          order.paymentStatus = 'paid';
          order.paidAt = new Date();
          await order.save({ session });
          updatedOrder = order.toObject();
          return;
        }
        if (!nextOrderStatuses[order.status]?.includes(status)) {
          const invalidTransition = new Error(`An order cannot move from ${order.status} to ${status}.`);
          invalidTransition.status = 409;
          throw invalidTransition;
        }
        if (status !== 'Cancelled' && order.paymentMethod !== 'Cash on delivery' && order.paymentStatus !== 'paid') {
          const unpaidOrder = new Error('Payment must be verified before an online-paid order can be processed.');
          unpaidOrder.status = 409;
          throw unpaidOrder;
        }
        if (status === 'Cancelled' && order.paymentMethod !== 'Cash on delivery' && order.paymentStatus === 'paid') {
          const paidOrder = new Error('This paid order must be refunded through its payment provider before cancellation.');
          paidOrder.status = 409;
          throw paidOrder;
        }

        if (status === 'Cancelled') {
          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { stock: item.quantity } },
              { session },
            );
          }
        }

        order.status = status;
        order.statusHistory.push({ status, note });
        await order.save({ session });
        updatedOrder = order.toObject();
      });
    } finally {
      await session.endSession();
    }
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    if (error?.status === 404 || error?.status === 409) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Order status could not be updated:', error);
    return NextResponse.json({ error: 'Order status could not be updated.' }, { status: 500 });
  }
}
