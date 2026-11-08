import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import Notification from '@/models/Notification';
import { announceNewProduct } from '@/lib/web-push';
import Order from '@/models/Order';
import Review from '@/models/Review';

function validateProduct(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const category = typeof body?.category === 'string' ? body.category.trim() : '';
  const image = typeof body?.image === 'string' ? body.image.trim() : '';
  const video = typeof body?.video === 'string' ? body.video.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const price = Number(body?.price);
  const oldPrice = body?.oldPrice === '' || body?.oldPrice == null ? undefined : Number(body.oldPrice);
  const stock = body?.stock === '' || body?.stock == null ? 10 : Number(body.stock);
  const validImage =
    (image.startsWith('/') && !image.startsWith('//')) ||
    (() => {
      try {
        return new URL(image).protocol === 'https:';
      } catch {
        return false;
      }
    })();

  if (
    !name ||
    name.length > 120 ||
    !category ||
    category.length > 80 ||
    !Number.isFinite(price) ||
    price <= 0 ||
    (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice <= price)) ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    description.length > 2000 ||
    video.length > 2000 ||
    !validImage
  ) {
    return null;
  }
  if (video) {
    try {
      if (new URL(video).protocol !== 'https:') return null;
    } catch {
      return null;
    }
  }

  return {
    name,
    category,
    price,
    ...(oldPrice === undefined ? {} : { oldPrice }),
    image,
    description,
    video,
    ...(typeof body.badge === 'string' && body.badge.trim()
      ? { badge: body.badge.trim().slice(0, 40) }
      : { badge: '' }),
    stock,
  };
}

export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    const ratings = await Review.aggregate([
      { $group: { _id: '$productId', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingByProductId = new Map(ratings.map((rating) => [String(rating._id), rating]));
    return NextResponse.json({
      success: true,
      data: products.map((product) => ({
        ...product,
        stock: product.stock ?? 10,
        ratingAverage: ratingByProductId.get(String(product._id))?.average || 0,
        reviewCount: ratingByProductId.get(String(product._id))?.count || 0,
      })),
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to load products:', error);
    return NextResponse.json(
      { success: false, error: 'Database connection failed. Check the MongoDB URI, database user credentials, and Atlas Network Access.' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Admin login required.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const productData = validateProduct(body);
  if (!productData) {
    return NextResponse.json({ success: false, error: 'Please provide valid product details.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const newProduct = await Product.create(productData);
    let notification = { configured: false, sent: 0, failed: 0 };
    try {
      await Notification.create({
        type: 'new-product',
        productId: newProduct._id,
        title: `New at Ittadi: ${newProduct.name}`,
        message: `Discover ${newProduct.name} for ৳ ${newProduct.price}.`,
      });
      notification = await announceNewProduct(newProduct);
    } catch (notificationError) {
      console.error('Product was published but its announcement could not be delivered:', notificationError);
    }
    return NextResponse.json({ success: true, data: newProduct, notification }, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json(
      { success: false, error: 'Product could not be published. Please check the database connection.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Admin login required.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }
  if (typeof body?.id !== 'string' || !/^[a-f\d]{24}$/i.test(body.id)) {
    return NextResponse.json({ success: false, error: 'A valid product ID is required.' }, { status: 400 });
  }
  const productData = validateProduct(body);
  if (!productData) {
    return NextResponse.json({ success: false, error: 'Please provide valid product details.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const update = {
      $set: productData,
      ...(productData.oldPrice === undefined ? { $unset: { oldPrice: 1 } } : {}),
    };
    const product = await Product.findByIdAndUpdate(body.id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!product) return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json(
      { success: false, error: 'Product could not be updated. Please check the database connection.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Admin login required.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body?.id !== 'string' || !/^[a-f\d]{24}$/i.test(body.id)) {
    return NextResponse.json({ success: false, error: 'A valid product ID is required.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const activeOrder = await Order.exists({
      items: { $elemMatch: { productId: body.id } },
      status: { $nin: ['Delivered', 'Cancelled'] },
    });
    if (activeOrder) {
      return NextResponse.json(
        { success: false, error: 'This product is in an active order. Complete or cancel that order before deleting it.' },
        { status: 409 },
      );
    }
    const product = await Product.findByIdAndDelete(body.id);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json(
      { success: false, error: 'Product could not be deleted. Please check the database connection.' },
      { status: 500 },
    );
  }
}