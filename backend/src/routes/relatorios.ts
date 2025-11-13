import { Router } from 'express';
import {
  relatorioFluxoCaixa,
  relatorioComissoes,
  relatorioVendas,
  relatorioRentabilidade,
} from '../controllers/relatorioController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Relatórios disponíveis para admin e caixa
router.use(authorize('admin', 'caixa'));

// GET /api/relatorios/fluxo-caixa - Relatório de fluxo de caixa
router.get('/fluxo-caixa', relatorioFluxoCaixa);

// GET /api/relatorios/comissoes - Relatório de comissões
router.get('/comissoes', relatorioComissoes);

// GET /api/relatorios/vendas - Relatório de vendas
router.get('/vendas', relatorioVendas);

// GET /api/relatorios/rentabilidade - Relatório de rentabilidade
router.get('/rentabilidade', relatorioRentabilidade);

export default router;
