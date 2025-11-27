# Arquitetura do Sistema - Sistema de Gestao para Bar

## Visao Geral

Este documento detalha a arquitetura tecnica do sistema, incluindo decisoes de design, padroes utilizados e integracao entre componentes.

---

## Indice

1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Backend](#2-backend)
3. [Frontend](#3-frontend)
4. [Comunicacao em Tempo Real](#4-comunicacao-em-tempo-real)
5. [Seguranca](#5-seguranca)
6. [Infraestrutura](#6-infraestrutura)
7. [Padroes de Projeto](#7-padroes-de-projeto)
8. [Fluxo de Dados](#8-fluxo-de-dados)

---

## 1. Arquitetura Geral

### Tipo de Arquitetura

O sistema segue uma **arquitetura em camadas** com separacao clara entre:

- **Apresentacao**: React SPA (Single Page Application)
- **Negocios**: Express.js API REST
- **Dados**: PostgreSQL + Redis

### Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Desktop │  │ Tablet  │  │ Mobile  │  │  Admin  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        └────────────┴─────┬──────┴────────────┘
                           │
                    ┌──────▼──────┐
                    │    NGINX    │  Port: 80/443
                    │   (Proxy)   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐        │
    │  FRONTEND   │ │   BACKEND   │        │
    │  (React)    │ │  (Express)  │        │
    │  Port:3000  │ │  Port:3001  │        │
    └─────────────┘ └──────┬──────┘        │
                           │               │
           ┌───────────────┼───────────────┤
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │ PostgreSQL  │ │    Redis    │ │  Socket.io  │
    │  Port:5432  │ │  Port:6379  │ │  (realtime) │
    └─────────────┘ └─────────────┘ └─────────────┘
```

### Principios Arquiteturais

1. **Separacao de Responsabilidades**: Cada camada tem responsabilidade unica
2. **Stateless Backend**: API sem estado, autenticacao via JWT
3. **Event-Driven**: Atualizacoes em tempo real via WebSocket
4. **Containerizacao**: Deploy via Docker para portabilidade
5. **Seguranca em Camadas**: Validacao em multiplos pontos

---

## 2. Backend

### Estrutura de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                        ROUTES                                │
│  Definicao de endpoints, validacao de entrada               │
├─────────────────────────────────────────────────────────────┤
│                      MIDDLEWARES                             │
│  Autenticacao, autorizacao, sanitizacao, rate limiting      │
├─────────────────────────────────────────────────────────────┤
│                      CONTROLLERS                             │
│  Logica de negocios, orquestracao de operacoes              │
├─────────────────────────────────────────────────────────────┤
│                       SERVICES                               │
│  Servicos auxiliares (tokenBlacklist, etc)                  │
├─────────────────────────────────────────────────────────────┤
│                        CONFIG                                │
│  Conexao com banco, Redis, logger                           │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Requisicao

```
Request
   │
   ▼
┌──────────────────┐
│   Express App    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Helmet       │  ← Headers de seguranca
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│      CORS        │  ← Validacao de origem
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Rate Limiter   │  ← Controle de taxa
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Router       │  ← Roteamento
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Auth Middleware│  ← Verificacao JWT
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Validator     │  ← Validacao Joi
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Controller    │  ← Logica de negocios
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Database      │  ← PostgreSQL
└────────┬─────────┘
         │
         ▼
Response
```

### Configuracao do Servidor

```typescript
// server.ts - Estrutura principal
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: CORS_ORIGIN }
});

// Middlewares globais
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/comandas', authMiddleware, comandasRoutes);
// ... outras rotas

// Error handler
app.use(errorHandler);
```

### Conexao com Banco de Dados

```typescript
// config/database.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                        // Maximo de conexoes
  idleTimeoutMillis: 30000,       // Timeout de conexao ociosa
  connectionTimeoutMillis: 2000   // Timeout de conexao
});
```

### Conexao Redis

```typescript
// config/redis.ts
import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL
});

