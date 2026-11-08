import { NextResponse } from 'next/server';
import { isSslCommerzConfigured } from '@/lib/sslcommerz';
import { walletPaymentNumbers } from '@/lib/wallet-payments';

export async function GET(request) {
  return NextResponse.json({
    sslcommerzEnabled: isSslCommerzConfigured(request.url),
    walletNumbers: walletPaymentNumbers,
  });
}
