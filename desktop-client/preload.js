const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData)
});