// Usado para:
// - Token blacklist (logout)
// - Cache de sessoes
```

---

## 3. Frontend

### Estrutura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    AuthProvider                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              QueryClientProvider                 │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │                  Router                    │  │  │  │
│  │  │  │  ┌─────────────────────────────────────┐  │  │  │  │
│  │  │  │  │              Layout                  │  │  │  │  │
│  │  │  │  │  ┌─────────┐  ┌─────────────────┐  │  │  │  │  │
│  │  │  │  │  │ Sidebar │  │   Page Content   │  │  │  │  │  │
│  │  │  │  │  └─────────┘  └─────────────────┘  │  │  │  │  │
│  │  │  │  └─────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Gerenciamento de Estado

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTADO DA APLICACAO                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Zustand   │     │ React Query │     │   Context   │   │
│  │ (Auth Store)│     │(Server State│     │  (Temas)    │   │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘   │
│         │                   │                   │           │
│         │   ┌───────────────┼───────────────┐   │           │
│         │   │               │               │   │           │
│         ▼   ▼               ▼               ▼   ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    COMPONENTES                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Zustand (AuthContext):**
- Estado de autenticacao
- Dados do usuario logado
- Tokens JWT

**React Query:**
- Cache de dados do servidor
- Sincronizacao automatica
- Invalidacao inteligente
- Retry automatico

### Estrutura de Hooks

```typescript
// Exemplo: useComandas.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function useComandas() {
  const queryClient = useQueryClient();

  const { data: comandas, isLoading } = useQuery({
    queryKey: ['comandas'],
    queryFn: () => api.get('/comandas').then(res => res.data.comandas),
    refetchInterval: 30000  // Atualiza a cada 30s
  });

  const adicionarItem = useMutation({
    mutationFn: (item) => api.post('/comandas/itens', item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    }
  });

  return { comandas, isLoading, adicionarItem };
}
```

### Servico de API

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api'
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Tentar refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('token', data.token);
        error.config.headers.Authorization = `Bearer ${data.token}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 4. Comunicacao em Tempo Real

### Arquitetura WebSocket

```
┌─────────────────────────────────────────────────────────────┐
│                      SOCKET.IO SERVER                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │    Namespace    │     │     Rooms       │               │
│  │    (default)    │     │                 │               │
│  └────────┬────────┘     │ • comandas-abertas              │
│           │              │ • quartos                       │
│           │              │ • caixa                         │
│           │              └─────────────────┘               │
│           │                                                 │
│  ┌────────▼────────┐                                       │
│  │     Events      │                                       │
│  │                 │                                       │
│  │ • comanda:criada│                                       │
│  │ • comanda:atualizada                                    │
│  │ • comanda:fechada                                       │
│  │ • quarto:atualizado                                     │
│  │ • caixa:atualizado                                      │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Eventos

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Cliente A│    │  Server  │    │ Cliente B│    │ Cliente C│
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │  POST /item   │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │   Response    │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │               │ emit('comanda:atualizada')   │
     │               │──────────────>│               │
     │               │───────────────────────────────>
     │               │               │               │
     │   WebSocket   │               │               │
     │<──────────────│               │               │
     │               │               │               │
```

### Implementacao no Backend

```typescript
// server.ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Entrar na sala de comandas abertas
  socket.join('comandas-abertas');

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Emitir evento quando comanda e atualizada
function emitComandaAtualizada(comanda) {
  io.to('comandas-abertas').emit('comanda:atualizada', comanda);
}
```

### Implementacao no Frontend

```typescript
// services/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });
  }

  onComandaAtualizada(callback: (data: any) => void) {
    this.socket?.on('comanda:atualizada', callback);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export default new SocketService();
```

---

## 5. Seguranca

### Camadas de Seguranca

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADAS DE SEGURANCA                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. TRANSPORTE                                               │
│     └─ HTTPS/TLS (Nginx)                                    │
│                                                              │
│  2. REDE                                                     │
│     └─ Firewall, Docker network isolation                   │
│                                                              │
│  3. APLICACAO                                                │
│     ├─ Helmet (headers HTTP)                                │
│     ├─ CORS (origens permitidas)                            │
│     ├─ Rate limiting (DDoS protection)                      │
│     └─ Input sanitization (XSS)                             │
│                                                              │
│  4. AUTENTICACAO                                             │
│     ├─ JWT com expiracao curta (1h)                         │
│     ├─ Refresh token (7d)                                   │
│     └─ Token blacklist (logout)                             │
│                                                              │
│  5. AUTORIZACAO                                              │
│     └─ Role-based access control (RBAC)                     │
│                                                              │
│  6. DADOS                                                    │
│     ├─ bcrypt para senhas (10 rounds)                       │
│     ├─ Validacao Joi em todas entradas                      │
│     └─ Prepared statements (SQL injection)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Autenticacao

```
┌──────────┐                           ┌──────────┐
│  Client  │                           │  Server  │
└────┬─────┘                           └────┬─────┘
     │                                      │
     │  POST /login {login, senha}         │
     │─────────────────────────────────────>│
     │                                      │
     │                        ┌─────────────┤
     │                        │ Validar     │
     │                        │ credenciais │
     │                        │ bcrypt.compare
     │                        └─────────────┤
     │                                      │
     │  {token, refreshToken, usuario}     │
     │<─────────────────────────────────────│
     │                                      │
     │  GET /api/data                       │
     │  Authorization: Bearer <token>       │
     │─────────────────────────────────────>│
     │                                      │
     │                        ┌─────────────┤
     │                        │ jwt.verify  │
     │                        │ Check role  │
     │                        └─────────────┤
     │                                      │
     │  {data}                             │
     │<─────────────────────────────────────│
     │                                      │
```

### Middleware de Autenticacao

