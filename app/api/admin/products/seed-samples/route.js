import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { sampleProducts } from '@/lib/sample-products';

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
  const stock = Number(body?.stock);
  if (!Number.isInteger(stock) || stock < 1 || stock > 10000) {
    return NextResponse.json({ success: false, error: 'Sample products need a stock quantity from 1 to 10,000.' }, { status: 400 });
  }

  try {
    await dbConnect();
    if (await Product.exists({})) {
      return NextResponse.json(
        { success: false, error: 'The catalog already contains products. Add or edit items individually instead.' },
        { status: 409 },
      );
    }

    const products = await Product.insertMany(
      sampleProducts.map((product) => ({ ...product, stock, badge: '' })),
      { ordered: true },
    );
    return NextResponse.json({ success: true, count: products.length }, { status: 201 });
  } catch (error) {
    console.error('Sample products could not be published:', error);
    return NextResponse.json({ success: false, error: 'Sample products could not be published.' }, { status: 500 });
  }
}
