import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { isAdminRequest } from '@/lib/admin-auth';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import Review from '@/models/Review';
import SupportMessage from '@/models/SupportMessage';
import { normalizeLegacyOrderBilling } from '@/lib/delivery';

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  try {
    await dbConnect();
    const [customers, orders, unreadMessages, reviews] = await Promise.all([
      Customer.find({}).select('name email phone address location createdAt').sort({ createdAt: -1 }).lean(),
      Order.find({}).sort({ createdAt: -1 }).limit(200).lean(),
      SupportMessage.find({ readByAdmin: false }).sort({ createdAt: 1 }).limit(300).lean(),
      Review.find({})
        .sort({ createdAt: -1 })
        .limit(200)
        .populate({ path: 'productId', select: 'name' })
        .populate({ path: 'customerId', select: 'name email' })
        .lean(),
    ]);
    return NextResponse.json({
      customers,
      orders: orders.map(normalizeLegacyOrderBilling),
      unreadMessages,
      reviews,
    });
  } catch (error) {
    console.error('Admin overview could not be loaded:', error);
    return NextResponse.json(
      { error: 'Database connection failed. Check the MongoDB URI, database user credentials, and Atlas Network Access.' },
      { status: 500 },
    );
  }
}
