import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true, select: false },
    avatarUrl: { type: String, maxlength: 350000, default: '' },
    phone: { type: String, trim: true, maxlength: 24, default: '' },
    address: {
      street: { type: String, trim: true, maxlength: 240, default: '' },
      area: { type: String, trim: true, maxlength: 100, default: '' },
      district: { type: String, trim: true, maxlength: 100, default: '' },
      postalCode: { type: String, trim: true, maxlength: 16, default: '' },
    },
    location: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
  },
  { timestamps: true },
);

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
