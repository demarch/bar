import { Router } from 'express';
import {
  abrirCaixa,
  buscarCaixaAberto,
  registrarSangria,
  fecharCaixa,
  relatorioCaixa,
} from '../controllers/caixaController';
import { authenticate, authorize } from '../middlewares/auth';
import { validate, schemas } from '../middlewares/validator';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/caixa/aberto - Buscar caixa aberto
router.get('/aberto', buscarCaixaAberto);

// POST /api/caixa/abrir - Abrir caixa (apenas caixa e admin)
router.post('/abrir', authorize('caixa', 'admin'), validate(schemas.abrirCaixa), abrirCaixa);

// POST /api/caixa/sangria - Registrar sangria (apenas caixa e admin)
router.post('/sangria', authorize('caixa', 'admin'), validate(schemas.sangria), registrarSangria);

// PUT /api/caixa/fechar - Fechar caixa (apenas caixa e admin)
router.put('/fechar', authorize('caixa', 'admin'), validate(schemas.fecharCaixa), fecharCaixa);

// GET /api/caixa/:id/relatorio - Relatório do caixa
router.get('/:id/relatorio', authorize('caixa', 'admin'), relatorioCaixa);

export default router;
