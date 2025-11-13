import { Router } from 'express';
import { body } from 'express-validator';
import ProdutoController from '../controllers/ProdutoController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar (todos podem visualizar)
router.get('/', ProdutoController.listar);

// Listar categorias
router.get('/categorias', ProdutoController.categorias);

// Buscar por ID (todos podem visualizar)
router.get('/:id', ProdutoController.buscarPorId);

// Criar (apenas admin)
router.post(
  '/',
  requireAdmin,
  validate([
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('categoria').notEmpty().withMessage('Categoria é obrigatória'),
    body('preco').isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo'),
    body('tipo').isIn(['normal', 'comissionado']).withMessage('Tipo inválido'),
    body('comissaoPercentual').optional().isFloat({ min: 0, max: 100 })
  ]),
  ProdutoController.criar
);

// Atualizar (apenas admin)
router.put('/:id', requireAdmin, ProdutoController.atualizar);

// Deletar (apenas admin)
router.delete('/:id', requireAdmin, ProdutoController.deletar);

export default router;
