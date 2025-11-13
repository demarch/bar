import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

// Middleware para processar validações
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Executar todas as validações
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Retornar erros de validação
    res.status(400).json({
      error: 'Erro de validação',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg
      }))
    });
  };
};
