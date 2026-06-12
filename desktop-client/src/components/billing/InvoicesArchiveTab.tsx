import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, ClipboardList, RefreshCw, Eye, Printer, ArrowLeft, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Invoice } from '../../types';
import { handleReprint } from './printUtils';

export const InvoicesArchiveTab: React.FC = () => {
  const { db, paginatedInvoices, invoicesTotalCount, pendingSyncCount, fetchInvoicesPage, addToast } = useStore();
  const [historySearch, setHistorySearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const limit = 10;

  // Page fetch effect
  useEffect(() => {
    if (db) {
      fetchInvoicesPage(currentPage, limit, historySearch);
    }
  }, [db, currentPage, historySearch, fetchInvoicesPage]);

  // Reset page on search text change
  useEffect(() => {
    setCurrentPage(1);
  }, [historySearch]);

  // Fetch monthly revenue on mount / changes
  useEffect(() => {
    const fetchRevenue = async () => {
      if (!db) return;
      // Get invoices from the beginning of the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const docs = await db.invoices.find({
        selector: {
          date: { $gte: startOfMonth.toISOString() }
        }
      }).exec();

      const total = docs.reduce((sum, doc) => sum + parseFloat(doc.totals.grandTotal), 0);
      setTotalRevenue(total);
    };

    fetchRevenue();
  }, [db, invoicesTotalCount]);

  const totalPages = Math.ceil(invoicesTotalCount / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Archive Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <ShoppingBag size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold">Total Revenue (Month)</span>
            <strong className="text-lg text-white font-extrabold">
              ₹{totalRevenue.toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg">
            <ClipboardList size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold">Total Invoices</span>
            <strong className="text-lg text-white font-extrabold">{invoicesTotalCount} bills</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <RefreshCw size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold">Pending Cloud Sync</span>
            <strong className="text-lg text-white font-extrabold">{pendingSyncCount} invoices</strong>
          </div>
        </div>
      </div>

      {/* Split Screen Search & Receipt View */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: List Invoices */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-850 mb-4 gap-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Saved Transactions</h3>
              
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text"
                  placeholder="Search by Bill Number or Name..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full border border-slate-800 rounded-lg bg-slate-950">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                  <tr>
                    <th className="px-4 py-3">Bill Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Total Value</th>
                    <th className="px-4 py-3 text-center">Sync Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {paginatedInvoices.map(inv => (
                    <tr key={inv._id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{inv.customerName}</td>
                      <td className="px-4 py-3 font-bold text-white">₹{parseFloat(inv.totals.grandTotal).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.syncStatus === 'synced' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {inv.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleReprint(inv, addToast)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
                        >
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {invoicesTotalCount > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-850 text-xs text-slate-400">
                <div>
                  Showing <span className="text-white font-semibold">{paginatedInvoices.length}</span> of{' '}
                  <span className="text-white font-semibold">{invoicesTotalCount}</span> transactions
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

        {/* Right Column: Invoice Receipt display */}
        <div className="xl:col-span-1">
          {selectedInvoice ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5 sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Bill Viewport</h3>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-500 hover:text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>

              {/* Receipt paper view */}
              <div className="receipt-paper mx-auto border border-slate-300 shadow-lg">
                <div className="receipt-header">
                  <h2>EASYACC STORE</h2>
                  <p>12/A Park Street, Kolkata, West Bengal</p>
                  <p>GSTIN: 19AABCU9603R1ZM</p>
                </div>
                <div className="receipt-divider"></div>
                <div className="receipt-info-row">
                  <span>Bill: {selectedInvoice.invoiceNumber}</span>
                  <span>Date: {new Date(selectedInvoice.date).toLocaleDateString()}</span>
                </div>
                <div className="receipt-info-row">
                  <span>Customer: {selectedInvoice.customerName}</span>
                </div>
                <div className="receipt-divider"></div>
                
                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="right" style={{ width: '40px' }}>Qty</th>
                      <th className="right" style={{ width: '80px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map(item => (
                      <tr key={item.productId}>
                        <td>
                          {item.name}<br/>
                          <small style={{ fontSize: '0.68rem', color: '#6b7280' }}>HSN: {item.hsnCode} ({item.gstRate}%)</small>
                        </td>
                        <td className="right">{item.quantity}</td>
                        <td className="right">₹{parseFloat(item.taxableValue).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="receipt-divider"></div>
                <div className="receipt-totals-box">
                  <div className="receipt-total-row">
                    <span>Taxable Amt:</span>
                    <span>₹{parseFloat(selectedInvoice.totals.taxableAmount).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedInvoice.totals.totalIGST) > 0 ? (
                    <div className="receipt-total-row">
                      <span>IGST Total:</span>
                      <span>₹{parseFloat(selectedInvoice.totals.totalIGST).toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="receipt-total-row">
                        <span>CGST Total:</span>
                        <span>₹{parseFloat(selectedInvoice.totals.totalCGST).toFixed(2)}</span>
                      </div>
                      <div className="receipt-total-row">
                        <span>SGST Total:</span>
                        <span>₹{parseFloat(selectedInvoice.totals.totalSGST).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="receipt-total-row receipt-grand-row">
                    <span>Grand Total:</span>
                    <span>₹{parseFloat(selectedInvoice.totals.grandTotal).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="receipt-divider"></div>
                <div className="receipt-footer">
                  <p>Thank you for shopping with us!</p>
                </div>
              </div>

              <button 
                onClick={() => handleReprint(selectedInvoice, addToast)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Reprint Receipt
              </button>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-10 text-center text-slate-500 sticky top-6">
              <Eye size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold">Select an Invoice</p>
              <p className="text-xs text-slate-600 mt-1">Select any transaction row from the archive list to view its thermal receipt.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
