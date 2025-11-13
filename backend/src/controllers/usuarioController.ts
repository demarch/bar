import { Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// Listar todos os usuários
export const listarUsuarios = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT id, nome, login, tipo, ativo, created_at
     FROM usuarios
     ORDER BY nome`
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Buscar usuário por ID
export const buscarUsuario = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT id, nome, login, tipo, ativo, created_at
     FROM usuarios
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Usuário não encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

// Criar usuário
export const criarUsuario = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome, login, senha, tipo } = req.body;

  // Validações
  if (!nome || !login || !senha || !tipo) {
    throw new AppError('Todos os campos são obrigatórios', 400);
  }

  if (!['admin', 'caixa', 'atendente'].includes(tipo)) {
    throw new AppError('Tipo de usuário inválido', 400);
  }

  if (senha.length < 6) {
    throw new AppError('A senha deve ter no mínimo 6 caracteres', 400);
  }

  // Verificar se login já existe
  const loginExiste = await pool.query(
    'SELECT id FROM usuarios WHERE login = $1',
    [login]
  );

  if (loginExiste.rows.length > 0) {
    throw new AppError('Login já está em uso', 400);
  }

  // Hash da senha
  const senhaHash = await bcrypt.hash(senha, 10);

  // Criar usuário
  const result = await pool.query(
    `INSERT INTO usuarios (nome, login, senha, tipo)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, login, tipo, ativo, created_at`,
    [nome, login, senhaHash, tipo]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Usuário criado com sucesso',
  };

  res.status(201).json(response);
});

// Atualizar usuário
export const atualizarUsuario = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nome, login, senha, tipo } = req.body;

  // Validações
  if (!nome || !login || !tipo) {
    throw new AppError('Nome, login e tipo são obrigatórios', 400);
  }

  if (!['admin', 'caixa', 'atendente'].includes(tipo)) {
    throw new AppError('Tipo de usuário inválido', 400);
  }

  // Verificar se usuário existe
  const usuarioExiste = await pool.query(
    'SELECT id FROM usuarios WHERE id = $1',
    [id]
  );

  if (usuarioExiste.rows.length === 0) {
    throw new AppError('Usuário não encontrado', 404);
  }

  // Verificar se login já existe em outro usuário
  const loginExiste = await pool.query(
    'SELECT id FROM usuarios WHERE login = $1 AND id != $2',
    [login, id]
  );

  if (loginExiste.rows.length > 0) {
    throw new AppError('Login já está em uso por outro usuário', 400);
  }

  // Se senha foi fornecida, fazer o hash
  let query = `UPDATE usuarios SET nome = $1, login = $2, tipo = $3`;
  let params: any[] = [nome, login, tipo];

  if (senha && senha.trim() !== '') {
    if (senha.length < 6) {
      throw new AppError('A senha deve ter no mínimo 6 caracteres', 400);
    }
    const senhaHash = await bcrypt.hash(senha, 10);
    query += `, senha = $4 WHERE id = $5`;
    params.push(senhaHash, id);
  } else {
    query += ` WHERE id = $4`;
    params.push(id);
  }

  query += ` RETURNING id, nome, login, tipo, ativo, created_at`;

  const result = await pool.query(query, params);

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Usuário atualizado com sucesso',
  };

  res.json(response);
});

// Desativar usuário
export const desativarUsuario = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Não permitir desativar o próprio usuário
  if (req.user && req.user.id === parseInt(id)) {
    throw new AppError('Você não pode desativar seu próprio usuário', 400);
  }

  const result = await pool.query(
    `UPDATE usuarios SET ativo = false
     WHERE id = $1
     RETURNING id, nome, login, tipo, ativo, created_at`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Usuário não encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Usuário desativado com sucesso',
  };

  res.json(response);
});

// Ativar usuário
export const ativarUsuario = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE usuarios SET ativo = true
     WHERE id = $1
     RETURNING id, nome, login, tipo, ativo, created_at`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Usuário não encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Usuário ativado com sucesso',
  };

  res.json(response);
});
