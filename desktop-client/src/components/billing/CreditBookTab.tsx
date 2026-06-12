import React, { useState, useEffect } from 'react';
import { Search, User, Send, Printer } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Customer, Invoice } from '../../types';
import { MERCHANT_STATE_CODE } from './constants';
import { handleReprint } from './printUtils';

export const CreditBookTab: React.FC = () => {
  const { db, customers, invoicesTotalCount, addToast } = useStore();

  const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [cName, setCName] = useState('');
  const [cGstin, setCGstin] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cStateCode, setCStateCode] = useState('19');
  const [cStartingBalance, setCStartingBalance] = useState('0.00');
  const [khataSearch, setKhataSearch] = useState('');

  // Fetch statements dynamically
  useEffect(() => {
    const fetchCustomerInvoices = async () => {
      if (db && selectedKhataCustomer) {
        try {
          const docs = await db.invoices.find({
            selector: { customerId: selectedKhataCustomer._id }
          }).exec();
          
          const sorted = docs
            .map((d: any) => d.toJSON() as Invoice)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setCustomerInvoices(sorted);
        } catch (e: any) {
          console.error("Failed to load customer statements:", e);
        }
      } else {
        setCustomerInvoices([]);
      }
    };
    fetchCustomerInvoices();
  }, [db, selectedKhataCustomer, invoicesTotalCount]);

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !cName || !cPhone) {
      addToast('Customer Name and Phone are required.', 'error');
      return;
    }

    try {
      const newCust: Customer = {
        _id: `cust_${Date.now()}`,
        name: cName,
        phone: cPhone,
        gstin: cGstin.toUpperCase(),
        stateCode: cStateCode,
        balance: parseFloat(cStartingBalance).toFixed(2),
        updatedAt: new Date().toISOString()
      };

      await db.customers.insert(newCust);
      addToast(`Customer ledger created for ${cName}!`, 'success');
      setCName('');
      setCPhone('');
      setCGstin('');
      setCStartingBalance('0.00');
    } catch (err: any) {
      addToast('Ledger Creation Error: ' + err.message, 'error');
    }
  };

  const handleCustomerRemindSMS = (customer: Customer) => {
    const message = `Payment Reminder SMS simulated to ${customer.phone || 'Register Phone'}: Dear ${customer.name}, you have a balance of ₹${parseFloat(customer.balance || '0').toFixed(2)} due at EasyACC. Please settle.`;
    console.log(message);
    addToast(`SMS Reminder simulated to ${customer.phone}!`, 'info');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Left Column: Create Ledger & Search */}
      <div className="xl:col-span-1 space-y-6">
        
        {/* Registration card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider pb-3 border-b border-slate-850">
            Register Customer Ledger
          </h3>
          
          <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
            <div className="input-group">
              <label className="text-xs text-slate-400 font-semibold block mb-1">Customer / Shop Name *</label>
              <input 
                type="text" 
                value={cName} 
                onChange={(e) => setCName(e.target.value)} 
                placeholder="e.g. John Doe, Rajesh Store"
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                required 
              />
            </div>

            <div className="input-group">
              <label className="text-xs text-slate-400 font-semibold block mb-1">Phone Number *</label>
              <input 
                type="text" 
                value={cPhone} 
                onChange={(e) => setCPhone(e.target.value)} 
                placeholder="10-digit Mobile"
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                required 
              />
            </div>

            <div className="input-group">
              <label className="text-xs text-slate-400 font-semibold block mb-1">GSTIN Number (Optional)</label>
              <input 
                type="text" 
                value={cGstin} 
                onChange={(e) => setCGstin(e.target.value)} 
                placeholder="15-digit GSTIN"
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              />
            </div>

            <div className="flex gap-3">
              <div className="input-group flex-1">
                <label className="text-xs text-slate-400 font-semibold block mb-1">State Code *</label>
                <select 
                  value={cStateCode} 
                  onChange={(e) => setCStateCode(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                >
                  <option value="19">19 - West Bengal</option>
                  <option value="10">10 - Bihar</option>
                  <option value="09">09 - Uttar Pradesh</option>
                  <option value="27">27 - Maharashtra</option>
                  <option value="29">29 - Karnataka</option>
                </select>
              </div>

              <div className="input-group flex-1">
                <label className="text-xs text-slate-400 font-semibold block mb-1">Starting Balance (₹)</label>
                <input 
                  type="number" 
                  value={cStartingBalance} 
                  onChange={(e) => setCStartingBalance(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white font-bold"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs active:scale-95 transition mt-2"
            >
              Create Ledger
            </button>
          </form>
        </div>

        {/* Outstanding Customers list */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5 space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-850 gap-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Credit Accounts</h3>
            
            <div className="relative w-full max-w-[150px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text"
                placeholder="Filter..."
                value={khataSearch}
                onChange={(e) => setKhataSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 pl-8 pr-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {customers
              .filter(c => c.name.toLowerCase().includes(khataSearch.toLowerCase()))
              .map(c => (
                <div 
                  key={c._id}
                  onClick={() => setSelectedKhataCustomer(c)}
                  className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                    selectedKhataCustomer?._id === c._id
                      ? 'bg-slate-800 border-indigo-500'
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900/60'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-white text-xs">{c.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{c.phone}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className={`text-xs font-bold ${parseFloat(c.balance || '0') > 0 ? 'text-rose-500 font-bold' : 'text-emerald-500'}`}>
                      ₹{parseFloat(c.balance || '0').toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
          </div>

        </div>

      </div>

      {/* Right Column: Statement & SMS Alerts */}
      <div className="xl:col-span-2">
        {selectedKhataCustomer ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-850 gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedKhataCustomer.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 font-mono">{selectedKhataCustomer.phone}</span>
                  {selectedKhataCustomer.gstin && (
                    <span className="text-[10px] bg-slate-800 text-indigo-400 px-2 py-0.5 rounded font-mono font-semibold">
                      GSTIN: {selectedKhataCustomer.gstin}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleCustomerRemindSMS(selectedKhataCustomer)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-755 text-xs text-white font-bold rounded-lg transition flex items-center gap-2 border border-slate-700"
                >
                  <Send size={14} />
                  Simulate SMS Alert
                </button>

                <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-850 text-right">
                  <span className="text-[10px] text-slate-500 block">Total Due</span>
                  <strong className="text-rose-500 font-extrabold text-sm">
                    ₹{parseFloat(selectedKhataCustomer.balance || '0').toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Transaction Ledger List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Statements</h4>
              
              <div className="overflow-x-auto w-full border border-slate-800 rounded-lg bg-slate-950">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                    <tr>
                      <th className="px-4 py-3">Invoice Number</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Taxable Value</th>
                      <th className="px-4 py-3">Total Value</th>
                      <th className="px-4 py-3">Payment status</th>
                      <th className="px-4 py-3 text-right">Reprint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {customerInvoices.map(inv => (
                      <tr key={inv._id}>
                        <td className="px-4 py-3 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-400">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">₹{parseFloat(inv.totals.taxableAmount).toFixed(2)}</td>
                        <td className="px-4 py-3 font-bold text-white">₹{parseFloat(inv.totals.grandTotal).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.paymentStatus === 'Paid' 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {inv.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid (Debit)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleReprint(inv, addToast)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                            title="Reprint"
                          >
                            <Printer size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {customerInvoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500">
                          No credit transactions found in local storage for this ledger account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-16 text-center text-slate-500">
            <User size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold">Select a Customer Account</p>
            <p className="text-xs text-slate-600 mt-1">Select a customer ledger card from the left panel to review statements, simulate SMS alerts, and track dues.</p>
          </div>
        )}
      </div>

    </div>
  );
};
