import { Router } from 'express';
import {
  listarAcompanhantes,
  listarAcompanhantesAtivas,
  criarAcompanhante,
  atualizarAcompanhante,
  ativarAcompanhante,
  desativarAcompanhante,
  relatorioComissoes,
  listarPulseirasDisponiveis,
  listarPulseirasAtivas,
  buscarPulseira,
  estatisticasPulseiras,
  listarAcompanhantesPresentes,
  encerrarPeriodo,
  marcarComissoesPagas,
  listarHistoricoAtivacoes,
  estatisticasDia,
} from '../controllers/acompanhanteController';
import { authenticate, authorize } from '../middlewares/auth';
import { validate, schemas } from '../middlewares/validator';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/acompanhantes - Listar todas acompanhantes
router.get('/', listarAcompanhantes);

// GET /api/acompanhantes/presentes - Listar acompanhantes presentes hoje (com status)
router.get('/presentes', listarAcompanhantesPresentes);

// GET /api/acompanhantes/ativas - Listar acompanhantes ativas hoje
router.get('/ativas', listarAcompanhantesAtivas);

// GET /api/acompanhantes/historico - Histórico de ativações do dia
router.get('/historico', listarHistoricoAtivacoes);

// GET /api/acompanhantes/estatisticas-dia - Estatísticas do dia
router.get('/estatisticas-dia', estatisticasDia);

// GET /api/acompanhantes/pulseiras/disponiveis - Listar pulseiras disponíveis
router.get('/pulseiras/disponiveis', listarPulseirasDisponiveis);

// GET /api/acompanhantes/pulseiras/ativas - Listar pulseiras ativas hoje
router.get('/pulseiras/ativas', listarPulseirasAtivas);

// GET /api/acompanhantes/pulseiras/estatisticas - Estatísticas de pulseiras
router.get('/pulseiras/estatisticas', estatisticasPulseiras);

// GET /api/acompanhantes/pulseiras/:numero - Buscar pulseira específica
router.get('/pulseiras/:numero', buscarPulseira);

// POST /api/acompanhantes - Criar acompanhante (apenas admin)
router.post('/', authorize('admin'), validate(schemas.createAcompanhante), criarAcompanhante);

// PUT /api/acompanhantes/:id - Atualizar acompanhante (apenas admin)
router.put('/:id', authorize('admin'), validate(schemas.createAcompanhante), atualizarAcompanhante);

// POST /api/acompanhantes/:id/ativar - Ativar acompanhante para o dia
router.post('/:id/ativar', ativarAcompanhante);

// DELETE /api/acompanhantes/:id/desativar - Desativar acompanhante do dia
router.delete('/:id/desativar', desativarAcompanhante);

// POST /api/acompanhantes/periodo/:periodoId/encerrar - Encerrar período
router.post('/periodo/:periodoId/encerrar', encerrarPeriodo);

// POST /api/acompanhantes/periodo/:periodoId/pagar - Marcar comissões como pagas
router.post('/periodo/:periodoId/pagar', marcarComissoesPagas);

// GET /api/acompanhantes/:id/comissoes - Relatório de comissões
router.get('/:id/comissoes', relatorioComissoes);

export default router;
