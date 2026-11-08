import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getSslCommerzConfig } from '@/lib/sslcommerz';
import { processSslCommerzPayment } from '@/lib/sslcommerz-payment';

function accountRedirect(request, paymentStatus, orderNumber = '') {
  const config = getSslCommerzConfig(request.url);
  if (!config) return NextResponse.json({ error: 'Payment return URL is not configured.' }, { status: 503 });
  const destination = new URL('/account', config.baseUrl);
  destination.searchParams.set('payment', paymentStatus);
  if (orderNumber) destination.searchParams.set('order', orderNumber);
  return NextResponse.redirect(destination, { status: 303 });
}

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return accountRedirect(request, 'verification');
  }

  const orderNumber = String(formData.get('tran_id') || '');
  try {
    await dbConnect();
    const result = await processSslCommerzPayment(formData, request.url);
    if (result.status === 'paid') return accountRedirect(request, 'paid', orderNumber);
    if (result.status === 'review') return accountRedirect(request, 'review', orderNumber);
    return accountRedirect(request, 'verification', orderNumber);
  } catch (error) {
    console.error('SSLCOMMERZ payment return could not be verified:', error);
    return accountRedirect(request, 'verification', orderNumber);
  }
}
