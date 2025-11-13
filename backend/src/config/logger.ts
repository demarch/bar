import winston from 'winston';
import path from 'path';

const logDir = 'logs';

// Definir formato de log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Criar logger
const logger = winston.createLogger({
  format: logFormat,
  transports: [
    // Log de erros em arquivo separado
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Log combinado
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    }),
    // Log de operações financeiras (auditoria)
    new winston.transports.File({
      filename: path.join(logDir, 'financial.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ]
});

// Adicionar console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

export default logger;

// Helper para logs financeiros
export const logFinancial = (action: string, data: any, userId?: number) => {
  logger.info('FINANCIAL_OPERATION', {
    action,
    data,
    userId,
    timestamp: new Date().toISOString()
  });
};