```typescript
// middlewares/auth.ts
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  const token = authHeader.substring(7);

  // Verificar se token esta na blacklist
  const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Token revogado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.tipo)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
};
```

---

## 6. Infraestrutura

### Docker Compose - Desenvolvimento

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: bar_system
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d bar_system"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bar-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bar-network

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD}@postgres:5432/bar_system
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - bar-network

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_WS_URL=ws://localhost:3001
    depends_on:
      - backend
    networks:
      - bar-network

volumes:
  postgres_data:
  redis_data:

networks:
  bar-network:
    driver: bridge
```

### Nginx - Producao

```nginx
# nginx/nginx.conf
upstream backend {
    server backend:3001;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location /health {
        proxy_pass http://backend/health;
    }
}
```

---

## 7. Padroes de Projeto

### Padroes Utilizados

| Padrao | Aplicacao |
|--------|-----------|
| **MVC** | Separacao Model-View-Controller no backend |
| **Repository** | Acesso a dados via pool PostgreSQL |
| **Singleton** | Instancias unicas (Redis, Socket.io) |
| **Observer** | WebSocket para eventos em tempo real |
| **Middleware** | Pipeline de processamento Express |
| **Factory** | Criacao de tokens JWT |
| **Strategy** | Calculo de comissoes (percentual/fixo) |

### Exemplo: Strategy Pattern (Comissoes)

```typescript
// Calculo de comissao baseado em tipo
function calcularComissao(produto, acompanhante) {
  let comissao = 0;

  // Strategy 1: Percentual
  if (produto.comissao_percentual) {
    comissao += produto.preco * (produto.comissao_percentual / 100);
  }

  // Strategy 2: Valor fixo
  if (produto.comissao_fixa) {
    comissao += produto.comissao_fixa;
  }

  // Strategy 3: Percentual da acompanhante
  if (!produto.comissao_percentual && !produto.comissao_fixa) {
    comissao = produto.preco * (acompanhante.percentual_comissao / 100);
  }

  return comissao;
}
```

---

## 8. Fluxo de Dados

### Diagrama de Sequencia - Adicionar Item

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Frontend │ │   Nginx  │ │  Backend │ │ PostgreSQL│ │ Socket.io│
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │            │
     │ POST /api/comandas/itens            │            │
     │───────────>│            │            │            │
     │            │───────────>│            │            │
     │            │            │            │            │
     │            │            │ Validar JWT│            │
     │            │            │────────────│            │
     │            │            │            │            │
     │            │            │ Validar dados           │
     │            │            │────────────│            │
     │            │            │            │            │
     │            │            │ INSERT item│            │
     │            │            │───────────>│            │
     │            │            │            │            │
     │            │            │  Trigger   │            │
     │            │            │  atualiza  │            │
     │            │            │  total     │            │
     │            │            │<───────────│            │
     │            │            │            │            │
     │            │            │ emit event │            │
     │            │            │───────────────────────>│
     │            │            │            │            │
     │ Response   │            │            │            │
     │<───────────│<───────────│            │            │
     │            │            │            │            │
     │ WebSocket: comanda:atualizada        │            │
     │<─────────────────────────────────────────────────│
     │            │            │            │            │
```

### Diagrama de Sequencia - Tempo Livre

```
┌──────────┐                    ┌──────────┐ ┌──────────┐
│ Frontend │                    │  Backend │ │ Database │
└────┬─────┘                    └────┬─────┘ └────┬─────┘
     │                               │            │
     │ POST /tempo-livre             │            │
     │ {comanda, quarto, acompanhantes}          │
     │──────────────────────────────>│            │
     │                               │            │
     │                               │ INSERT item│
     │                               │ tempo_livre=true
     │                               │ status='em_andamento'
     │                               │───────────>│
     │                               │            │
     │  {item_id, hora_entrada}     │            │
     │<──────────────────────────────│            │
     │                               │            │
     │ ... TEMPO PASSA ...           │            │
     │                               │            │
     │ PUT /tempo-livre/:id/calcular │            │
     │──────────────────────────────>│            │
     │                               │            │
     │                               │ SELECT minutos
     │                               │ calcular_valor_tempo_livre()
     │                               │───────────>│
     │                               │            │
     │                               │ UPDATE status
     │                               │ ='aguardando_confirmacao'
     │                               │───────────>│
     │                               │            │
     │  {minutos, valor_sugerido}   │            │
     │<──────────────────────────────│            │
     │                               │            │
     │ PUT /tempo-livre/:id/confirmar            │
     │ {valor_final}                 │            │
     │──────────────────────────────>│            │
     │                               │            │
     │                               │ UPDATE valor_total
     │                               │ status='finalizado'
     │                               │───────────>│
     │                               │            │
     │  {item finalizado}           │            │
     │<──────────────────────────────│            │
     │                               │            │
```

---

*Documentacao gerada em Novembro 2025*
