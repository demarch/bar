import winston from 'winston';
import path from 'path';

// Formato customizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para console (desenvolvimento)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '../../logs');

// Configurar transports
const transports: winston.transport[] = [
  // Console (sempre ativo)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'info',
  }),
];

// Em produção, adicionar arquivos de log
if (process.env.NODE_ENV === 'production') {
  // Log geral (info e acima)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: customFormat,
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Log de erros (error apenas)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      format: customFormat,
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Log de auditoria (operações financeiras)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      format: customFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10, // Manter mais logs de auditoria
    })
  );
}

// Criar logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'bar-system-backend' },
  transports,
  // Não sair em caso de erro de log
  exitOnError: false,
});

// Logger específico para auditoria
export const auditLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  defaultMeta: { service: 'bar-system-audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 10485760,
      maxFiles: 10,
    }),
    // Também exibir no console em desenvolvimento
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({ format: consoleFormat })]
      : []),
  ],
});

// Funções auxiliares para logs de auditoria
export const logAudit = {
  /**
   * Log de login
   */
  login: (userId: number, login: string, ip: string, success: boolean) => {
    auditLogger.info('LOGIN', {
      action: 'login',
      userId,
      login,
      ip,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log de logout
   */
  logout: (userId: number, login: string) => {
    auditLogger.info('LOGOUT', {
      action: 'logout',
      userId,
      login,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log de operação em comanda
   */
  comanda: (
    action: 'criar' | 'adicionar_item' | 'fechar' | 'cancelar',
    userId: number,
    comandaId: number,
    details?: any
  ) => {
    auditLogger.info('COMANDA', {
      action: `comanda_${action}`,
      userId,
      comandaId,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log de operação de caixa
   */
  caixa: (
    action: 'abrir' | 'fechar' | 'sangria',
    userId: number,
    caixaId: number,
    valor: number,
    details?: any
  ) => {
    auditLogger.info('CAIXA', {
      action: `caixa_${action}`,
      userId,
      caixaId,
      valor,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log de operação de quarto
   */
  quarto: (
    action: 'ocupar' | 'finalizar' | 'cancelar',
    userId: number,
    quartoId: number,
    details?: any
  ) => {
    auditLogger.info('QUARTO', {
      action: `quarto_${action}`,
      userId,
      quartoId,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log de alteração de configuração
   */
  config: (userId: number, configKey: string, oldValue: any, newValue: any) => {
    auditLogger.info('CONFIG', {
      action: 'config_change',
      userId,
      configKey,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log de operação administrativa
   */
  admin: (action: string, userId: number, resource: string, details?: any) => {
    auditLogger.info('ADMIN', {
      action: `admin_${action}`,
      userId,
      resource,
      details,
      timestamp: new Date().toISOString(),
    });
  },
};

// Sobrescrever console.log em produção para usar winston
if (process.env.NODE_ENV === 'production') {
  console.log = (...args: any[]) => logger.info(args.join(' '));
  console.info = (...args: any[]) => logger.info(args.join(' '));
  console.warn = (...args: any[]) => logger.warn(args.join(' '));
  console.error = (...args: any[]) => logger.error(args.join(' '));
}

export default logger;
