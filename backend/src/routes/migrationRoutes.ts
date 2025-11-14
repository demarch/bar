import { Router } from 'express';
import { applyCommissionFixMigration } from '../controllers/migrationController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Aplicar migração de comissão fixa (apenas admin)
router.post('/apply-commission-fix', authenticate, authorize('admin'), applyCommissionFixMigration);

export default router;
