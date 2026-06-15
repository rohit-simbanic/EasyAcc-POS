# EasyACC POS - Comprehensive Q&A (150 Questions & Answers)

This document contains 150 questions and detailed answers with examples directly from the codebase of the **EasyACC POS** application. This guide covers frontend architecture, backend REST APIs, WebSocket database synchronization, GST accounting compliance, and desktop shell hardware integrations.

---

## 📌 Table of Contents
1. [Section 1: Architecture, Offline-First Engine, & WebSocket Sync (Q1 - Q25)](#section-1-architecture-offline-first-engine--websocket-sync-q1---q25)
2. [Section 2: Frontend & Desktop UI Development (Q26 - Q75)](#section-2-frontend--desktop-ui-development-q26---q75)
3. [Section 3: Backend API, Controllers, and Databases (Q76 - Q110)](#section-3-backend-api-controllers-and-databases-q76---q110)
4. [Section 4: GST Compliance & Financial Calculation Engine (Q111 - Q130)](#section-4-gst-compliance--financial-calculation-engine-q111---q130)
5. [Section 5: Hardware, Native APIs & Browser Integration (Q131 - Q150)](#section-5-hardware-native-apis--browser-integration-q131---q150)

---

## Section 1: Architecture, Offline-First Engine, & WebSocket Sync (Q1 - Q25)

#### Q1: What is the high-level system architecture of EasyACC POS?
**Answer:** EasyACC POS is built as a hybrid offline-first desktop application using Electron.js on the frontend shell, React for the user interface, and RxDB (with Dexie.js for IndexedDB storage) for client-side storage. The backend is a Node.js/Express server backed by MongoDB. Real-time, bidirectional synchronization between the client-side IndexedDB and server-side MongoDB is accomplished via Socket.io WebSockets.

#### Q2: What database library is used on the client-side and how is it configured?
**Answer:** The application uses **RxDB** (Reactive Database) combined with the **Dexie.js** storage engine. This configuration is located in [localDb.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/db/localDb.ts) lines 118-122:
```typescript
const createDatabase = async (): Promise<EasyACCDatabase> => {
  const db = await createRxDatabase<EasyACCDatabaseCollections>({
    name: 'easyaccdb',
    storage: getRxStorageDexie()
  });
...
```

#### Q3: Why is Dexie.js preferred over other RxDB storage engines in this application?
**Answer:** Dexie.js is an IndexedDB wrapper. In hybrid environments (Electron + browser fallback/PWA), Dexie allows the application to run seamlessly inside a standard web browser without needing native node binaries (like SQLite), while providing high performance, query indexing, and structural ACID transaction guarantees.

#### Q4: How is the database instance exposed to the rest of the application?
**Answer:** The database initialization is wrapped in a singleton pattern. It is fetched via the `getDatabase()` export in [localDb.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/db/localDb.ts) lines 148-153:
```typescript
export const getDatabase = (): Promise<EasyACCDatabase> => {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
};
```
And it is registered into the Zustand store inside [App.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/App.tsx) line 19 via `setDb(database)`.

#### Q5: What collection schemas are initialized in the local IndexedDB?
**Answer:** Three collections are initialized inside `createDatabase()` in [localDb.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/db/localDb.ts) lines 124-143:
1. `products` (manages catalog details, prices, and stock)
2. `customers` (manages customer profiles and credit balances)
3. `invoices` (manages transaction history)

#### Q6: How does RxDB handle schema migrations when launching the application?
**Answer:** EasyACC uses the `RxDBMigrationSchemaPlugin`. In [localDb.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/db/localDb.ts) lines 125-142, each collection specifies its `migrationStrategies` to map documents:
```typescript
products: { 
  schema: productSchema,
  migrationStrategies: {
    1: (oldDoc) => oldDoc // Version 1 identity migration strategy
  }
}
```

#### Q7: What indices are created in the local `productSchema` to optimize lookup times?
**Answer:** Inside [localDb.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/db/localDb.ts) line 47:
```typescript
indexes: ['sku', 'name', 'hsnCode', 'updatedAt']
```
These indices ensure that barcode scans (SKU lookups) and item name searches run in under 15ms by bypassing full-table scans.

#### Q8: How is the local `invoiceSchema` primary key defined?
**Answer:** In [localDb.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/db/localDb.ts) line 71, the primary key is `_id`, which is populated with a unique UUID string generated on checkout:
```typescript
primaryKey: '_id',
```

#### Q9: What properties are marked as required in the client-side `customerSchema`?
**Answer:** In [localDb.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/db/localDb.ts) line 64:
```typescript
required: ['_id', 'name', 'stateCode'],
```

#### Q10: How does the application initialize its synchronization workflow on startup?
**Answer:** Inside [App.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/App.tsx) lines 24-25, the application invokes the `initSyncManager` helper immediately after the database is connected:
```typescript
// Initialize real-time synchronization manager
initSyncManager(database);
```

#### Q11: Explain the initialization logic of the Socket.io WebSocket connection in the client.
**Answer:** Inside [syncManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/sync/syncManager.ts) lines 10-11, the client instantiates the Socket.io client using an environment variable fallback:
```typescript
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5005';
socket = io(BACKEND_URL);
```

#### Q12: How does the client update its online/offline status reactively?
**Answer:** In [syncManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/sync/syncManager.ts) lines 13-22, the manager listens to WebSocket lifecycle events to toggle Zustand's online state:
```typescript
socket.on('connect', () => {
  useStore.getState().setOnline(true);
  triggerSync(db);
});

socket.on('disconnect', () => {
  useStore.getState().setOnline(false);
});
```

#### Q13: How frequently does the background thread trigger a synchronization cycle?
**Answer:** In [syncManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/sync/syncManager.ts) lines 24-26, a 30-second interval is defined:
```typescript
setInterval(() => {
  triggerSync(db);
}, 30000);
```

#### Q14: How does the client-side synchronization avoid redundant cycles if one is already running?
**Answer:** In [syncManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/sync/syncManager.ts) lines 30-31, a locking boolean `isSyncing` and connection gatekeepers are checked:
```typescript
if (isSyncing || !socket || !socket.connected) return;
isSyncing = true;
```

#### Q15: Explain the client-side **PUSH** sync sequence.
**Answer:** In [syncManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/sync/syncManager.ts) lines 37-62:
1. Queries all local invoices with `syncStatus === 'pending'`.
2. Emits a WebSocket event `'sync_push'` containing the serialized array.
3. Upon server validation callback, it updates each local invoice's `syncStatus` to `'synced'`:
```typescript
const pendingInvoicesDoc = await db.invoices.find({
  selector: { syncStatus: 'pending' }
}).exec();
...
socket!.emit('sync_push', { invoices: pendingInvoices }, (res: any) => { ... });
...
await doc.patch({ syncStatus: 'synced' });
```

#### Q16: Explain the client-side **PULL** sync sequence.
**Answer:** In [syncManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/sync/syncManager.ts) lines 65-111:
1. Fetches the `lastPullTime` string from `localStorage`.
2. Emits a `'sync_pull'` event to the server.
3. Iterates over returned updated products and customers, applying an `upsert` call for each.
4. Stores the returned `serverTime` timestamp as the new `lastPullTime`.
5. Triggers a catalog fetch to update active Zustand UI states:
```typescript
const lastPullTime = localStorage.getItem('lastPullTime') || '';
socket!.emit('sync_pull', lastPullTime, (res: any) => { ... });
...
await db.products.upsert(formattedProd as Product);
...
localStorage.setItem('lastPullTime', pullResponse.serverTime);
```

#### Q17: How is MongoDB decimal representation formatted back to strings in client-side PULL sync?
**Answer:** MongoDB Decimal128 types return as `{ $numberDecimal: "string" }` objects. In [syncManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/sync/syncManager.ts) lines 83-87:
```typescript
price: {
  purchasePrice: prod.price.purchasePrice.$numberDecimal || prod.price.purchasePrice.toString(),
  mrp: prod.price.mrp.$numberDecimal || prod.price.mrp.toString(),
  sellingPrice: prod.price.sellingPrice.$numberDecimal || prod.price.sellingPrice.toString()
}
```

#### Q18: What event handler is registered in the backend server to receive WebSocket sync pushes?
**Answer:** In [socketManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/sync/socketManager.ts) line 12:
```typescript
socket.on('sync_push', async (data: any, callback: Function) => { ... });
```

#### Q19: Why does the server inspect MongoDB replica set status during synchronization?
**Answer:** MongoDB multi-document ACID transactions require MongoDB Sessions, which are only supported on databases running as Replica Sets. In standalone test databases, attempting to start a transaction throws an exception. EasyACC implements a fallback check in [socketManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/sync/socketManager.ts) lines 17-25:
```typescript
if (mongoose.connection.db) {
  const hello: any = await mongoose.connection.db.admin().command({ hello: 1 });
  if (hello.setName) {
    useTransaction = true;
    session = await mongoose.startSession();
    session.startTransaction();
  }
}
```

#### Q20: How are atomic updates guaranteed on the backend during synchronization?
**Answer:** In [socketManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/sync/socketManager.ts) lines 100-113, if `useTransaction` is active, any failure rolls back all operations (invoice storage, product stock updates, customer credit balance updates):
```typescript
if (useTransaction && session) {
  await session.commitTransaction();
  session.endSession();
}
...
catch (error: any) {
  if (useTransaction && session) {
    await session.abortTransaction();
    session.endSession();
  }
  callback({ success: false, error: error.message });
}
```

#### Q21: How are catalog synchronization updates pulled by the client on request?
**Answer:** In [socketManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/sync/socketManager.ts) lines 117-134, the server queries products and customers updated after the client's `lastPullTime` timestamp:
```typescript
const pullDate = lastPullTime ? new Date(lastPullTime) : new Date(0);
const updatedProducts = await Product.find({ updatedAt: { $gt: pullDate } });
const updatedCustomers = await Customer.find({ updatedAt: { $gt: pullDate } });
```

#### Q22: What happens if an invoice sync fails on the backend?
**Answer:** The backend catches the exception, rolls back the transaction, and executes the callback with `success: false` and the error message (see [socketManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/sync/socketManager.ts#L106-L113)). The client-side `syncManager.ts` catches the failed promise rejection, logs the error, leaves the invoice's local `syncStatus` as `'pending'`, and retries it in the next 30-second cycle.

#### Q23: How does the application resolve client-server database conflict states for customers?
**Answer:** EasyACC uses a "Last-Write-Wins" synchronization strategy. Both MongoDB and RxDB schemas contain automatic timestamping. When the client pulls data, it forces an `upsert()` call using the server's record, which includes the updated `updatedAt` field.

#### Q24: What database connection indicator does the backend health check expose?
**Answer:** In [server.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/server.ts) lines 39-46, the `/api/health` route inspects `mongoose.connection.readyState`:
```typescript
const dbState = mongoose.connection.readyState;
const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
```

#### Q25: How does the application handle sync when internet connectivity is intermittent?
**Answer:** During offline states, Socket.io sets `online: false`. The user can checkout invoices normally. Checkout commits the invoice directly to local IndexedDB with `syncStatus: 'pending'`. The moment WebSockets reconnect, the `connect` listener immediately calls `triggerSync()`, flushing all accumulated pending invoices to the cloud server in a single push.

---

## Section 2: Frontend & Desktop UI Development (Q26 - Q75)

#### Q26: What layout engine/structure bootstrap React and Electron processes?
**Answer:** The React app runs concurrently with the Electron runtime. In [package.json](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/package.json) line 12:
```json
"dev": "concurrently --kill-others \"cross-env BROWSER=none npm run react-start\" \"wait-on http://localhost:3000 && npm run electron-start\""
```
This spawns the React webpack dev server on port 3000, waits for it, and then launches the Electron shell pointing to it.

#### Q27: How is the Zustand store structured for managing application actions and states?
**Answer:** The store is defined in [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) using the `create` module. States cover catalogs, cart items, toasts, pagination details, and modals.

#### Q28: How does Zustand fetch full database arrays without causing high render counts?
**Answer:** Inside [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 89-108, `fetchCatalog` executes optimized queries and selectively sets React states:
```typescript
fetchCatalog: async () => {
  const { db } = get();
  if (!db) return;
  const prodsDoc = await db.products.find().exec();
  const custsDoc = await db.customers.find().exec();
  const invoicesCountDoc = await db.invoices.find().exec();
  const pendingDoc = await db.invoices.find({
    selector: { syncStatus: 'pending' }
  }).exec();

  set({
    products: prodsDoc.map((d: any) => d.toJSON() as Product),
    customers: custsDoc.map((d: any) => d.toJSON() as Customer),
    invoices: [], // Kept empty globally to avoid huge in-memory arrays; paginatedInvoices is used instead!
    invoiceCount: invoicesCountDoc.length,
    pendingSyncCount: pendingDoc.length
  });
}
```

#### Q29: What is the benefit of keeping the global `invoices` array empty in Zustand?
**Answer:** Over months of business transactions, loading thousands of sales invoices in memory would cause severe garbage collection overhead, UI lag, and memory leaks. EasyACC keeps this array empty, loading invoices in small pages via `fetchInvoicesPage` only when browsing archives.

#### Q30: How is pagination executed client-side inside the Zustand store for products?
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 335-359, pagination uses RxDB queries with sorting, skipping, and limiting criteria:
```typescript
const allMatching = await db.products.find({ selector: query }).exec();
const prodsDoc = await db.products.find({
  selector: query,
  sort: [{ name: 'asc' }],
  skip: (page - 1) * limit,
  limit: limit
}).exec();
set({
  paginatedProducts: prodsDoc.map((d: any) => d.toJSON() as Product),
  productsTotalCount: allMatching.length
});
```

#### Q31: How is regex-based live text searching performed on the local product catalog?
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 340-345, the database filters records matching either name or SKU:
```typescript
if (search.trim()) {
  query.$or = [
    { name: { $regex: '.*' + search + '.*', $options: 'i' } },
    { sku: { $regex: '.*' + search + '.*', $options: 'i' } }
  ];
}
```

#### Q32: Explain the cart stock validation rule in `addToCart`.
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 110-128:
```typescript
const existing = cart.find(item => item._id === product._id);
if (existing) {
  const targetQty = existing.quantity + 1;
  if (targetQty > product.stock.quantity) {
    addToast(`Cannot add more. Only ${product.stock.quantity} units available in stock. (স্টক এ শুধুমাত্র ${product.stock.quantity} টি পণ্য আছে।)`, 'error');
    return;
  }
...
```
This blocks users from adding items beyond the local stock quantities, showing warnings in both English and Bengali.

#### Q33: How does the Zustand store update quantities in the cart?
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 139-158:
```typescript
updateQuantity: (productId, quantity) => {
  if (quantity <= 0) {
    get().removeFromCart(productId);
    return;
  }
...
  set({
    cart: cart.map(item =>
      item._id === productId ? { ...item, quantity } : item
    )
  });
}
```

#### Q34: How is a toast notification programmatically discarded after 4 seconds?
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 317-327, `addToast` sets an automatic `setTimeout` execution trigger:
```typescript
addToast: (message, type) => {
  const id = uuidv4();
  set((state) => ({
    toasts: [...state.toasts, { id, message, type }]
  }));
  setTimeout(() => {
    get().removeToast(id);
  }, 4000);
}
```

#### Q35: Where are Electron configuration rules for launching the native app located?
**Answer:** In the main process script [main.js](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/main.js).

#### Q36: How does Electron disable node integration in renderer processes for security?
**Answer:** Inside [main.js](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/main.js) lines 11-15, Electron uses `webPreferences`:
```javascript
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false
}
```
This isolates variables and protects the operating system shell from arbitrary script injections.

#### Q37: How is the preload script structured to expose native bridge APIs?
**Answer:** Inside [preload.js](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/preload.js) lines 3-5, contextBridge maps safe invoke mechanisms:
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData)
});
```

#### Q38: How does the application detect if it is running inside Electron?
**Answer:** In [index.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/index.tsx) line 23:
```typescript
const isElectron = !!(window as any).electronAPI || navigator.userAgent.toLowerCase().includes('electron');
```

#### Q39: How does the React app subscribe to RxDB database updates reactively?
**Answer:** In [Billing.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/Billing.tsx) lines 37-45, the component registers to collection change streams:
```typescript
const productSub = db.products.$.subscribe(() => fetchCatalog());
const customerSub = db.customers.$.subscribe(() => fetchCatalog());
const invoiceSub = db.invoices.$.subscribe(() => fetchCatalog());
```
Any changes (insertions, patches, deletions) trigger a fresh catalog fetch, keeping the UI instantly updated.

#### Q40: Why must subscription channels be unsubscribed inside the `useEffect` cleanup return block?
**Answer:** Failure to unsubscribe leaves observer listeners active when components mount/unmount, causing major client memory leaks and performance degradation.

#### Q41: Explain how the global barcode scan keypress interceptor is implemented.
**Answer:** Inside [BillingTerminalTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/BillingTerminalTab.tsx) lines 107-153, a keyboard event listener captures characters. If keystroke intervals are less than 50ms (typical barcode reader speeds), characters accumulate in a buffer. Pressing `'Enter'` searches the catalog:
```typescript
if (activeEl !== barcodeInputRef.current && (currentTime - lastKeyTime > 50)) {
  buffer = '';
}
buffer += e.key;
...
if (e.key === 'Enter') {
  const match = products.find(p => p.sku.toLowerCase() === buffer.toLowerCase());
  ...
}
```

#### Q42: Why are global scans skipped when an input, select, or textarea is active?
**Answer:** In [BillingTerminalTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/BillingTerminalTab.tsx) lines 112-121:
```typescript
const activeEl = document.activeElement;
const isInputActive = activeEl && (
  activeEl.tagName === 'INPUT' || 
  activeEl.tagName === 'TEXTAREA' || 
  activeEl.tagName === 'SELECT'
);
if (isInputActive) {
  return;
}
```
This blocks barcode character streams from appending text into active inputs while a user is typing names or numbers.

#### Q43: How does the checkout screen handle cash changes?
**Answer:** In [BillingTerminalTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/BillingTerminalTab.tsx) lines 632-637, if the input cash tendered is greater than the total:
```typescript
{Number(cashTendered) >= Number(totals.grandTotal) && (
  <div className="flex justify-between items-center text-xs font-bold text-emerald-500 pt-1.5 border-t border-slate-900">
    <span>Change Due:</span>
    <span className="text-sm">₹{(Number(cashTendered) - Number(totals.grandTotal)).toFixed(2)}</span>
  </div>
)}
```

#### Q44: What are the quick denomination helper inputs shown on Cash checkout?
**Answer:** In [BillingTerminalTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/BillingTerminalTab.tsx) lines 601-628, custom amounts (like next 50, next 100, 200, 500, and 2000) are generated dynamically based on the total:
```typescript
const next50 = Math.ceil(total / 50) * 50;
const next100 = Math.ceil(total / 100) * 100;
```

#### Q45: How does the application trigger print receipts in the checkout action?
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 268-276:
```typescript
const win = window as any;
if (win.electronAPI) {
  try {
    await win.electronAPI.printReceipt(invoiceDoc);
  } catch (e) {
    addToast("Local printing failed or was cancelled.", "error");
  }
}
```

#### Q46: How is the state code evaluated if no customer is selected on checkout?
**Answer:** The checkout terminal defaults to merchant's local West Bengal state code `19`. In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) line 243:
```typescript
billingStateCode: selectedCustomer ? selectedCustomer.stateCode : MERCHANT_STATE_CODE,
```

#### Q47: What triggers the `LowStockAlertModal` daily checklist?
**Answer:** During application boot, [App.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/App.tsx) line 22 runs:
```typescript
useStore.getState().checkDailyLowStockAlerts();
```

#### Q48: How is the daily low stock alert throttled so that it only alerts once a day?
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 395-404, it registers the date:
```typescript
const today = new Date().toISOString().split('T')[0];
...
const lastAlertDate = localStorage.getItem('easyacc_last_daily_alert_date') || '';
if (lastAlertDate === today) {
  return;
}
```

#### Q49: How is an immediate stock alert triggered right after checkouts?
**Answer:** Inside [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 286-288:
```typescript
const cartProductIds = cart.map(item => item._id);
get().checkImmediateLowStockAlert(cartProductIds);
```

#### Q50: How does `checkImmediateLowStockAlert` track already alerted products?
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 434-442, alerted item keys are saved in `localStorage`:
```typescript
const stored = localStorage.getItem('easyacc_immediate_alerted_ids');
if (stored) {
  immediateAlertedIds = JSON.parse(stored);
}
```
If an item goes back above the stock alert limit, it is pruned from this list.

#### Q51: How is the UI layout configured in `Billing.tsx`?
**Answer:** It uses a flexible row/column split layout with Tailwind classes, including responsive sidebars and a main content viewport (see [Billing.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/Billing.tsx#L56-L132)).

#### Q52: What is the main layout color scheme?
**Answer:** A deep dark mode theme using Tailwind CSS classes `bg-slate-950 text-slate-50` (see [Billing.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/Billing.tsx#L57)).

#### Q53: How are monthly revenue metrics computed on mount in `InvoicesArchiveTab.tsx`?
**Answer:** In [InvoicesArchiveTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/InvoicesArchiveTab.tsx) lines 30-48, the component queries invoices matching dates from the 1st of the current month and aggregates totals:
```typescript
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);
const docs = await db.invoices.find({
  selector: {
    date: { $gte: startOfMonth.toISOString() }
  }
}).exec();
const total = docs.reduce((sum, doc) => sum + parseFloat(doc.totals.grandTotal), 0);
```

#### Q54: How is a new product added to the catalog database?
**Answer:** In [InventoryCatalogTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/InventoryCatalogTab.tsx) lines 78-97:
```typescript
const newProd: Product = {
  _id: `prod_${Date.now()}`,
  name: pName,
  sku: pSku,
  hsnCode: pHsn,
  gstRate: Number(pGstRate),
  price: { ... },
  stock: { ... },
  updatedAt: new Date().toISOString()
};
await db.products.insert(newProd);
```

#### Q55: How are product edits updated in RxDB?
**Answer:** In [InventoryCatalogTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/InventoryCatalogTab.tsx) lines 50-68, the database record is queried and updated via `.patch()`:
```typescript
const prodDoc = await db.products.findOne({ selector: { _id: editingProduct._id } }).exec();
if (prodDoc) {
  await prodDoc.patch({ name: pName, ... });
}
```

#### Q56: How is product deletion handled?
**Answer:** In [InventoryCatalogTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/InventoryCatalogTab.tsx) lines 130-149, it retrieves the document and calls `.remove()`:
```typescript
const doc = await db?.products.findOne({ selector: { _id: id } }).exec();
if (doc) {
  await doc.remove();
}
```

#### Q57: How does `CartQuantityInput` validate keyboard inputs on blur?
**Answer:** In [BillingTerminalTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/BillingTerminalTab.tsx) lines 25-36:
```typescript
const handleBlur = () => {
  const parsed = parseInt(inputValue, 10);
  if (isNaN(parsed) || parsed <= 0) {
    updateQuantity(item._id, 0);
  } else if (parsed > item.stock.quantity) {
    addToast(`Cannot exceed available stock of ${item.stock.quantity} units for ${item.name}`, 'error');
    updateQuantity(item._id, item.stock.quantity);
  }
...
```

#### Q58: What is the purpose of `.npmrc`?
**Answer:** It enforces configuration lockups and restricts registry scopes for npm commands.

#### Q59: Explain the loading state render in `App.tsx`.
**Answer:** If the database engine is initializing, it renders a centering screen spinner (see [App.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/App.tsx#L38-L47)):
```typescript
<Loader2 className="icon-spin text-indigo-500 mb-4 animate-spin" size={48} />
```

#### Q60: How does the application display connection statuses visually?
**Answer:** It uses active headers, sidebar details, and dynamic toast messages indicating if synchronization or real-time offline mode is active.

#### Q61: What packages are used to build CSS inside `desktop-client`?
**Answer:** `postcss`, `tailwindcss`, and `@tailwindcss/postcss`.

#### Q62: Explain the structure of `Sidebar.tsx`.
**Answer:** Renders clickable navigation entries. Clicking an entry triggers `setActiveTab(tab)` which controls content visibility in `Billing.tsx`.

#### Q63: Where are PWA events handled?
**Answer:** In [index.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/index.tsx) lines 22-30.

#### Q64: What package is used for generating unique IDs?
**Answer:** `uuid` (specifically, `v4 as uuidv4` is imported in `useStore.ts` line 2).

#### Q65: What packages are in devDependencies for Electron bundling?
**Answer:** `electron`, `electron-builder`, `concurrently`, and `wait-on`.

#### Q66: What is the configuration rule in `vercel.json`?
**Answer:** In [vercel.json](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/vercel.json), a simple rewrite configures routing rules:
```json
{
  "cleanUrls": true
}
```

#### Q67: How does `BillingTerminalTab.tsx` focus the search box on startup?
**Answer:** It references the search field using a `useRef` variable and executes focus inside `useEffect` (see [BillingTerminalTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/BillingTerminalTab.tsx#L93-L166)).

#### Q68: Explain the `QuickAddProductModal` flow.
**Answer:** It renders a simplified catalog form inside a modal. Submitting the form writes the product to IndexedDB and automatically adds it to the checkout cart.

#### Q69: How is product search suggestions shown in checkout search?
**Answer:** In [BillingTerminalTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/BillingTerminalTab.tsx) lines 276-300, it filters suggestions matching the input query and renders them in an absolute-positioned dropdown.

#### Q70: Where is `MERCHANT_STATE_CODE` defined in the frontend?
**Answer:** In [constants.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/constants.ts) line 1:
```typescript
export const MERCHANT_STATE_CODE = '19'; // West Bengal state code
```

#### Q71: How does `CreditBookTab.tsx` select customer details?
**Answer:** It iterates through `customers` arrays, matches filters, and selects the customer index using `setSelectedKhataCustomer(c)` (see [CreditBookTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/CreditBookTab.tsx#L182-L208)).

#### Q72: What command runs linting/type-checking tests on frontend workspace configurations?
**Answer:** `tsc --noEmit` verifies strict TypeScript compiler rules.

#### Q73: How does the billing tab adjust product stocks locally after checks?
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 253-265:
```typescript
for (const item of cart) {
  const prodDoc = await db.products.findOne({ selector: { _id: item._id } }).exec();
  if (prodDoc) {
    const currentStock = prodDoc.stock.quantity;
    await prodDoc.patch({
      stock: { ...prodDoc.stock, quantity: Math.max(0, currentStock - item.quantity) }
    });
  }
}
```

#### Q74: What package displays icons?
**Answer:** `lucide-react`.

#### Q75: How is PWA registration limited in `index.tsx`?
**Answer:** PWA Service Worker is registered only in production environments:
```typescript
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) { ... }
```

---

## Section 3: Backend API, Controllers, and Databases (Q76 - Q110)

#### Q76: What database connection engine is used on the server?
**Answer:** **Mongoose** connecting to MongoDB.

#### Q77: Explain the schema setup for Mongoose model customer profiles.
**Answer:** In [Customer.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Customer.ts) lines 19-36, the Mongoose schema defines fields:
```typescript
const CustomerSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  gstin: { type: String, uppercase: true, trim: true },
  stateCode: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  balance: { type: Schema.Types.Decimal128, default: 0.00 }
});
```

#### Q78: Why is the `_id` field in server schemas typed as `String`?
**Answer:** Client databases generate local transactional UUIDs. Storing MongoDB `_id` keys as custom Strings (instead of default `ObjectId`) allows synchronization engines to push client-generated records without needing id translations or key mapping steps.

#### Q79: What indices are defined in the Customer database schema?
**Answer:** In [Customer.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Customer.ts) lines 38-40:
```typescript
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ updatedAt: -1 });
```

#### Q80: Explain the Mongoose product catalog schema structure.
**Answer:** In [Product.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Product.ts) lines 26-47, the schema maps product items, HSN numbers, and tax rates.

#### Q81: Why are product price properties stored as Mongoose `Decimal128` fields?
**Answer:** JavaScript floating-point arithmetic is subject to IEEE-754 precision errors (e.g., `0.1 + 0.2 === 0.30000000000000004`). In financial accounting systems, this leads to balance sheet anomalies. `Decimal128` stores values with high-precision decimal representation, avoiding rounding errors.

#### Q82: How does the `Product` schema track stock levels and threshold configurations?
**Answer:** In [Product.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Product.ts) lines 37-40:
```typescript
stock: {
  quantity: { type: Number, required: true, default: 0 },
  lowStockAlert: { type: Number, default: 10 }
}
```

#### Q83: How does the application model batch details and expiration dates?
**Answer:** In [Product.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Product.ts) lines 41-45:
```typescript
batches: [{
  batchNumber: { type: String },
  expiryDate: { type: Date },
  quantity: { type: Number, default: 0 }
}]
```

#### Q84: What indices are configured in the `Product` schema to speed up queries?
**Answer:** In [Product.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Product.ts) lines 52-54:
```typescript
ProductSchema.index({ name: 1 });
ProductSchema.index({ hsnCode: 1 });
ProductSchema.index({ updatedAt: -1 });
```

#### Q85: What fields are defined in the Invoice model schema?
**Answer:** In [Invoice.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Invoice.ts) lines 54-80:
`_id`, `invoiceNumber`, `date`, `customerId`, `customerName`, `customerGSTIN`, `billingStateCode`, `items`, `totals`, `paymentStatus`, `syncStatus`, and `eInvoiceStatus`.

#### Q86: What is the benefit of mapping the invoice `items` field using a sub-document schema?
**Answer:** In [Invoice.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Invoice.ts) line 62, nesting `[InvoiceItemSchema]` ensures that invoice items inherit validation constraints and are saved atomically alongside the parent invoice document.

#### Q87: What indices are defined in the Mongoose `Invoice` schema?
**Answer:** In [Invoice.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/models/Invoice.ts) lines 82-86:
```typescript
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ customerName: 1 });
InvoiceSchema.index({ customerId: 1 });
InvoiceSchema.index({ date: -1 });
InvoiceSchema.index({ updatedAt: -1 });
```

#### Q88: How are Express REST routes configured inside `server.ts`?
**Answer:** In [server.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/server.ts) lines 50-53:
```typescript
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/invoices', invoiceRoutes);
```

#### Q89: How is Mongoose connected to MongoDB on application start?
**Answer:** In [db.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/config/db.ts) lines 4-11:
```typescript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easyacc';
try {
  await mongoose.connect(MONGODB_URI);
} catch (error) { ... }
```

#### Q90: How does the REST API endpoint fetch products with search criteria?
**Answer:** In [inventoryController.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/controllers/inventoryController.ts) lines 7-40, search filters are applied using regex matches on name or SKU:
```typescript
const query: any = {};
if (search) {
  query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { sku: { $regex: search, $options: 'i' } }
  ];
}
```

#### Q91: How is pagination handled on the server when fetching product lists?
**Answer:** In [inventoryController.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/controllers/inventoryController.ts) lines 21-28, it queries database counts and applies `.skip()` and `.limit()` modifiers:
```typescript
const totalCount = await Product.countDocuments(query);
const products = await Product.find(query)
  .sort({ name: 1 })
  .skip((page - 1) * limit)
  .limit(limit);
