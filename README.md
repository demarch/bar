# 🍺 Sistema de Gestão para Bar/Casa Noturna

Sistema web completo para gestão de bar/casa noturna com controle de comandas, comissões para acompanhantes e ocupação de quartos.

## 📋 Índice

- [Características](#características)
- [Stack Tecnológica](#stack-tecnológica)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Executando o Projeto](#executando-o-projeto)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [API Endpoints](#api-endpoints)
- [Deploy](#deploy)
- [Credenciais Padrão](#credenciais-padrão)

## ✨ Características

- ✅ **Sistema de Comandas**: Controle completo de comandas com lançamento de itens em tempo real
- ✅ **Comissões para Acompanhantes**: Cálculo automático de comissões em bebidas
- ✅ **Ocupação de Quartos**: Controle de tempo com cálculo automático de valores
- ✅ **Movimento de Caixa**: Abertura, fechamento, sangrias e relatórios
- ✅ **Autenticação JWT**: 3 níveis de acesso (Admin, Caixa, Atendente)
- ✅ **Tempo Real**: Socket.io para sincronização entre dispositivos
- ✅ **Relatórios**: Vendas, comissões e fluxo de caixa
- ✅ **Responsivo**: Interface otimizada para desktop, tablets e mobile

## 🛠 Stack Tecnológica

### Backend
- **Node.js** 20.x
- **Express** - Framework web
- **TypeScript** - Type safety
- **PostgreSQL** - Banco de dados
- **Sequelize** - ORM
- **Socket.io** - Comunicação em tempo real
- **JWT** - Autenticação
- **Winston** - Logging

### Frontend
- **React** 18.x
- **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **React Router** - Roteamento
- **Axios** - HTTP client
- **Socket.io Client** - WebSocket
- **React Query** - State management

### DevOps
- **Docker** & **Docker Compose**
- **Nginx** - Servidor web para produção

## 📦 Pré-requisitos

- **Node.js** >= 20.x
- **PostgreSQL** >= 15.x
- **Docker** & **Docker Compose** (opcional, para deploy)
- **npm** ou **yarn**

## 🚀 Instalação

### 1. Clone o repositório

\`\`\`bash
git clone <repository-url>
cd bar
\`\`\`

### 2. Instale as dependências

#### Backend
\`\`\`bash
cd backend
npm install
\`\`\`

#### Frontend
\`\`\`bash
cd ../frontend
npm install
\`\`\`

## ⚙️ Configuração

### Backend

1. Copie o arquivo de exemplo e configure as variáveis de ambiente:

\`\`\`bash
cd backend
cp .env.example .env
\`\`\`

2. Edite o arquivo `.env` com suas configurações:

\`\`\`env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bar_system
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres

# JWT
JWT_SECRET=seu_secret_super_seguro_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_super_seguro_aqui

# Outros
PORT=3001
NODE_ENV=development
\`\`\`

### Frontend

1. Copie o arquivo de exemplo:

\`\`\`bash
cd frontend
cp .env.example .env
\`\`\`

2. As configurações padrão já estão corretas para desenvolvimento local.

### Banco de Dados

1. Crie o banco de dados PostgreSQL:

\`\`\`bash
createdb bar_system
\`\`\`

2. Execute o seed para popular com dados iniciais:

\`\`\`bash
cd backend
npm run seed
\`\`\`

Isso criará:
- Usuários padrão (admin, caixa, atendente)
- Produtos de exemplo
- Acompanhantes de exemplo
- Configurações de quartos

## 🏃 Executando o Projeto

### Modo Desenvolvimento

#### Backend
\`\`\`bash
cd backend
npm run dev
# Servidor rodando em http://localhost:3001
\`\`\`

#### Frontend
\`\`\`bash
cd frontend
npm run dev
# Aplicação rodando em http://localhost:3000
\`\`\`

### Modo Produção (Docker)

\`\`\`bash
# Na raiz do projeto
docker-compose up -d

# Para parar
docker-compose down
\`\`\`

## 📁 Estrutura do Projeto

\`\`\`
bar-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Configurações (DB, logger)
│   │   ├── controllers/     # Controllers da API
│   │   ├── middlewares/     # Middlewares (auth, errors)
│   │   ├── models/          # Modelos Sequelize
│   │   ├── routes/          # Rotas da API
│   │   ├── services/        # Lógica de negócio
│   │   ├── types/           # TypeScript types
│   │   └── server.ts        # Servidor principal
│   ├── .env                 # Variáveis de ambiente
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── contexts/        # React Contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Páginas
│   │   ├── services/        # API & Socket
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # App principal
│   ├── .env                 # Variáveis de ambiente
│   └── package.json
│
└── docker-compose.yml       # Orquestração Docker
\`\`\`

## 🎯 Funcionalidades

### 1. Gestão de Comandas
- Criar comandas com número único
- Lançar itens (produtos normais e comissionados)
- Visualizar comandas abertas em tempo real
- Fechar comandas com forma de pagamento
- Remover itens

### 2. Sistema de Comissões
- Cadastro de acompanhantes
- Ativação/desativação diária
- Lançamento de bebidas comissionadas
- Cálculo automático da comissão (configurável por produto/acompanhante)
- Relatório de comissões por período

### 3. Controle de Quartos
- Registro de entrada com acompanhante
- Cálculo automático do tempo decorrido
- Enquadramento automático na faixa de preço
- Lançamento automático na comanda
- Configuração flexível de preços por tempo

### 4. Movimento de Caixa
- Abertura de caixa com valor inicial
- Registro de sangrias
- Fechamento automático com cálculo de totais
- Histórico de movimentos
- Validação de comandas pendentes

### 5. Relatórios
- **Vendas**: Total, por categoria, por produto
- **Comissões**: Total e por acompanhante
- **Fluxo de Caixa**: Entradas, saídas, diferença
- **Dashboard**: Resumo em tempo real

### 6. Administração
- Cadastro de produtos
- Configuração de preços
- Gestão de usuários
- Configuração de comissões
- Configuração de quartos

## 🔌 API Endpoints

### Autenticação
\`\`\`
POST   /api/auth/login          - Login
POST   /api/auth/refresh        - Refresh token
GET    /api/auth/me             - Usuário atual
\`\`\`

### Comandas
\`\`\`
POST   /api/comandas            - Criar comanda
GET    /api/comandas/:id        - Buscar por ID
GET    /api/comandas/abertas    - Listar abertas
POST   /api/comandas/lancar-item - Lançar item
POST   /api/comandas/fechar     - Fechar comanda
DELETE /api/comandas/itens/:id  - Remover item
\`\`\`

### Quartos
\`\`\`
POST   /api/quartos/iniciar     - Iniciar ocupação
POST   /api/quartos/finalizar   - Finalizar ocupação
GET    /api/quartos/ocupados    - Listar ocupados
\`\`\`

### Caixa
\`\`\`
POST   /api/caixa/abrir         - Abrir caixa
POST   /api/caixa/fechar        - Fechar caixa
POST   /api/caixa/sangria       - Registrar sangria
GET    /api/caixa/aberto        - Buscar caixa aberto
GET    /api/caixa/:id           - Buscar por ID
\`\`\`

### Relatórios
\`\`\`
GET    /api/relatorios/vendas   - Relatório de vendas
GET    /api/relatorios/comissoes - Relatório de comissões
GET    /api/relatorios/fluxo-caixa - Fluxo de caixa
GET    /api/relatorios/dashboard - Dashboard geral
\`\`\`

### Produtos
\`\`\`
GET    /api/produtos            - Listar produtos
POST   /api/produtos            - Criar produto (admin)
PUT    /api/produtos/:id        - Atualizar produto (admin)
DELETE /api/produtos/:id        - Deletar produto (admin)
\`\`\`

### Acompanhantes
\`\`\`
GET    /api/acompanhantes       - Listar acompanhantes
POST   /api/acompanhantes       - Criar acompanhante (admin)
PATCH  /api/acompanhantes/:id/ativar - Ativar acompanhante
PATCH  /api/acompanhantes/:id/desativar - Desativar acompanhante
\`\`\`

## 🚢 Deploy

### Usando Docker Compose

1. Configure as variáveis de ambiente em `docker-compose.yml`

2. Execute:
\`\`\`bash
docker-compose up -d
\`\`\`

3. Execute o seed do banco (primeira vez):
\`\`\`bash
docker-compose exec backend npm run seed
\`\`\`

### Variáveis de Ambiente de Produção

Certifique-se de alterar:
- `JWT_SECRET` e `JWT_REFRESH_SECRET` para valores seguros
- `DB_PASSWORD` para uma senha forte
- `CORS_ORIGIN` para o domínio do frontend

## 🔐 Credenciais Padrão

Após executar o seed, use estas credenciais para login:

| Tipo | Login | Senha | Descrição |
|------|-------|-------|-----------|
| **Admin** | admin | admin123 | Acesso total ao sistema |
| **Caixa** | caixa | caixa123 | Abertura/fechamento de caixa |
| **Atendente** | atendente | atendente123 | Lançamento de itens no PDV |

⚠️ **IMPORTANTE**: Altere essas senhas em produção!

## 📝 Níveis de Acesso

### Admin
- ✅ Todas as funcionalidades
- ✅ Cadastro de produtos e preços
- ✅ Gestão de usuários
- ✅ Configurações do sistema

### Caixa
- ✅ Abertura/fechamento de caixa
- ✅ Fechamento de comandas
- ✅ Relatórios financeiros
- ✅ Ativar/desativar acompanhantes
- ❌ Cadastros administrativos

### Atendente
- ✅ Criar comandas
- ✅ Lançar itens
- ✅ Controle de quartos
- ✅ Consultar comandas abertas
- ❌ Fechar caixa
- ❌ Relatórios financeiros

## 🔄 Sincronização em Tempo Real

O sistema utiliza Socket.io para sincronizar:
- Criação e atualização de comandas
- Fechamento de comandas
- Ocupação/liberação de quartos
- Dashboard e totais

Todos os dispositivos conectados recebem atualizações instantâneas.

## 🧪 Testes

\`\`\`bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
\`\`\`

## 📄 Licença

MIT

## 👥 Suporte

Para dúvidas e suporte, abra uma issue no repositório.

---

**Desenvolvido com ❤️ para otimizar a gestão de bares e casas noturnas**
