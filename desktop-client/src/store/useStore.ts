import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { triggerSync } from '../sync/syncManager';
import { EasyACCDatabase } from '../db/localDb';
import { Product, Customer, CartItem, InvoiceItem, InvoiceTotals, Invoice, Toast } from '../types';

const MERCHANT_STATE_CODE = '19';

interface EasyACCState {
  db: EasyACCDatabase | null;
  online: boolean;
  products: Product[];
  customers: Customer[];
  cart: CartItem[];
  invoices: Invoice[];
  toasts: Toast[];
  selectedCustomer: Customer | null;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  invoiceCount: number;
  pendingSyncCount: number;

  // Pagination States
  paginatedProducts: Product[];
  paginatedInvoices: Invoice[];
  productsTotalCount: number;
  invoicesTotalCount: number;

  // Low Stock Alert States
  lowStockModal: {
    isOpen: boolean;
    title: string;
    products: { name: string; sku: string; quantity: number }[];
  };
  
  // Actions
  setDb: (db: EasyACCDatabase) => void;
  setLowStockModal: (isOpen: boolean, title: string, products: { name: string; sku: string; quantity: number }[]) => void;
  checkDailyLowStockAlerts: () => Promise<void>;
  checkImmediateLowStockAlert: (productIdsToCheck: string[]) => Promise<void>;
  setOnline: (online: boolean) => void;
  fetchCatalog: () => Promise<void>;
  fetchProductsPage: (page: number, limit: number, search: string) => Promise<void>;
  fetchInvoicesPage: (page: number, limit: number, search: string) => Promise<void>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setPaymentStatus: (status: 'Paid' | 'Unpaid' | 'Partial') => void;
  calculateTotals: (method?: 'Cash' | 'UPI' | 'Credit') => { items: InvoiceItem[]; totals: InvoiceTotals };
  checkout: (method: 'Cash' | 'UPI' | 'Credit') => Promise<Invoice>; // Returns created invoice on success
  loadMockData: () => Promise<void>;
  
