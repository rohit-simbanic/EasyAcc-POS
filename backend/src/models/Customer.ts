import mongoose, { Schema } from 'mongoose';

export interface ICustomer {
  _id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  balance: mongoose.Types.Decimal128;
}

const CustomerSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  gstin: { type: String, uppercase: true, trim: true },
  stateCode: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String }
  },
  balance: { type: Schema.Types.Decimal128, default: 0.00 }
}, {
  timestamps: true,
  _id: false
});

CustomerSchema.index({ name: 1 });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ updatedAt: -1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
