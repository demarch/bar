import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh, me, logout } from '../controllers/authController';
import { validate, schemas } from '../middlewares/validator';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Rate limiter específico para login (proteção contra força bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas (opcional)
});

// POST /api/auth/login - Login de usuário
router.post('/login', loginLimiter, validate(schemas.login), login);

// POST /api/auth/refresh - Renovar token
router.post('/refresh', refresh);

// GET /api/auth/me - Dados do usuário atual
router.get('/me', authenticate, me);

// POST /api/auth/logout - Logout do usuário (revoga o token)
router.post('/logout', authenticate, logout);

export default router;
