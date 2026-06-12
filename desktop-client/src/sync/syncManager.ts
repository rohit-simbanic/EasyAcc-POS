import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { EasyACCDatabase } from '../db/localDb';
import { Product, Customer } from '../types';

let socket: Socket | null = null;
let isSyncing = false;

export const initSyncManager = (db: EasyACCDatabase) => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5005';
  socket = io(BACKEND_URL);

  socket.on('connect', () => {
    console.log('📡 Sync client connected to server');
    useStore.getState().setOnline(true);
    triggerSync(db);
  });

  socket.on('disconnect', () => {
    console.log('📡 Sync client disconnected (Offline mode active)');
    useStore.getState().setOnline(false);
  });

  setInterval(() => {
    triggerSync(db);
  }, 30000);
};

export const triggerSync = async (db: EasyACCDatabase) => {
  if (isSyncing || !socket || !socket.connected) return;
  isSyncing = true;

  try {
    console.log('🔄 Sync cycle started...');

    // 1. PUSH: Get all pending invoices
    const pendingInvoicesDoc = await db.invoices.find({
      selector: { syncStatus: 'pending' }
    }).exec();

    const pendingInvoices = pendingInvoicesDoc.map((doc: any) => doc.toJSON());

    if (pendingInvoices.length > 0) {
      console.log(`📤 Pushing ${pendingInvoices.length} invoices to server...`);
      
      const response: any = await new Promise((resolve, reject) => {
        socket!.emit('sync_push', { invoices: pendingInvoices }, (res: any) => {
          if (res && res.success) resolve(res);
          else reject(new Error(res ? res.error : 'Sync failed'));
        });
      });

      if (response.success && response.syncedIds.invoices.length > 0) {
        for (const id of response.syncedIds.invoices) {
          const doc = await db.invoices.findOne({ selector: { _id: id } }).exec();
          if (doc) {
            await doc.patch({ syncStatus: 'synced' });
          }
        }
        console.log(`✅ Synced ${response.syncedIds.invoices.length} invoices successfully.`);
      }
    }

    // 2. PULL: Fetch newer products/customers
    const lastPullTime = localStorage.getItem('lastPullTime') || '';
    
    const pullResponse: any = await new Promise((resolve, reject) => {
      socket!.emit('sync_pull', lastPullTime, (res: any) => {
        if (res && res.success) resolve(res);
        else reject(new Error(res ? res.error : 'Pull failed'));
      });
    });

    if (pullResponse.success) {
      let catalogUpdated = false;

      if (pullResponse.products && pullResponse.products.length > 0) {
        console.log(`📥 Pulling ${pullResponse.products.length} updated products...`);
        catalogUpdated = true;
        for (const prod of pullResponse.products) {
          const formattedProd = {
            ...prod,
            price: {
              purchasePrice: prod.price.purchasePrice.$numberDecimal || prod.price.purchasePrice.toString(),
              mrp: prod.price.mrp.$numberDecimal || prod.price.mrp.toString(),
              sellingPrice: prod.price.sellingPrice.$numberDecimal || prod.price.sellingPrice.toString()
            }
          };
          await db.products.upsert(formattedProd as Product);
        }
      }

      if (pullResponse.customers && pullResponse.customers.length > 0) {
        console.log(`📥 Pulling ${pullResponse.customers.length} updated customers...`);
        catalogUpdated = true;
        for (const cust of pullResponse.customers) {
          const formattedCust = {
            ...cust,
            balance: cust.balance?.$numberDecimal || cust.balance?.toString() || '0'
          };
          await db.customers.upsert(formattedCust as Customer);
        }
      }

      localStorage.setItem('lastPullTime', pullResponse.serverTime);

      // Trigger catalog refresh in Zustand store if updates were pulled
      if (catalogUpdated) {
        await useStore.getState().fetchCatalog();
      }
    }

    console.log('🔄 Sync cycle completed successfully');
  } catch (error: any) {
    console.error('❌ Sync cycle error:', error.message);
  } finally {
    isSyncing = false;
  }
};
