import { Router } from 'express';
import { body } from 'express-validator';
import CaixaController from '../controllers/CaixaController';
import { authenticateToken, requireCaixaOrAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Abrir caixa (apenas caixa ou admin)
router.post(
  '/abrir',
  requireCaixaOrAdmin,
  validate([
    body('valorAbertura')
      .isFloat({ min: 0 })
      .withMessage('Valor de abertura deve ser um número positivo')
  ]),
  CaixaController.abrir
);

// Fechar caixa (apenas caixa ou admin)
router.post(
  '/fechar',
  requireCaixaOrAdmin,
  validate([body('movimentoCaixaId').isInt().withMessage('ID do movimento é obrigatório')]),
  CaixaController.fechar
);

// Registrar sangria (apenas caixa ou admin)
router.post(
  '/sangria',
  requireCaixaOrAdmin,
  validate([
    body('movimentoCaixaId').isInt().withMessage('ID do movimento é obrigatório'),
    body('valor').isFloat({ min: 0 }).withMessage('Valor deve ser um número positivo'),
    body('descricao').notEmpty().withMessage('Descrição é obrigatória')
  ]),
  CaixaController.registrarSangria
);

// Buscar caixa aberto
router.get('/aberto', CaixaController.buscarCaixaAberto);

// Buscar por ID
router.get('/:id', CaixaController.buscarPorId);

// Listar movimentos (apenas caixa ou admin)
router.get('/', requireCaixaOrAdmin, CaixaController.listarMovimentos);

export default router;
