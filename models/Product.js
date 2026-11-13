import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  image: { type: String, required: true },
  images: { type: [String], default: [] },
  video: { type: String, trim: true, maxlength: 2000, default: '' },
  videoUrl: { type: String, trim: true, maxlength: 2000, default: '' },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  specifications: { type: String, trim: true, maxlength: 4000, default: '' },
  badge: { type: String },
  stock: { type: Number, default: 10 },
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);