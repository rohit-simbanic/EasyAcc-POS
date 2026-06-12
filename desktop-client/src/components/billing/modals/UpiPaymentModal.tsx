import React, { useState, useEffect } from 'react';
import { Landmark, RefreshCw, CheckCircle } from 'lucide-react';
import QRCode from 'qrcode';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: string;
  finalizeCheckout: () => Promise<void>;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  finalizeCheckout,
  addToast
}) => {
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const upiUrl = `upi://pay?pa=9883995131-3@ybl&pn=EasyACC%20Store&am=${grandTotal}&cu=INR`;
      QRCode.toDataURL(upiUrl, { width: 250, margin: 2 })
        .then(url => {
          setUpiQrUrl(url);
        })
        .catch(err => {
          console.error("Failed to generate UPI QR code:", err);
          addToast("Failed to generate payment QR code", "error");
        });
    } else {
      setUpiQrUrl('');
    }
  }, [isOpen, grandTotal, addToast]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await finalizeCheckout();
      onClose();
    } catch (e) {
      // toast is already shown in parent finalizeCheckout
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="success-modal-card" style={{ maxWidth: '400px', padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <Landmark size={22} className="text-primary" /> Scan to Pay via UPI
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center', width: '100%' }}>
          Ask the customer to scan the QR Code below using GPay, PhonePe, Paytm, or any BHIM UPI app.
        </p>

        <div style={{
          background: '#ffffff',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: '220px',
          position: 'relative'
        }}>
          {upiQrUrl ? (
            <img 
              src={upiQrUrl} 
              alt="UPI QR Code" 
              style={{ width: '200px', height: '200px', display: 'block' }} 
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw className="animate-spin text-indigo-500" size={32} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Generating QR Code...</span>
            </div>
          )}
        </div>

        <div style={{ width: '100%', marginTop: '16px', fontSize: '0.8rem', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Pay To:</span>
            <span style={{ fontWeight: 600, color: 'black' }}>EasyACC Store</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>UPI ID:</span>
            <span style={{ fontWeight: 600, color: 'black' }}>9883995131-3@ybl</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '4px', marginTop: '4px', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 'bold', color: 'black' }}>Amount:</span>
            <span style={{ fontWeight: 'bold', color: '#4f46e5' }}>₹{grandTotal}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '20px' }}>
          <button 
            type="button"
            className="btn btn-secondary bg-slate-800 hover:bg-slate-750 text-white font-bold py-2 px-4 rounded transition" 
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel / Back
          </button>
          <button 
            type="button"
            className="btn btn-success bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-2" 
            style={{ flex: 1 }}
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
            Confirm Paid
          </button>
        </div>
      </div>
    </div>
  );
};
