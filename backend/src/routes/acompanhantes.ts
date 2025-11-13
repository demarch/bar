import { Router } from 'express';
import {
  listarAcompanhantes,
  listarAcompanhantesAtivas,
  criarAcompanhante,
  atualizarAcompanhante,
  ativarAcompanhante,
  desativarAcompanhante,
  relatorioComissoes,
} from '../controllers/acompanhanteController';
import { authenticate, authorize } from '../middlewares/auth';
import { validate, schemas } from '../middlewares/validator';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/acompanhantes - Listar todas acompanhantes
router.get('/', listarAcompanhantes);

// GET /api/acompanhantes/ativas - Listar acompanhantes ativas hoje
router.get('/ativas', listarAcompanhantesAtivas);

// POST /api/acompanhantes - Criar acompanhante (apenas admin)
router.post('/', authorize('admin'), validate(schemas.createAcompanhante), criarAcompanhante);

// PUT /api/acompanhantes/:id - Atualizar acompanhante (apenas admin)
router.put('/:id', authorize('admin'), validate(schemas.createAcompanhante), atualizarAcompanhante);

// POST /api/acompanhantes/:id/ativar - Ativar acompanhante para o dia
router.post('/:id/ativar', ativarAcompanhante);

// DELETE /api/acompanhantes/:id/desativar - Desativar acompanhante do dia
router.delete('/:id/desativar', desativarAcompanhante);

// GET /api/acompanhantes/:id/comissoes - Relatório de comissões
router.get('/:id/comissoes', relatorioComissoes);

export default router;
