import { Router } from 'express';
import { body } from 'express-validator';
import ComandaController from '../controllers/ComandaController';
import { authenticateToken } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Criar comanda
router.post(
  '/',
  validate([
    body('numero').isInt({ min: 1 }).withMessage('Número deve ser um inteiro positivo'),
    body('movimentoCaixaId').isInt().withMessage('ID do movimento de caixa é obrigatório'),
    body('clienteNome').optional().isString()
  ]),
  ComandaController.criar
);

// Lançar item
router.post(
  '/lancar-item',
  validate([
    body('comandaId').isInt().withMessage('ID da comanda é obrigatório'),
    body('produtoId').isInt().withMessage('ID do produto é obrigatório'),
    body('quantidade').isInt({ min: 1 }).withMessage('Quantidade deve ser maior que zero'),
    body('acompanhanteId').optional().isInt()
  ]),
  ComandaController.lancarItem
);

// Fechar comanda
router.post(
  '/fechar',
  validate([
    body('comandaId').isInt().withMessage('ID da comanda é obrigatório'),
    body('formaPagamento').notEmpty().withMessage('Forma de pagamento é obrigatória')
  ]),
  ComandaController.fechar
);

// Listar comandas abertas
router.get('/abertas', ComandaController.listarAbertas);

// Buscar por número
router.get('/numero', ComandaController.buscarPorNumero);

// Buscar por ID
router.get('/:id', ComandaController.buscarPorId);

// Remover item
router.delete('/itens/:itemId', ComandaController.removerItem);

export default router;
