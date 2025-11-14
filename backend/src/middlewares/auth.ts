import { Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthRequest, UserType } from '../types';
import { isBlacklisted } from '../services/tokenBlacklist';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-me';

export interface JwtPayload {
  id: number;
  login: string;
  tipo: UserType;
}

// Middleware para verificar se o usuário está autenticado
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      res.status(401).json({
        success: false,
        error: 'Erro no token'
      });
      return;
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      res.status(401).json({
        success: false,
        error: 'Token mal formatado'
      });
      return;
    }

    // Verificar se o token está na blacklist
    const isRevoked = await isBlacklisted(token);
    if (isRevoked) {
      res.status(401).json({
        success: false,
        error: 'Token revogado. Faça login novamente.'
      });
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(401).json({
          success: false,
          error: 'Token inválido'
        });
        return;
      }

      req.user = decoded as JwtPayload;
      req.token = token; // Armazenar token para uso posterior (logout)
      next();
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Falha na autenticação'
    });
  }
};

// Middleware para verificar se o usuário tem permissão (tipo de usuário)
export const authorize = (...allowedTypes: UserType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    if (!allowedTypes.includes(req.user.tipo)) {
      res.status(403).json({
        success: false,
        error: 'Acesso negado. Você não tem permissão para acessar este recurso.'
      });
      return;
    }

    next();
  };
};

// Gerar token JWT
export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

// Gerar refresh token
export const generateRefreshToken = (payload: JwtPayload): string => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any
  };
  return jwt.sign(payload, refreshSecret, options);
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
