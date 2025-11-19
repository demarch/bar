import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * Middleware para sanitizar inputs e prevenir:
 * - NoSQL injection
 * - XSS (Cross-Site Scripting)
 * - SQL injection básico
 */

// Middleware para sanitizar dados do MongoDB (remove $, ., etc)
export const sanitizeMongoData = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ Tentativa de injection detectada em ${req.path}:`, key);
  },
});

/**
 * Sanitiza strings para prevenir XSS
 * Remove ou escapa caracteres perigosos
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;

  // Remove tags HTML/script
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Escapa caracteres especiais
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
};

/**
 * Sanitiza objetos recursivamente
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Middleware para sanitizar body, query e params
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitizar body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitizar query
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitizar params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('❌ Erro ao sanitizar inputs:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar dados de entrada',
    });
  }
};

/**
 * Valida e sanitiza campos específicos comuns
 */
export const validators = {
  /**
   * Valida email
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Valida CPF/CNPJ (formato brasileiro)
   */
  isValidDocument: (doc: string): boolean => {
    const cleaned = doc.replace(/\D/g, '');
    return cleaned.length === 11 || cleaned.length === 14;
  },

  /**
   * Valida telefone brasileiro
   */
  isValidPhone: (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  },

  /**
   * Valida se é número positivo
   */
  isPositiveNumber: (num: any): boolean => {
    return !isNaN(num) && Number(num) > 0;
  },

  /**
   * Valida se é número não-negativo
   */
  isNonNegativeNumber: (num: any): boolean => {
    return !isNaN(num) && Number(num) >= 0;
  },

  /**
   * Sanitiza nome (remove caracteres especiais, mantém apenas letras, números e espaços)
   */
  sanitizeName: (name: string): string => {
    if (typeof name !== 'string') return '';
    return name.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim();
  },
};

export default {
  sanitizeMongoData,
  sanitizeInputs,
  validators,
};
