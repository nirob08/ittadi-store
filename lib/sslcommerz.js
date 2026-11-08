const SANDBOX_HOST = 'https://sandbox.sslcommerz.com';
const LIVE_HOST = 'https://securepay.sslcommerz.com';

export function getSslCommerzConfig(requestUrl) {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
  const localBaseUrl = process.env.NODE_ENV === 'development' ? requestUrl : '';
  const baseUrl = configuredBaseUrl || localBaseUrl;

  if (!storeId || !storePassword || !baseUrl) return null;

  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    return null;
  }
  if (process.env.NODE_ENV === 'production' && parsedBaseUrl.protocol !== 'https:') return null;

  const sandbox = process.env.SSLCOMMERZ_SANDBOX !== 'false';
  return {
    storeId,
    storePassword,
    baseUrl: parsedBaseUrl.origin,
    apiHost: sandbox ? SANDBOX_HOST : LIVE_HOST,
  };
}

export function isSslCommerzConfigured(requestUrl) {
  const localBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined;
  return Boolean(getSslCommerzConfig(requestUrl || localBaseUrl));
}

export async function createSslCommerzSession(order, requestUrl, customerEmail) {
  const config = getSslCommerzConfig(requestUrl);
  if (!config) throw new Error('SSLCOMMERZ is not configured for this environment.');

  const callbackUrl = `${config.baseUrl}/api/payments/sslcommerz/callback`;
  const ipnUrl = `${config.baseUrl}/api/payments/sslcommerz/ipn`;
  const params = new URLSearchParams({
    store_id: config.storeId,
    store_passwd: config.storePassword,
    total_amount: Number(order.total).toFixed(2),
    currency: 'BDT',
    tran_id: order.orderNumber,
    success_url: callbackUrl,
    fail_url: callbackUrl,
    cancel_url: callbackUrl,
    ipn_url: ipnUrl,
    cus_name: order.deliveryAddress.name,
    cus_email: customerEmail || 'customer@ittadi4u.com',
    cus_add1: `${order.deliveryAddress.street}, ${order.deliveryAddress.area}`.slice(0, 100),
    cus_city: order.deliveryAddress.district,
    cus_postcode: order.deliveryAddress.postalCode || '0000',
    cus_country: 'Bangladesh',
    cus_phone: order.deliveryAddress.phone,
    shipping_method: 'YES',
    product_name: order.items.map((item) => item.name).join(', ').slice(0, 200),
    product_category: 'E-commerce',
    product_profile: 'general',
  });

  const response = await fetch(`${config.apiHost}/gwprocess/v4/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`SSLCOMMERZ session request failed with HTTP ${response.status}.`);

  const result = await response.json();
  if (result.status !== 'SUCCESS' || typeof result.GatewayPageURL !== 'string') {
    throw new Error('SSLCOMMERZ did not return a hosted payment URL.');
  }
  const gatewayUrl = new URL(result.GatewayPageURL);
  if (gatewayUrl.protocol !== 'https:' || gatewayUrl.hostname !== new URL(config.apiHost).hostname) {
    throw new Error('SSLCOMMERZ returned an unexpected payment URL.');
  }
  return gatewayUrl.toString();
}

export async function validateSslCommerzTransaction(validationId, requestUrl) {
  const config = getSslCommerzConfig(requestUrl);
  if (!config) throw new Error('SSLCOMMERZ is not configured for this environment.');

  const params = new URLSearchParams({
    val_id: validationId,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    format: 'json',
  });
  const response = await fetch(`${config.apiHost}/validator/api/validationserverAPI.php?${params}`, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`SSLCOMMERZ validation failed with HTTP ${response.status}.`);
  return response.json();
}
