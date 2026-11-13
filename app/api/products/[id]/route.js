import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Review from '@/models/Review';

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  try {
    await dbConnect();
    const productId = new mongoose.Types.ObjectId(id);
    const [product, summary] = await Promise.all([
      Product.findById(productId).lean(),
      Review.aggregate([
        { $match: { productId } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: {
        ...product,
        images: product.images?.length ? product.images : [product.image],
        videoUrl: product.videoUrl || product.video || '',
        stock: product.stock ?? 10,
        ratingAverage: summary[0]?.average || 0,
        reviewCount: summary[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('Product details could not be loaded:', error);
    return NextResponse.json({ error: 'Product details could not be loaded.' }, { status: 500 });
  }
}
