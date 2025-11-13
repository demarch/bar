import { Router } from 'express';
import { body } from 'express-validator';
import AcompanhanteController from '../controllers/AcompanhanteController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar (todos podem visualizar)
router.get('/', AcompanhanteController.listar);

// Buscar por ID (todos podem visualizar)
router.get('/:id', AcompanhanteController.buscarPorId);

// Criar (apenas admin)
router.post(
  '/',
  requireAdmin,
  validate([
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('apelido').optional().isString(),
    body('telefone').optional().isString(),
    body('documento').optional().isString(),
    body('percentualComissao').optional().isFloat({ min: 0, max: 100 })
  ]),
  AcompanhanteController.criar
);

// Atualizar (apenas admin)
router.put('/:id', requireAdmin, AcompanhanteController.atualizar);

// Ativar/Desativar (caixa ou admin podem fazer)
router.patch('/:id/ativar', AcompanhanteController.ativar);
router.patch('/:id/desativar', AcompanhanteController.desativar);

// Deletar (apenas admin)
router.delete('/:id', requireAdmin, AcompanhanteController.deletar);

export default router;
