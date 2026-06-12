export interface Product {
  _id: string;
  name: string;
  sku: string;
  hsnCode: string;
  gstRate: number;
  price: {
    purchasePrice: string;
    mrp: string;
    sellingPrice: string;
  };
  stock: {
    quantity: number;
    lowStockAlert: number;
  };
  updatedAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
  balance?: string;
  updatedAt: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  hsnCode: string;
  quantity: number;
  unitPrice: string;
  taxableValue: string;
  gstRate: number;
  cgst: string;
  sgst: string;
  igst: string;
}

export interface InvoiceTotals {
  taxableAmount: string;
  totalCGST: string;
  totalSGST: string;
  totalIGST: string;
  grandTotal: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerGSTIN?: string;
  billingStateCode: string;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
