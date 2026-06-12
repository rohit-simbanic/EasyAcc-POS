import mongoose, { Schema } from 'mongoose';

export interface IInvoiceItem {
  productId: string;
  name: string;
  hsnCode: string;
  quantity: number;
  unitPrice: mongoose.Types.Decimal128;
  taxableValue: mongoose.Types.Decimal128;
  gstRate: number;
  cgst: mongoose.Types.Decimal128;
  sgst: mongoose.Types.Decimal128;
  igst: mongoose.Types.Decimal128;
}

export interface IInvoice {
  _id: string;
  invoiceNumber: string;
  date: Date;
  customerId?: string;
  customerName: string;
  customerGSTIN?: string;
  billingStateCode: string;
  items: IInvoiceItem[];
  totals: {
    taxableAmount: mongoose.Types.Decimal128;
    totalCGST: mongoose.Types.Decimal128;
    totalSGST: mongoose.Types.Decimal128;
    totalIGST: mongoose.Types.Decimal128;
    grandTotal: mongoose.Types.Decimal128;
  };
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  syncStatus: 'pending' | 'synced' | 'failed';
  eInvoiceStatus?: {
    irn?: string;
    qrCodeUrl?: string;
    acknowledgedAt?: Date;
  };
}

const InvoiceItemSchema: Schema = new Schema({
  productId: { type: String, ref: 'Product', required: true },
  name: { type: String, required: true },
  hsnCode: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Schema.Types.Decimal128, required: true },
  taxableValue: { type: Schema.Types.Decimal128, required: true },
  gstRate: { type: Number, required: true },
  cgst: { type: Schema.Types.Decimal128, default: 0 },
  sgst: { type: Schema.Types.Decimal128, default: 0 },
  igst: { type: Schema.Types.Decimal128, default: 0 }
});

const InvoiceSchema: Schema = new Schema({
  _id: { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
  customerId: { type: String, ref: 'Customer' },
  customerName: { type: String, required: true },
  customerGSTIN: { type: String },
  billingStateCode: { type: String, required: true },
  items: [InvoiceItemSchema],
  totals: {
    taxableAmount: { type: Schema.Types.Decimal128, required: true },
    totalCGST: { type: Schema.Types.Decimal128, default: 0 },
    totalSGST: { type: Schema.Types.Decimal128, default: 0 },
    totalIGST: { type: Schema.Types.Decimal128, default: 0 },
    grandTotal: { type: Schema.Types.Decimal128, required: true }
  },
  paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
  syncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'synced' },
  eInvoiceStatus: {
    irn: { type: String },
    qrCodeUrl: { type: String },
    acknowledgedAt: { type: Date }
  }
}, {
  timestamps: true,
  _id: false
});

InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ customerName: 1 });
InvoiceSchema.index({ customerId: 1 });
InvoiceSchema.index({ date: -1 });
InvoiceSchema.index({ updatedAt: -1 });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
