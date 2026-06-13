const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: "EasyACC - Billing & GST Software"
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Automatically grant camera permissions for the barcode scanner
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function generateReceiptHtml(invoice) {
  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding: 6px 0; font-family: monospace; font-size: 0.75rem;">
        ${item.name}<br/>
        <small style="font-size: 0.65rem; color: #4b5563;">HSN: ${item.hsnCode} (${item.gstRate}%)</small>
      </td>
      <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 0.75rem;">${item.quantity}</td>
      <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 0.75rem;">₹${parseFloat(item.taxableValue).toFixed(2)}</td>
    </tr>
  `).join('');

  const taxRowsHtml = parseFloat(invoice.totals.totalIGST) > 0
    ? `<tr><td style="padding: 4px 0; font-family: monospace; font-size: 0.75rem;">IGST:</td><td colspan="2" style="text-align: right; font-family: monospace; font-size: 0.75rem;">₹${parseFloat(invoice.totals.totalIGST).toFixed(2)}</td></tr>`
    : `<tr><td style="padding: 4px 0; font-family: monospace; font-size: 0.75rem;">CGST:</td><td colspan="2" style="text-align: right; font-family: monospace; font-size: 0.75rem;">₹${parseFloat(invoice.totals.totalCGST).toFixed(2)}</td></tr>
       <tr><td style="padding: 4px 0; font-family: monospace; font-size: 0.75rem;">SGST:</td><td colspan="2" style="text-align: right; font-family: monospace; font-size: 0.75rem;">₹${parseFloat(invoice.totals.totalSGST).toFixed(2)}</td></tr>`;

  return `
    <html>
      <head>
        <title>Receipt ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 10px;
            color: #111827;
            background: #fff;
            max-width: 300px;
            margin: 0 auto;
          }
          .header { text-align: center; margin-bottom: 12px; }
          .header h2 { margin: 0; font-size: 1rem; font-weight: bold; }
          .header p { margin: 2px 0 0 0; font-size: 0.65rem; color: #4b5563; }
          .divider { border-top: 1px dashed #111827; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; font-size: 0.7rem; margin-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; font-size: 0.7rem; margin: 8px 0; }
          th { border-bottom: 1px dashed #111827; padding-bottom: 4px; text-align: left; }
          .totals-table { width: 100%; margin-top: 6px; font-size: 0.7rem; }
          .grand-total { font-weight: bold; border-top: 1px dashed #111827; }
          .footer { text-align: center; font-size: 0.65rem; margin-top: 16px; color: #4b5563; }
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
      </body>
    </html>
  `;
}

// IPC Handler for Thermal Printing
ipcMain.handle('print-receipt', async (event, receiptData) => {
  console.log('📠 Printing receipt triggered via native IPC:', receiptData.invoiceNumber);

  return new Promise((resolve, reject) => {
    try {
      const html = generateReceiptHtml(receiptData);

      let printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
          printWindow.destroy();
          if (success) {
            resolve({ success: true, printedAt: new Date() });
          } else {
            reject(new Error(`Print failed or was cancelled: ${failureReason}`));
          }
        });
      });
    } catch (err) {
      reject(err);
    }
  });
});
