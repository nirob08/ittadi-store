import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { customerFromRequest } from '@/lib/customer-auth';
import Order from '@/models/Order';
import Product from '@/models/Product';

export async function GET(request) {
  try {
    const customer = await customerFromRequest(request);
    if (!customer) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    const orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Customer orders could not be loaded:', error);
    return NextResponse.json({ error: 'Orders could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const requestedItems = body?.items;
  const deliveryAddress = body?.deliveryAddress;
  if (!Array.isArray(requestedItems) || requestedItems.length < 1 || requestedItems.length > 20) {
    return NextResponse.json({ error: 'An order must contain between 1 and 20 products.' }, { status: 400 });
  }
  const quantityById = new Map();
  for (const item of requestedItems) {
    if (typeof item?.productId !== 'string' || !/^[a-f\d]{24}$/i.test(item.productId)) {
      return NextResponse.json({ error: 'One of the selected products is invalid.' }, { status: 400 });
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return NextResponse.json({ error: 'Product quantities must be whole numbers from 1 to 20.' }, { status: 400 });
    }
    const id = item.productId.toLowerCase();
    quantityById.set(id, (quantityById.get(id) || 0) + quantity);
    if (quantityById.get(id) > 20) {
      return NextResponse.json({ error: 'Product quantity cannot exceed 20.' }, { status: 400 });
    }
  }

  const address = {
    name: typeof deliveryAddress?.name === 'string' ? deliveryAddress.name.trim() : '',
    phone: typeof deliveryAddress?.phone === 'string' ? deliveryAddress.phone.trim() : '',
    street: typeof deliveryAddress?.street === 'string' ? deliveryAddress.street.trim() : '',
    area: typeof deliveryAddress?.area === 'string' ? deliveryAddress.area.trim() : '',
    district: typeof deliveryAddress?.district === 'string' ? deliveryAddress.district.trim() : '',
    postalCode: typeof deliveryAddress?.postalCode === 'string' ? deliveryAddress.postalCode.trim() : '',
  };
  if (
    address.name.length < 2 ||
    address.name.length > 120 ||
    !/^[+0-9][0-9 ()-]{6,22}$/.test(address.phone) ||
    !address.street ||
    address.street.length > 240 ||
    !address.area ||
    address.area.length > 100 ||
    !address.district ||
    address.district.length > 100 ||
    address.postalCode.length > 16
  ) {
    return NextResponse.json({ error: 'Enter a valid delivery name, phone and complete address.' }, { status: 400 });
  }

  if (deliveryAddress.location != null) {
    const latitude = Number(deliveryAddress.location.latitude);
    const longitude = Number(deliveryAddress.location.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'The delivery location coordinates are invalid.' }, { status: 400 });
    }
    address.location = { latitude, longitude };
  }

  try {
    const customer = await customerFromRequest(request);
    if (!customer) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    await dbConnect();
    const productIds = [...quantityById.keys()];
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products are no longer available.' }, { status: 409 });
    }
    const items = products.map((product) => ({
      productId: product._id,
      name: product.name,
      image: product.image,
      quantity: quantityById.get(String(product._id).toLowerCase()),
      unitPrice: product.price,
    }));
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const session = await mongoose.startSession();
    let order;
    try {
      await session.withTransaction(async () => {
        await Product.updateMany({ stock: { $exists: false } }, { $set: { stock: 10 } }, { session });
        for (const item of items) {
          const reservation = await Product.updateOne(
            { _id: item.productId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { session },
          );
          if (reservation.modifiedCount !== 1) {
            const unavailable = new Error(`Not enough stock for ${item.name}.`);
            unavailable.status = 409;
            throw unavailable;
          }
        }
        const [createdOrder] = await Order.create(
          [{
            orderNumber: `IT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
            customerId: customer._id,
            items,
            total,
            deliveryAddress: address,
            status: 'Placed',
            statusHistory: [{ status: 'Placed', note: 'Order received' }],
          }],
          { session },
        );
        order = createdOrder.toObject();
      });
    } finally {
      await session.endSession();
    }
    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    if (error?.status === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Order could not be placed:', error);
    return NextResponse.json({ error: 'Your order could not be placed. Please check the database connection and try again.' }, { status: 500 });
  }
}
