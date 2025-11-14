import { Router } from 'express';
import {
  listarQuartos,
  listarQuartosAtivos,
  buscarQuarto,
  criarQuarto,
  atualizarQuarto,
  deletarQuarto,
  listarConfiguracoes,
  atualizarConfiguracao,
} from '../controllers/quartoAdminController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ============================================
// ROTAS DE QUARTOS (ADMIN)
// ============================================

// GET /api/admin/quartos - Listar todos os quartos
router.get('/', authorize(['admin']), listarQuartos);

// GET /api/admin/quartos/ativos - Listar quartos ativos
router.get('/ativos', listarQuartosAtivos);

// GET /api/admin/quartos/:id - Buscar quarto por ID
router.get('/:id', buscarQuarto);

// POST /api/admin/quartos - Criar novo quarto
router.post('/', authorize(['admin']), criarQuarto);

// PUT /api/admin/quartos/:id - Atualizar quarto
router.put('/:id', authorize(['admin']), atualizarQuarto);

// DELETE /api/admin/quartos/:id - Deletar quarto
router.delete('/:id', authorize(['admin']), deletarQuarto);

// ============================================
// ROTAS DE CONFIGURAÇÕES (ADMIN)
// ============================================

// GET /api/admin/quartos/configuracoes/list - Listar configurações
router.get('/configuracoes/list', authorize(['admin']), listarConfiguracoes);

// PUT /api/admin/quartos/configuracoes/:id - Atualizar configuração
router.put('/configuracoes/:id', authorize(['admin']), atualizarConfiguracao);

export default router;
