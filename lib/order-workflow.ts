export const nextOrderStatuses: Record<string, string[]> = {
  Placed: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for delivery'],
  'Out for delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};
