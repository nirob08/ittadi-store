import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

ReviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
