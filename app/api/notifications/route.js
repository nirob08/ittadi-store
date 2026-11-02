import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function GET() {
  try {
    await dbConnect();
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('productId', 'name image price')
      .lean();
    return NextResponse.json({
      notifications: notifications.map((notification) => ({
        id: notification._id,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
        product: notification.productId,
      })),
    });
  } catch (error) {
    console.error('Store notifications could not be loaded:', error);
    return NextResponse.json({ error: 'Notifications could not be loaded.' }, { status: 500 });
  }
}
