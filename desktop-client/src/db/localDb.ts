import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { Product, Customer, Invoice } from '../types';

addRxPlugin(RxDBMigrationSchemaPlugin);


export type EasyACCDatabaseCollections = {
  products: RxCollection<Product>;
  customers: RxCollection<Customer>;
  invoices: RxCollection<Invoice>;
};

export type EasyACCDatabase = RxDatabase<EasyACCDatabaseCollections>;

const productSchema = {
  title: 'product schema',
  version: 1,
  description: 'describes a retail/wholesale product',
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 100 },
    sku: { type: 'string', maxLength: 100 },
    hsnCode: { type: 'string', maxLength: 100 },
    gstRate: { type: 'number' },
    price: {
      type: 'object',
      properties: {
        purchasePrice: { type: 'string' },
        mrp: { type: 'string' },
        sellingPrice: { type: 'string' }
      }
    },
    stock: {
      type: 'object',
      properties: {
        quantity: { type: 'number' },
        lowStockAlert: { type: 'number' }
      }
    },
    updatedAt: { type: 'string', maxLength: 100 }
  },
  required: ['_id', 'name', 'sku', 'hsnCode', 'gstRate', 'price', 'stock'],
  indexes: ['sku', 'name', 'hsnCode', 'updatedAt']
};

const customerSchema = {
  title: 'customer schema',
  version: 1,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 100 },
    gstin: { type: 'string' },
    stateCode: { type: 'string' },
    phone: { type: 'string', maxLength: 100 },
    balance: { type: 'string' },
    updatedAt: { type: 'string', maxLength: 100 }
  },
  required: ['_id', 'name', 'stateCode'],
  indexes: ['name', 'phone', 'updatedAt']
};

const invoiceSchema = {
  title: 'invoice schema',
  version: 1,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 100 },
    invoiceNumber: { type: 'string', maxLength: 100 },
    date: { type: 'string', maxLength: 100 },
    customerId: { type: 'string', maxLength: 100 },
    customerName: { type: 'string', maxLength: 100 },
    customerGSTIN: { type: 'string' },
    billingStateCode: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          name: { type: 'string' },
          hsnCode: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { type: 'string' },
          taxableValue: { type: 'string' },
          gstRate: { type: 'number' },
          cgst: { type: 'string' },
          sgst: { type: 'string' },
          igst: { type: 'string' }
        }
      }
    },
    totals: {
      type: 'object',
      properties: {
        taxableAmount: { type: 'string' },
        totalCGST: { type: 'string' },
        totalSGST: { type: 'string' },
        totalIGST: { type: 'string' },
        grandTotal: { type: 'string' }
      }
    },
    paymentStatus: { type: 'string' },
    syncStatus: { type: 'string' }
  },
  required: ['_id', 'invoiceNumber', 'date', 'customerName', 'billingStateCode', 'items', 'totals', 'syncStatus'],
  indexes: ['invoiceNumber', 'customerName', 'date', 'customerId']
};

let dbPromise: Promise<EasyACCDatabase> | null = null;

const createDatabase = async (): Promise<EasyACCDatabase> => {
  const db = await createRxDatabase<EasyACCDatabaseCollections>({
    name: 'easyaccdb',
    storage: getRxStorageDexie()
  });

  await db.addCollections({
    products: { 
      schema: productSchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc
      }
    },
    customers: { 
      schema: customerSchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc
      }
    },
    invoices: { 
      schema: invoiceSchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc
      }
    }
  });

  return db;
};

export const getDatabase = (): Promise<EasyACCDatabase> => {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
};
