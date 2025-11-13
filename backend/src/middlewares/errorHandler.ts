import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

// Classe de erro customizada
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware de tratamento de erros
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log do erro
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Se for erro operacional (conhecido), retornar mensagem específica
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode
    });
    return;
  }

  // Erro de validação do Sequelize
  if (err.name === 'SequelizeValidationError') {
    res.status(400).json({
      error: 'Erro de validação',
      details: err.message
    });
    return;
  }

  // Erro de chave duplicada do Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({
      error: 'Registro duplicado',
      details: err.message
    });
    return;
  }

  // Erro JWT
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Token inválido'
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expirado'
    });
    return;
  }

  // Erro genérico (não operacional)
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message
  });
};

// Middleware para capturar rotas não encontradas
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
};

// Helper para async error handling
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
