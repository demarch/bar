import { Router } from 'express';
import {
  listarComandasAbertas,
  criarComanda,
  buscarComanda,
  adicionarItem,
  fecharComanda,
  cancelarItem,
  adicionarServicoQuarto,
  adicionarServicoTempoLivre,
  listarServicosTempoLivreEmAndamento,
  calcularValorTempoLivre,
  confirmarServicoTempoLivre,
  cancelarCalculoTempoLivre,
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

// POST /api/comandas/itens - Adicionar item à comanda
router.post('/itens', validate(schemas.addItemComanda), adicionarItem);

// POST /api/comandas/servico-quarto - Adicionar serviço de quarto com múltiplas acompanhantes
router.post('/servico-quarto', adicionarServicoQuarto);

// ============================================
// ROTAS DE TEMPO LIVRE (devem vir antes de /:numero para não conflitar)
// ============================================

// GET /api/comandas/tempo-livre - Listar serviços de tempo livre em andamento
router.get('/tempo-livre', listarServicosTempoLivreEmAndamento);

// POST /api/comandas/tempo-livre - Adicionar serviço de quarto com tempo livre
router.post('/tempo-livre', adicionarServicoTempoLivre);

// PUT /api/comandas/tempo-livre/:id/calcular - Calcular valor do serviço de tempo livre
router.put('/tempo-livre/:id/calcular', calcularValorTempoLivre);

// PUT /api/comandas/tempo-livre/:id/confirmar - Confirmar valor do serviço de tempo livre
router.put('/tempo-livre/:id/confirmar', confirmarServicoTempoLivre);

// PUT /api/comandas/tempo-livre/:id/cancelar-calculo - Cancelar cálculo e voltar para em_andamento
router.put('/tempo-livre/:id/cancelar-calculo', cancelarCalculoTempoLivre);

// ============================================
// ROTAS COM PARÂMETROS (devem vir por último)
// ============================================

// GET /api/comandas/:numero - Buscar comanda por número
router.get('/:numero', buscarComanda);

// PUT /api/comandas/:id/fechar - Fechar comanda (apenas caixa e admin)
router.put('/:id/fechar', authorize('caixa', 'admin'), fecharComanda);

// PUT /api/comandas/itens/:id/cancelar - Cancelar item
router.put('/itens/:id/cancelar', authorize('caixa', 'admin'), cancelarItem);

export default router;
