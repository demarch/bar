import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';

// Config
dotenv.config();

// Logger
import logger from './config/logger';

// Database
import { pool } from './config/database';
import { connectRedis } from './config/redis';

// Middlewares
import { errorHandler } from './middlewares/errorHandler';
import { sanitizeMongoData, sanitizeInputs } from './middlewares/sanitize';

// Routes
import authRoutes from './routes/auth';
import comandaRoutes from './routes/comandas';
import produtoRoutes from './routes/produtos';
import acompanhanteRoutes from './routes/acompanhantes';
import caixaRoutes from './routes/caixa';
import quartoRoutes from './routes/quartos';
import quartoAdminRoutes from './routes/quartosAdmin';
import usuarioRoutes from './routes/usuarios';
import relatorioRoutes from './routes/relatorios';
import migrationRoutes from './routes/migrationRoutes';
import dashboardRoutes from './routes/dashboard';
import healthRoutes from './routes/health';
import { nfeRoutes, inicializarNfe } from './nfe';

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
});

// HTTP Request Logging (Morgan + Winston)
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        logger.http(message.trim());
      },
    },
  })
);

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitização de inputs (previne XSS, NoSQL injection)
app.use(sanitizeMongoData);
app.use(sanitizeInputs);

app.use('/api/', limiter);

// Health check routes (sem rate limit)
app.use('/health', healthRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/comandas', comandaRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/acompanhantes', acompanhanteRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/quartos', quartoRoutes);
app.use('/api/admin/quartos', quartoAdminRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/nfe', nfeRoutes);

// Error handler (deve ser o último middleware)
app.use(errorHandler);

// ============================================
// WEBSOCKET AUTHENTICATION
// ============================================

interface SocketUser {
  id: number;
  login: string;
  tipo: string;
}

// Middleware de autenticação WebSocket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Token de autenticação não fornecido'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as SocketUser;
    socket.data.user = decoded;
    next();
  } catch (error) {
    next(new Error('Token inválido ou expirado'));
  }
});

// ============================================
// WEBSOCKET HANDLERS
// ============================================

io.on('connection', (socket) => {
  const user = socket.data.user as SocketUser;
  logger.info(`✅ WebSocket: Cliente conectado - Socket: ${socket.id} | Usuário: ${user.login}`);

  // Juntar sala de comandas abertas
  socket.join('comandas-abertas');

  // Escutar atualização de comanda
  socket.on('comanda:atualizada', (data) => {
    logger.debug('📝 WebSocket: Comanda atualizada', { data });
    socket.broadcast.to('comandas-abertas').emit('comanda:atualizada', data);
  });

  // Escutar nova comanda
  socket.on('comanda:criada', (data) => {
    logger.debug('🆕 WebSocket: Nova comanda', { data });
    socket.broadcast.to('comandas-abertas').emit('comanda:criada', data);
  });

  // Escutar comanda fechada
  socket.on('comanda:fechada', (data) => {
    logger.debug('✔️ WebSocket: Comanda fechada', { data });
    socket.broadcast.to('comandas-abertas').emit('comanda:fechada', data);
  });

  // Escutar atualização de quarto
  socket.on('quarto:atualizado', (data) => {
    logger.debug('🚪 WebSocket: Quarto atualizado', { data });
    socket.broadcast.emit('quarto:atualizado', data);
  });

  // Escutar atualização de caixa
  socket.on('caixa:atualizado', (data) => {
    logger.debug('💰 WebSocket: Caixa atualizado', { data });
    socket.broadcast.emit('caixa:atualizado', data);
  });

  socket.on('disconnect', () => {
    logger.info(`❌ WebSocket: Cliente desconectado - Socket: ${socket.id}`);
  });
});

// Export io para uso em controllers
export { io };

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('✅ Conexão com PostgreSQL estabelecida');

    // Connect to Redis
    await connectRedis();

    // Inicializa módulo NF-e (certificado, contingência, etc)
    try {
      const nfeIniciado = await inicializarNfe();
      if (nfeIniciado) {
        logger.info('✅ Módulo NF-e inicializado com sucesso');
      } else {
        logger.warn('⚠️ Módulo NF-e não inicializado (verifique configuração)');
      }
    } catch (nfeError) {
      logger.warn('⚠️ Erro ao inicializar módulo NF-e:', nfeError);
    }

    // Start server
    server.listen(PORT, () => {
      logger.info('');
      logger.info('🚀 ========================================');
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`🚀 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info('🚀 ========================================');
      logger.info('');
    });
  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  logger.info('👋 SIGTERM recebido. Encerrando graciosamente...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('👋 SIGINT recebido. Encerrando graciosamente...');
  await pool.end();
  process.exit(0);
});

// Start the server
startServer();