  // Toast Actions
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useStore = create<EasyACCState>((set, get) => ({
  db: null,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  products: [],
  customers: [],
  cart: [],
  invoices: [],
  toasts: [],
  selectedCustomer: null,
  paymentStatus: 'Paid',
  invoiceCount: 0,
  pendingSyncCount: 0,

  paginatedProducts: [],
  paginatedInvoices: [],
  productsTotalCount: 0,
  invoicesTotalCount: 0,

  lowStockModal: {
    isOpen: false,
    title: '',
    products: []
  },

  setDb: (db) => {
    set({ db });
    get().fetchCatalog();
  },

  setOnline: (online) => set({ online }),

  fetchCatalog: async () => {
    const { db } = get();
    if (!db) return;

    // Fetch lists (load products and customers in full for selectors/autocomplete)
    const prodsDoc = await db.products.find().exec();
    const custsDoc = await db.customers.find().exec();
    const invoicesCountDoc = await db.invoices.find().exec();
    const pendingDoc = await db.invoices.find({
      selector: { syncStatus: 'pending' }
    }).exec();

    set({
      products: prodsDoc.map((d: any) => d.toJSON() as Product),
      customers: custsDoc.map((d: any) => d.toJSON() as Customer),
      invoices: [], // Kept empty globally to avoid huge in-memory arrays; paginatedInvoices is used instead!
      invoiceCount: invoicesCountDoc.length,
      pendingSyncCount: pendingDoc.length
    });
  },

  addToCart: (product) => {
    const { cart, addToast } = get();
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      const targetQty = existing.quantity + 1;
      if (targetQty > product.stock.quantity) {
        addToast(`Cannot add more. Only ${product.stock.quantity} units available in stock. (স্টক এ শুধুমাত্র ${product.stock.quantity} টি পণ্য আছে।)`, 'error');
        return;
      }
      get().updateQuantity(product._id, targetQty);
    } else {
      if (product.stock.quantity < 1) {
        addToast(`Out of stock! ${product.name} cannot be added. (স্টক এ নেই!)`, 'error');
        return;
      }
      set({ cart: [...cart, { ...product, quantity: 1 }] });
      addToast(`Added ${product.name} to cart`, 'info');
    }
  },

  removeFromCart: (productId) => {
    const { cart, addToast } = get();
    const item = cart.find(i => i._id === productId);
    set({ cart: cart.filter(item => item._id !== productId) });
    if (item) {
      addToast(`Removed ${item.name} from cart`, 'info');
    }
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    const { cart, addToast } = get();
    const item = cart.find(i => i._id === productId);
    if (!item) return;

    if (quantity > item.stock.quantity) {
      addToast(`Cannot exceed available stock of ${item.stock.quantity} units. (স্টক এ শুধুমাত্র ${item.stock.quantity} টি পণ্য আছে।)`, 'error');
      quantity = item.stock.quantity;
    }

    set({
      cart: cart.map(item =>
        item._id === productId ? { ...item, quantity } : item
      )
    });
  },

  setSelectedCustomer: (selectedCustomer) => set({ selectedCustomer }),

  setPaymentStatus: (paymentStatus) => set({ paymentStatus }),

  calculateTotals: (method) => {
    const { cart, selectedCustomer } = get();
    let taxableAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    const items: InvoiceItem[] = cart.map(item => {
      const quantity = item.quantity;
      const unitPrice = parseFloat(item.price.sellingPrice);
      const itemTaxable = unitPrice * quantity;
      
      let itemCGST = 0;
      let itemSGST = 0;
      let itemIGST = 0;

      const isInterstate = selectedCustomer && selectedCustomer.stateCode !== MERCHANT_STATE_CODE;
      const taxRate = item.gstRate;

      if (isInterstate) {
        itemIGST = itemTaxable * (taxRate / 100);
        totalIGST += itemIGST;
      } else {
        itemCGST = itemTaxable * ((taxRate / 2) / 100);
        itemSGST = itemTaxable * ((taxRate / 2) / 100);
        totalCGST += itemCGST;
        totalSGST += itemSGST;
      }

      taxableAmount += itemTaxable;

      return {
        productId: item._id,
        name: item.name,
        hsnCode: item.hsnCode,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        taxableValue: itemTaxable.toFixed(2),
        gstRate: taxRate,
        cgst: itemCGST.toFixed(2),
        sgst: itemSGST.toFixed(2),
        igst: itemIGST.toFixed(2)
      };
    });

    let grandTotal = taxableAmount + totalCGST + totalSGST + totalIGST;
    if (method === 'Cash' || method === 'Credit') {
      // Round to nearest integer to avoid fractional payments for Cash/Credit
      grandTotal = Math.round(grandTotal);
    }

    return {
      items,
      totals: {
        taxableAmount: taxableAmount.toFixed(2),
        totalCGST: totalCGST.toFixed(2),
        totalSGST: totalSGST.toFixed(2),
        totalIGST: totalIGST.toFixed(2),
        grandTotal: grandTotal.toFixed(2)
      }
    };
  },

  checkout: async (method) => {
    const { db, cart, selectedCustomer, calculateTotals, addToast } = get();
    if (!db) throw new Error('Database not initialized');
    if (cart.length === 0) throw new Error('Cart is empty!');

    const invoiceId = uuidv4();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const { items, totals } = calculateTotals(method);

    const invoiceDoc: Invoice = {
      _id: invoiceId,
      invoiceNumber,
      date: new Date().toISOString(),
      customerId: selectedCustomer ? selectedCustomer._id : '',
      customerName: selectedCustomer ? selectedCustomer.name : 'Cash Customer',
      customerGSTIN: selectedCustomer ? selectedCustomer.gstin || '' : '',
      billingStateCode: selectedCustomer ? selectedCustomer.stateCode : MERCHANT_STATE_CODE,
      items,
      totals,
      paymentStatus: method === 'Credit' ? 'Unpaid' : 'Paid',
      syncStatus: 'pending'
    };

    // 1. Write invoice to local RxDB
    await db.invoices.insert(invoiceDoc);

    // 2. Adjust local product stock count
    for (const item of cart) {
      const prodDoc = await db.products.findOne({ selector: { _id: item._id } }).exec();
      if (prodDoc) {
        const currentStock = prodDoc.stock.quantity;
        await prodDoc.patch({
          stock: {
            ...prodDoc.stock,
            quantity: Math.max(0, currentStock - item.quantity)
          }
        });
      }
    }

    // 3. Trigger receipt printing via Electron contextBridge
    const win = window as any;
    if (win.electronAPI) {
      try {
        await win.electronAPI.printReceipt(invoiceDoc);
      } catch (e) {
        console.error("Local printer failed:", e);
        addToast("Local printing failed or was cancelled.", "error");
      }
    }

    // Clear state
    set({ cart: [], selectedCustomer: null });

    addToast(`Invoice ${invoiceNumber} created and printed!`, 'success');

    // Sync
    triggerSync(db);

    // Trigger immediate stock alert checks for the purchased items
    const cartProductIds = cart.map(item => item._id);
    get().checkImmediateLowStockAlert(cartProductIds);

    return invoiceDoc;
  },

  loadMockData: async () => {
    const { db, addToast } = get();
    if (!db) return;

    const mockProducts = [
      { _id: 'prod1', name: 'Paracetamol 650mg', sku: 'PARA650', hsnCode: '3004', gstRate: 12, price: { purchasePrice: '1.20', mrp: '2.00', sellingPrice: '1.80' }, stock: { quantity: 150, lowStockAlert: 10 }, updatedAt: new Date().toISOString() },
      { _id: 'prod2', name: 'Amoxicillin Capsule', sku: 'AMOX500', hsnCode: '3004', gstRate: 12, price: { purchasePrice: '3.40', mrp: '5.50', sellingPrice: '4.90' }, stock: { quantity: 80, lowStockAlert: 15 }, updatedAt: new Date().toISOString() },
      { _id: 'prod3', name: 'N95 Face Mask', sku: 'MASKN95', hsnCode: '6307', gstRate: 5, price: { purchasePrice: '12.00', mrp: '25.00', sellingPrice: '20.00' }, stock: { quantity: 400, lowStockAlert: 50 }, updatedAt: new Date().toISOString() }
    ];
    for (const prod of mockProducts) {
      await db.products.upsert(prod as Product);
    }

    const mockCustomers = [
      { _id: 'cust1', name: 'Sen Distributors', gstin: '19AABCU9603R1ZM', stateCode: '19', phone: '9876543210', balance: '0.00', updatedAt: new Date().toISOString() },
      { _id: 'cust2', name: 'Roy Medical Hall', gstin: '10AAACU1234R1ZP', stateCode: '10', phone: '9876543211', balance: '0.00', updatedAt: new Date().toISOString() }
    ];
    for (const cust of mockCustomers) {
      await db.customers.upsert(cust as Customer);
    }

    addToast('Mock catalog data loaded!', 'success');
  },

  addToast: (message, type) => {
    const id = uuidv4();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  fetchProductsPage: async (page, limit, search) => {
    const { db } = get();
    if (!db) return;

    const query: any = {};
    if (search.trim()) {
      query.$or = [
        { name: { $regex: '.*' + search + '.*', $options: 'i' } },
        { sku: { $regex: '.*' + search + '.*', $options: 'i' } }
      ];
    }

    const allMatching = await db.products.find({ selector: query }).exec();
    const prodsDoc = await db.products.find({
      selector: query,
      sort: [{ name: 'asc' }],
      skip: (page - 1) * limit,
      limit: limit
    }).exec();

    set({
      paginatedProducts: prodsDoc.map((d: any) => d.toJSON() as Product),
      productsTotalCount: allMatching.length
    });
  },

  fetchInvoicesPage: async (page, limit, search) => {
    const { db } = get();
    if (!db) return;

    const query: any = {};
    if (search.trim()) {
      query.$or = [
        { invoiceNumber: { $regex: '.*' + search + '.*', $options: 'i' } },
        { customerName: { $regex: '.*' + search + '.*', $options: 'i' } }
      ];
    }

    const allMatching = await db.invoices.find({ selector: query }).exec();
    const invoicesDoc = await db.invoices.find({
      selector: query,
      sort: [{ date: 'desc' }],
      skip: (page - 1) * limit,
      limit: limit
    }).exec();

    set({
      paginatedInvoices: invoicesDoc.map((d: any) => d.toJSON() as Invoice),
      invoicesTotalCount: allMatching.length
    });
  },

  setLowStockModal: (isOpen, title, products) => {
    set({ lowStockModal: { isOpen, title, products } });
  },

  checkDailyLowStockAlerts: async () => {
    const { db, setLowStockModal } = get();
    if (!db) return;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 10) {
      const lastAlertDate = localStorage.getItem('easyacc_last_daily_alert_date') || '';
      if (lastAlertDate === today) {
        return;
      }

      const allProductsDocs = await db.products.find().exec();
      const lowStockProducts = allProductsDocs
        .map((doc: any) => doc.toJSON() as Product)
        .filter(p => p.stock.quantity < 10)
        .map(p => ({
          name: p.name,
          sku: p.sku,
          quantity: p.stock.quantity
        }));

      if (lowStockProducts.length > 0) {
        setLowStockModal(true, 'Daily Low Stock Report (দৈনিক কম স্টক রিপোর্ট)', lowStockProducts);
        localStorage.setItem('easyacc_last_daily_alert_date', today);
      }
    } else {
      const targetTime = new Date();
      targetTime.setHours(10, 0, 0, 0);
      const delayMs = targetTime.getTime() - now.getTime();

      setTimeout(() => {
        get().checkDailyLowStockAlerts();
      }, delayMs);
    }
  },

  checkImmediateLowStockAlert: async (productIdsToCheck) => {
    const { db, setLowStockModal } = get();
    if (!db || productIdsToCheck.length === 0) return;

    let immediateAlertedIds: string[] = [];
    try {
      const stored = localStorage.getItem('easyacc_immediate_alerted_ids');
      if (stored) {
        immediateAlertedIds = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing easyacc_immediate_alerted_ids:', e);
    }

    const newlyLowStock: { name: string; sku: string; quantity: number }[] = [];

    for (const id of productIdsToCheck) {
      const prodDoc = await db.products.findOne({ selector: { _id: id } }).exec();
      if (prodDoc) {
        const prodObj = prodDoc.toJSON() as Product;
        const currentQty = prodObj.stock.quantity;

        if (currentQty < 10) {
          if (!immediateAlertedIds.includes(id)) {
            newlyLowStock.push({
              name: prodObj.name,
              sku: prodObj.sku,
              quantity: currentQty
            });
            immediateAlertedIds.push(id);
          }
        } else {
          immediateAlertedIds = immediateAlertedIds.filter(item => item !== id);
        }
      }
    }

    localStorage.setItem('easyacc_immediate_alerted_ids', JSON.stringify(immediateAlertedIds));

    if (newlyLowStock.length > 0) {
      setLowStockModal(true, 'Immediate Low Stock Warning (তাৎক্ষণিক স্টক অ্যালার্ট)', newlyLowStock);
    }
  }
}));
