import { Router } from 'express';
import { getGstr1Report } from '../controllers/reportController';

const router = Router();

// GET /api/reports/gstr1
router.get('/gstr1', getGstr1Report);

export default router;
