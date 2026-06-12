import { Router } from 'express';
import { getInventoryAlerts, getProducts } from '../controllers/inventoryController';

const router = Router();

// GET /api/inventory
router.get('/', getProducts);

// GET /api/inventory/alerts
router.get('/alerts', getInventoryAlerts);

export default router;
