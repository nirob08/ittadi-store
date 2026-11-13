import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import Review from '@/models/Review';
import SupportMessage from '@/models/SupportMessage';
import { normalizeLegacyOrderBilling } from '@/lib/delivery';

export async function GET(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }

  try {
    await dbConnect();
    const [customer, orders] = await Promise.all([
      Customer.findById(id).select('name email avatarUrl phone address location createdAt').lean(),
      Order.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
    ]);
    if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    return NextResponse.json({
      customer,
      orders: orders.map(normalizeLegacyOrderBilling),
    });
  } catch (error) {
    console.error('Customer profile could not be loaded for admin:', error);
    return NextResponse.json({ error: 'Customer profile could not be loaded.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'A valid customer ID is required.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const activeOrder = await Order.exists({
      customerId: new mongoose.Types.ObjectId(id),
      status: { $nin: ['Delivered', 'Cancelled'] },
    });
    if (activeOrder) {
      return NextResponse.json(
        { error: 'This customer has an active order. Complete or cancel it before deleting the account.' },
        { status: 409 },
      );
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const customer = await Customer.findByIdAndDelete(id, { session });
        if (!customer) {
          const missingCustomer = new Error('Customer not found.');
          missingCustomer.status = 404;
          throw missingCustomer;
        }
        await Promise.all([
          Review.deleteMany({ customerId: id }, { session }),
          SupportMessage.deleteMany({ customerId: id }, { session }),
        ]);
      });
    } finally {
      await session.endSession();
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.status === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Customer account could not be deleted:', error);
    return NextResponse.json({ error: 'Customer account could not be deleted.' }, { status: 500 });
  }
}
