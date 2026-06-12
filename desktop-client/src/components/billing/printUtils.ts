import { Invoice } from '../../types';
import { MERCHANT_STATE_CODE } from './constants';

export const triggerBrowserPrint = (
  invoice: Invoice,
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
  const printWindow = window.open('', '_blank', 'width=450,height=600');
  if (!printWindow) {
    addToast('Popup blocker prevented printing. Please allow popups for this site.', 'error');
    return;
  }

  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding: 6px 0; font-family: monospace;">
        ${item.name}<br/>
        <small style="font-size: 0.7rem; color: #4b5563;">HSN: ${item.hsnCode} (${item.gstRate}%)</small>
      </td>
      <td style="padding: 6px 0; text-align: right; font-family: monospace;">${item.quantity}</td>
      <td style="padding: 6px 0; text-align: right; font-family: monospace;">₹${parseFloat(item.taxableValue).toFixed(2)}</td>
    </tr>
  `).join('');

  const taxRowsHtml = parseFloat(invoice.totals.totalIGST) > 0 
    ? `<tr><td style="padding: 4px 0; font-family: monospace;">IGST:</td><td colspan="2" style="text-align: right; font-family: monospace;">₹${parseFloat(invoice.totals.totalIGST).toFixed(2)}</td></tr>`
    : `<tr><td style="padding: 4px 0; font-family: monospace;">CGST:</td><td colspan="2" style="text-align: right; font-family: monospace;">₹${parseFloat(invoice.totals.totalCGST).toFixed(2)}</td></tr>
       <tr><td style="padding: 4px 0; font-family: monospace;">SGST:</td><td colspan="2" style="text-align: right; font-family: monospace;">₹${parseFloat(invoice.totals.totalSGST).toFixed(2)}</td></tr>`;

  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 10px;
            color: #111827;
            background: #fff;
            max-width: 320px;
            margin: 0 auto;
          }
          .header { text-align: center; margin-bottom: 12px; }
          .header h2 { margin: 0; font-size: 1.1rem; font-weight: bold; }
          .header p { margin: 2px 0 0 0; font-size: 0.7rem; color: #4b5563; }
          .divider { border-top: 1px dashed #111827; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; font-size: 0.75rem; margin: 8px 0; }
          th { border-bottom: 1px dashed #111827; padding-bottom: 4px; text-align: left; }
          .totals-table { width: 100%; margin-top: 6px; font-size: 0.75rem; }
          .grand-total { font-weight: bold; border-top: 1px dashed #111827; }
          .footer { text-align: center; font-size: 0.7rem; margin-top: 16px; color: #4b5563; }
          @media print {
            body { padding: 0; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>EASYACC STORE</h2>
          <p>12/A Park Street, Kolkata, West Bengal</p>
          <p>GSTIN: 19AABCU9603R1ZM</p>
        </div>
        <div class="divider"></div>
        <div class="row">
          <span>Bill: ${invoice.invoiceNumber}</span>
          <span>Date: ${new Date(invoice.date).toLocaleDateString()}</span>
        </div>
        <div class="row">
          <span>Customer: ${invoice.customerName}</span>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: right; width: 40px;">Qty</th>
              <th style="text-align: right; width: 80px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <table class="totals-table">
          <tbody>
            <tr>
              <td style="padding: 4px 0;">Taxable Amt:</td>
              <td colspan="2" style="text-align: right;">₹${parseFloat(invoice.totals.taxableAmount).toFixed(2)}</td>
            </tr>
            ${taxRowsHtml}
            <tr class="grand-total">
              <td style="padding: 6px 0; font-weight: bold;">Grand Total:</td>
              <td colspan="2" style="text-align: right; font-weight: bold;">₹${parseFloat(invoice.totals.grandTotal).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  addToast(`Print document generated for ${invoice.invoiceNumber}`, 'success');
};

export const handleReprint = async (
  invoice: Invoice,
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
  const win = window as any;
  if (win.electronAPI) {
    try {
      await win.electronAPI.printReceipt(invoice);
      addToast(`Invoice ${invoice.invoiceNumber} sent to printer!`, 'success');
    } catch (e) {
      console.error("Local printer failed, falling back to browser printing.", e);
      triggerBrowserPrint(invoice, addToast);
    }
  } else {
    triggerBrowserPrint(invoice, addToast);
  }
};