```

#### Q92: How are low stock alert reports queried dynamically from MongoDB?
**Answer:** In [inventoryController.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/controllers/inventoryController.ts) lines 52-54, low stock products are matched using the `$expr` operator:
```typescript
const lowStockProducts = await Product.find({
  $expr: { $lte: ['$stock.quantity', '$stock.lowStockAlert'] }
});
```

#### Q93: How does the backend determine if a batch is expiring within 90 days?
**Answer:** In [inventoryController.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/controllers/inventoryController.ts) lines 47-59, the backend checks dates against a calculated range:
```typescript
const ninetyDaysLater = new Date();
ninetyDaysLater.setDate(today.getDate() + 90);
const expiringProducts = await Product.find({
  'batches.expiryDate': { $gte: today, $lte: ninetyDaysLater }
});
```

#### Q94: How does `getInvoices` retrieve paginated lists of historical transactions?
**Answer:** In [invoiceController.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/controllers/invoiceController.ts) lines 7-40:
```typescript
const invoices = await Invoice.find(query)
  .sort({ date: -1 })
  .skip(skip)
  .limit(limit);
```

#### Q95: Explain the customer statement generation logic in `getCustomerLedger`.
**Answer:** In [customerController.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/controllers/customerController.ts) lines 8-46, it queries invoices associated with the customer, aggregates outstanding balances chronologically, and returns ledger entries:
```typescript
const customerInvoices = await Invoice.find({ customerId: id }).sort({ date: 1 });
let runningBalance = 0;
const entries = customerInvoices.map(invoice => {
  const grandTotal = parseFloat(invoice.totals.grandTotal.toString());
  runningBalance += grandTotal;
  return {
    date: invoice.date,
    reference: invoice.invoiceNumber,
    type: 'Invoice (Debit)',
    amount: grandTotal,
    runningBalance
  };
});
```

#### Q96: What script runs the TypeScript compilation on the backend?
**Answer:** `npm run build`, which triggers `tsc` compiler rules.

#### Q97: What command runs backend development servers in real-time reload environments?
**Answer:** `npm run dev`, which fires `ts-node-dev --respawn --transpile-only src/server.ts`.

#### Q98: What is the main configuration file for backend compile pipelines?
**Answer:** [tsconfig.json](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/tsconfig.json).

#### Q99: What is the configuration value for target compiler outputs in `backend/tsconfig.json`?
**Answer:** `"target": "es2020"` (see [tsconfig.json](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/tsconfig.json#L4)).

#### Q100: How is the Socket.io sync listener initialized in backend `server.ts`?
**Answer:** In [server.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/server.ts) line 56:
```typescript
initSocketManager(io);
```

#### Q101: What packages are in the backend `dependencies` catalog?
**Answer:** `express`, `mongoose`, `socket.io`, `cors`, and `dotenv`.

#### Q102: What packages are in `devDependencies` for the backend?
**Answer:** `@types/express`, `@types/cors`, `@types/node`, `ts-node-dev`, and `typescript`.

#### Q103: How does the Express app configure incoming JSON parse body limits?
**Answer:** In [server.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/server.ts) line 36:
```typescript
app.use(express.json());
```

#### Q104: Where is the CORS header policy configured for REST API requests?
**Answer:** In [server.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/server.ts) line 35 via `app.use(cors())`.

#### Q105: How are cross-origin requests restricted for WebSockets on initialization?
**Answer:** Inside [server.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/server.ts) lines 24-29, the Socket.io constructor allows wildcard HTTP method entries:
```typescript
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
```

#### Q106: Where is environment variable config initialized on startup?
**Answer:** In [server.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/server.ts) line 8 via `dotenv.config()`.

#### Q107: What is the fallback port parameter for the express server?
**Answer:** In [server.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/server.ts) line 59:
```typescript
const PORT = process.env.PORT || 5000;
```

#### Q108: How are MongoDB connection logs printed in the startup output?
**Answer:** In [db.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/config/db.ts) line 7:
```typescript
console.log('✅ Connected to MongoDB successfully (TypeScript)');
```

#### Q109: What command terminates backend servers if MongoDB connection errors occur?
**Answer:** In [db.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/config/db.ts) line 10:
```typescript
process.exit(1);
```

#### Q110: How does the backend WebSocket disconnect handler clean up state?
**Answer:** In [socketManager.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/sync/socketManager.ts) lines 136-138, it registers a disconnect log:
```typescript
socket.on('disconnect', () => {
  console.log(`🔌 Client disconnected: ${socket.id}`);
});
```

---

## Section 4: GST Compliance & Financial Calculation Engine (Q111 - Q130)

#### Q111: Explain CGST, SGST, and IGST components in Indian GST compliance.
**Answer:** 
- **CGST (Central Goods and Services Tax):** Collected by the Central Government on Intrastate sales transactions.
- **SGST (State Goods and Services Tax):** Collected by the State Government on Intrastate sales transactions.
- **IGST (Integrated Goods and Services Tax):** Collected by the Central Government on Interstate transactions.

#### Q112: Under what conditions does the system calculate Intrastate CGST/SGST?
**Answer:** When the state code of the selected customer matches the merchant's state code (`'19'` - West Bengal).

#### Q113: Under what conditions does the system calculate Interstate IGST?
**Answer:** When the state code of the selected customer differs from the merchant's state code (`'19'`).

#### Q114: Explain the tax calculation splits implemented in the Zustand store.
**Answer:** In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 180-191:
```typescript
const isInterstate = selectedCustomer && selectedCustomer.stateCode !== MERCHANT_STATE_CODE;
const taxRate = item.gstRate;

