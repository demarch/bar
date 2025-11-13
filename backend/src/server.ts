import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

// Config
dotenv.config();

// Database
import { pool } from './config/database';
import { connectRedis } from './config/redis';

// Middlewares
import { errorHandler } from './middlewares/errorHandler';

// Routes
import authRoutes from './routes/auth';
import comandaRoutes from './routes/comandas';
import produtoRoutes from './routes/produtos';
import acompanhanteRoutes from './routes/acompanhantes';
import caixaRoutes from './routes/caixa';
import quartoRoutes from './routes/quartos';
import usuarioRoutes from './routes/usuarios';

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
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/comandas', comandaRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/acompanhantes', acompanhanteRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/quartos', quartoRoutes);
app.use('/api/usuarios', usuarioRoutes);

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
  console.log('✅ Cliente conectado:', socket.id, '| Usuário:', user.login);

  // Juntar sala de comandas abertas
  socket.join('comandas-abertas');

  // Escutar atualização de comanda
  socket.on('comanda:atualizada', (data) => {
    console.log('📝 Comanda atualizada:', data);
    socket.broadcast.to('comandas-abertas').emit('comanda:atualizada', data);
  });

  // Escutar nova comanda
  socket.on('comanda:criada', (data) => {
    console.log('🆕 Nova comanda:', data);
    socket.broadcast.to('comandas-abertas').emit('comanda:criada', data);
  });

  // Escutar comanda fechada
  socket.on('comanda:fechada', (data) => {
    console.log('✔️ Comanda fechada:', data);
    socket.broadcast.to('comandas-abertas').emit('comanda:fechada', data);
  });

  // Escutar atualização de quarto
  socket.on('quarto:atualizado', (data) => {
    console.log('🚪 Quarto atualizado:', data);
    socket.broadcast.emit('quarto:atualizado', data);
  });

  // Escutar atualização de caixa
  socket.on('caixa:atualizado', (data) => {
    console.log('💰 Caixa atualizado:', data);
    socket.broadcast.emit('caixa:atualizado', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
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
    console.log('✅ Conexão com PostgreSQL estabelecida');

    // Connect to Redis
    await connectRedis();

    // Start server
    server.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🚀 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ========================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM recebido. Encerrando graciosamente...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('👋 SIGINT recebido. Encerrando graciosamente...');
  await pool.end();
  process.exit(0);
});

// Start the server
startServer();
