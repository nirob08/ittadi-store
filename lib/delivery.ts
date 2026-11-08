const DHAKA_DELIVERY_FEE = 70;
const OUTSIDE_DHAKA_DELIVERY_FEE = 120;

export function getDeliveryFee(district: string): number | null {
  if (typeof district !== 'string' || !district.trim()) return null;
  const normalizedDistrict = district.trim().toLocaleLowerCase('en');
  return normalizedDistrict === 'dhaka' || normalizedDistrict === 'ঢাকা'
    ? DHAKA_DELIVERY_FEE
    : OUTSIDE_DHAKA_DELIVERY_FEE;
}

export function normalizeLegacyOrderBilling<T extends {
  items?: { unitPrice?: number; quantity?: number }[];
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  deliveryAddress?: { district?: string };
}>(order: T): T {
  const itemsSubtotal = order.items?.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0,
  ) ?? 0;
  const deliveryFee = getDeliveryFee(order.deliveryAddress?.district ?? '');

  if (
    Number(order.deliveryFee ?? 0) === 0 &&
    deliveryFee !== null &&
    Number(order.total) === itemsSubtotal + deliveryFee
  ) {
    return { ...order, subtotal: itemsSubtotal, deliveryFee };
  }

  return order;
}
