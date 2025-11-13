import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middlewares/auth';
import { ApiResponse, User } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { login, senha } = req.body;

  // Buscar usuário
  const result = await pool.query(
    'SELECT * FROM usuarios WHERE login = $1 AND ativo = true',
    [login]
  );

  if (result.rows.length === 0) {
    throw new AppError('Usuário ou senha inválidos', 401);
  }

  const user: User = result.rows[0];

  // Verificar senha
  const senhaValida = await bcrypt.compare(senha, user.senha);

  if (!senhaValida) {
    throw new AppError('Usuário ou senha inválidos', 401);
  }

  // Gerar tokens
  const tokenPayload = {
    id: user.id,
    login: user.login,
    tipo: user.tipo,
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Retornar dados do usuário e tokens (sem a senha)
  const { senha: _, ...userWithoutPassword } = user;

  const response: ApiResponse = {
    success: true,
    data: {
      user: userWithoutPassword,
      token,
      refreshToken,
    },
    message: 'Login realizado com sucesso',
  };

  res.json(response);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token não fornecido', 401);
  }

  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    throw new AppError('Refresh token inválido', 401);
  }

  // Verificar se o usuário ainda existe e está ativo
  const result = await pool.query(
    'SELECT * FROM usuarios WHERE id = $1 AND ativo = true',
    [decoded.id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Usuário não encontrado ou inativo', 401);
  }

  // Gerar novo token
  const newToken = generateToken({
    id: decoded.id,
    login: decoded.login,
    tipo: decoded.tipo,
  });

  const response: ApiResponse = {
    success: true,
    data: { token: newToken },
    message: 'Token renovado com sucesso',
  };

  res.json(response);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const userId = authReq.user.id;

  const result = await pool.query(
    'SELECT id, nome, login, tipo, ativo FROM usuarios WHERE id = $1',
    [userId]
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
