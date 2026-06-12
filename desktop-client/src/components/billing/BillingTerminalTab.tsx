import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ShoppingCart, Trash2, User, Landmark, Printer, Camera, Database
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Product, Invoice } from '../../types';
import { MERCHANT_STATE_CODE } from './constants';
import { handleReprint } from './printUtils';
import { CameraScannerModal } from './modals/CameraScannerModal';
import { QuickAddProductModal } from './modals/QuickAddProductModal';
import { UpiPaymentModal } from './modals/UpiPaymentModal';
import { CheckoutSuccessModal } from './modals/CheckoutSuccessModal';

export const BillingTerminalTab: React.FC = () => {
  const {
    db,
    products,
    customers,
    cart,
    selectedCustomer,
    setSelectedCustomer,
    setPaymentStatus,
    addToCart,
    removeFromCart,
    updateQuantity,
    calculateTotals,
    checkout,
    loadMockData,
    addToast
  } = useStore();

  const [productSearch, setProductSearch] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Modal / scanner states
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [quickAddSku, setQuickAddSku] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  // Checkout states
  const [checkoutMethod, setCheckoutMethod] = useState<'Cash' | 'UPI' | 'Credit'>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isCashTenderedEdited, setIsCashTenderedEdited] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState<boolean>(false);

  // Global barcode scanning listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT'
      );
      
      if (isInputActive) {
        return;
      }

      const currentTime = Date.now();
      
      if (e.key === 'Enter') {
        if (buffer.length > 1) {
          const match = products.find(p => p.sku.toLowerCase() === buffer.toLowerCase());
          if (match) {
            addToCart(match);
            addToast(`Scanned Barcode: ${match.name} (${match.sku})`, 'success');
            e.preventDefault();
            e.stopPropagation();
          } else {
            setQuickAddSku(buffer);
            e.preventDefault();
            e.stopPropagation();
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        if (activeEl !== barcodeInputRef.current && (currentTime - lastKeyTime > 50)) {
          buffer = '';
        }
        buffer += e.key;
        lastKeyTime = currentTime;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [products, addToCart, addToast]);

  const focusBarcodeInput = () => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // Keep focus in barcode search
  useEffect(() => {
    if (!showCameraScanner && !quickAddSku) {
      focusBarcodeInput();
    }
  }, [showCameraScanner, quickAddSku]);

  // Handle searches
  const handleProductSearchSelect = (e: React.FormEvent) => {
    e.preventDefault();
    
    // First try exact match
    const exactMatch = products.find(p => 
      p.sku.toLowerCase() === productSearch.toLowerCase() ||
      p.name.toLowerCase() === productSearch.toLowerCase()
    );
    
    if (exactMatch) {
      addToCart(exactMatch);
      setProductSearch('');
      return;
    }
    
    // Fallback: If there are partial matches, add the first matching product
    const partialMatches = products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.hsnCode.includes(productSearch)
    );
    
    if (partialMatches.length > 0) {
      addToCart(partialMatches[0]);
      setProductSearch('');
    } else {
      if (productSearch.trim()) {
        setQuickAddSku(productSearch.trim());
        setProductSearch('');
      } else {
        addToast(`Product search input is empty`, 'error');
      }
    }
  };

  const { items, totals } = calculateTotals(checkoutMethod);

  // Cash Tendered Auto-update Effect
  useEffect(() => {
    if (!isCashTenderedEdited) {
      setCashTendered(parseFloat(totals.grandTotal) > 0 ? totals.grandTotal : '');
    }
  }, [totals.grandTotal, isCashTenderedEdited]);

  const finalizeCheckout = async () => {
    try {
      const invoice = await checkout(checkoutMethod);
      setCreatedInvoice(invoice);
      setCashTendered('');
      setIsCashTenderedEdited(false);
    } catch (err: any) {
      addToast(err.message || 'Checkout failed', 'error');
    }
  };

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      addToast('Cart is empty!', 'error');
      return;
    }

    if (checkoutMethod === 'Cash') {
      const grandTotal = Number(totals.grandTotal);
      const tendered = Number(cashTendered) || 0;
      if (tendered < grandTotal) {
        addToast(`Insufficient cash. Cash tendered (₹${tendered}) is less than total amount (₹${grandTotal})`, 'error');
        return;
      }
      await finalizeCheckout();
    } else if (checkoutMethod === 'UPI') {
      setShowUpiModal(true);
    } else {
      await finalizeCheckout();
    }
  };

  const handleLoadMock = async () => {
    try {
      await loadMockData();
    } catch (err: any) {
      addToast('Failed to load mock data: ' + err.message, 'error');
    }
  };

  const searchResults = productSearch.trim() ? products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.hsnCode.includes(productSearch)
  ) : [];

  return (
    <div className="space-y-6">
      {/* Search Bar / Camera Scanner Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <form onSubmit={handleProductSearchSelect} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              ref={barcodeInputRef}
              placeholder="Search by SKU, item name, or scan barcode directly..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 px-10 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 transition"
            />
            
            {/* Search suggestions dropdown */}
            {productSearch.trim().length > 0 && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-850">
                {searchResults.map(p => (
                  <div 
                    key={p._id}
                    onClick={() => {
                      addToCart(p);
                      setProductSearch('');
                    }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/60 cursor-pointer transition"
                  >
                    <div>
                      <span className="font-semibold text-xs text-white block">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">SKU: {p.sku} | HSN: {p.hsnCode}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-indigo-400 block">₹{parseFloat(p.price.sellingPrice).toFixed(2)}</span>
                      <span className={`text-[10px] ${p.stock.quantity <= p.stock.lowStockAlert ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                        Stock: {p.stock.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={() => setShowCameraScanner(true)}
            title="Scan Barcode with Camera"
            className="px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg transition-all flex items-center justify-center text-white"
          >
            <Camera size={18} />
          </button>
          
          <button 
            type="submit"
            className="px-5 bg-slate-800 hover:bg-slate-700 text-sm font-bold text-white rounded-lg active:scale-95 transition"
          >
            Add Item
          </button>
        </form>
      </div>

      {/* Main Terminal Screen Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Cart items */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShoppingCart size={18} className="text-indigo-500" />
              Checkout Cart ({cart.length} unique items)
            </h3>

            {cart.length === 0 ? (
              <div className="space-y-6">
                <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/40">
                  <div className="w-12 h-12 bg-slate-850 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-400">Cart is currently empty</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Scan barcodes or use the search bar above.</p>
                </div>

                {products.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Quick Select Products
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {products.slice(0, 6).map(p => (
                        <button
                          key={p._id}
                          onClick={() => addToCart(p)}
                          className="p-3 bg-slate-950 border border-slate-850 hover:border-indigo-500/50 hover:bg-slate-900 rounded-lg text-left transition-all active:scale-[0.98] group flex flex-col justify-between h-24"
                        >
                          <div>
                            <span className="font-bold text-xs text-white block truncate group-hover:text-indigo-400 transition-colors">{p.name}</span>
                            <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">SKU: {p.sku}</span>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-xs font-extrabold text-white">₹{parseFloat(p.price.sellingPrice).toFixed(2)}</span>
                            <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                              Stock: {p.stock.quantity}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {cart.map(item => (
                  <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
                    <div>
                      <h4 className="font-bold text-white text-sm">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-400">SKU: {item.sku}</span>
                        <span className="text-[10px] text-slate-500">HSN: {item.hsnCode} ({item.gstRate}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
                        <button 
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850 rounded transition"
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-bold text-white text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850 rounded transition"
                        >
                          +
                        </button>
                      </div>

                      {/* Item Price details */}
                      <div className="text-right min-w-[80px]">
                        <span className="text-xs text-slate-500 block">₹{parseFloat(item.price.sellingPrice).toFixed(2)} ea</span>
                        <span className="text-sm font-bold text-white">₹{(parseFloat(item.price.sellingPrice) * item.quantity).toFixed(2)}</span>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item._id)}
                        className="text-slate-500 hover:text-rose-500 transition p-1"
                        title="Delete Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tax Breakdown Summary Box */}
          {cart.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                CGST / SGST / IGST Tax Splits
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-slate-500 block mb-0.5">Taxable Value:</span>
                  <strong className="text-white">₹{totals.taxableAmount}</strong>
                </div>
                
                {parseFloat(totals.totalIGST) > 0 ? (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 col-span-2">
                    <span className="text-indigo-400 block mb-0.5 font-bold">Interstate IGST Total:</span>
                    <strong className="text-white">₹{totals.totalIGST}</strong>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                      <span className="text-slate-500 block mb-0.5">CGST Total:</span>
                      <strong className="text-white">₹{totals.totalCGST}</strong>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                      <span className="text-slate-500 block mb-0.5">SGST Total:</span>
                      <strong className="text-white">₹{totals.totalSGST}</strong>
                    </div>
                  </>
                )}
                
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-slate-500 block mb-0.5">Grand Invoice Total:</span>
                  <strong className="text-white text-sm">₹{totals.grandTotal}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Customer & Checkout Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Customer Select Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <User size={18} className="text-indigo-500" />
              Customer Details
            </h3>

            <div className="input-group">
              <select 
                value={selectedCustomer ? selectedCustomer._id : ''}
                onChange={(e) => {
                  const cust = customers.find(c => c._id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              >
                <option value="">-- Cash Customer (No GSTIN) --</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.gstin ? `(${c.gstin})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="text-xs space-y-1.5 p-3 bg-slate-950 border border-slate-850 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-white font-semibold">{selectedCustomer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">State Code:</span>
                  <span className="text-white font-semibold">
                    {selectedCustomer.stateCode} {selectedCustomer.stateCode === MERCHANT_STATE_CODE ? '(Intrastate)' : '(Interstate)'}
                  </span>
                </div>
                {selectedCustomer.gstin && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">GSTIN:</span>
                    <span className="text-indigo-400 font-mono font-bold">{selectedCustomer.gstin}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-900 mt-1 font-semibold">
                  <span className="text-slate-500">Outstanding:</span>
                  <span className={parseFloat(selectedCustomer.balance || '0') > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                    ₹{parseFloat(selectedCustomer.balance || '0').toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Checkout controls */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Landmark size={18} className="text-indigo-500" />
              Payment Details
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              <button 
                type="button"
                onClick={() => {
                  setCheckoutMethod('Cash');
                  setPaymentStatus('Paid');
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all border ${
                  checkoutMethod === 'Cash' 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                Cash
              </button>
              <button 
                type="button"
                onClick={() => {
                  setCheckoutMethod('UPI');
                  setPaymentStatus('Paid');
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all border ${
                  checkoutMethod === 'UPI' 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                UPI
              </button>
              <button 
                type="button"
                onClick={() => {
                  setCheckoutMethod('Credit');
                  setPaymentStatus('Unpaid');
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all border ${
                  checkoutMethod === 'Credit' 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                Credit
              </button>
            </div>

            {/* Cash Details helper */}
            {checkoutMethod === 'Cash' && (
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-3">
                <div className="input-group">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Cash Tendered (₹)</label>
                  <input 
                    type="number"
                    placeholder="Enter cash received..."
                    value={cashTendered}
                    onChange={(e) => {
                      setCashTendered(e.target.value);
                      setIsCashTenderedEdited(true);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-sm text-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Denominations */}
                <div className="flex flex-wrap gap-1.5">
                  <button 
                    type="button"
                    onClick={() => setCashTendered(totals.grandTotal)}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-bold rounded"
                  >
                    Exact (₹{totals.grandTotal})
                  </button>
                  
                  {(() => {
                    const total = Number(totals.grandTotal);
                    const helpers: number[] = [];
                    const next50 = Math.ceil(total / 50) * 50;
                    if (next50 > total && next50 !== Math.round(total)) helpers.push(next50);
                    const next100 = Math.ceil(total / 100) * 100;
                    if (next100 > total && next100 !== next50) helpers.push(next100);
                    
                    [200, 500, 2000].forEach(val => {
                      if (val > total && !helpers.includes(val) && val !== next50 && val !== next100) {
                        helpers.push(val);
                      }
                    });
                    
                    return helpers.map(val => (
                      <button 
                        key={val}
                        type="button"
                        onClick={() => {
                          setCashTendered(val.toString());
                          setIsCashTenderedEdited(true);
                        }}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-bold rounded"
                      >
                        ₹{val}
                      </button>
                    ));
                  })()}
                </div>

                {/* Change due */}
                {Number(cashTendered) >= Number(totals.grandTotal) && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-500 pt-1.5 border-t border-slate-900">
                    <span>Change Due:</span>
                    <span className="text-sm">₹{(Number(cashTendered) - Number(totals.grandTotal)).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* UPI Info Box */}
            {checkoutMethod === 'UPI' && (
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                  <Landmark size={14} />
                  UPI Scan & Pay Enabled
                </div>
                <p>Generates an offline-compatible QR code popup window on checkout.</p>
              </div>
            )}

            <button 
              onClick={handleCheckoutSubmit}
              disabled={(checkoutMethod === 'Cash' && Number(cashTendered) < Number(totals.grandTotal)) || cart.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 active:scale-98"
            >
              <Printer size={18} />
              Finalize & Print Bill
            </button>
          </div>

        </div>

      </div>

      {/* MODALS */}
      <CameraScannerModal 
        isOpen={showCameraScanner} 
        onClose={() => setShowCameraScanner(false)} 
        products={products}
        addToCart={addToCart}
        addToast={addToast}
        setQuickAddSku={setQuickAddSku}
      />

      <QuickAddProductModal 
        quickAddSku={quickAddSku} 
        onClose={() => setQuickAddSku(null)} 
        db={db}
        addToCart={addToCart}
        addToast={addToast}
      />

      <UpiPaymentModal 
        isOpen={showUpiModal} 
        onClose={() => setShowUpiModal(false)} 
        grandTotal={totals.grandTotal}
        finalizeCheckout={finalizeCheckout}
        addToast={addToast}
      />

      <CheckoutSuccessModal 
        createdInvoice={createdInvoice} 
        onClose={() => {
          setCreatedInvoice(null);
          setCashTendered('');
          setIsCashTenderedEdited(false);
        }}
        handleReprint={(inv) => handleReprint(inv, addToast)}
      />
    </div>
  );
};
