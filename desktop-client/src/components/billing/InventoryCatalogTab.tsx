import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash, Package, ArrowLeft, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Product } from '../../types';
import { HSN_PRESETS } from './constants';

export const InventoryCatalogTab: React.FC = () => {
  const { db, paginatedProducts, productsTotalCount, fetchProductsPage, addToast } = useStore();

  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pHsn, setPHsn] = useState('');
  const [pGstRate, setPGstRate] = useState(12);
  const [pPurchasePrice, setPPurchasePrice] = useState('');
  const [pMrp, setPMrp] = useState('');
  const [pSellingPrice, setPSellingPrice] = useState('');
  const [pStockQty, setPStockQty] = useState('');
  const [pLowStockAlert, setPLowStockAlert] = useState('10');
  const [inventorySearch, setInventorySearch] = useState('');

  // Page fetch effect
  useEffect(() => {
    if (db) {
      fetchProductsPage(currentPage, limit, inventorySearch);
    }
  }, [db, currentPage, inventorySearch, fetchProductsPage]);

  // Reset page to 1 on search text change
  useEffect(() => {
    setCurrentPage(1);
  }, [inventorySearch]);

  const totalPages = Math.ceil(productsTotalCount / limit) || 1;

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (!pName || !pSku || !pHsn || !pPurchasePrice || !pSellingPrice || !pStockQty) {
      addToast('Please fill out all required fields.', 'error');
      return;
    }

    try {
      if (editingProduct) {
        const prodDoc = await db.products.findOne({ selector: { _id: editingProduct._id } }).exec();
        if (prodDoc) {
          await prodDoc.patch({
            name: pName,
            sku: pSku,
            hsnCode: pHsn,
            gstRate: Number(pGstRate),
            price: {
              purchasePrice: pPurchasePrice,
              mrp: pMrp || pSellingPrice,
              sellingPrice: pSellingPrice
            },
            stock: {
              quantity: Number(pStockQty),
              lowStockAlert: Number(pLowStockAlert) || 5
            },
            updatedAt: new Date().toISOString()
          });
          addToast('Product details updated successfully!', 'success');
          setEditingProduct(null);
        }
      } else {
        const existSku = await db.products.findOne({ selector: { sku: pSku } }).exec();
        if (existSku) {
          addToast('SKU barcode already exists in catalog!', 'error');
          return;
        }

        const newProd: Product = {
          _id: `prod_${Date.now()}`,
          name: pName,
          sku: pSku,
          hsnCode: pHsn,
          gstRate: Number(pGstRate),
          price: {
            purchasePrice: pPurchasePrice,
            mrp: pMrp || pSellingPrice,
            sellingPrice: pSellingPrice
          },
          stock: {
            quantity: Number(pStockQty),
            lowStockAlert: Number(pLowStockAlert) || 5
          },
          updatedAt: new Date().toISOString()
        };

        await db.products.insert(newProd);
        addToast('New Product added to catalog!', 'success');
      }

      setPName('');
      setPSku('');
      setPHsn('');
      setPGstRate(12);
      setPPurchasePrice('');
      setPMrp('');
      setPSellingPrice('');
      setPStockQty('');
      setPLowStockAlert('10');

      // Refresh list
      fetchProductsPage(currentPage, limit, inventorySearch);
    } catch (err: any) {
      addToast('Inventory Save Error: ' + err.message, 'error');
    }
  };

  const handleEditProductClick = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPSku(prod.sku);
    setPHsn(prod.hsnCode);
    setPGstRate(prod.gstRate);
    setPPurchasePrice(prod.price.purchasePrice);
    setPMrp(prod.price.mrp || '');
    setPSellingPrice(prod.price.sellingPrice);
    setPStockQty(prod.stock.quantity.toString());
    setPLowStockAlert(prod.stock.lowStockAlert.toString());
  };

  const handleDeleteProductClick = async (id: string) => {
    if (!window.confirm('Delete this product from catalog?')) return;
    try {
      const doc = await db?.products.findOne({ selector: { _id: id } }).exec();
      if (doc) {
        await doc.remove();
        addToast('Product deleted from inventory', 'info');
        // Refresh page (go to previous page if page becomes empty)
        const updatedTotal = productsTotalCount - 1;
        const maxPage = Math.ceil(updatedTotal / limit) || 1;
        if (currentPage > maxPage) {
          setCurrentPage(maxPage);
        } else {
          fetchProductsPage(currentPage, limit, inventorySearch);
        }
      }
    } catch (e: any) {
      addToast('Delete failed: ' + e.message, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Left Column: Add/Edit Form */}
      <div className="xl:col-span-1">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5 space-y-4">
          
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider pb-3 border-b border-slate-850">
            {editingProduct ? 'Edit Catalog Entry' : 'Create Catalog Product'}
          </h3>

          <form onSubmit={handleInventorySubmit} className="space-y-4">
            
            <div className="input-group">
              <label className="text-xs text-slate-400 font-semibold block mb-1">Item Name *</label>
              <input 
                type="text" 
                value={pName} 
                onChange={(e) => setPName(e.target.value)} 
                placeholder="e.g. Rice Bag, Headset" 
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                required 
              />
            </div>

            <div className="flex gap-3">
              <div className="input-group flex-1">
                <label className="text-xs text-slate-400 font-semibold block mb-1">SKU Barcode *</label>
                <input 
                  type="text" 
                  value={pSku} 
                  onChange={(e) => setPSku(e.target.value)} 
                  placeholder="SKU" 
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white disabled:opacity-50"
                  required 
                  disabled={editingProduct !== null}
                />
              </div>
              
              <div className="input-group flex-1">
                <label className="text-xs text-slate-400 font-semibold block mb-1">HSN Code *</label>
                <input 
                  type="text" 
                  value={pHsn} 
                  onChange={(e) => setPHsn(e.target.value)} 
                  placeholder="HSN" 
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                  required 
                />
                {/* HSN presets dropdown */}
                <select 
                  className="w-full bg-slate-950 border border-slate-800 px-2 py-1 mt-1 rounded text-[11px] text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onChange={(e) => {
                    const selected = HSN_PRESETS.find(item => item.code === e.target.value);
                    if (selected) {
                      setPHsn(selected.code);
                      setPGstRate(selected.gst);
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
              <label className="text-xs text-slate-400 font-semibold block mb-1">GST Tax Rate (%) *</label>
              <select 
                value={pGstRate} 
                onChange={(e) => setPGstRate(Number(e.target.value))} 
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              >
                <option value={0}>0% (Tax Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>

            <div className="flex gap-3">
              <div className="input-group flex-1">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Purchase Price (₹) *</label>
                <input 
                  type="number" 
                  value={pPurchasePrice} 
                  onChange={(e) => setPPurchasePrice(e.target.value)} 
                  placeholder="Cost" 
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                  required 
                />
              </div>
              <div className="input-group flex-1">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Selling Price (₹) *</label>
                <input 
                  type="number" 
                  value={pSellingPrice} 
                  onChange={(e) => setPSellingPrice(e.target.value)} 
                  placeholder="Sell Price" 
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                  required 
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="input-group flex-1">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Stock Quantity *</label>
                <input 
                  type="number" 
                  value={pStockQty} 
                  onChange={(e) => setPStockQty(e.target.value)} 
                  placeholder="Qty" 
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                  required 
                />
              </div>
              <div className="input-group flex-1">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Low Stock Warning *</label>
                <input 
                  type="number" 
                  value={pLowStockAlert} 
                  onChange={(e) => setPLowStockAlert(e.target.value)} 
                  placeholder="Alert Threshold" 
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                  required 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              {editingProduct && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingProduct(null);
                    setPName('');
                    setPSku('');
                    setPHsn('');
                    setPGstRate(12);
                    setPPurchasePrice('');
                    setPMrp('');
                    setPSellingPrice('');
                    setPStockQty('');
                    setPLowStockAlert('10');
                  }}
                  className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs active:scale-95 transition"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit" 
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs active:scale-95 transition"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Right Column: Listing Table */}
      <div className="xl:col-span-2">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5 space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-850 gap-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Catalog Inventory</h3>
            
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder="Search Catalog by SKU, Name, or HSN Code..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full border border-slate-800 rounded-lg bg-slate-950">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                <tr>
                  <th className="px-4 py-3">SKU Barcode</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">HSN</th>
                  <th className="px-4 py-3">GST Rate</th>
                  <th className="px-4 py-3">Purchase</th>
                  <th className="px-4 py-3">Selling</th>
                  <th className="px-4 py-3 text-center">Qty / Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {paginatedProducts.map(p => (
                  <tr key={p._id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-400">{p.sku}</td>
                    <td className="px-4 py-3 font-bold text-white">{p.name}</td>
                    <td className="px-4 py-3">{p.hsnCode}</td>
                    <td className="px-4 py-3">{p.gstRate}%</td>
                    <td className="px-4 py-3">₹{parseFloat(p.price.purchasePrice).toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold text-white">₹{parseFloat(p.price.sellingPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.stock.quantity <= p.stock.lowStockAlert 
                          ? 'bg-rose-500/10 text-rose-500 font-bold' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {p.stock.quantity} (Alert: {p.stock.lowStockAlert})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button 
                        onClick={() => handleEditProductClick(p)}
                        className="p-1.5 bg-slate-850 hover:bg-slate-750 text-slate-300 rounded"
                        title="Edit Product"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProductClick(p._id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 rounded"
                        title="Delete Product"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-slate-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {productsTotalCount > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-850 text-xs text-slate-400">
              <div>
                Showing <span className="text-white font-semibold">{paginatedProducts.length}</span> of{' '}
                <span className="text-white font-semibold">{productsTotalCount}</span> products
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white flex items-center gap-1 transition"
                >
                  <ArrowLeft size={14} /> Prev
                </button>
                <span className="font-semibold text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white flex items-center gap-1 transition"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
