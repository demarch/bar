import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// Listar todas as categorias
export const listarCategorias = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM categorias WHERE ativa = true ORDER BY ordem, nome'
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Listar todos os produtos
export const listarProdutos = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { categoria_id, tipo } = req.query;

  let query = `
    SELECT p.*, c.nome as categoria_nome
    FROM produtos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.ativo = true
  `;

  const params: any[] = [];
  let paramCount = 1;

  if (categoria_id) {
    query += ` AND p.categoria_id = $${paramCount}`;
    params.push(categoria_id);
    paramCount++;
  }

  if (tipo) {
    query += ` AND p.tipo = $${paramCount}`;
    params.push(tipo);
    paramCount++;
  }

  query += ' ORDER BY c.ordem, p.nome';

  const result = await pool.query(query, params);

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Buscar produto por ID
export const buscarProduto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT p.*, c.nome as categoria_nome
     FROM produtos p
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Produto não encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

// Criar produto
export const criarProduto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome, categoria_id, preco, tipo, comissao_percentual } = req.body;

  const result = await pool.query(
    `INSERT INTO produtos (nome, categoria_id, preco, tipo, comissao_percentual)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [nome, categoria_id, preco, tipo, comissao_percentual]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Produto criado com sucesso',
  };

  res.status(201).json(response);
});

// Atualizar produto
export const atualizarProduto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nome, categoria_id, preco, tipo, comissao_percentual } = req.body;

  const result = await pool.query(
    `UPDATE produtos
     SET nome = $1, categoria_id = $2, preco = $3, tipo = $4, comissao_percentual = $5
     WHERE id = $6
     RETURNING *`,
    [nome, categoria_id, preco, tipo, comissao_percentual, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Produto não encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Produto atualizado com sucesso',
  };

  res.json(response);
});

// Desativar produto
export const desativarProduto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    'UPDATE produtos SET ativo = false WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Produto não encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Produto desativado com sucesso',
  };

  res.json(response);
});

// ============ CATEGORIAS ============

// Criar categoria
export const criarCategoria = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome, ordem } = req.body;

  const result = await pool.query(
    `INSERT INTO categorias (nome, ordem)
     VALUES ($1, $2)
     RETURNING *`,
    [nome, ordem || 0]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Categoria criada com sucesso',
  };

  res.status(201).json(response);
});

// Atualizar categoria
export const atualizarCategoria = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nome, ordem } = req.body;

  const result = await pool.query(
    `UPDATE categorias
     SET nome = $1, ordem = $2
     WHERE id = $3
     RETURNING *`,
    [nome, ordem, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Categoria não encontrada', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Categoria atualizada com sucesso',
  };

  res.json(response);
});

// Desativar categoria
export const desativarCategoria = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Verificar se há produtos associados
  const produtosAssociados = await pool.query(
    'SELECT COUNT(*) as count FROM produtos WHERE categoria_id = $1 AND ativo = true',
    [id]
  );

  if (parseInt(produtosAssociados.rows[0].count) > 0) {
    throw new AppError('Não é possível desativar categoria com produtos ativos', 400);
  }

  const result = await pool.query(
    'UPDATE categorias SET ativa = false WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Categoria não encontrada', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Categoria desativada com sucesso',
  };

  res.json(response);
});
