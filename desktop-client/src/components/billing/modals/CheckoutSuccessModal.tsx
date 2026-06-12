import React from 'react';
import { CheckCircle, Printer } from 'lucide-react';
import { Invoice } from '../../../types';

interface CheckoutSuccessModalProps {
  createdInvoice: Invoice | null;
  onClose: () => void;
  handleReprint: (invoice: Invoice) => void;
}

export const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({
  createdInvoice,
  onClose,
  handleReprint
}) => {
  if (!createdInvoice) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1300 }}>
      <div className="success-modal-card" style={{ maxWidth: '480px' }}>
        <div className="success-icon-badge">
          <CheckCircle size={40} />
        </div>
        <h2 className="success-modal-title">Bill Finalized & Saved!</h2>
        
        {/* Embedded Receipt inside Success Modal */}
        <div className="receipt-paper mx-auto border border-slate-300 shadow-lg">
          <div className="receipt-header">
            <h2>EASYACC STORE</h2>
            <p>12/A Park Street, Kolkata, West Bengal</p>
          </div>
          <div className="receipt-divider"></div>
          <div className="receipt-info-row">
            <span>Bill: {createdInvoice.invoiceNumber}</span>
            <span>Date: {new Date(createdInvoice.date).toLocaleDateString()}</span>
          </div>
          <div className="receipt-info-row">
            <span>Customer: {createdInvoice.customerName}</span>
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
              {createdInvoice.items.map(item => (
                <tr key={item.productId}>
                  <td>
                    {item.name}<br/>
                    <small style={{ fontSize: '0.68rem', color: '#6b7280' }}>HSN: {item.hsnCode}</small>
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
              <span>₹{parseFloat(createdInvoice.totals.taxableAmount).toFixed(2)}</span>
            </div>
            {parseFloat(createdInvoice.totals.totalIGST) > 0 ? (
              <div className="receipt-total-row">
                <span>IGST Total:</span>
                <span>₹{parseFloat(createdInvoice.totals.totalIGST).toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="receipt-total-row">
                  <span>CGST Total:</span>
                  <span>₹{parseFloat(createdInvoice.totals.totalCGST).toFixed(2)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>SGST Total:</span>
                  <span>₹{parseFloat(createdInvoice.totals.totalSGST).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="receipt-total-row receipt-grand-row">
              <span>Grand Total:</span>
              <span>₹{parseFloat(createdInvoice.totals.grandTotal).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="receipt-divider"></div>
          <div className="receipt-footer">
            <p>Thank you for shopping with us!</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '20px' }}>
          <button 
            className="btn btn-secondary bg-slate-800 hover:bg-slate-750 text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-1" 
            onClick={() => handleReprint(createdInvoice)}
            style={{ flex: 1 }}
          >
            <Printer size={16} style={{ display: 'inline' }} />
            Reprint Bill
          </button>
          <button 
            className="btn btn-success bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition" 
            onClick={onClose}
            style={{ flex: 1 }}
          >
            New Transaction
          </button>
        </div>
      </div>
    </div>
  );
};
