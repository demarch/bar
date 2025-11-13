import { Router } from 'express';
import { body } from 'express-validator';
import AuthController from '../controllers/AuthController';
import { authenticateToken } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// Login
router.post(
  '/login',
  validate([
    body('login').notEmpty().withMessage('Login é obrigatório'),
    body('senha').notEmpty().withMessage('Senha é obrigatória')
  ]),
  AuthController.login
);

// Refresh token
router.post(
  '/refresh',
  validate([body('refreshToken').notEmpty().withMessage('Refresh token é obrigatório')]),
  AuthController.refreshToken
);

// Verificar usuário autenticado
router.get('/me', authenticateToken, AuthController.me);

export default router;
