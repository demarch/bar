import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      res.status(400).json({
        success: false,
        error: 'Erro de validação',
        details: errors,
      });
      return;
    }

    next();
  };
};

// Schemas de validação comuns
export const schemas = {
  login: Joi.object({
    login: Joi.string().required().min(3).max(50),
    senha: Joi.string().required().min(6),
  }),

  createComanda: Joi.object({
    numero: Joi.number().required().positive(),
    cliente_nome: Joi.string().optional().max(100),
  }),

  addItemComanda: Joi.object({
    comanda_id: Joi.number().required().positive(),
    produto_id: Joi.number().required().positive(),
    quantidade: Joi.number().required().positive(),
    acompanhante_id: Joi.number().optional().positive(),
  }),

  abrirCaixa: Joi.object({
    valor_abertura: Joi.number().required().min(0),
  }),

  fecharCaixa: Joi.object({
    valor_fechamento: Joi.number().required().min(0),
    observacoes: Joi.string().optional(),
  }),

  sangria: Joi.object({
    valor: Joi.number().required().positive(),
    descricao: Joi.string().required().min(3),
  }),

  createAcompanhante: Joi.object({
    nome: Joi.string().required().max(100),
    apelido: Joi.string().optional().max(50),
    telefone: Joi.string().optional().max(20),
    documento: Joi.string().optional().max(20),
    percentual_comissao: Joi.number().optional().min(0).max(100),
    tipo_acompanhante: Joi.string().optional().valid('fixa', 'rotativa'),
    numero_pulseira_fixa: Joi.number().optional().min(1).max(1000),
  }),

  ocuparQuarto: Joi.object({
    comanda_id: Joi.number().required().positive(),
    acompanhante_id: Joi.number().required().positive(),
    numero_quarto: Joi.number().required().positive(),
  }),
};
