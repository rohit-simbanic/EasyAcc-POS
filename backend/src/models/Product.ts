import mongoose, { Schema } from 'mongoose';

export interface IProduct {
  _id: string;
  name: string;
  sku: string;
  hsnCode: string;
  gstRate: number;
  price: {
    purchasePrice: mongoose.Types.Decimal128;
    mrp: mongoose.Types.Decimal128;
    sellingPrice: mongoose.Types.Decimal128;
  };
  stock: {
    quantity: number;
    lowStockAlert: number;
  };
  batches: Array<{
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
  }>;
  attributes?: Map<string, string>;
}

const ProductSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  hsnCode: { type: String, required: true },
  gstRate: { type: Number, required: true },
  price: {
    purchasePrice: { type: Schema.Types.Decimal128, required: true },
    mrp: { type: Schema.Types.Decimal128, required: true },
    sellingPrice: { type: Schema.Types.Decimal128, required: true }
  },
  stock: {
    quantity: { type: Number, required: true, default: 0 },
    lowStockAlert: { type: Number, default: 10 }
  },
  batches: [{
    batchNumber: { type: String },
    expiryDate: { type: Date },
    quantity: { type: Number, default: 0 }
  }],
  attributes: { type: Map, of: String }
}, {
  timestamps: true,
  _id: false
});

ProductSchema.index({ name: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ hsnCode: 1 });
ProductSchema.index({ updatedAt: -1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
