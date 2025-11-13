import { Router } from 'express';
import { body } from 'express-validator';
import ConfiguracaoController from '../controllers/ConfiguracaoController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar configurações de quartos (todos podem ver)
router.get('/quartos', ConfiguracaoController.listarConfiguracoesQuartos);

// Criar configuração de quarto (apenas admin)
router.post(
  '/quartos',
  requireAdmin,
  validate([
    body('minutos').isInt({ min: 1 }).withMessage('Minutos deve ser um número positivo'),
    body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
    body('valor').isFloat({ min: 0 }).withMessage('Valor deve ser um número positivo')
  ]),
  ConfiguracaoController.criarConfiguracaoQuarto
);

// Atualizar configuração de quarto (apenas admin)
router.put('/quartos/:id', requireAdmin, ConfiguracaoController.atualizarConfiguracaoQuarto);

// Deletar configuração de quarto (apenas admin)
router.delete('/quartos/:id', requireAdmin, ConfiguracaoController.deletarConfiguracaoQuarto);

export default router;
