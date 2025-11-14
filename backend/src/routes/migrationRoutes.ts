import { Router } from 'express';
import { applyCommissionFixMigration } from '../controllers/migrationController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';

const router = Router();

// Aplicar migração de comissão fixa (apenas admin)
router.post('/apply-commission-fix', authenticateToken, authorizeRoles('admin'), applyCommissionFixMigration);

export default router;
