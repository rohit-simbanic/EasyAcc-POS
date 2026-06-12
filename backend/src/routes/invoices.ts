import { Router } from 'express';
import { getInvoices } from '../controllers/invoiceController';

const router = Router();

// GET /api/invoices
router.get('/', getInvoices);

export default router;
