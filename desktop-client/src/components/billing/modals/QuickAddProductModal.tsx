import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { Product } from '../../../types';
import { HSN_PRESETS } from '../constants';

interface QuickAddProductModalProps {
  quickAddSku: string | null;
  onClose: () => void;
  db: any;
  addToCart: (product: Product) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  quickAddSku,
  onClose,
  db,
  addToCart,
  addToast
}) => {
  const [qaName, setQaName] = useState('');
  const [qaHsn, setQaHsn] = useState('');
  const [qaGstRate, setQaGstRate] = useState(12);
  const [qaPurchasePrice, setQaPurchasePrice] = useState('');
  const [qaSellingPrice, setQaSellingPrice] = useState('');
  const [qaStockQty, setQaStockQty] = useState('100');

  if (!quickAddSku) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !quickAddSku) return;

    if (!qaName || !qaHsn || !qaPurchasePrice || !qaSellingPrice || !qaStockQty) {
      addToast('Please fill all fields for the new product.', 'error');
      return;
    }

    try {
      const newProduct: Product = {
        _id: `prod_${Date.now()}`,
        name: qaName,
        sku: quickAddSku,
        hsnCode: qaHsn,
        gstRate: Number(qaGstRate),
        price: {
          purchasePrice: qaPurchasePrice,
          mrp: qaSellingPrice,
          sellingPrice: qaSellingPrice
        },
        stock: {
          quantity: Number(qaStockQty),
          lowStockAlert: 5
        },
        updatedAt: new Date().toISOString()
      };

      await db.products.insert(newProduct);
      addToast(`Registered SKU "${quickAddSku}" as ${qaName}!`, 'success');
      
      // Add to cart automatically
      addToCart(newProduct);

      // Reset local states
      setQaName('');
      setQaHsn('');
      setQaGstRate(12);
      setQaPurchasePrice('');
      setQaSellingPrice('');
      setQaStockQty('100');

      onClose();
    } catch (err: any) {
      console.error(err);
      addToast('Quick Add Registration failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="success-modal-card" style={{ maxWidth: '450px', padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <Package size={22} className="text-primary" /> Unregistered Barcode Found
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Barcode <strong>"{quickAddSku}"</strong> is not registered. Register it below to automatically add it to this sale.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4 w-full text-left">
          <div className="input-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Product Name *</label>
            <input 
              type="text" 
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-white" 
              placeholder="e.g. Rice Brand A, Potato Chips"
              value={qaName}
              onChange={(e) => setQaName(e.target.value)}
              required 
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>SKU Barcode</label>
              <input type="text" value={quickAddSku} className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-500" disabled />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>HSN Code *</label>
              <input 
                type="text" 
                value={qaHsn} 
                onChange={(e) => setQaHsn(e.target.value)} 
                placeholder="HSN" 
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-white" 
                required 
              />
              <select 
                className="w-full bg-slate-950 border border-slate-800 px-2 py-1 mt-1 rounded text-[11px] text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onChange={(e) => {
                  const selected = HSN_PRESETS.find(item => item.code === e.target.value);
                  if (selected) {
                    setQaHsn(selected.code);
                    setQaGstRate(selected.gst);
                  }
                }}
                value=""
              >
                <option value="" disabled>-- Quick Select Category HSN --</option>
                {Array.from(new Set(HSN_PRESETS.map(item => item.category))).map(cat => (
                  <optgroup key={cat} label={cat}>
                    {HSN_PRESETS.filter(item => item.category === cat).map(item => (
                      <option key={item.code} value={item.code}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>GST Rate (%) *</label>
            <select 
              value={qaGstRate} 
              onChange={(e) => setQaGstRate(Number(e.target.value))} 
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-white"
            >
              <option value={0}>0% (Tax Exempt)</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cost Price (₹) *</label>
              <input 
                type="number" 
                placeholder="Purchase Cost"
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-white"
                value={qaPurchasePrice}
                onChange={(e) => setQaPurchasePrice(e.target.value)}
                required 
              />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Retail Price (₹) *</label>
              <input 
                type="number" 
                placeholder="Selling Price"
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-white"
                value={qaSellingPrice}
                onChange={(e) => setQaSellingPrice(e.target.value)}
                required 
              />
            </div>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Initial stock Quantity *</label>
            <input 
              type="number" 
              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-white"
              value={qaStockQty}
              onChange={(e) => setQaStockQty(e.target.value)}
              required 
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary bg-slate-800 hover:bg-slate-750 text-white font-bold py-2 px-4 rounded transition" 
              style={{ flex: 1 }} 
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-success bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition" style={{ flex: 1 }}>
              Save & Add to Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
