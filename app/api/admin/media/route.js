import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import dbConnect from '@/lib/mongodb';
import { detectProductImageType, productImageExtension, productMediaBucket } from '@/lib/product-media';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

export async function POST(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Choose a JPEG, PNG or WebP image to upload.' }, { status: 400 });
  }
  const file = formData.get('image');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Choose a JPEG, PNG or WebP image to upload.' }, { status: 400 });
  }
  if (file.size < 1 || file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: 'Product images must be smaller than 4 MB.' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = detectProductImageType(buffer);
    if (!contentType || contentType !== file.type || !productImageExtension(contentType)) {
      return NextResponse.json({ error: 'The image content must match a JPEG, PNG or WebP file.' }, { status: 400 });
    }

    await dbConnect();
    const bucket = productMediaBucket();
    const upload = bucket.openUploadStream(`product-${randomUUID()}.${productImageExtension(contentType)}`, {
      contentType,
      metadata: { purpose: 'product-image' },
    });
    await new Promise((resolve, reject) => {
      upload.once('error', reject);
      upload.once('finish', resolve);
      upload.end(buffer);
    });
    return NextResponse.json({ success: true, image: `/api/media/${upload.id}` }, { status: 201 });
  } catch (error) {
    console.error('Product image could not be uploaded:', error);
    return NextResponse.json({ error: 'Product image could not be uploaded.' }, { status: 500 });
  }
}
