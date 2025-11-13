import { Router } from 'express';
import {
  listarUsuarios,
  buscarUsuario,
  criarUsuario,
  atualizarUsuario,
  desativarUsuario,
  ativarUsuario,
} from '../controllers/usuarioController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Todas as rotas de usuários são apenas para admin
router.use(authorize('admin'));

// GET /api/usuarios - Listar usuários
router.get('/', listarUsuarios);

// GET /api/usuarios/:id - Buscar usuário
router.get('/:id', buscarUsuario);

// POST /api/usuarios - Criar usuário
router.post('/', criarUsuario);

// PUT /api/usuarios/:id - Atualizar usuário
router.put('/:id', atualizarUsuario);

// DELETE /api/usuarios/:id - Desativar usuário
router.delete('/:id', desativarUsuario);

// PATCH /api/usuarios/:id/ativar - Ativar usuário
router.patch('/:id/ativar', ativarUsuario);

export default router;
