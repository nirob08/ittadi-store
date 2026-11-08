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
        avatarUrl: customer.avatarUrl || '',
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
  const avatarUrl = body?.avatarUrl;
  let avatarBytes;
  if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
    const match = typeof avatarUrl === 'string'
      ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(avatarUrl)
      : null;
    if (!match || avatarUrl.length > 350000) {
      return NextResponse.json({ error: 'Please choose a valid JPG, PNG or WebP profile photo.' }, { status: 400 });
    }
    avatarBytes = Buffer.from(match[2], 'base64');
    const signatureIsValid =
      (match[1] === 'jpeg' && avatarBytes[0] === 0xff && avatarBytes[1] === 0xd8 && avatarBytes[2] === 0xff) ||
      (match[1] === 'png' && avatarBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
      (match[1] === 'webp' && avatarBytes.toString('ascii', 0, 4) === 'RIFF' && avatarBytes.toString('ascii', 8, 12) === 'WEBP');
    if (avatarBytes.length > 256 * 1024 || !signatureIsValid) {
      return NextResponse.json({ error: 'Profile photos must be valid images no larger than 256 KB.' }, { status: 400 });
    }
  }
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
      {
        $set: {
          name,
          phone,
          address: nextAddress,
          ...(location ? { location } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || '' } : {}),
        },
      },
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
        avatarUrl: avatarUrl === undefined ? customer.avatarUrl || '' : avatarUrl || '',
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
