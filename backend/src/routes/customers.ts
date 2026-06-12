import { Router } from 'express';
import { getCustomerLedger } from '../controllers/customerController';

const router = Router();

// GET /api/customers/:id/ledger
router.get('/:id/ledger', getCustomerLedger);

export default router;
