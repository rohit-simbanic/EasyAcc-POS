import React from 'react';
import { useStore } from '../../../store/useStore';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function LowStockAlertModal() {
  const { lowStockModal, setLowStockModal } = useStore();

  if (!lowStockModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300 animate-fadeIn">
      {/* Modal Container */}
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/30 bg-slate-900/90 text-slate-100 shadow-2xl shadow-rose-950/20 backdrop-blur-xl animate-scaleIn">
        {/* Warning Banner/Header */}
        <div className="relative flex flex-col items-center justify-center p-6 text-center border-b border-slate-800 bg-rose-950/20">
          <div className="absolute top-3 right-3">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>

          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 mb-3 animate-pulse border border-rose-500/20">
            <AlertTriangle size={28} />
          </div>

          <h3 className="text-lg font-bold tracking-tight text-rose-400">
            {lowStockModal.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            The following products have stock counts running below 10 units.
          </p>
          <p className="text-xs text-slate-500 italic mt-0.5">
            নিচের পণ্যগুলোর স্টক ১০ ইউনিটের নিচে নেমে গেছে।
          </p>
        </div>

        {/* Product List Content */}
        <div className="max-h-60 overflow-y-auto px-6 py-4 divide-y divide-slate-800">
          {lowStockModal.products.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-sm">
              <div className="flex flex-col min-w-0 pr-4">
                <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                <span className="text-[10px] text-slate-500 tracking-wide">SKU: {item.sku}</span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs text-slate-400 font-medium">Qty:</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                  {item.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={() => setLowStockModal(false, '', [])}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-slate-100 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 rounded-lg transition-all shadow-md shadow-rose-950/20 border border-rose-500/30"
          >
            <CheckCircle size={14} />
            <span>Acknowledge / ঠিক আছে</span>
          </button>
        </div>
      </div>
    </div>
  );
}
