# Sistema de Gestão para Bar/Casa Noturna

Sistema web completo para gestão de bar/casa noturna com controle de comandas, comissões para acompanhantes e ocupação de quartos.

## 📋 Índice

- [Características](#características)
- [Stack Tecnológica](#stack-tecnológica)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Funcionalidades](#funcionalidades)
- [Deploy](#deploy)

## ✨ Características

- **Gestão de Comandas**: Abertura, lançamento de itens e fechamento de comandas
- **PDV Multi-dispositivo**: Suporte para desktop, tablets e dispositivos móveis
- **Sistema de Comissões**: Controle automático de comissões para acompanhantes
- **Controle de Quartos**: Gestão de ocupação com cálculo automático de tempo e valor
- **Movimento de Caixa**: Abertura, fechamento, sangrias e relatórios
- **Tempo Real**: Atualizações em tempo real via WebSocket
- **Autenticação JWT**: Sistema seguro com níveis de acesso (Admin, Caixa, Atendente)
- **Interface Responsiva**: Design moderno com Tailwind CSS

## 🚀 Stack Tecnológica

### Backend
- **Node.js** + **TypeScript**
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **Socket.io** - WebSocket para atualizações em tempo real
- **Redis** - Cache e sessões
- **JWT** - Autenticação

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **React Query** - Gerenciamento de estado
- **Zustand** - State management
- **Socket.io Client** - WebSocket

### Infraestrutura
- **Docker** + **Docker Compose**
- **Nginx** - Reverse proxy
- **PostgreSQL 15**
- **Redis 7**

## 📦 Requisitos

- Docker >= 20.10
- Docker Compose >= 2.0
- Node.js >= 20 (para desenvolvimento local)
- npm >= 10

## 🔧 Instalação

### Usando Docker (Recomendado)

1. Clone o repositório:
```bash
git clone <repository-url>
cd bar
```

2. Configure as variáveis de ambiente:
```bash
# Backend
cp backend/.env.example backend/.env

# Edite o arquivo backend/.env conforme necessário
```

3. Inicie os containers:
```bash
docker-compose up -d
```

4. Aguarde a inicialização (pode levar alguns minutos na primeira vez):
```bash
docker-compose logs -f
```

5. Acesse o sistema:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: localhost:5432

### Desenvolvimento Local

#### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configure o .env com suas credenciais locais
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## ⚙️ Configuração

### Variáveis de Ambiente

#### Backend (.env)

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://admin:senha_segura_2024@localhost:5432/bar_system

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura_2024
JWT_REFRESH_SECRET=sua_chave_refresh_muito_segura_2024
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Banco de Dados

O banco de dados é inicializado automaticamente com:
- Schema completo
- Dados iniciais (categorias, produtos, configurações)
- Usuário admin padrão

**Credenciais padrão:**
- Login: `admin`
- Senha: `admin123`

⚠️ **IMPORTANTE:** Altere a senha do administrador no primeiro acesso!

## 📖 Uso

### Login

1. Acesse http://localhost:3000
2. Use as credenciais padrão (admin/admin123)
3. Você será redirecionado para o PDV

### Fluxo de Trabalho

#### 1. Abrir Caixa (Admin/Caixa)
- Necessário antes de iniciar operações
- Informe o valor de abertura
- O caixa fica vinculado ao operador

#### 2. Gerenciar Comandas (PDV)
- **Nova Comanda**: Digite o número e clique em "Nova"
- **Buscar Comanda**: Digite o número e clique em "Buscar"
- **Adicionar Itens**:
  - Selecione a categoria
  - Escolha o produto
  - Informe a quantidade
  - Para itens comissionados, selecione a acompanhante
  - Clique em "Adicionar"

#### 3. Bebidas Comissionadas
- Selecione um produto do tipo "Comissionado"
- Escolha a acompanhante ativa
- Sistema calcula automaticamente a comissão (padrão 40%)

#### 4. Controle de Quartos
- Registre a ocupação com número do quarto e acompanhante
- Ao finalizar, sistema calcula tempo e valor automaticamente
- Valor é lançado na comanda do cliente

#### 5. Fechar Comanda (Caixa)
- Verifique se não há quartos ocupados
- Selecione a forma de pagamento
- Confirme o fechamento

#### 6. Fechar Caixa (Caixa/Admin)
- Todas comandas devem estar fechadas
- Informe o valor de fechamento
- Sistema gera relatório completo

## 📁 Estrutura do Projeto

```
bar-system/
├── backend/
│   ├── src/
│   │   ├── config/           # Configurações (DB, Redis)
│   │   ├── controllers/      # Controllers da API
│   │   ├── middlewares/      # Auth, validação, erros
│   │   ├── routes/           # Rotas da API
│   │   ├── types/            # TypeScript types
│   │   └── server.ts         # Servidor principal
│   ├── database/
│   │   └── init.sql          # Schema do banco
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── pages/            # Páginas da aplicação
│   │   ├── services/         # API e Socket.io
│   │   ├── hooks/            # Custom hooks
│   │   ├── contexts/         # Contexts (Auth)
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

### Autenticação
```
POST   /api/auth/login          # Login
POST   /api/auth/refresh        # Renovar token
GET    /api/auth/me             # Dados do usuário atual
```

### Comandas
```
GET    /api/comandas            # Listar comandas abertas
POST   /api/comandas            # Criar comanda
GET    /api/comandas/:numero    # Buscar por número
POST   /api/comandas/itens      # Adicionar item
PUT    /api/comandas/:id/fechar # Fechar comanda
PUT    /api/comandas/itens/:id/cancelar # Cancelar item
```

### Produtos
```
GET    /api/produtos            # Listar produtos
GET    /api/produtos/:id        # Buscar produto
GET    /api/produtos/categorias # Listar categorias
POST   /api/produtos            # Criar produto (admin)
PUT    /api/produtos/:id        # Atualizar produto (admin)
DELETE /api/produtos/:id        # Desativar produto (admin)
```

### Acompanhantes
```
GET    /api/acompanhantes       # Listar todas
GET    /api/acompanhantes/ativas # Listar ativas hoje
POST   /api/acompanhantes       # Criar (admin)
PUT    /api/acompanhantes/:id   # Atualizar (admin)
POST   /api/acompanhantes/:id/ativar # Ativar para o dia
DELETE /api/acompanhantes/:id/desativar # Desativar do dia
GET    /api/acompanhantes/:id/comissoes # Relatório comissões
```

### Caixa
```
GET    /api/caixa/aberto        # Buscar caixa aberto
POST   /api/caixa/abrir         # Abrir caixa (caixa/admin)
POST   /api/caixa/sangria       # Registrar sangria (caixa/admin)
PUT    /api/caixa/fechar        # Fechar caixa (caixa/admin)
GET    /api/caixa/:id/relatorio # Relatório do caixa
```

### Quartos
```
GET    /api/quartos/configuracoes # Listar configurações
GET    /api/quartos/ocupados     # Listar quartos ocupados
POST   /api/quartos/ocupar       # Ocupar quarto
PUT    /api/quartos/:id/finalizar # Finalizar ocupação
PUT    /api/quartos/:id/cancelar # Cancelar ocupação
```

## 🎯 Funcionalidades Detalhadas

### Níveis de Acesso

#### Admin
- Acesso total ao sistema
- Configurações de produtos e preços
- Gestão de usuários e acompanhantes
- Todos os relatórios

#### Caixa
- Abertura/fechamento de caixa
- Fechamento de comandas
- Sangrias
- Relatórios do dia

#### Atendente
- Lançamento de pedidos (PDV)
- Consulta de comandas
- Ocupação de quartos
- **Sem acesso** a funções administrativas ou financeiras

### Sistema de Comissões

- Percentual configurável por acompanhante (padrão 40%)
- Cálculo automático no lançamento
- Relatórios individuais por período
- Integração com fechamento de caixa

### Controle de Quartos

Tabela de preços padrão:
- 30 minutos: R$ 70,00
- 1 hora: R$ 100,00
- 1 hora e meia: R$ 150,00
- 2 horas: R$ 200,00

O sistema calcula automaticamente o tempo decorrido e enquadra na faixa de preço adequada.

### WebSocket Events

#### Comandas
- `comanda:atualizada` - Item adicionado/removido
- `comanda:criada` - Nova comanda aberta
- `comanda:fechada` - Comanda finalizada

#### Quartos
- `quarto:atualizado` - Status de quarto alterado

#### Caixa
- `caixa:atualizado` - Movimento de caixa alterado

## 🚀 Deploy

### Produção com Docker

1. Ajuste as variáveis de ambiente para produção
2. Configure domínio e certificados SSL
3. Execute:

```bash
docker-compose -f docker-compose.yml up -d
```

### Backup do Banco de Dados

```bash
# Backup
docker-compose exec postgres pg_dump -U admin bar_system > backup.sql

# Restore
docker-compose exec -T postgres psql -U admin bar_system < backup.sql
```

### Logs

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## 🛠️ Desenvolvimento

### Adicionar Novos Produtos

Via SQL:
```sql
INSERT INTO produtos (nome, categoria_id, preco, tipo, ativo)
VALUES ('Nome do Produto', 1, 15.00, 'normal', true);
```

Via API (requer autenticação admin):
```bash
curl -X POST http://localhost:3001/api/produtos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Nome do Produto",
    "categoria_id": 1,
    "preco": 15.00,
    "tipo": "normal"
  }'
```

### Criar Novo Usuário

```sql
-- Hash da senha deve ser gerado com bcrypt
INSERT INTO usuarios (nome, login, senha, tipo)
VALUES ('Nome', 'login', '$2b$10$hashedPassword', 'atendente');
```

### Testes

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📝 Licença

Este projeto é privado e proprietário.

## 👥 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para gestão eficiente de bares e casas noturnas**
