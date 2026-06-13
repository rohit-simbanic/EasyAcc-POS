import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Info, Database
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Sidebar } from './billing/Sidebar';
import { BillingTerminalTab } from './billing/BillingTerminalTab';
import { InvoicesArchiveTab } from './billing/InvoicesArchiveTab';
import { InventoryCatalogTab } from './billing/InventoryCatalogTab';
import { CreditBookTab } from './billing/CreditBookTab';
import { Gstr1TaxTab } from './billing/Gstr1TaxTab';
import LowStockAlertModal from './billing/modals/LowStockAlertModal';
import { PwaInstallBanner } from './billing/modals/PwaInstallBanner';

export default function Billing() {
  const {
    db,
    online,
    products,
    invoiceCount,
    pendingSyncCount,
    toasts,
    fetchCatalog,
    loadMockData,
    addToast
  } = useStore();

  // Navigation tabs: 'billing' | 'history' | 'inventory' | 'khata' | 'gstr1'
  const [activeTab, setActiveTab] = useState<'billing' | 'history' | 'inventory' | 'khata' | 'gstr1'>('billing');

  // Auto-subscribe to RxDB updates
  useEffect(() => {
    if (!db) return;

    fetchCatalog();

    const productSub = db.products.$.subscribe(() => fetchCatalog());
    const customerSub = db.customers.$.subscribe(() => fetchCatalog());
    const invoiceSub = db.invoices.$.subscribe(() => fetchCatalog());

    return () => {
      productSub.unsubscribe();
      customerSub.unsubscribe();
      invoiceSub.unsubscribe();
    };
  }, [db, fetchCatalog]);

  const handleLoadMock = async () => {
    try {
      await loadMockData();
    } catch (err: any) {
      addToast('Failed to load mock data: ' + err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* 1. LEFT NAVIGATION SIDEBAR / TOP BAR */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. MAIN APP CONTENT CONTAINER */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-7xl mx-auto">
        
        {/* Header toolbar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-slate-850 gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {activeTab === 'billing' && 'Sales Checkout Terminal'}
              {activeTab === 'history' && 'Invoices & Billing Archives'}
              {activeTab === 'inventory' && 'Stock Control & Product Catalog'}
              {activeTab === 'khata' && 'Credit Book Ledger (Khata Book)'}
              {activeTab === 'gstr1' && 'GSTR-1 Tax Return Compliance'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'billing' && 'Intercepts global barcode scan. Zero downtime IndexedDB transaction engine active.'}
              {activeTab === 'history' && 'Browse, search, reprint, or check cloud synchronization status of past sales bills.'}
              {activeTab === 'inventory' && 'Manage catalog items, HSN codes, cost margins, standard prices, and low stock warnings.'}
              {activeTab === 'khata' && 'Track outstanding balance ledgers for credit buyers and trigger SMS notification alerts.'}
              {activeTab === 'gstr1' && 'Generate and download standard government compliant GSTR-1 JSON schema files.'}
            </p>
          </div>
          
          {/* Quick Mock Data Loader Button */}
          {products.length === 0 && (
            <button 
              onClick={handleLoadMock}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow"
            >
              <Database size={14} />
              Load Mock Inventory
            </button>
          )}
        </header>

        {/* Dynamic Tab Render */}
        {activeTab === 'billing' && <BillingTerminalTab />}
        {activeTab === 'history' && <InvoicesArchiveTab />}
        {activeTab === 'inventory' && <InventoryCatalogTab />}
        {activeTab === 'khata' && <CreditBookTab />}
        {activeTab === 'gstr1' && <Gstr1TaxTab />}

      </main>

      {/* 3. FLOATING TOAST NOTIFICATIONS */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`toast-item ${
              toast.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' :
              toast.type === 'error' ? 'bg-rose-950 border-rose-500 text-rose-300' :
              'bg-slate-900 border-indigo-500 text-slate-300'
            } border-l-4 p-4 rounded-lg shadow-xl text-xs font-semibold max-w-sm flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto`}
          >
            {toast.type === 'success' && <CheckCircle size={18} className="text-emerald-500" />}
            {toast.type === 'error' && <AlertTriangle size={18} className="text-rose-500" />}
            {toast.type === 'info' && <Info size={18} className="text-indigo-500" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* 4. DEDICATED LOW STOCK WARNING MODAL OVERLAY */}
      <LowStockAlertModal />

      {/* 5. PWA INSTALLATION BANNER FOR BROWSER USER */}
      <PwaInstallBanner />

    </div>
  );
}
