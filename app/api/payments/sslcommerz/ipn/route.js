import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { processSslCommerzPayment } from '@/lib/sslcommerz-payment';

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid payment notification.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const result = await processSslCommerzPayment(formData, request.url);
    if (result.status === 'unverified') {
      return NextResponse.json({ received: true, verified: false });
    }
    return NextResponse.json({ received: true, paymentStatus: result.status });
  } catch (error) {
    console.error('SSLCOMMERZ IPN could not be verified:', error);
    return NextResponse.json({ error: 'Payment notification could not be verified.' }, { status: 502 });
  }
}
