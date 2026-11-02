import { NextResponse } from 'next/server';
import { customerFromRequest } from '@/lib/customer-auth';
import Customer from '@/models/Customer';

export async function GET(request) {
  try {
    const customer = await customerFromRequest(request);
    if (!customer) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
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
    console.error('Customer profile could not be loaded:', error);
    return NextResponse.json({ error: 'Customer profile could not be loaded.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const address = body?.address;
  if (
    name.length < 2 ||
    name.length > 120 ||
    phone.length > 24 ||
    (phone && !/^[+0-9][0-9 ()-]{6,22}$/.test(phone)) ||
    !address ||
    typeof address !== 'object'
  ) {
    return NextResponse.json({ error: 'Please enter a valid name, phone number and address.' }, { status: 400 });
  }

  const nextAddress = {
    street: typeof address.street === 'string' ? address.street.trim() : '',
    area: typeof address.area === 'string' ? address.area.trim() : '',
    district: typeof address.district === 'string' ? address.district.trim() : '',
    postalCode: typeof address.postalCode === 'string' ? address.postalCode.trim() : '',
  };
  if (
    nextAddress.street.length > 240 ||
    nextAddress.area.length > 100 ||
    nextAddress.district.length > 100 ||
    nextAddress.postalCode.length > 16
  ) {
    return NextResponse.json({ error: 'One or more address fields are too long.' }, { status: 400 });
  }

  let location;
  if (body.location != null) {
    const latitude = Number(body.location.latitude);
    const longitude = Number(body.location.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'The location coordinates are invalid.' }, { status: 400 });
    }
    location = { latitude, longitude };
  }

  try {
    const customer = await customerFromRequest(request);
    if (!customer) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    await Customer.updateOne(
      { _id: customer._id },
      { $set: { name, phone, address: nextAddress, ...(location ? { location } : {}) } },
    );
    const savedLocation =
      location ||
      (Number.isFinite(customer.location?.latitude) && Number.isFinite(customer.location?.longitude)
        ? customer.location
        : undefined);
    return NextResponse.json({
      success: true,
      customer: {
        id: customer._id,
        name,
        email: customer.email,
        phone,
        address: nextAddress,
        ...(savedLocation ? { location: savedLocation } : {}),
      },
    });
  } catch (error) {
    console.error('Customer profile could not be updated:', error);
    return NextResponse.json({ error: 'Customer profile could not be updated.' }, { status: 500 });
  }
}
