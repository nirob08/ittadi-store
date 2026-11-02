import { NextResponse } from 'next/server';
import { clearCustomerSessionCookie, customerFromRequest } from '@/lib/customer-auth';

export async function GET(request) {
  try {
    const customer = await customerFromRequest(request);
    if (!customer) return NextResponse.json({ customer: null });
    return NextResponse.json({
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        ...(Number.isFinite(customer.location?.latitude) && Number.isFinite(customer.location?.longitude)
          ? { location: customer.location }
          : {}),
      },
    });
  } catch (error) {
    console.error('Customer session check failed:', error);
    return NextResponse.json({ error: 'Customer session could not be checked.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearCustomerSessionCookie(response);
  return response;
}
