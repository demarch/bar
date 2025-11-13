import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Importar configurações
import sequelize, { testConnection } from './config/database';
import logger from './config/logger';
import { initModels } from './models';

// Importar middlewares
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Importar rotas
import authRoutes from './routes/auth';
import comandaRoutes from './routes/comandas';
import quartoRoutes from './routes/quartos';
import caixaRoutes from './routes/caixa';
import relatorioRoutes from './routes/relatorios';
import acompanhanteRoutes from './routes/acompanhantes';
import produtoRoutes from './routes/produtos';
import configuracaoRoutes from './routes/configuracoes';

// Carregar variáveis de ambiente
dotenv.config();

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Criar aplicação Express
const app = express();
const server = http.createServer(app);

// Configurar Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Middlewares globais
app.use(helmet()); // Segurança
app.use(compression()); // Compressão de respostas
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' })); // CORS
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/comandas', comandaRoutes);
app.use('/api/quartos', quartoRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/acompanhantes', acompanhanteRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/configuracoes', configuracaoRoutes);

// Middleware de rota não encontrada
app.use(notFoundHandler);

// Middleware de tratamento de erros
app.use(errorHandler);

// Configurar WebSocket para tempo real
io.on('connection', (socket) => {
  logger.info(`Cliente conectado: ${socket.id}`);

  // Entrar em uma sala específica (por exemplo, sala do movimento de caixa)
  socket.on('join:caixa', (movimentoCaixaId: number) => {
    socket.join(`caixa:${movimentoCaixaId}`);
    logger.info(`Socket ${socket.id} entrou na sala caixa:${movimentoCaixaId}`);
  });

  // Sair de uma sala
  socket.on('leave:caixa', (movimentoCaixaId: number) => {
    socket.leave(`caixa:${movimentoCaixaId}`);
    logger.info(`Socket ${socket.id} saiu da sala caixa:${movimentoCaixaId}`);
  });

  // Eventos de atualização
  socket.on('comanda:atualizada', (data) => {
    // Broadcast para todos os clientes na mesma sala de caixa
    socket.to(`caixa:${data.movimentoCaixaId}`).emit('comanda:atualizada', data);
  });

  socket.on('comanda:criada', (data) => {
    socket.to(`caixa:${data.movimentoCaixaId}`).emit('comanda:criada', data);
  });

  socket.on('comanda:fechada', (data) => {
    socket.to(`caixa:${data.movimentoCaixaId}`).emit('comanda:fechada', data);
  });

  socket.on('quarto:ocupado', (data) => {
    io.emit('quarto:ocupado', data);
  });

  socket.on('quarto:liberado', (data) => {
    io.emit('quarto:liberado', data);
  });

  socket.on('disconnect', () => {
    logger.info(`Cliente desconectado: ${socket.id}`);
  });
});

// Exportar io para uso em outros módulos
export { io };

// Inicializar servidor
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

const startServer = async () => {
  try {
    // Testar conexão com banco de dados
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Falha ao conectar com banco de dados');
    }

    // Inicializar modelos
    initModels();

    // Sincronizar banco de dados (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Banco de dados sincronizado');
    }

    // Iniciar servidor
    server.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🍺 Sistema de Gestão de Bar                        ║
║                                                       ║
║   Servidor rodando em: http://${HOST}:${PORT}      ║
║   Ambiente: ${process.env.NODE_ENV || 'development'}                          ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Fechando servidor gracefully...');
  server.close(async () => {
    await sequelize.close();
    logger.info('Servidor fechado');
    process.exit(0);
  });
});

// Iniciar servidor
startServer();