if (isInterstate) {
  itemIGST = itemTaxable * (taxRate / 100);
  totalIGST += itemIGST;
} else {
  itemCGST = itemTaxable * ((taxRate / 2) / 100);
  itemSGST = itemTaxable * ((taxRate / 2) / 100);
  totalCGST += itemCGST;
  totalSGST += itemSGST;
}
```

#### Q115: How is the taxable value computed for an invoice item?
**Answer:** Inside [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) line 174:
```typescript
const itemTaxable = unitPrice * quantity;
```

#### Q116: How does the application prevent decimal values from causing currency fractions during cash checkouts?
**Answer:** The checkout total is rounded to the nearest integer for Cash and Credit transactions. In [useStore.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/store/useStore.ts) lines 210-213:
```typescript
if (method === 'Cash' || method === 'Credit') {
  // Round to nearest integer to avoid fractional payments for Cash/Credit
  grandTotal = Math.round(grandTotal);
}
```

#### Q117: Why does the system bypass currency rounding for UPI payment methods?
**Answer:** UPI checkout methods use real-time digital bank-to-bank transfers. Digital checkouts can handle exact decimal amounts directly (e.g. ₹124.74), making physical coin rounding unnecessary.

#### Q118: What is HSN and how are codes structured in the POS billing terminal?
**Answer:** HSN (Harmonized System of Nomenclature) is a standard classification code system. Preset parameters are configured in [constants.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/constants.ts) lines 4-33:
```typescript
export const HSN_PRESETS = [
  { code: '3004', name: 'Medicines / Pharmaceuticals', gst: 12, category: 'Healthcare' },
  { code: '9018', name: 'Medical Devices & Equipments', gst: 18, category: 'Healthcare' },
  { code: '6307', name: 'Face Masks (N95/Surgical)', gst: 5, category: 'Healthcare' },
  ...
];
```

#### Q119: How does selecting a preset HSN category update inputs in the catalog UI?
**Answer:** In [InventoryCatalogTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/InventoryCatalogTab.tsx) lines 201-209, selecting a preset from the dropdown automatically populates the HSN and GST rate states:
```typescript
onChange={(e) => {
  const selected = HSN_PRESETS.find(item => item.code === e.target.value);
  if (selected) {
    setPHsn(selected.code);
    setPGstRate(selected.gst);
  }
}}
```

#### Q120: What is the merchant state code set to in frontend configurations?
**Answer:** State Code `'19'` (West Bengal), defined in [constants.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/constants.ts) line 2.

#### Q121: What is GSTR-1?
**Answer:** GSTR-1 is a monthly or quarterly tax return document that merchants in India must file, listing all outward sales supplies.

#### Q122: Under what category does GSTR-1 file sales to registered GSTIN customers?
**Answer:** **B2B (Business-to-Business)** invoices.

#### Q123: Under what category does GSTR-1 file sales to retail/unregistered customers?
**Answer:** **B2CS (Business-to-Consumer Small)** invoices.

#### Q124: How does the frontend group invoices for B2B vs B2CS inside `Gstr1TaxTab.tsx`?
**Answer:** In [Gstr1TaxTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/Gstr1TaxTab.tsx) lines 45-83:
```typescript
const isB2B = !!inv.customerGSTIN;
if (isB2B) {
  b2b.push({
    ctin: inv.customerGSTIN,
    inv: [{
      inum: inv.invoiceNumber,
      idt: new Date(inv.date).toLocaleDateString('en-GB'),
      val: parseFloat(inv.totals.grandTotal),
      pos: inv.billingStateCode,
...
```

#### Q125: How does the frontend aggregate product metrics under HSN summaries for GSTR-1 files?
**Answer:** In [Gstr1TaxTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/Gstr1TaxTab.tsx) lines 85-108, items are grouped by their HSN and tax rate:
```typescript
inv.items.forEach((item) => {
  const key = `${item.hsnCode}_${item.gstRate}`;
  if (!hsnSummaryMap.has(key)) {
    hsnSummaryMap.set(key, { hsn_sc: item.hsnCode, desc: item.name.substring(0, 30), ... });
  }
  const entry = hsnSummaryMap.get(key);
  entry.qty += item.quantity;
  entry.txval += parseFloat(item.taxableValue);
...
```

#### Q126: How is the compiled GSTR-1 report downloaded as a compliant JSON schema file?
**Answer:** In [Gstr1TaxTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/Gstr1TaxTab.tsx) lines 127-139, the frontend creates a temporary download link with a Blob URL:
```typescript
const data = getGstr1Data();
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `GSTR-1_${gstr1Month}_${data.gstin}.json`;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
```

#### Q127: How does the backend generate financial statistics in `reportController.ts`?
**Answer:** The controller queries invoices with `syncStatus === 'synced'` and aggregates B2B, B2CS, and HSN counts in a structure identical to the frontend's GSTR-1 tab (see [reportController.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/backend/src/controllers/reportController.ts#L7-L93)).

#### Q128: How are values formatted inside the final backend reports?
**Answer:** Values are explicitly converted from MongoDB types to floats:
```typescript
val: parseFloat(inv.totals.grandTotal.toString())
```

#### Q129: What is the merchant state code set to in backend tax logic?
**Answer:** `'19'` (West Bengal), matching the client-side constant.

#### Q130: How does the system compute Interstate IGST values in `reportController.ts`?
**Answer:** If the invoice billing state code is not `'19'`, it evaluates IGST:
```typescript
iamt: inv.billingStateCode !== MERCHANT_STATE_CODE ? parseFloat(item.igst.toString()) : 0
```

---

## Section 5: Hardware, Native APIs & Browser Integration (Q131 - Q150)

#### Q131: What library is used to capture hardware cameras for barcode scans?
**Answer:** **html5-qrcode** (see [CameraScannerModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/CameraScannerModal.tsx) line 3).

#### Q132: What specific barcode formats are supported in the HTML5 Qrcode configuration?
**Answer:** EAN_13, EAN_8, CODE_128, CODE_39, UPC_A, UPC_E, and QR_CODE (configured in [CameraScannerModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/CameraScannerModal.tsx#L78-L86)).

#### Q133: How does the application automatically grant media device access in Electron?
**Answer:** Inside [main.js](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/main.js) lines 36-42, Electron overrides the session's permission request handler:
```javascript
session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
  if (permission === 'media') {
    callback(true); // Automatically grant camera permission
  } else {
    callback(false);
  }
});
```

#### Q134: How does `CameraScannerModal.tsx` request active camera hardware listings?
**Answer:** In [CameraScannerModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/CameraScannerModal.tsx) lines 161-165:
```typescript
Html5Qrcode.getCameras().then(devices => {
  if (devices && devices.length > 0) {
    setCameras(devices);
  }
})
```

#### Q135: How does the scanner modal handle digital zooming capabilities dynamically?
**Answer:** In [CameraScannerModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/CameraScannerModal.tsx) lines 145-154, it queries camera capabilities and exposes control ranges if supported:
```typescript
if (capabilities.zoomFeature && capabilities.zoomFeature().isSupported()) {
  const zoom = capabilities.zoomFeature();
  setZoomSupported(true);
  setZoomMin(zoom.min() || 1);
  setZoomMax(zoom.max() || 10);
  setZoomStep(zoom.step() || 0.1);
  setZoomValue(zoom.value() || 1);
}
```

#### Q136: What method applies the updated zoom value back to the camera track?
**Answer:** In [CameraScannerModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/CameraScannerModal.tsx) lines 55-67:
```typescript
const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
if (capabilities.zoomFeature && capabilities.zoomFeature().isSupported()) {
  const zoom = capabilities.zoomFeature();
  await zoom.apply(val);
  setZoomValue(val);
}
```

#### Q137: How is the flashlight/torch turned ON or OFF programmatically?
**Answer:** In [CameraScannerModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/CameraScannerModal.tsx) lines 37-53, it updates the camera track capabilities:
```typescript
const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
if (capabilities.torchFeature && capabilities.torchFeature().isSupported()) {
  const torch = capabilities.torchFeature();
  const nextState = !torchOn;
  await torch.apply(nextState);
  setTorchOn(nextState);
}
```

#### Q138: How is the camera stream stopped on modal unmounting to release resources?
**Answer:** Inside `useEffect` cleanup return in [CameraScannerModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/CameraScannerModal.tsx) lines 174-185:
```typescript
return () => {
  if (activeScanner) {
    try {
      if (activeScanner.isScanning) {
        activeScanner.stop().catch(err => ...);
      }
    } catch (e) { ... }
    html5QrCodeRef.current = null;
  }
};
```
Failing to stop the scanner keeps the camera active and locked, preventing other parts of the app or other applications from accessing it.

#### Q139: How does visual mirroring apply to front-facing preview screens?
**Answer:** Inside [CameraScannerModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/CameraScannerModal.tsx) line 229:
```typescript
<div className={`scanner-viewport-wrapper ${isMirrored ? 'mirror-feed' : ''}`} ...>
```
The CSS class `mirror-feed` applies a 2D transform scale: `transform: scaleX(-1)` to render a natural mirror perspective to the operator.

#### Q140: Explain how silent/headless receipt printing is spooled in Electron main process.
**Answer:** Inside [main.js](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/main.js) lines 151-183, the IPC handler `print-receipt` instantiates a hidden window, loads the formatted HTML string, and triggers printing on load:
```javascript
ipcMain.handle('print-receipt', async (event, receiptData) => {
  const html = generateReceiptHtml(receiptData);
  let printWindow = new BrowserWindow({ show: false, ... });
  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      printWindow.destroy();
      ...
    });
  });
});
```

#### Q141: What arguments does `generateReceiptHtml` expect to compile the receipt HTML?
**Answer:** An `Invoice` object.

#### Q142: How does the application select which tax headers to print on thermal slips?
**Answer:** In [main.js](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/main.js) lines 71-74, it checks the `totalIGST` property:
```javascript
const taxRowsHtml = parseFloat(invoice.totals.totalIGST) > 0
  ? `<tr><td>IGST:</td><td colspan="2">₹${parseFloat(invoice.totals.totalIGST).toFixed(2)}</td></tr>`
  : `<tr><td>CGST:</td><td colspan="2">₹${parseFloat(invoice.totals.totalCGST).toFixed(2)}</td></tr>
     <tr><td>SGST:</td><td colspan="2">₹${parseFloat(invoice.totals.totalSGST).toFixed(2)}</td></tr>`;
```

#### Q143: Explain the fallback printing strategy implemented in `printUtils.ts`.
**Answer:** In [printUtils.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/printUtils.ts) lines 116-132, the utility detects if the app is running inside Electron. If `window.electronAPI` is absent (PWA browser mode), it falls back to window spooling:
```typescript
export const handleReprint = async (invoice, addToast) => {
  const win = window as any;
  if (win.electronAPI) {
    try {
      await win.electronAPI.printReceipt(invoice);
    } catch (e) {
      triggerBrowserPrint(invoice, addToast);
    }
  } else {
    triggerBrowserPrint(invoice, addToast);
  }
};
```

#### Q144: How does `triggerBrowserPrint` simulate receipt printing in standard web browsers?
**Answer:** Inside [printUtils.ts](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/printUtils.ts) lines 8-12 and 103-108, it opens a small popup window, writes the receipt HTML, calls `window.print()` upon loading, and closes itself shortly after:
```typescript
const printWindow = window.open('', '_blank', 'width=450,height=600');
...
printWindow.document.write(`
  ...
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    }
  </script>
`);
```

#### Q145: What format does the UPI checkout QR code schema follow?
**Answer:** Standard Bharat UPI Deep Linking specification.

#### Q146: What library is used to generate the QR codes visually?
**Answer:** **qrcode** (see [UpiPaymentModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/UpiPaymentModal.tsx) line 3).

#### Q147: Explain the UPI URI format generated by `UpiPaymentModal.tsx`.
**Answer:** In [UpiPaymentModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/UpiPaymentModal.tsx) lines 25-28:
```typescript
const upiUrl = `upi://pay?pa=9883995131-3@ybl&pn=EasyACC%20Store&am=${grandTotal}&cu=INR`;
QRCode.toDataURL(upiUrl, { width: 250, margin: 2 }).then(url => {
  setUpiQrUrl(url);
});
```
This maps the merchant account virtual address (`pa`), merchant name (`pn`), and the transaction totals (`am`) into a QR image data URL.

#### Q148: What is the merchant virtual address (UPI ID) configured in the payments modal?
**Answer:** `9883995131-3@ybl` (see [UpiPaymentModal.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/modals/UpiPaymentModal.tsx#L96)).

#### Q149: How is GSTR-1 tax compliance reporting compiled in `Gstr1TaxTab.tsx`?
**Answer:** GSTR-1 monthly sales returns are generated by querying local invoices for the reporting period (e.g. `YYYY-MM`), categorizing them into B2B and B2CS based on client GSTIN presence, compiling HSN classifications, and downloading them as a government-compliant JSON payload.

#### Q150: Explain the SMS payment reminder simulation in the Credit Book.
**Answer:** In [CreditBookTab.tsx](file:///c:/Users/rohit/Downloads/Easyacc-POS/desktop-client/src/components/billing/CreditBookTab.tsx) lines 73-77, a simulated SMS notification alert is logged to the debug console:
```typescript
const handleCustomerRemindSMS = (customer: Customer) => {
  const message = `Payment Reminder SMS simulated to ${customer.phone}: Dear ${customer.name}, you have a balance of ₹${parseFloat(customer.balance || '0').toFixed(2)} due at EasyACC. Please settle.`;
  console.log(message);
  addToast(`SMS Reminder simulated to ${customer.phone}!`, 'info');
};
```
This logs outstanding credit ledger balances and phone metadata, demonstrating outward SMS notification routing logic.
