import { Router } from 'express';
import { login, refresh, me } from '../controllers/authController';
import { validate, schemas } from '../middlewares/validator';
import { authenticate } from '../middlewares/auth';

const router = Router();

// POST /api/auth/login - Login de usuário
router.post('/login', validate(schemas.login), login);

// POST /api/auth/refresh - Renovar token
router.post('/refresh', refresh);

// GET /api/auth/me - Dados do usuário atual
router.get('/me', authenticate, me);

export default router;
