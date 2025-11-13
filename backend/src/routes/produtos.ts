import { Router } from 'express';
import {
  listarCategorias,
  listarProdutos,
  buscarProduto,
  criarProduto,
  atualizarProduto,
  desativarProduto,
  criarCategoria,
  atualizarCategoria,
  desativarCategoria,
} from '../controllers/produtoController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ============ CATEGORIAS ============
// GET /api/produtos/categorias - Listar categorias
router.get('/categorias', listarCategorias);

// POST /api/produtos/categorias - Criar categoria (apenas admin)
router.post('/categorias', authorize('admin'), criarCategoria);

// PUT /api/produtos/categorias/:id - Atualizar categoria (apenas admin)
router.put('/categorias/:id', authorize('admin'), atualizarCategoria);

// DELETE /api/produtos/categorias/:id - Desativar categoria (apenas admin)
router.delete('/categorias/:id', authorize('admin'), desativarCategoria);

// ============ PRODUTOS ============
// GET /api/produtos - Listar produtos
router.get('/', listarProdutos);

// GET /api/produtos/:id - Buscar produto
router.get('/:id', buscarProduto);

// POST /api/produtos - Criar produto (apenas admin)
router.post('/', authorize('admin'), criarProduto);

// PUT /api/produtos/:id - Atualizar produto (apenas admin)
router.put('/:id', authorize('admin'), atualizarProduto);

// DELETE /api/produtos/:id - Desativar produto (apenas admin)
router.delete('/:id', authorize('admin'), desativarProduto);

export default router;
