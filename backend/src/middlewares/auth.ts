import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, UserType } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-me';

export interface JwtPayload {
  id: number;
  login: string;
  tipo: UserType;
}

// Middleware para verificar se o usuário está autenticado
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        error: 'Erro no token'
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({
        success: false,
        error: 'Token mal formatado'
      });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          error: 'Token inválido'
        });
      }

      req.user = decoded as JwtPayload;
      return next();
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Falha na autenticação'
    });
  }
};

// Middleware para verificar se o usuário tem permissão (tipo de usuário)
export const authorize = (...allowedTypes: UserType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    if (!allowedTypes.includes(req.user.tipo)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Você não tem permissão para acessar este recurso.'
      });
    }

    next();
  };
};

// Gerar token JWT
export const generateToken = (payload: JwtPayload): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Gerar refresh token
export const generateRefreshToken = (payload: JwtPayload): string => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, refreshSecret, { expiresIn });
};

// Verificar refresh token
export const verifyRefreshToken = (token: string): JwtPayload | null => {
  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';
    return jwt.verify(token, refreshSecret) as JwtPayload;
  } catch (error) {
    return null;
  }
};
