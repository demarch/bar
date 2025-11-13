import { Router } from 'express';
import { body } from 'express-validator';
import QuartoController from '../controllers/QuartoController';
import { authenticateToken } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Iniciar ocupação
router.post(
  '/iniciar',
  validate([
    body('comandaId').isInt().withMessage('ID da comanda é obrigatório'),
    body('numeroQuarto').isInt({ min: 1 }).withMessage('Número do quarto é obrigatório'),
    body('acompanhanteId').isInt().withMessage('ID da acompanhante é obrigatório')
  ]),
  QuartoController.iniciarOcupacao
);

// Finalizar ocupação
router.post(
  '/finalizar',
  validate([body('ocupacaoId').isInt().withMessage('ID da ocupação é obrigatório')]),
  QuartoController.finalizarOcupacao
);

// Listar quartos ocupados
router.get('/ocupados', QuartoController.listarOcupados);

// Buscar por comanda
router.get('/comanda/:comandaId', QuartoController.buscarPorComanda);

// Verificar disponibilidade
router.get('/disponibilidade/:numeroQuarto', QuartoController.verificarDisponibilidade);

export default router;
