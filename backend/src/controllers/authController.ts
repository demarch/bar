import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middlewares/auth';
import { ApiResponse, User, AuthRequest } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';
import { addToBlacklist } from '../services/tokenBlacklist';

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

  // Configurar cookies httpOnly
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction, // true em produção (HTTPS)
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hora
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });

  // Retornar dados do usuário (sem a senha e sem tokens no body)
  const { senha: _, ...userWithoutPassword } = user;

  const response: ApiResponse = {
    success: true,
    data: {
      user: userWithoutPassword,
    },
    message: 'Login realizado com sucesso',
  };

  res.json(response);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // Tentar pegar refresh token do cookie ou do body (para compatibilidade)
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

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

  // Configurar cookie httpOnly
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', newToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hora
  });

  const response: ApiResponse = {
    success: true,
    data: {},
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

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const token = authReq.token;

  if (token) {
    // Decodificar o token para obter o tempo de expiração
    const decoded = jwt.decode(token) as any;

    if (decoded && decoded.exp) {
      // Calcular tempo restante até expiração (em segundos)
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;

      // Adicionar token à blacklist
      if (expiresIn > 0) {
        await addToBlacklist(token, expiresIn);
      }
    }
  }

  // Limpar cookies
  res.clearCookie('token');
  res.clearCookie('refreshToken');

  const response: ApiResponse = {
    success: true,
    message: 'Logout realizado com sucesso',
  };

  res.json(response);
});
