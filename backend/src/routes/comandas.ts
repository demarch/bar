import { Router } from 'express';
import {
  listarComandasAbertas,
  criarComanda,
  buscarComanda,
  adicionarItem,
  fecharComanda,
  cancelarItem,
} from '../controllers/comandaController';
import { authenticate, authorize } from '../middlewares/auth';
import { validate, schemas } from '../middlewares/validator';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/comandas - Listar comandas abertas
router.get('/', listarComandasAbertas);

// POST /api/comandas - Criar nova comanda
router.post('/', validate(schemas.createComanda), criarComanda);

// GET /api/comandas/:numero - Buscar comanda por número
router.get('/:numero', buscarComanda);

// POST /api/comandas/itens - Adicionar item à comanda
router.post('/itens', validate(schemas.addItemComanda), adicionarItem);

// PUT /api/comandas/:id/fechar - Fechar comanda (apenas caixa e admin)
router.put('/:id/fechar', authorize('caixa', 'admin'), fecharComanda);

// PUT /api/comandas/itens/:id/cancelar - Cancelar item
router.put('/itens/:id/cancelar', authorize('caixa', 'admin'), cancelarItem);

export default router;
