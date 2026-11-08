import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { customerFromRequest } from '@/lib/customer-auth';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Review from '@/models/Review';

async function reviewSummary(productId) {
  const [summary] = await Review.aggregate([
    { $match: { productId } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return { average: summary?.average || 0, count: summary?.count || 0 };
}

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
  try {
    await dbConnect();
    const productId = new mongoose.Types.ObjectId(id);
    const [reviews, summary] = await Promise.all([
      Review.find({ productId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate({ path: 'customerId', select: 'name' })
        .lean(),
      reviewSummary(productId),
    ]);
    return NextResponse.json({
      reviews: reviews.map((review) => ({
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        customerName: review.customerId?.name || 'Customer',
        verifiedPurchase: true,
      })),
      summary,
    });
  } catch (error) {
    console.error('Product reviews could not be loaded:', error);
    return NextResponse.json({ error: 'Product reviews could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid review.' }, { status: 400 });
  }
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3 || comment.length > 1000) {
    return NextResponse.json({ error: 'Choose 1–5 stars and write a review between 3 and 1,000 characters.' }, { status: 400 });
  }

  try {
    const customer = await customerFromRequest(request);
    if (!customer) return NextResponse.json({ error: 'Sign in with the account that placed the delivered order to review this item.' }, { status: 401 });
    await dbConnect();
    const product = await Product.exists({ _id: id });
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const deliveredOrder = await Order.findOne({
      customerId: customer._id,
      status: 'Delivered',
      items: { $elemMatch: { productId: id } },
    }).select('_id').lean();
    if (!deliveredOrder) {
      return NextResponse.json({ error: 'A review is available after this product is delivered to you.' }, { status: 403 });
    }

    const review = await Review.create({
      productId: id,
      customerId: customer._id,
      orderId: deliveredOrder._id,
      rating,
      comment,
    });
    return NextResponse.json({
      success: true,
      review: {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        customerName: customer.name,
        verifiedPurchase: true,
      },
      summary: await reviewSummary(review.productId),
    }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'You have already reviewed this product.' }, { status: 409 });
    }
    console.error('Product review could not be saved:', error);
    return NextResponse.json({ error: 'Your review could not be saved.' }, { status: 500 });
  }
}
