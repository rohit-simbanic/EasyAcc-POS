import React, { useState, useEffect } from 'react';
import { Download, Users, User, FileText } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Invoice } from '../../types';
import { MERCHANT_STATE_CODE } from './constants';

export const Gstr1TaxTab: React.FC = () => {
  const { db, addToast } = useStore();
  const [gstr1Month, setGstr1Month] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthInvoices, setMonthInvoices] = useState<Invoice[]>([]);

  // Fetch month invoices dynamically
  useEffect(() => {
    const fetchMonthInvoices = async () => {
      if (db) {
        const year = parseInt(gstr1Month.split('-')[0]);
        const month = parseInt(gstr1Month.split('-')[1]);
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 1).toISOString();

        try {
          const docs = await db.invoices.find({
            selector: {
              date: {
                $gte: startDate,
                $lt: endDate
              }
            }
          }).exec();
          setMonthInvoices(docs.map((d: any) => d.toJSON() as Invoice));
        } catch (e) {
          console.error("Failed to fetch GSTR-1 month invoices:", e);
        }
      }
    };
    fetchMonthInvoices();
  }, [db, gstr1Month]);

  // GSTR-1 Aggregator
  const getGstr1Data = () => {
    const b2b: any[] = [];
    const b2cs: any[] = [];
    const hsnSummaryMap: Map<string, any> = new Map();

    monthInvoices.forEach(inv => {
      const isB2B = !!inv.customerGSTIN;

      // 1. Map to B2B or B2CS
      if (isB2B) {
        b2b.push({
          ctin: inv.customerGSTIN,
          inv: [
            {
              inum: inv.invoiceNumber,
              idt: new Date(inv.date).toLocaleDateString('en-GB'),
              val: parseFloat(inv.totals.grandTotal),
              pos: inv.billingStateCode,
              rchrg: 'N',
              inv_typ: 'R',
              itms: inv.items.map(item => ({
                num: 1,
                itm_det: {
                  rt: item.gstRate,
                  txval: parseFloat(item.taxableValue),
                  iamt: inv.billingStateCode !== MERCHANT_STATE_CODE ? parseFloat(item.igst) : 0,
                  camt: inv.billingStateCode === MERCHANT_STATE_CODE ? parseFloat(item.cgst) : 0,
                  samt: inv.billingStateCode === MERCHANT_STATE_CODE ? parseFloat(item.sgst) : 0
                }
              }))
            }
          ]
        });
      } else {
        b2cs.push({
          sply_ty: inv.billingStateCode === MERCHANT_STATE_CODE ? 'INTRA' : 'INTER',
          pos: inv.billingStateCode,
          txval: parseFloat(inv.totals.taxableAmount),
          rt: inv.items[0] ? inv.items[0].gstRate : 12,
          iamt: inv.billingStateCode !== MERCHANT_STATE_CODE ? parseFloat(inv.totals.totalIGST) : 0,
          camt: inv.billingStateCode === MERCHANT_STATE_CODE ? parseFloat(inv.totals.totalCGST) : 0,
          samt: inv.billingStateCode === MERCHANT_STATE_CODE ? parseFloat(inv.totals.totalSGST) : 0
        });
      }

      // 2. Aggregate HSN details
      inv.items.forEach((item) => {
        const key = `${item.hsnCode}_${item.gstRate}`;
        if (!hsnSummaryMap.has(key)) {
          hsnSummaryMap.set(key, {
            hsn_sc: item.hsnCode,
            desc: item.name.substring(0, 30),
            uqc: 'OTH',
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0
          });
        }
        const entry = hsnSummaryMap.get(key);
        entry.qty += item.quantity;
        entry.txval += parseFloat(item.taxableValue);
        entry.val += parseFloat(item.taxableValue) + parseFloat(item.cgst) + parseFloat(item.sgst) + parseFloat(item.igst);
        entry.iamt += parseFloat(item.igst);
        entry.camt += parseFloat(item.cgst);
        entry.samt += parseFloat(item.sgst);
      });
    });

    return {
      gstin: "19AABCU9603R1ZM",
      fp: gstr1Month.replace('-', ''),
      b2b,
      b2cs,
      hsn: Array.from(hsnSummaryMap.values()).map(h => ({
        ...h,
        txval: parseFloat(h.txval.toFixed(2)),
        val: parseFloat(h.val.toFixed(2)),
        iamt: parseFloat(h.iamt.toFixed(2)),
        camt: parseFloat(h.camt.toFixed(2)),
        samt: parseFloat(h.samt.toFixed(2))
      }))
    };
  };

  const handleDownloadGSTR1 = () => {
    const data = getGstr1Data();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR-1_${gstr1Month}_${data.gstin}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('GSTR-1 JSON Schema file downloaded!', 'success');
  };

  const gstr1Data = getGstr1Data();

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-300">Reporting Period (Month):</span>
          <input 
            type="month" 
            value={gstr1Month} 
            onChange={(e) => setGstr1Month(e.target.value)} 
            className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
        </div>

        <button 
          onClick={handleDownloadGSTR1}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow"
        >
          <Download size={14} />
          Download GSTR-1 JSON Schema
        </button>
      </div>

      {/* Aggregated returns preview grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* B2B summary */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-850">
            <Users size={16} className="text-indigo-400" />
            1. B2B Invoices (Business-to-Business)
          </h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Record count (B2B):</span>
              <span className="text-white font-semibold">{gstr1Data.b2b.length} transactions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Taxable Value:</span>
              <span className="text-white font-bold">
                ₹{gstr1Data.b2b.reduce((sum, entry) => sum + entry.inv[0].val, 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto w-full border border-slate-800 rounded bg-slate-950 text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Client GSTIN</th>
                  <th className="px-3 py-2 text-right">Amt (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {gstr1Data.b2b.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-mono">{entry.ctin}</td>
                    <td className="px-3 py-2 text-right font-bold text-white">₹{entry.inv[0].val.toFixed(2)}</td>
                  </tr>
                ))}
                {gstr1Data.b2b.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-4 text-slate-600">No B2B invoices in {gstr1Month}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* B2CS summary */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-850">
            <User size={16} className="text-indigo-400" />
            2. B2CS Invoices (Business-to-Consumer Small)
          </h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Record count (B2CS):</span>
              <span className="text-white font-semibold">{gstr1Data.b2cs.length} transactions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Taxable Value:</span>
              <span className="text-white font-bold">
                ₹{gstr1Data.b2cs.reduce((sum, entry) => sum + entry.txval, 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto w-full border border-slate-800 rounded bg-slate-950 text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">State (POS)</th>
                  <th className="px-3 py-2">GST Rate</th>
                  <th className="px-3 py-2 text-right">Taxable Val (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {gstr1Data.b2cs.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">State Code: {entry.pos}</td>
                    <td className="px-3 py-2">{entry.rt}%</td>
                    <td className="px-3 py-2 text-right font-bold text-white">₹{entry.txval.toFixed(2)}</td>
                  </tr>
                ))}
                {gstr1Data.b2cs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-slate-600">No B2C small invoices in {gstr1Month}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* HSN Summary */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-850">
            <FileText size={16} className="text-indigo-400" />
            3. HSN Summary (Harmonized System)
          </h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Unique HSN Codes:</span>
              <span className="text-white font-semibold">{gstr1Data.hsn.length} categories</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Taxable Value:</span>
              <span className="text-white font-bold">
                ₹{gstr1Data.hsn.reduce((sum, entry) => sum + entry.txval, 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto w-full border border-slate-800 rounded bg-slate-950 text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">HSN Code</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2 text-right">Taxable (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {gstr1Data.hsn.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-mono font-bold text-white">{entry.hsn_sc}</td>
                    <td className="px-3 py-2">{entry.qty}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-200">₹{entry.txval.toFixed(2)}</td>
                  </tr>
                ))}
                {gstr1Data.hsn.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-slate-600">No product items reported in {gstr1Month}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
