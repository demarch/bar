import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Dashboard disponível apenas para admin
router.use(authorize('admin'));

// GET /api/admin/dashboard - Estatísticas do dashboard
router.get('/', getDashboardStats);

export default router;
