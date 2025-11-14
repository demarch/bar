import { Router } from 'express';
import {
  listarConfiguracoesQuartos,
  listarQuartosDisponiveis,
  listarQuartosOcupados,
  ocuparQuarto,
  finalizarOcupacao,
  cancelarOcupacao,
} from '../controllers/quartoController';
import { authenticate } from '../middlewares/auth';
import { validate, schemas } from '../middlewares/validator';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/quartos/configuracoes - Listar configurações de quartos
router.get('/configuracoes', listarConfiguracoesQuartos);

// GET /api/quartos/disponiveis - Listar quartos disponíveis
router.get('/disponiveis', listarQuartosDisponiveis);

// GET /api/quartos/ocupados - Listar quartos ocupados
router.get('/ocupados', listarQuartosOcupados);

// POST /api/quartos/ocupar - Ocupar quarto
router.post('/ocupar', validate(schemas.ocuparQuarto), ocuparQuarto);

// PUT /api/quartos/:id/finalizar - Finalizar ocupação
router.put('/:id/finalizar', finalizarOcupacao);

// PUT /api/quartos/:id/cancelar - Cancelar ocupação
router.put('/:id/cancelar', cancelarOcupacao);

export default router;
