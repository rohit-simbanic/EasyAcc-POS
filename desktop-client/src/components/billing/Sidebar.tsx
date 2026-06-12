import React from 'react';
import { ShoppingCart, ClipboardList, Package, BookOpen, FileText, ShoppingBag } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface SidebarProps {
  activeTab: 'billing' | 'history' | 'inventory' | 'khata' | 'gstr1';
  setActiveTab: (tab: 'billing' | 'history' | 'inventory' | 'khata' | 'gstr1') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { online, invoiceCount, pendingSyncCount } = useStore();

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-row md:flex-col justify-between md:justify-start gap-3 md:gap-4 overflow-x-auto md:overflow-y-auto md:sticky md:top-0 md:h-screen shrink-0 z-10 shadow-lg">
      {/* Brand Logo */}
      <div className="hidden md:flex items-center gap-3 px-2 py-3">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
          <ShoppingBag size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">EasyACC POS</h1>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Offline-First Retail</span>
        </div>
      </div>

      {/* Tab Selection Navigation */}
      <nav className="flex flex-row md:flex-col gap-1 w-full md:mt-4">
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap md:w-full ${
            activeTab === 'billing'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <ShoppingCart size={18} />
          <span>POS Billing</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap md:w-full ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <ClipboardList size={18} />
          <span>Invoices</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap md:w-full ${
            activeTab === 'inventory'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Package size={18} />
          <span>Inventory Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('khata')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap md:w-full ${
            activeTab === 'khata'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <BookOpen size={18} />
          <span>Credit Book</span>
        </button>

        <button
          onClick={() => setActiveTab('gstr1')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap md:w-full ${
            activeTab === 'gstr1'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileText size={18} />
          <span>GSTR-1 GST Tax</span>
        </button>
      </nav>

      {/* Sync & Connectivity Widgets */}
      <div className="hidden md:flex flex-col mt-auto border-t border-slate-800 pt-4 gap-3 text-xs text-slate-400">
        <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <span className="font-semibold">Engine status:</span>
          <div className="flex items-center gap-1.5 font-bold">
            {online ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-500">Cloud Sync</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-amber-500">Offline DB</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1 py-1">
          <div className="flex justify-between">
            <span>Local Bills:</span>
            <span className="text-white font-semibold">{invoiceCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Pending Sync:</span>
            <span className={`font-semibold ${pendingSyncCount > 0 ? 'text-amber-500 font-bold' : 'text-slate-300'}`}>
              {pendingSyncCount}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
