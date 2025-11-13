import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload, TipoUsuario } from '../types';

// Estender a interface Request do Express
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido ou expirado' });
    return;
  }
};

// Middleware para verificar se usuário é admin
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  if (req.user.tipo !== TipoUsuario.ADMIN) {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    return;
  }

  next();
};

// Middleware para verificar se usuário é caixa ou admin
export const requireCaixaOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  if (![TipoUsuario.ADMIN, TipoUsuario.CAIXA].includes(req.user.tipo)) {
    res.status(403).json({ error: 'Acesso negado. Apenas caixa ou admin.' });
    return;
  }

  next();
};

// Middleware para verificar tipos específicos de usuário
export const requireTypes = (...tipos: TipoUsuario[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!tipos.includes(req.user.tipo)) {
      res.status(403).json({
        error: `Acesso negado. Requer um dos seguintes perfis: ${tipos.join(', ')}`
      });
      return;
    }

    next();
  };
};
