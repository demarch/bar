import { Router } from 'express';
import RelatorioController from '../controllers/RelatorioController';
import { authenticateToken, requireCaixaOrAdmin } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação de caixa ou admin
router.use(authenticateToken, requireCaixaOrAdmin);

// Relatório de vendas
router.get('/vendas', RelatorioController.vendas);

// Relatório de comissões
router.get('/comissoes', RelatorioController.comissoes);

// Relatório de fluxo de caixa
router.get('/fluxo-caixa', RelatorioController.fluxoCaixa);

// Dashboard geral
router.get('/dashboard', RelatorioController.dashboard);

export default router;
