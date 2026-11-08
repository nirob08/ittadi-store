import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'Placed',
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for delivery',
  'Delivered',
  'Cancelled',
];

export const PAYMENT_METHODS = [
  'Cash on delivery',
  'SSLCOMMERZ',
  'Manual bKash',
  'Manual Nagad',
];

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        image: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, min: 0 },
    deliveryFee: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Cash on delivery' },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'review', 'failed'], default: 'unpaid' },
    paymentReference: { type: String, trim: true, maxlength: 100, default: '' },
    paymentValidationId: { type: String, trim: true, maxlength: 100, default: '' },
    paidAt: { type: Date },
    status: { type: String, enum: ORDER_STATUSES, default: 'Placed' },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES, required: true },
        note: { type: String, trim: true, maxlength: 300, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    deliveryAddress: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      phone: { type: String, required: true, trim: true, maxlength: 24 },
      street: { type: String, required: true, trim: true, maxlength: 240 },
      area: { type: String, required: true, trim: true, maxlength: 100 },
      district: { type: String, required: true, trim: true, maxlength: 100 },
      postalCode: { type: String, trim: true, maxlength: 16, default: '' },
      location: {
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
      },
    },
  },
  { timestamps: true },
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
