import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Customer from '../models/Customer';
import Invoice from '../models/Invoice';

export const initSocketManager = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Push Sync handler
    socket.on('sync_push', async (data: any, callback: Function) => {
      let session: mongoose.ClientSession | undefined = undefined;
      let useTransaction = false;

      try {
        if (mongoose.connection.db) {
          const hello: any = await mongoose.connection.db.admin().command({ hello: 1 });
          if (hello.setName) {
            useTransaction = true;
            session = await mongoose.startSession();
            session.startTransaction();
          } else {
            console.log('⚠️ MongoDB is running in Standalone Mode. Transactions disabled (sequential queries active).');
          }
        } else {
          console.log('⚠️ MongoDB connection.db is not initialized.');
        }
      } catch (e: any) {
        console.log('⚠️ Failed to initialize MongoDB session/transaction:', e.message);
        useTransaction = false;
      }

      try {
        const { invoices, products, customers } = data;
        const syncedIds = { invoices: [], products: [], customers: [] };
        const options = useTransaction ? { session } : {};

        // 1. Sync Customers
        if (customers && customers.length > 0) {
          for (const customer of customers) {
            await Customer.findOneAndUpdate(
              { _id: customer._id },
              customer,
              { upsert: true, new: true, ...options }
            );
            (syncedIds.customers as any[]).push(customer._id);
          }
        }

        // 2. Sync Products
        if (products && products.length > 0) {
          for (const product of products) {
            await Product.findOneAndUpdate(
              { _id: product._id },
              product,
              { upsert: true, new: true, ...options }
            );
            (syncedIds.products as any[]).push(product._id);
          }
        }

        // 3. Sync Invoices (Deduct stock and update client ledger balance)
        if (invoices && invoices.length > 0) {
          for (const invoice of invoices) {
            const existingInvoice = await Invoice.findById(invoice._id).session(useTransaction && session ? session : null);
            if (!existingInvoice) {
              // New invoice: adjust product stocks
              for (const item of invoice.items) {
                await Product.updateOne(
                  { _id: item.productId },
                  { $inc: { 'stock.quantity': -item.quantity } },
                  options
                );
              }

              // Update Customer Ledger Balance if not a cash customer and payment is not fully paid
              if (invoice.customerId && (invoice.paymentStatus === 'Unpaid' || invoice.paymentStatus === 'Partial')) {
                const amount = parseFloat(invoice.totals.grandTotal);
                if (!isNaN(amount)) {
                  await Customer.updateOne(
                    { _id: invoice.customerId },
                    { $inc: { balance: amount } },
                    options
                  );
                }
              }
            }

            // Save Invoice
            await Invoice.findOneAndUpdate(
              { _id: invoice._id },
              { ...invoice, syncStatus: 'synced' },
              { upsert: true, new: true, ...options }
            );
            (syncedIds.invoices as any[]).push(invoice._id);
          }
        }

        if (useTransaction && session) {
          await session.commitTransaction();
          session.endSession();
        }

        callback({ success: true, syncedIds });
      } catch (error: any) {
        if (useTransaction && session) {
          await session.abortTransaction();
          session.endSession();
        }
        console.error('❌ Sync failed:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Pull Sync handler
    socket.on('sync_pull', async (lastPullTime: string, callback: Function) => {
      try {
        const pullDate = lastPullTime ? new Date(lastPullTime) : new Date(0);
        
        const updatedProducts = await Product.find({ updatedAt: { $gt: pullDate } });
        const updatedCustomers = await Customer.find({ updatedAt: { $gt: pullDate } });

        callback({
          success: true,
          products: updatedProducts,
          customers: updatedCustomers,
          serverTime: new Date()
        });
      } catch (error: any) {
        console.error('❌ Pull failed:', error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
