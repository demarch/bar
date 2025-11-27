# Documentacao Tecnica - Sistema de Gestao para Bar

## Visao Geral

Sistema web completo para gestao de bar/casa noturna com controle de comandas, comissoes para acompanhantes, ocupacao de quartos e controle de caixa.

**Versao:** 2.0.0
**Ultima Atualizacao:** Novembro 2025

---

## Indice

1. [Stack Tecnologica](#1-stack-tecnologica)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Modulos e Funcionalidades](#4-modulos-e-funcionalidades)
5. [Fluxos de Negocio](#5-fluxos-de-negocio)
6. [Seguranca](#6-seguranca)
7. [Performance](#7-performance)
8. [Documentacao Relacionada](#8-documentacao-relacionada)

---

## 1. Stack Tecnologica

### Backend

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| Node.js | 20+ | Runtime JavaScript |
| TypeScript | 5.3 | Tipagem estatica |
| Express | 4.18.2 | Framework web |
| PostgreSQL | 15 | Banco de dados relacional |
| Redis | 7 | Cache e blacklist de tokens |
| Socket.io | 4.7.2 | Comunicacao em tempo real |
| JWT | 9.0.2 | Autenticacao stateless |
| bcrypt | 5.1.1 | Hash de senhas |
| Joi | 17.11.0 | Validacao de dados |
| Winston | 3.11.0 | Sistema de logs |
| Helmet | 7.1.0 | Headers de seguranca HTTP |
| PM2 | 6.0.13 | Gerenciador de processos (producao) |

### Frontend

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| React | 18.2.0 | Biblioteca UI |
| TypeScript | 5.2.2 | Tipagem estatica |
| Vite | 5.0.8 | Build tool |
| Tailwind CSS | 3.3.6 | Framework CSS |
| React Router | 6.20.1 | Roteamento SPA |
| Axios | 1.6.2 | Cliente HTTP |
| Zustand | 4.4.7 | Gerenciamento de estado |
| TanStack Query | 5.14.2 | Cache e sincronizacao de dados |
| React Hook Form | 7.49.2 | Gerenciamento de formularios |
| Socket.io Client | 4.7.2 | WebSocket client |
| date-fns | 3.0.0 | Manipulacao de datas |

### Infraestrutura

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| Docker | 20.10+ | Containerizacao |
| Docker Compose | 2.0+ | Orquestracao de containers |
| Nginx | Alpine | Reverse proxy e SSL |

---

## 2. Arquitetura do Sistema

### Diagrama de Arquitetura

```
                                    +------------------+
                                    |     CLIENTE      |
                                    |  (Browser/App)   |
                                    +--------+---------+
                                             |
                                             | HTTPS (443)
                                             v
                                    +------------------+
                                    |      NGINX       |
                                    |  Reverse Proxy   |
                                    |   SSL/TLS Term   |
                                    +--------+---------+
                                             |
                        +--------------------+--------------------+
                        |                                         |
                        v                                         v
               +--------+--------+                       +--------+--------+
               |    FRONTEND     |                       |     BACKEND     |
               |   React + Vite  |                       |   Express API   |
               |   Port: 3000    |                       |   Port: 3001    |
               +-----------------+                       +--------+--------+
                                                                  |
                                                  +---------------+---------------+
                                                  |               |               |
                                                  v               v               v
                                         +--------+------+ +------+-------+ +-----+------+
                                         |  PostgreSQL   | |    Redis     | |  Socket.io |
                                         |   Port: 5432  | |  Port: 6379  | |  WebSocket |
                                         +---------------+ +--------------+ +------------+
```

### Comunicacao

- **HTTP/HTTPS**: API REST para operacoes CRUD
- **WebSocket**: Atualizacoes em tempo real via Socket.io
- **Eventos WebSocket**:
  - `comanda:criada` - Nova comanda aberta
  - `comanda:atualizada` - Item adicionado/removido
  - `comanda:fechada` - Comanda finalizada
  - `quarto:atualizado` - Status de quarto alterado
  - `caixa:atualizado` - Movimento de caixa alterado

### Rede Docker

```yaml
networks:
  bar-network:
    driver: bridge
```

Todos os servicos comunicam-se internamente pela rede `bar-network`.

---

## 3. Estrutura do Projeto

```
bar/
├── backend/
│   ├── src/
│   │   ├── config/                 # Configuracoes
│   │   │   ├── database.ts        # Pool PostgreSQL
│   │   │   ├── redis.ts           # Cliente Redis
│   │   │   └── logger.ts          # Winston logger
│   │   │
│   │   ├── controllers/            # Logica de negocios (11 arquivos)
│   │   │   ├── authController.ts
│   │   │   ├── comandaController.ts
│   │   │   ├── quartoController.ts
│   │   │   ├── caixaController.ts
│   │   │   ├── acompanhanteController.ts
│   │   │   ├── produtoController.ts
│   │   │   ├── usuarioController.ts
│   │   │   ├── relatorioController.ts
│   │   │   ├── dashboardController.ts
│   │   │   ├── quartoAdminController.ts
│   │   │   └── migrationController.ts
│   │   │
│   │   ├── routes/                 # Definicao de rotas (12 arquivos)
│   │   │   ├── auth.ts             # /api/auth
│   │   │   ├── comandas.ts         # /api/comandas
│   │   │   ├── quartos.ts          # /api/quartos
│   │   │   ├── caixa.ts            # /api/caixa
│   │   │   ├── acompanhantes.ts    # /api/acompanhantes
│   │   │   ├── produtos.ts         # /api/produtos
│   │   │   ├── usuarios.ts         # /api/usuarios
│   │   │   ├── relatorios.ts       # /api/relatorios
│   │   │   ├── dashboard.ts        # /api/admin/dashboard
│   │   │   ├── quartosAdmin.ts     # /api/admin/quartos
│   │   │   ├── migrationRoutes.ts  # /api/migrations
│   │   │   └── health.ts           # /health
│   │   │
│   │   ├── middlewares/            # Middlewares Express
│   │   │   ├── auth.ts             # Autenticacao JWT
│   │   │   ├── validator.ts        # Validacao Joi
│   │   │   ├── sanitize.ts         # Prevencao XSS
│   │   │   └── errorHandler.ts     # Tratamento de erros
│   │   │
│   │   ├── services/               # Servicos
│   │   │   └── tokenBlacklist.ts   # Revogacao de tokens
│   │   │
│   │   ├── types/                  # Tipos TypeScript
│   │   └── server.ts               # Entrada principal
│   │
│   ├── database/
│   │   ├── init.sql                # Schema inicial
│   │   └── migrations/             # 8 migracoes
│   │
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Paginas principais
│   │   │   ├── Login.tsx
│   │   │   ├── PDV.tsx
│   │   │   ├── Caixa.tsx
│   │   │   ├── Quartos.tsx
│   │   │   ├── Admin.tsx
│   │   │   ├── Relatorios.tsx
│   │   │   └── DashboardAcompanhantes.tsx
│   │   │
│   │   ├── components/             # Componentes React
│   │   │   ├── Layout.tsx
│   │   │   ├── admin/              # Painel administrativo
│   │   │   ├── pdv/                # Ponto de venda
│   │   │   ├── quartos/            # Gestao de quartos
│   │   │   ├── caixa/              # Operacoes de caixa
│   │   │   └── relatorios/         # Relatorios
│   │   │
│   │   ├── services/               # API e WebSocket
│   │   │   ├── api.ts
│   │   │   └── socket.ts
│   │   │
│   │   ├── contexts/               # Estado global
│   │   │   └── AuthContext.tsx
│   │   │
│   │   ├── hooks/                  # Custom hooks
│   │   └── types/                  # Tipos TypeScript
│   │
│   ├── Dockerfile
│   └── package.json
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
│
├── docs/                           # Documentacao
├── docker-compose.yml              # Desenvolvimento
└── docker-compose.prod.yml         # Producao
```

---

## 4. Modulos e Funcionalidades

### 4.1 Autenticacao e Autorizacao

**Niveis de Acesso:**

| Tipo | Permissoes |
|------|-----------|
| **admin** | Acesso total: configuracoes, usuarios, produtos, relatorios, caixa |
| **caixa** | Abertura/fechamento caixa, fechamento comandas, sangrias, relatorios |
| **atendente** | PDV, lancamento pedidos, consulta comandas, ocupacao quartos |

**Fluxo de Autenticacao:**
1. Login com usuario/senha
2. Servidor gera JWT (1h) + Refresh Token (7d)
3. Cliente armazena tokens
4. Requisicoes com header `Authorization: Bearer <token>`
5. Refresh automatico antes da expiracao

### 4.2 Ponto de Venda (PDV)

- Abertura e busca de comandas
- Lancamento de itens por categoria
- Itens comissionados com selecao de acompanhante
- Servico de quarto com multiplas acompanhantes
- **Tempo Livre**: Servico de quarto sem tempo pre-definido
- Cancelamento de itens (caixa/admin)
- Atualizacao em tempo real via WebSocket

### 4.3 Sistema de Comissoes

**Tipos de Comissao:**
- **Percentual**: Padrao 40%, configuravel por acompanhante
- **Fixa**: Valor fixo por item (ex: R$ 20,00)
- **Combinada**: Percentual + valor fixo

**Fluxo:**
1. Item adicionado com acompanhante vinculada
2. Sistema calcula comissao automaticamente
3. Valor somado ao total de comissoes da comanda
4. Deduzido do caixa no fechamento
5. Relatório por acompanhante e periodo
6. Marcacao de pagamento no encerramento do periodo

### 4.4 Gestao de Quartos

**Configuracoes de Preco:**

| Tempo | Valor |
|-------|-------|
| 30 minutos | R$ 70,00 |
| 1 hora | R$ 100,00 |
| 1 hora e meia | R$ 150,00 |
| 2 horas | R$ 200,00 |

**Servico de Tempo Livre (Migration 008):**
- Inicia servico sem tempo pre-definido
- Timer baseado em checkout
- Calculo automatico com tolerancia de 10 minutos por faixa
- Estados: `em_andamento` -> `aguardando_confirmacao` -> `finalizado`
- Permite ajuste manual antes da confirmacao

### 4.5 Sistema de Pulseiras

- Atribuicao de pulseiras fisicas as acompanhantes
- Pulseiras fixas para acompanhantes permanentes
- Rastreamento de ativacao/desativacao diaria
- Estatisticas de uso
- Disponibilidade em tempo real

### 4.6 Controle de Caixa

**Operacoes:**
- **Abertura**: Valor inicial, vinculado ao operador
- **Sangria**: Retirada de valores com descricao
- **Fechamento**: Conferencia, totalizacao, relatorio

**Totalizadores:**
- Total de vendas
- Total de comissoes
- Total de sangrias
- Valor esperado em caixa

### 4.7 Relatorios

| Relatorio | Descricao |
|-----------|-----------|
| Fluxo de Caixa | Entradas, saidas, sangrias por periodo |
| Comissoes | Comissoes por acompanhante e periodo |
| Vendas | Vendas por produto, categoria, periodo |
| Rentabilidade | Margens e metricas de performance |

---

## 5. Fluxos de Negocio

### 5.1 Fluxo de Abertura do Dia

```
1. Admin/Caixa faz login
2. Abre o caixa com valor inicial
3. Acompanhantes sao ativadas para o dia
4. Sistema pronto para operacao
```

### 5.2 Fluxo de Atendimento

```
1. Atendente abre nova comanda (numero unico)
2. Cliente consome:
   - Bebidas normais -> lancamento simples
   - Bebidas comissionadas -> seleciona acompanhante
   - Quarto -> registra ocupacao com acompanhante(s)
3. Itens refletidos em tempo real
4. Caixa fecha comanda com forma de pagamento
5. Valores atualizados no movimento de caixa
```

### 5.3 Fluxo de Tempo Livre

```
1. Atendente inicia "Servico Tempo Livre"
2. Seleciona quarto e acompanhante(s)
3. Timer comeca a contar
4. Ao finalizar, sistema calcula valor sugerido
5. Atendente confirma ou ajusta valor
6. Lancado na comanda automaticamente
```

### 5.4 Fluxo de Fechamento do Dia

```
1. Todas as comandas devem estar fechadas
2. Quartos devem estar desocupados
3. Caixa informa valor de fechamento
4. Sistema compara com valor esperado
5. Gera relatorio completo do dia
6. Acompanhantes desativadas automaticamente
```

---

## 6. Seguranca

### Autenticacao

- **JWT**: Tokens de curta duracao (1h)
- **Refresh Token**: Renovacao automatica (7d)
- **Token Blacklist**: Revogacao via Redis no logout
- **bcrypt**: Hash de senhas com salt (10 rounds)

### Protecao de Rotas

- Middleware de autenticacao em todas rotas protegidas
- Verificacao de nivel de acesso por rota
- Rate limiting no endpoint de login (5 tentativas/15min)

### Seguranca HTTP

- **Helmet**: Headers de seguranca (XSS, MIME sniffing, etc)
- **CORS**: Configuracao de origens permitidas
- **Sanitizacao**: Prevencao de injecao XSS
- **Validacao**: Schemas Joi em todas as entradas

### Rate Limiting

| Endpoint | Limite |
|----------|--------|
| Login | 5 req/15min |
| API geral | 100 req/min |
| Operacoes | 200 req/min |

### Auditoria

- Logs de todas operacoes financeiras
- Registro de login/logout
- Historico de alteracoes em registros criticos
- Arquivos de log rotacionados (10MB max, 5 arquivos)

---

## 7. Performance

### Banco de Dados

- **Pool de conexoes**: 20 conexoes
- **Indices otimizados**: Em colunas frequentemente consultadas
- **Views materializadas**: Para consultas complexas
- **Queries otimizadas**: Agregacoes eficientes

### Cache

- **Redis**: Blacklist de tokens
- **React Query**: Cache client-side com stale-while-revalidate
- **Nginx**: Cache de assets estaticos (1 ano)

### Otimizacoes

- **Gzip**: Compressao de respostas
- **Code Splitting**: Lazy loading de rotas React
- **Assets**: Minificacao e bundling via Vite
- **WebSocket**: Reduz polling HTTP

---

## 8. Documentacao Relacionada

| Documento | Descricao |
|-----------|-----------|
| [API_REFERENCE.md](./API_REFERENCE.md) | Referencia completa da API REST |
| [DATABASE.md](./DATABASE.md) | Schema e modelo de dados |
| [ARQUITETURA.md](./ARQUITETURA.md) | Detalhes da arquitetura |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Guia de deploy e configuracao |
| [QUICK_START.md](./QUICK_START.md) | Guia de inicio rapido |
| [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) | Backup e restauracao |
| [SSL_SETUP.md](./SSL_SETUP.md) | Configuracao HTTPS |

---

## Credenciais Padrao

**Usuario:** admin
**Senha:** admin123

**IMPORTANTE:** Altere a senha no primeiro acesso em producao!

---

*Documentacao gerada em Novembro 2025*
