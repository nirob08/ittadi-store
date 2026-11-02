import mongoose from 'mongoose';

const SupportMessageSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    sender: { type: String, enum: ['customer', 'admin'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    readByCustomer: { type: Boolean, default: false },
    readByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

SupportMessageSchema.index({ customerId: 1, createdAt: 1 });

export default mongoose.models.SupportMessage || mongoose.model('SupportMessage', SupportMessageSchema);
