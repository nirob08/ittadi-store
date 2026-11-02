import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const endpoint = body?.endpoint;
  const keys = body?.keys;
  let endpointUrl;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    return NextResponse.json({ error: 'The push subscription is invalid.' }, { status: 400 });
  }
  if (
    endpointUrl.protocol !== 'https:' ||
    endpointUrl.href.length > 2048 ||
    !(
      endpointUrl.hostname === 'fcm.googleapis.com' ||
      endpointUrl.hostname === 'push.services.mozilla.com' ||
      endpointUrl.hostname.endsWith('.push.services.mozilla.com') ||
      endpointUrl.hostname.endsWith('.push.apple.com') ||
      endpointUrl.hostname.endsWith('.notify.windows.com')
    ) ||
    typeof keys?.p256dh !== 'string' ||
    typeof keys?.auth !== 'string' ||
    keys.p256dh.length < 20 ||
    keys.p256dh.length > 256 ||
    keys.auth.length < 16 ||
    keys.auth.length > 128
  ) {
    return NextResponse.json({ error: 'The push subscription is invalid.' }, { status: 400 });
  }

  try {
    await dbConnect();
    await PushSubscription.findOneAndUpdate(
      { endpoint: endpointUrl.href },
      { $set: { keys: { p256dh: keys.p256dh, auth: keys.auth } } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscription could not be saved:', error);
    return NextResponse.json({ error: 'Browser notifications could not be enabled.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (typeof body?.endpoint !== 'string' || body.endpoint.length > 2048) {
    return NextResponse.json({ error: 'A valid push subscription is required.' }, { status: 400 });
  }

  try {
    await dbConnect();
    await PushSubscription.deleteOne({ endpoint: body.endpoint });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscription could not be removed:', error);
    return NextResponse.json({ error: 'Browser notifications could not be disabled.' }, { status: 500 });
  }
}
