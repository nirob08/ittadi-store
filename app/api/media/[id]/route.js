import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { productMediaBucket } from '@/lib/product-media';

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  try {
    await dbConnect();
    const objectId = new mongoose.Types.ObjectId(id);
    const bucket = productMediaBucket();
    const file = await bucket.find({ _id: objectId }).next();
    if (!file || file.metadata?.purpose !== 'product-image') {
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    }

    const stream = bucket.openDownloadStream(objectId);
    return new NextResponse(Readable.toWeb(stream), {
      headers: {
        'Content-Type': file.contentType || 'application/octet-stream',
        'Content-Length': String(file.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Product image could not be loaded:', error);
    return NextResponse.json({ error: 'Image could not be loaded.' }, { status: 500 });
  }
}
