import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['new-product'], required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 240 },
  },
  { timestamps: true },
);

export default mongoose.models.StoreNotification ||
  mongoose.model('StoreNotification', NotificationSchema);
