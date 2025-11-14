# ROADMAP COMPLETO - Sistema de Gestão de Bar

**Data de Criação:** 14/11/2025
**Projeto:** Sistema de Gestão para Bar com Controle de Comandas e Comissões
**Status Atual:** 60% Completo
**Tempo Total Estimado:** 10 semanas (2.5 meses)

---

## 📊 VISÃO GERAL

### Resumo Executivo
- **Backend:** 90% completo ✅
- **Frontend:** 35% completo ⚠️
- **Infraestrutura:** 60% completa ⚠️
- **Segurança:** 50% completa 🔴
- **Testes:** 0% 🔴

### Objetivo
Completar todas as funcionalidades críticas e preparar o sistema para produção em **10 semanas**.

---

# 🔴 SPRINT 1: CORREÇÕES CRÍTICAS DE SEGURANÇA
**Duração:** 1 semana
**Prioridade:** CRÍTICA
**Objetivo:** Eliminar todas vulnerabilidades de segurança bloqueadoras

## Tarefas

### SEC-001: Corrigir Hash da Senha do Admin
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 15 minutos
- **Arquivo:** `/backend/database/init.sql:325`
- **Problema:** Hash mockado não funciona com 'admin123'
- **Solução:**
  ```bash
  # Gerar hash correto com bcrypt
  node -e "console.log(require('bcrypt').hashSync('admin123', 10))"
  ```
- **Checklist:**
  - [ ] Gerar hash correto com bcrypt
  - [ ] Atualizar init.sql linha 325
  - [ ] Testar login com admin/admin123
  - [ ] Verificar se JWT é gerado corretamente

### SEC-002: Corrigir usuario_id Hardcoded em Quartos
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 10 minutos
- **Arquivo:** `/backend/src/controllers/quartoController.ts:167`
- **Problema:** `usuario_id: 1` fixo ao invés de usar `req.user.id`
- **Código Atual:**
  ```typescript
  usuario_id: 1  // ERRADO
  ```
- **Código Correto:**
  ```typescript
  usuario_id: req.user!.id  // CORRETO
  ```
- **Checklist:**
  - [ ] Localizar linha 167 em quartoController.ts
  - [ ] Substituir `usuario_id: 1` por `usuario_id: req.user!.id`
  - [ ] Testar finalização de quarto
  - [ ] Verificar auditoria no banco de dados

### SEC-003: Implementar Autenticação no WebSocket
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 2 horas
- **Arquivo:** `/backend/src/server.ts`
- **Problema:** Qualquer cliente pode conectar sem validar JWT
- **Solução:**
  ```typescript
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });
  ```
- **Checklist:**
  - [ ] Criar middleware de autenticação WebSocket
  - [ ] Atualizar server.ts para usar middleware
  - [ ] Atualizar frontend para enviar token na conexão
  - [ ] Testar conexão com token válido
  - [ ] Testar rejeição com token inválido
  - [ ] Testar reconexão após expiração

### SEC-004: Remover Senhas Hardcoded do Docker
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 30 minutos
- **Arquivos:**
  - `/docker-compose.yml`
  - `/docker-compose.prod.yml`
- **Problema:** Senhas visíveis nos arquivos Docker Compose
- **Checklist:**
  - [ ] Criar arquivo `.env` na raiz do projeto
  - [ ] Mover todas senhas para .env:
    - POSTGRES_PASSWORD
    - REDIS_PASSWORD (se aplicável)
    - JWT_SECRET
    - JWT_REFRESH_SECRET
  - [ ] Atualizar docker-compose.yml para usar ${VARIAVEL}
  - [ ] Adicionar .env ao .gitignore
  - [ ] Criar .env.example com valores de exemplo
  - [ ] Documentar no README.md
  - [ ] Testar com docker-compose up

### SEC-005: Configurar Persistência do Redis
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 1 hora
- **Arquivo:** `/docker-compose.yml`
- **Problema:** Reiniciar Redis perde todas as sessões
- **Solução:** Configurar AOF (Append Only File)
- **Checklist:**
  - [ ] Adicionar volume persistente para Redis
    ```yaml
    volumes:
      - redis_data:/data
    ```
  - [ ] Configurar AOF:
    ```yaml
    command: redis-server --appendonly yes --appendfsync everysec
    ```
  - [ ] Adicionar volume na seção volumes
  - [ ] Testar persistência:
    - Conectar e criar sessão
    - Reiniciar container
    - Verificar se sessão persiste

### SEC-006: Implementar Rate Limiting Específico para Login
- **Prioridade:** 🔴 ALTA
- **Tempo:** 1 hora
- **Arquivo:** `/backend/src/routes/auth.ts`
- **Problema:** 100 req/15min muito permissivo para login
- **Solução:**
  ```typescript
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post('/login', loginLimiter, authController.login);
  ```
- **Checklist:**
  - [ ] Criar loginLimiter específico
  - [ ] Aplicar apenas na rota POST /login
  - [ ] Testar bloqueio após 5 tentativas
  - [ ] Verificar mensagem de erro clara
  - [ ] Documentar no README

### SEC-007: Implementar Sistema de Revogação de Tokens (Blacklist)
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivos:**
  - Criar `/backend/src/services/tokenBlacklist.ts`
  - Atualizar `/backend/src/middlewares/authenticate.ts`
- **Solução:**
  ```typescript
  // tokenBlacklist.ts
  import redis from '../config/redis';

  export const addToBlacklist = async (token: string, expiresIn: number) => {
    await redis.setex(`blacklist:${token}`, expiresIn, '1');
  };

  export const isBlacklisted = async (token: string): Promise<boolean> => {
    const result = await redis.get(`blacklist:${token}`);
    return result !== null;
  };
  ```
- **Checklist:**
  - [ ] Criar serviço tokenBlacklist.ts
  - [ ] Implementar addToBlacklist()
  - [ ] Implementar isBlacklisted()
  - [ ] Atualizar middleware authenticate para verificar blacklist
  - [ ] Criar endpoint POST /api/auth/logout
  - [ ] Adicionar token à blacklist no logout
  - [ ] Testar logout e tentativa de uso do token
  - [ ] Documentar no README

---

# 🟠 SPRINT 2: DASHBOARD DE CAIXA
**Duração:** 1 semana
**Prioridade:** CRÍTICA
**Objetivo:** Permitir operação completa do módulo de caixa

## Tarefas

### CAI-001: Criar Componente de Abertura de Caixa
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/caixa/AberturaCaixa.tsx`
- **Funcionalidades:**
  - Formulário com valor de abertura
  - Validação de valor > 0
  - Confirmação de abertura
  - Feedback de sucesso/erro
- **Checklist:**
  - [ ] Criar componente AberturaCaixa.tsx
  - [ ] Implementar formulário com Tailwind
  - [ ] Adicionar validação de valor
  - [ ] Integrar com hook useCaixa
  - [ ] Implementar feedback visual (toast)
  - [ ] Adicionar loading state
  - [ ] Testar abertura de caixa
  - [ ] Verificar se atualiza estado global

### CAI-002: Criar Dashboard Principal de Caixa
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 1 dia
- **Arquivo:** Criar `/frontend/src/components/caixa/DashboardCaixa.tsx`
- **Layout (conforme Especificação Seção 4.2):**
  ```
  ┌─────────────────────────────────────────┐
  │  CAIXA ABERTO                           │
  │  Operador: João Silva                   │
  │  Abertura: 14/11/2025 08:00             │
  │  Valor Inicial: R$ 500,00               │
  ├─────────────────────────────────────────┤
  │  RESUMO DO DIA                          │
  │  Vendas: R$ 2.500,00                    │
  │  Comissões: R$ 600,00                   │
  │  Sangrias: R$ 300,00                    │
  │  Lucro: R$ 1.600,00                     │
  ├─────────────────────────────────────────┤
  │  [Fechar Comanda] [Sangria]             │
  │  [Relatórios] [Fechar Caixa]            │
  └─────────────────────────────────────────┘
  ```
- **Checklist:**
  - [ ] Criar componente DashboardCaixa.tsx
  - [ ] Implementar cabeçalho com info do caixa
  - [ ] Implementar seção de resumo financeiro
  - [ ] Adicionar botões de ação
  - [ ] Integrar com WebSocket para atualizações em tempo real
  - [ ] Implementar auto-refresh a cada 30s
  - [ ] Adicionar gráfico de vendas (opcional)
  - [ ] Testar com dados reais

### CAI-003: Criar Tela de Fechamento de Comanda
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/caixa/FecharComanda.tsx`
- **Funcionalidades:**
  - Buscar comanda por número
  - Exibir resumo completo:
    - Itens normais
    - Itens comissionados (com acompanhante)
    - Serviços de quarto
    - Total geral
  - Validar quartos ocupados
  - Selecionar forma de pagamento (Dinheiro, Cartão Débito, Cartão Crédito, PIX)
  - Confirmação de fechamento
- **Checklist:**
  - [ ] Criar componente FecharComanda.tsx
  - [ ] Implementar busca de comanda
  - [ ] Criar seção de resumo detalhado
  - [ ] Adicionar validação de quartos ocupados
  - [ ] Implementar seletor de forma de pagamento
  - [ ] Adicionar modal de confirmação
  - [ ] Integrar com API PUT /comandas/:id/fechar
  - [ ] Implementar impressão/exportação (opcional)
  - [ ] Testar fluxo completo
  - [ ] Adicionar feedback de sucesso

### CAI-004: Criar Tela de Sangria
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 3 horas
- **Arquivo:** Criar `/frontend/src/components/caixa/Sangria.tsx`
- **Funcionalidades:**
  - Formulário com valor da sangria
  - Motivo/observação (opcional)
  - Validação de saldo disponível
  - Confirmação
- **Checklist:**
  - [ ] Criar componente Sangria.tsx
  - [ ] Implementar formulário
  - [ ] Adicionar validação de valor
  - [ ] Validar se há saldo suficiente
  - [ ] Adicionar campo de observação
  - [ ] Integrar com API POST /caixa/sangria
  - [ ] Atualizar saldo em tempo real
  - [ ] Testar sangria

### CAI-005: Criar Tela de Fechamento de Caixa
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/caixa/FechamentoCaixa.tsx`
- **Funcionalidades:**
  - Exibir resumo completo do dia:
    - Valor de abertura
    - Total de vendas
    - Total de sangrias
    - Comissões do dia
    - Saldo esperado
  - Informar valor de fechamento (contagem física)
  - Calcular diferença (quebra de caixa)
  - Validar se há comandas abertas
  - Confirmação de fechamento
  - Gerar relatório PDF (opcional)
- **Checklist:**
  - [ ] Criar componente FechamentoCaixa.tsx
  - [ ] Implementar seção de resumo
  - [ ] Adicionar campo de valor de fechamento
  - [ ] Calcular e exibir diferença
  - [ ] Validar comandas abertas
  - [ ] Adicionar modal de confirmação
  - [ ] Integrar com API PUT /caixa/fechar
  - [ ] Implementar geração de relatório
  - [ ] Testar fechamento
  - [ ] Verificar se caixa fica fechado

### CAI-006: Criar Página Principal de Caixa
- **Prioridade:** 🔴 CRÍTICA
- **Tempo:** 2 horas
- **Arquivo:** Criar `/frontend/src/pages/Caixa.tsx`
- **Funcionalidades:**
  - Verificar se há caixa aberto
  - Se não: exibir AberturaCaixa
  - Se sim: exibir DashboardCaixa
  - Navegação entre sub-telas
- **Checklist:**
  - [ ] Criar página Caixa.tsx
  - [ ] Implementar verificação de caixa aberto
  - [ ] Renderizar AberturaCaixa ou DashboardCaixa
  - [ ] Adicionar navegação para sub-telas
  - [ ] Adicionar proteção de rota (apenas caixa/admin)
  - [ ] Integrar com sistema de rotas
  - [ ] Testar fluxo completo

---

# 🟠 SPRINT 3: GERENCIAMENTO DE QUARTOS
**Duração:** 1 semana
**Prioridade:** ALTA
**Objetivo:** Completar funcionalidade de controle de quartos

## Tarefas

### QUA-001: Criar Backend - Listar Quartos Disponíveis
- **Prioridade:** 🟡 ALTA
- **Tempo:** 2 horas
- **Arquivo:** Atualizar `/backend/src/controllers/quartoController.ts`
- **Funcionalidade:** Endpoint GET /api/quartos/disponiveis
- **Checklist:**
  - [ ] Criar método listarDisponiveis()
  - [ ] Retornar quartos ativos do banco
  - [ ] Marcar quais estão ocupados
  - [ ] Adicionar rota em quartos.ts
  - [ ] Testar endpoint

### QUA-002: Criar Componente de Lista de Quartos Ocupados
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/quartos/QuartosOcupados.tsx`
- **Layout:**
  ```
  ┌─────────────────────────────────────────┐
  │  QUARTOS OCUPADOS                       │
  ├─────────────────────────────────────────┤
  │  Quarto 1 | Acompanhante: Ana           │
  │  Início: 10:30 | Tempo: 1h 23min        │
  │  Previsão: R$ 150,00                    │
  │  [Finalizar]                            │
  ├─────────────────────────────────────────┤
  │  Quarto 3 | Acompanhante: Maria         │
  │  Início: 11:00 | Tempo: 0h 53min        │
  │  Previsão: R$ 100,00                    │
  │  [Finalizar]                            │
  └─────────────────────────────────────────┘
  ```
- **Checklist:**
  - [ ] Criar componente QuartosOcupados.tsx
  - [ ] Implementar lista de quartos
  - [ ] Adicionar cálculo de tempo decorrido
  - [ ] Implementar atualização automática a cada 1 min
  - [ ] Adicionar botão de finalizar
  - [ ] Integrar com WebSocket
  - [ ] Adicionar indicador de cor por tempo:
    - Verde: < 30min
    - Amarelo: 30min - 1h
    - Laranja: 1h - 2h
    - Vermelho: > 2h
  - [ ] Testar atualização em tempo real

### QUA-003: Criar Componente de Ocupação de Quarto
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/quartos/OcuparQuarto.tsx`
- **Funcionalidades:**
  - Buscar comanda
  - Selecionar quarto disponível
  - Selecionar acompanhante(s)
  - Confirmar ocupação
- **Checklist:**
  - [ ] Criar componente OcuparQuarto.tsx
  - [ ] Implementar busca de comanda
  - [ ] Criar seletor de quarto (grid visual)
  - [ ] Implementar seleção de acompanhante
  - [ ] Suportar múltiplas acompanhantes
  - [ ] Adicionar validações
  - [ ] Integrar com API POST /quartos/ocupar
  - [ ] Testar ocupação

### QUA-004: Criar Modal de Finalização de Quarto
- **Prioridade:** 🟡 ALTA
- **Tempo:** 3 horas
- **Arquivo:** Criar `/frontend/src/components/quartos/FinalizarQuarto.tsx`
- **Funcionalidades:**
  - Exibir informações do quarto:
    - Número do quarto
    - Acompanhante(s)
    - Tempo decorrido
    - Valor calculado
    - Número da comanda
  - Permitir ajuste manual de valor (admin apenas)
  - Confirmação de finalização
- **Checklist:**
  - [ ] Criar componente FinalizarQuarto.tsx
  - [ ] Implementar exibição de informações
  - [ ] Adicionar cálculo de valor em tempo real
  - [ ] Permitir ajuste de valor (admin)
  - [ ] Adicionar confirmação
  - [ ] Integrar com API PUT /quartos/:id/finalizar
  - [ ] Testar finalização
  - [ ] Verificar lançamento na comanda

### QUA-005: Implementar Notificações de Tempo
- **Prioridade:** 🟡 MÉDIA
- **Tempo:** 3 horas
- **Arquivo:** Criar `/frontend/src/hooks/useQuartoNotifications.ts`
- **Funcionalidades:**
  - Alertar quando quarto atinge 1h 45min (perto de 2h)
  - Alertar quando ultrapassa 2h
  - Som ou notificação visual
- **Checklist:**
  - [ ] Criar hook useQuartoNotifications
  - [ ] Implementar verificação de tempo
  - [ ] Adicionar notificação toast
  - [ ] Adicionar som de alerta (opcional)
  - [ ] Integrar com QuartosOcupados
  - [ ] Testar notificações

### QUA-006: Criar Página Principal de Quartos
- **Prioridade:** 🟡 ALTA
- **Tempo:** 2 horas
- **Arquivo:** Criar `/frontend/src/pages/Quartos.tsx`
- **Layout:** 2 colunas
  - Esquerda: QuartosOcupados
  - Direita: OcuparQuarto
- **Checklist:**
  - [ ] Criar página Quartos.tsx
  - [ ] Implementar layout 2 colunas
  - [ ] Adicionar QuartosOcupados
  - [ ] Adicionar OcuparQuarto
  - [ ] Adicionar ao sistema de rotas
  - [ ] Testar navegação

---

# 🟡 SPRINT 4: PAINEL ADMINISTRATIVO
**Duração:** 2 semanas
**Prioridade:** ALTA
**Objetivo:** Permitir configuração completa do sistema via UI

## Semana 1: CRUD de Produtos e Categorias

### ADM-001: Criar Layout Base do Painel Admin
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/admin/AdminLayout.tsx`
- **Layout:**
  ```
  ┌─────────────────────────────────────────┐
  │  SIDEBAR          │  CONTEÚDO           │
  │  Dashboard        │                     │
  │  Produtos         │                     │
  │  Categorias       │                     │
  │  Acompanhantes    │                     │
  │  Usuários         │                     │
  │  Quartos          │                     │
  │  Configurações    │                     │
  └─────────────────────────────────────────┘
  ```
- **Checklist:**
  - [ ] Criar AdminLayout.tsx
  - [ ] Implementar sidebar responsiva
  - [ ] Adicionar navegação entre seções
  - [ ] Criar componente de header
  - [ ] Adicionar proteção de rota (admin apenas)
  - [ ] Testar navegação

### ADM-002: Criar CRUD de Produtos - Listagem
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/admin/produtos/ListaProdutos.tsx`
- **Funcionalidades:**
  - Tabela com todos produtos
  - Filtro por categoria
  - Busca por nome
  - Indicador de ativo/inativo
  - Botões: Novo, Editar, Desativar
- **Checklist:**
  - [ ] Criar componente ListaProdutos.tsx
  - [ ] Implementar tabela com Tailwind
  - [ ] Adicionar filtros
  - [ ] Integrar com API GET /produtos
  - [ ] Adicionar paginação
  - [ ] Testar listagem

### ADM-003: Criar CRUD de Produtos - Formulário
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/admin/produtos/FormProduto.tsx`
- **Campos:**
  - Nome
  - Categoria
  - Preço
  - Tipo (normal/comissionado)
  - Ativo (checkbox)
- **Checklist:**
  - [ ] Criar componente FormProduto.tsx
  - [ ] Implementar formulário
  - [ ] Adicionar validações
  - [ ] Integrar com API POST/PUT /produtos
  - [ ] Testar criação
  - [ ] Testar edição

### ADM-004: Criar CRUD de Categorias
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/admin/categorias/GerenciarCategorias.tsx`
- **Funcionalidades:**
  - Lista de categorias
  - Adicionar categoria
  - Editar categoria
  - Desativar categoria
  - Ordenação (drag & drop opcional)
- **Checklist:**
  - [ ] Criar componente GerenciarCategorias.tsx
  - [ ] Implementar lista
  - [ ] Adicionar formulário inline
  - [ ] Integrar com API
  - [ ] Testar CRUD completo

### ADM-005: Criar Dashboard Admin
- **Prioridade:** 🟡 MÉDIA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/admin/DashboardAdmin.tsx`
- **Widgets:**
  - Total de vendas (mês)
  - Comandas abertas (hoje)
  - Produtos mais vendidos (semana)
  - Comissões pendentes
  - Quartos ocupados
  - Gráfico de vendas (últimos 7 dias)
- **Checklist:**
  - [ ] Criar componente DashboardAdmin.tsx
  - [ ] Implementar widgets
  - [ ] Criar backend para estatísticas
  - [ ] Adicionar gráficos (Chart.js ou Recharts)
  - [ ] Implementar auto-refresh
  - [ ] Testar dashboard

## Semana 2: Acompanhantes, Usuários e Configurações

### ADM-006: Criar CRUD de Acompanhantes - Listagem
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/admin/acompanhantes/ListaAcompanhantes.tsx`
- **Funcionalidades:**
  - Tabela com todas acompanhantes
  - Indicador de ativa hoje
  - Percentual de comissão
  - Tipo (fixa/rotativa)
  - Número de pulseira
  - Botões: Nova, Editar, Excluir
- **Checklist:**
  - [ ] Criar componente ListaAcompanhantes.tsx
  - [ ] Implementar tabela
  - [ ] Adicionar indicadores visuais
  - [ ] Integrar com API GET /acompanhantes
  - [ ] Testar listagem

### ADM-007: Criar CRUD de Acompanhantes - Formulário
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/admin/acompanhantes/FormAcompanhante.tsx`
- **Campos:**
  - Nome
  - Tipo (fixa/rotativa)
  - Percentual de comissão
  - Número de pulseira (se rotativa)
  - Telefone (opcional)
  - Observações (opcional)
- **Checklist:**
  - [ ] Criar componente FormAcompanhante.tsx
  - [ ] Implementar formulário
  - [ ] Adicionar validações
  - [ ] Integrar com API POST/PUT /acompanhantes
  - [ ] Testar criação e edição

### ADM-008: Criar Tela de Ativação Diária
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/admin/acompanhantes/AtivacaoDiaria.tsx`
- **Funcionalidades:**
  - Lista de todas acompanhantes
  - Checkbox para ativar/desativar
  - Mostrar quais já estão ativas
  - Botão "Ativar Selecionadas"
  - Histórico de presença
- **Checklist:**
  - [ ] Criar componente AtivacaoDiaria.tsx
  - [ ] Implementar lista com checkboxes
  - [ ] Adicionar seleção em massa
  - [ ] Integrar com API POST /acompanhantes/:id/ativar
  - [ ] Mostrar histórico
  - [ ] Testar ativação/desativação

### ADM-009: Criar CRUD de Usuários
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/admin/usuarios/GerenciarUsuarios.tsx`
- **Funcionalidades:**
  - Listagem de usuários
  - Filtro por tipo (admin/caixa/atendente)
  - Adicionar usuário
  - Editar usuário
  - Desativar/Ativar usuário
  - Resetar senha
- **Checklist:**
  - [ ] Criar componente GerenciarUsuarios.tsx
  - [ ] Implementar tabela de usuários
  - [ ] Criar formulário de usuário
  - [ ] Adicionar validações
  - [ ] Integrar com API /usuarios
  - [ ] Implementar reset de senha (backend + frontend)
  - [ ] Testar CRUD completo

### ADM-010: Criar CRUD de Quartos
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/admin/quartos/GerenciarQuartos.tsx`
- **Funcionalidades:**
  - Listagem de quartos
  - Adicionar quarto (número, nome)
  - Editar quarto
  - Desativar quarto
  - Status: disponível/ocupado
- **Checklist:**
  - [ ] Criar componente GerenciarQuartos.tsx
  - [ ] Implementar listagem
  - [ ] Criar formulário
  - [ ] Integrar com API /admin/quartos
  - [ ] Testar CRUD

### ADM-011: Criar Tela de Configuração de Preços de Quartos
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/admin/quartos/ConfiguracaoPrecos.tsx`
- **Funcionalidades:**
  - Tabela de preços:
    - 30 min: R$ X
    - 1 hora: R$ X
    - 1h30: R$ X
    - 2 horas: R$ X
  - Editar valores
  - Salvar configurações
- **Checklist:**
  - [ ] Criar componente ConfiguracaoPrecos.tsx
  - [ ] Implementar formulário de preços
  - [ ] Adicionar validações
  - [ ] Integrar com API PUT /admin/quartos/configuracoes/:id
  - [ ] Testar atualização

### ADM-012: Criar Tela de Configurações do Sistema
- **Prioridade:** 🟡 MÉDIA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/admin/ConfiguracoesGerais.tsx`
- **Campos:**
  - Nome do estabelecimento
  - Percentual de comissão padrão
  - Timezone
  - Moeda
  - Configurações de impressão
- **Backend necessário:**
  - GET /api/configuracoes
  - PUT /api/configuracoes
- **Checklist:**
  - [ ] Criar endpoint backend GET/PUT /configuracoes
  - [ ] Criar componente ConfiguracoesGerais.tsx
  - [ ] Implementar formulário
  - [ ] Adicionar validações
  - [ ] Integrar com API
  - [ ] Testar atualização

### ADM-013: Criar Página Principal de Admin
- **Prioridade:** 🟡 ALTA
- **Tempo:** 2 horas
- **Arquivo:** Criar `/frontend/src/pages/Admin.tsx`
- **Checklist:**
  - [ ] Criar página Admin.tsx
  - [ ] Implementar roteamento interno
  - [ ] Adicionar AdminLayout
  - [ ] Configurar rotas para cada seção
  - [ ] Adicionar proteção (admin apenas)
  - [ ] Testar navegação completa

---

# 🟢 SPRINT 5: MÓDULO DE RELATÓRIOS
**Duração:** 1.5 semanas
**Prioridade:** ALTA
**Objetivo:** Completar sistema de relatórios para gestão financeira

## Tarefas Backend

### REL-001: Criar Estrutura de Rotas de Relatórios
- **Prioridade:** 🟡 ALTA
- **Tempo:** 1 hora
- **Arquivo:** Criar `/backend/src/routes/relatorios.ts`
- **Rotas:**
  - GET /api/relatorios/fluxo-caixa
  - GET /api/relatorios/comissoes
  - GET /api/relatorios/vendas
  - GET /api/relatorios/rentabilidade
- **Checklist:**
  - [ ] Criar arquivo relatorios.ts
  - [ ] Definir rotas
  - [ ] Adicionar middleware de autenticação
  - [ ] Adicionar middleware de autorização (caixa/admin)
  - [ ] Registrar rotas em server.ts

### REL-002: Implementar Controller de Fluxo de Caixa
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/backend/src/controllers/relatorioController.ts`
- **Método:** fluxoCaixa(req, res)
- **Parâmetros query:**
  - data_inicio (obrigatório)
  - data_fim (obrigatório)
- **Retorno:**
  ```json
  {
    "periodo": {
      "inicio": "2025-11-01",
      "fim": "2025-11-30"
    },
    "resumo": {
      "total_vendas": 50000.00,
      "total_comissoes": 12000.00,
      "total_sangrias": 5000.00,
      "lucro_liquido": 33000.00
    },
    "por_dia": [
      {
        "data": "2025-11-01",
        "vendas": 1500.00,
        "comissoes": 400.00,
        "lucro": 1100.00
      }
    ],
    "por_forma_pagamento": {
      "dinheiro": 20000.00,
      "cartao_debito": 15000.00,
      "cartao_credito": 10000.00,
      "pix": 5000.00
    }
  }
  ```
- **Checklist:**
  - [ ] Criar relatorioController.ts
  - [ ] Implementar método fluxoCaixa
  - [ ] Query SQL otimizada
  - [ ] Adicionar validação de parâmetros
  - [ ] Testar com Postman
  - [ ] Documentar endpoint

### REL-003: Implementar Controller de Relatório de Comissões
- **Prioridade:** 🟡 ALTA
- **Tempo:** 3 horas
- **Método:** relatorioComissoes(req, res)
- **Parâmetros query:**
  - data_inicio
  - data_fim
  - acompanhante_id (opcional)
- **Retorno:**
  ```json
  {
    "periodo": {
      "inicio": "2025-11-01",
      "fim": "2025-11-30"
    },
    "total_geral": 12000.00,
    "por_acompanhante": [
      {
        "acompanhante_id": 1,
        "nome": "Ana Silva",
        "total_itens": 45,
        "total_comissao": 1800.00,
        "percentual_medio": 40,
        "pago": false
      }
    ]
  }
  ```
- **Checklist:**
  - [ ] Implementar método relatorioComissoes
  - [ ] Query com JOIN otimizado
  - [ ] Filtro por acompanhante opcional
  - [ ] Adicionar flag de comissões pagas/pendentes
  - [ ] Testar endpoint
  - [ ] Documentar

### REL-004: Implementar Controller de Relatório de Vendas
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Método:** relatorioVendas(req, res)
- **Parâmetros query:**
  - data_inicio
  - data_fim
  - categoria_id (opcional)
  - produto_id (opcional)
- **Retorno:**
  ```json
  {
    "periodo": {
      "inicio": "2025-11-01",
      "fim": "2025-11-30"
    },
    "total_vendas": 50000.00,
    "total_itens": 1234,
    "ticket_medio": 40.52,
    "por_categoria": [
      {
        "categoria_id": 1,
        "nome": "Bebidas",
        "total_vendas": 30000.00,
        "quantidade": 800
      }
    ],
    "produtos_mais_vendidos": [
      {
        "produto_id": 5,
        "nome": "Cerveja Heineken",
        "quantidade": 250,
        "total_vendas": 2500.00
      }
    ]
  }
  ```
- **Checklist:**
  - [ ] Implementar método relatorioVendas
  - [ ] Query para total de vendas
  - [ ] Query para vendas por categoria
  - [ ] Query para produtos mais vendidos
  - [ ] Calcular ticket médio
  - [ ] Testar endpoint
  - [ ] Documentar

### REL-005: Implementar Controller de Análise de Rentabilidade
- **Prioridade:** 🟡 MÉDIA
- **Tempo:** 3 horas
- **Método:** analiseRentabilidade(req, res)
- **Parâmetros query:**
  - periodo (dia/semana/mes/ano)
- **Retorno:**
  ```json
  {
    "periodo": "mes",
    "data": "2025-11",
    "metricas": {
      "receita_bruta": 50000.00,
      "comissoes": 12000.00,
      "receita_liquida": 38000.00,
      "margem_liquida": 76.0
    },
    "comparacao_periodo_anterior": {
      "crescimento_receita": 15.5,
      "crescimento_lucro": 12.3
    }
  }
  ```
- **Checklist:**
  - [ ] Implementar método analiseRentabilidade
  - [ ] Calcular métricas
  - [ ] Comparar com período anterior
  - [ ] Testar endpoint
  - [ ] Documentar

## Tarefas Frontend

### REL-006: Criar Componente de Filtro de Período
- **Prioridade:** 🟡 ALTA
- **Tempo:** 3 horas
- **Arquivo:** Criar `/frontend/src/components/relatorios/FiltroPeriodo.tsx`
- **Funcionalidades:**
  - Seleção de data início/fim
  - Atalhos: Hoje, Ontem, Esta Semana, Este Mês
  - Botão Aplicar
- **Checklist:**
  - [ ] Criar componente FiltroPeriodo.tsx
  - [ ] Implementar seletor de datas
  - [ ] Adicionar atalhos
  - [ ] Validar período
  - [ ] Emitir evento onChange

### REL-007: Criar Relatório de Fluxo de Caixa - Frontend
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/relatorios/FluxoCaixa.tsx`
- **Seções:**
  - Filtro de período
  - Cards de resumo (vendas, comissões, lucro)
  - Gráfico de vendas por dia
  - Tabela de vendas por forma de pagamento
  - Botão exportar PDF/Excel
- **Checklist:**
  - [ ] Criar componente FluxoCaixa.tsx
  - [ ] Implementar filtro de período
  - [ ] Criar cards de resumo
  - [ ] Adicionar gráfico (Chart.js ou Recharts)
  - [ ] Criar tabela de formas de pagamento
  - [ ] Integrar com API GET /relatorios/fluxo-caixa
  - [ ] Implementar exportação (opcional)
  - [ ] Testar relatório

### REL-008: Criar Relatório de Comissões - Frontend
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/relatorios/RelatorioComissoes.tsx`
- **Seções:**
  - Filtro de período
  - Filtro por acompanhante
  - Total geral de comissões
  - Tabela por acompanhante:
    - Nome
    - Qtd itens
    - Total comissão
    - Status (pago/pendente)
    - Ação: Marcar como pago
  - Botão exportar
- **Checklist:**
  - [ ] Criar componente RelatorioComissoes.tsx
  - [ ] Implementar filtros
  - [ ] Criar tabela
  - [ ] Adicionar ação "Marcar como pago"
  - [ ] Integrar com API
  - [ ] Implementar exportação
  - [ ] Testar relatório

### REL-009: Implementar Backend - Marcar Comissões como Pagas
- **Prioridade:** 🟡 ALTA
- **Tempo:** 2 horas
- **Arquivo:** Atualizar `/backend/src/controllers/acompanhanteController.ts`
- **Endpoint:** POST /api/acompanhantes/periodo/:id/pagar
- **Checklist:**
  - [ ] Criar método pagarComissoes
  - [ ] Atualizar campo `pago` e `data_pagamento`
  - [ ] Registrar em logs
  - [ ] Testar endpoint

### REL-010: Criar Relatório de Vendas - Frontend
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/relatorios/RelatorioVendas.tsx`
- **Seções:**
  - Filtro de período
  - Filtro por categoria
  - Cards: Total vendas, Total itens, Ticket médio
  - Gráfico de vendas por categoria (pizza)
  - Tabela de produtos mais vendidos
- **Checklist:**
  - [ ] Criar componente RelatorioVendas.tsx
  - [ ] Implementar filtros
  - [ ] Criar cards de métricas
  - [ ] Adicionar gráfico de pizza
  - [ ] Criar tabela de top produtos
  - [ ] Integrar com API
  - [ ] Testar relatório

### REL-011: Criar Análise de Rentabilidade - Frontend
- **Prioridade:** 🟡 MÉDIA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/components/relatorios/AnaliseRentabilidade.tsx`
- **Seções:**
  - Seletor de período (dia/semana/mês)
  - Cards de métricas principais
  - Gráfico de comparação com período anterior
  - Indicadores de crescimento
- **Checklist:**
  - [ ] Criar componente AnaliseRentabilidade.tsx
  - [ ] Implementar seletor de período
  - [ ] Criar cards de métricas
  - [ ] Adicionar gráficos comparativos
  - [ ] Indicadores de % crescimento
  - [ ] Integrar com API
  - [ ] Testar relatório

### REL-012: Criar Página Principal de Relatórios
- **Prioridade:** 🟡 ALTA
- **Tempo:** 2 horas
- **Arquivo:** Criar `/frontend/src/pages/Relatorios.tsx`
- **Layout:** Abas
  - Fluxo de Caixa
  - Comissões
  - Vendas
  - Rentabilidade
- **Checklist:**
  - [ ] Criar página Relatorios.tsx
  - [ ] Implementar sistema de abas
  - [ ] Adicionar cada componente
  - [ ] Adicionar proteção de rota (caixa/admin)
  - [ ] Testar navegação

---

# 🟢 SPRINT 6: SEGURANÇA E INFRAESTRUTURA
**Duração:** 1 semana
**Prioridade:** ALTA
**Objetivo:** Preparar sistema para produção com segurança adequada

## Tarefas

### INF-001: Migrar Tokens para httpOnly Cookies
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 horas
- **Arquivos:**
  - `/backend/src/controllers/authController.ts`
  - `/frontend/src/services/api.ts`
- **Problema:** localStorage vulnerável a XSS
- **Solução:**
  - Backend: res.cookie('token', token, { httpOnly: true, secure: true })
  - Frontend: Remover localStorage, cookies gerenciados automaticamente
- **Checklist:**
  - [ ] Atualizar backend para usar cookies
  - [ ] Configurar cookie com httpOnly, secure, sameSite
  - [ ] Atualizar frontend para remover localStorage
  - [ ] Configurar Axios para incluir credentials
  - [ ] Atualizar endpoint /refresh
  - [ ] Testar login/logout
  - [ ] Testar refresh de token
  - [ ] Documentar mudança

### INF-002: Implementar Sanitização de Inputs
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/backend/src/middlewares/sanitize.ts`
- **Bibliotecas:** express-validator, xss-clean
- **Checklist:**
  - [ ] Instalar express-validator e xss-clean
  - [ ] Criar middleware de sanitização
  - [ ] Aplicar em todas rotas de POST/PUT
  - [ ] Adicionar validação de tipos
  - [ ] Testar com inputs maliciosos (XSS, SQL injection)
  - [ ] Documentar

### INF-003: Configurar Nginx como Reverse Proxy
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/nginx/nginx.conf`
- **Funcionalidades:**
  - Reverse proxy para backend
  - Servir frontend estático
  - Gzip compression
  - Cache de estáticos
  - Rate limiting
  - Headers de segurança
- **Checklist:**
  - [ ] Criar arquivo nginx.conf
  - [ ] Configurar reverse proxy
  - [ ] Configurar gzip
  - [ ] Configurar cache
  - [ ] Adicionar headers de segurança:
    - X-Frame-Options
    - X-Content-Type-Options
    - X-XSS-Protection
    - Strict-Transport-Security
  - [ ] Atualizar docker-compose.yml
  - [ ] Testar configuração
  - [ ] Documentar

### INF-004: Configurar SSL/TLS
- **Prioridade:** 🟡 ALTA
- **Tempo:** 4 horas
- **Arquivo:** Atualizar `/nginx/nginx.conf`
- **Solução:** Let's Encrypt com Certbot
- **Checklist:**
  - [ ] Instalar Certbot no container Nginx
  - [ ] Configurar renovação automática
  - [ ] Atualizar nginx.conf para HTTPS
  - [ ] Redirecionar HTTP → HTTPS
  - [ ] Configurar HSTS
  - [ ] Testar SSL (ssllabs.com)
  - [ ] Documentar

### INF-005: Configurar Backup Automatizado do PostgreSQL
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/scripts/backup.sh`
- **Funcionalidades:**
  - Backup com pg_dump
  - Rotação de backups (manter últimos 30 dias)
  - Compressão
  - Upload para S3 ou storage (opcional)
  - Cron job a cada hora
- **Checklist:**
  - [ ] Criar script backup.sh
  - [ ] Configurar pg_dump
  - [ ] Implementar compressão com gzip
  - [ ] Implementar rotação de backups
  - [ ] Criar cron job
  - [ ] Testar backup
  - [ ] Testar restore
  - [ ] Documentar procedimento

### INF-006: Implementar Logs Estruturados com Winston
- **Prioridade:** 🟡 ALTA
- **Tempo:** 6 hours
- **Arquivo:** Atualizar `/backend/src/config/logger.ts`
- **Logs necessários:**
  - Todas operações financeiras (comandas, caixa, sangrias)
  - Login/logout
  - Erros do sistema
  - Requisições HTTP (morgan + winston)
- **Checklist:**
  - [ ] Configurar Winston
  - [ ] Criar transports (console, file, error file)
  - [ ] Configurar rotação de logs
  - [ ] Adicionar logs em:
    - authController (login/logout)
    - comandaController (criar, fechar, cancelar)
    - caixaController (abrir, fechar, sangria)
  - [ ] Integrar Morgan com Winston
  - [ ] Testar logs
  - [ ] Documentar formato de logs

### INF-007: Configurar Monitoramento de Erros
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 4 horas
- **Solução:** Sentry ou similar
- **Checklist:**
  - [ ] Criar conta Sentry
  - [ ] Instalar @sentry/node no backend
  - [ ] Instalar @sentry/react no frontend
  - [ ] Configurar Sentry
  - [ ] Testar captura de erros
  - [ ] Configurar alertas
  - [ ] Documentar

### INF-008: Implementar Health Check Endpoints
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 2 horas
- **Arquivo:** Criar `/backend/src/routes/health.ts`
- **Endpoints:**
  - GET /health - status geral
  - GET /health/db - status do PostgreSQL
  - GET /health/redis - status do Redis
- **Checklist:**
  - [ ] Criar arquivo health.ts
  - [ ] Implementar verificações
  - [ ] Adicionar rotas
  - [ ] Testar endpoints
  - [ ] Documentar

### INF-009: Configurar PM2 para Gerenciamento de Processos
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 3 horas
- **Arquivo:** Criar `/backend/ecosystem.config.js`
- **Checklist:**
  - [ ] Criar ecosystem.config.js
  - [ ] Configurar cluster mode
  - [ ] Configurar auto-restart
  - [ ] Configurar logs
  - [ ] Atualizar Dockerfile para usar PM2
  - [ ] Testar em produção
  - [ ] Documentar comandos PM2

---

# 🟢 SPRINT 7: TESTES E DOCUMENTAÇÃO
**Duração:** 1 semana
**Prioridade:** MÉDIA
**Objetivo:** Garantir qualidade e facilitar manutenção

## Tarefas de Testes

### TST-001: Configurar Ambiente de Testes
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 3 horas
- **Arquivos:**
  - `/backend/jest.config.js`
  - `/backend/.env.test`
- **Checklist:**
  - [ ] Instalar Jest e supertest
  - [ ] Configurar Jest
  - [ ] Criar banco de dados de teste
  - [ ] Configurar .env.test
  - [ ] Criar scripts npm test
  - [ ] Documentar

### TST-002: Testes Unitários - Cálculo de Comissões
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/backend/src/__tests__/unit/comissao.test.ts`
- **Casos de teste:**
  - Cálculo com 40% de comissão
  - Cálculo com percentuais diferentes
  - Cálculo com quantidade > 1
  - Validação de valores negativos
- **Checklist:**
  - [ ] Criar arquivo de teste
  - [ ] Implementar casos de teste
  - [ ] Executar testes
  - [ ] Garantir 100% coverage da lógica de comissão

### TST-003: Testes Unitários - Cálculo de Tempo de Quarto
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 3 horas
- **Arquivo:** Criar `/backend/src/__tests__/unit/quarto.test.ts`
- **Casos de teste:**
  - Tempo < 30min → R$ 70
  - Tempo 45min → R$ 100
  - Tempo 1h30 → R$ 150
  - Tempo > 2h → R$ 200
- **Checklist:**
  - [ ] Criar arquivo de teste
  - [ ] Implementar casos de teste
  - [ ] Executar testes
  - [ ] Garantir coverage

### TST-004: Testes de Integração - Fluxo de Autenticação
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/backend/src/__tests__/integration/auth.test.ts`
- **Casos de teste:**
  - Login com credenciais válidas
  - Login com credenciais inválidas
  - Refresh token válido
  - Refresh token inválido
  - Acesso a rota protegida sem token
  - Acesso a rota protegida com token válido
- **Checklist:**
  - [ ] Criar arquivo de teste
  - [ ] Implementar casos de teste
  - [ ] Executar testes
  - [ ] Garantir coverage

### TST-005: Testes de Integração - Fluxo de Caixa
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/backend/src/__tests__/integration/caixa.test.ts`
- **Casos de teste:**
  - Abertura de caixa com sucesso
  - Tentativa de abrir caixa duplicado (deve falhar)
  - Sangria com saldo suficiente
  - Sangria com saldo insuficiente (deve falhar)
  - Fechamento com comandas abertas (deve falhar)
  - Fechamento com sucesso
- **Checklist:**
  - [ ] Criar arquivo de teste
  - [ ] Implementar casos de teste
  - [ ] Executar testes
  - [ ] Garantir coverage

### TST-006: Testes de Integração - Fluxo de Comandas
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 6 hours
- **Arquivo:** Criar `/backend/src/__tests__/integration/comanda.test.ts`
- **Casos de teste:**
  - Criar comanda sem caixa aberto (deve falhar)
  - Criar comanda com sucesso
  - Adicionar item normal
  - Adicionar item comissionado sem acompanhante (deve falhar)
  - Adicionar item comissionado com acompanhante
  - Fechar comanda com quarto ocupado (deve falhar)
  - Fechar comanda com sucesso
- **Checklist:**
  - [ ] Criar arquivo de teste
  - [ ] Implementar casos de teste
  - [ ] Executar testes
  - [ ] Garantir coverage > 70%

### TST-007: Testes E2E - Frontend (Opcional)
- **Prioridade:** ⚪ BAIXA
- **Tempo:** 2 dias
- **Framework:** Cypress ou Playwright
- **Casos de teste:**
  - Fluxo completo de atendimento
  - Fluxo de abertura/fechamento de caixa
- **Checklist:**
  - [ ] Configurar Cypress
  - [ ] Criar testes E2E
  - [ ] Executar testes
  - [ ] Documentar

## Tarefas de Documentação

### DOC-001: Documentar API com Swagger
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 1 dia
- **Arquivo:** Criar `/backend/src/swagger.ts`
- **Checklist:**
  - [ ] Instalar swagger-ui-express
  - [ ] Criar especificação OpenAPI
  - [ ] Documentar todos endpoints:
    - Auth
    - Comandas
    - Produtos
    - Acompanhantes
    - Caixa
    - Quartos
    - Relatórios
  - [ ] Adicionar exemplos de request/response
  - [ ] Servir em /api-docs
  - [ ] Testar documentação

### DOC-002: Criar Manual do Usuário
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 2 dias
- **Arquivo:** Criar `/docs/MANUAL_USUARIO.md`
- **Seções:**
  - Introdução ao sistema
  - Primeiros passos
  - Guia do Atendente (PDV)
  - Guia do Caixa
  - Guia do Administrador
  - Perguntas Frequentes
  - Solução de problemas
- **Checklist:**
  - [ ] Escrever manual completo
  - [ ] Adicionar screenshots
  - [ ] Criar índice
  - [ ] Revisar conteúdo

### DOC-003: Atualizar README.md
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 2 horas
- **Checklist:**
  - [ ] Atualizar seção de funcionalidades
  - [ ] Atualizar instruções de instalação
  - [ ] Documentar variáveis de ambiente
  - [ ] Adicionar seção de segurança
  - [ ] Adicionar troubleshooting
  - [ ] Atualizar endpoints da API

### DOC-004: Criar Guia de Deploy
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/docs/GUIA_DEPLOY.md`
- **Seções:**
  - Requisitos de servidor
  - Instalação em produção
  - Configuração de SSL
  - Configuração de backup
  - Configuração de monitoramento
  - Procedimentos de atualização
  - Rollback
- **Checklist:**
  - [ ] Escrever guia completo
  - [ ] Testar procedimentos
  - [ ] Documentar comandos
  - [ ] Revisar

### DOC-005: Criar Documentação de Backup e Restore
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 2 horas
- **Arquivo:** Criar `/docs/BACKUP_RESTORE.md`
- **Checklist:**
  - [ ] Documentar procedimento de backup manual
  - [ ] Documentar backup automatizado
  - [ ] Documentar procedimento de restore
  - [ ] Adicionar exemplos de comandos
  - [ ] Testar procedimentos

---

# 🟢 SPRINT 8: MELHORIAS DE UX E FEATURES AVANÇADAS
**Duração:** 1 semana
**Prioridade:** BAIXA
**Objetivo:** Polir experiência do usuário

## Tarefas

### UX-001: Implementar Atalhos de Teclado no PDV
- **Prioridade:** ⚪ BAIXA
- **Tempo:** 6 horas
- **Arquivo:** Criar `/frontend/src/hooks/useKeyboardShortcuts.ts`
- **Atalhos:**
  - F1: Buscar comanda
  - F2: Nova comanda
  - F3: Adicionar item
  - Enter: Confirmar
  - Esc: Cancelar
  - Ctrl+F: Busca rápida de produto
- **Checklist:**
  - [ ] Criar hook useKeyboardShortcuts
  - [ ] Implementar listeners
  - [ ] Integrar com PDV
  - [ ] Adicionar legenda de atalhos
  - [ ] Testar atalhos
  - [ ] Documentar

### UX-002: Implementar Reconexão Automática WebSocket
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 4 horas
- **Arquivo:** Atualizar `/frontend/src/services/socket.ts`
- **Funcionalidades:**
  - Retry com backoff exponencial
  - Heartbeat/ping-pong
  - Indicador visual de conexão
  - Reconexão automática
- **Checklist:**
  - [ ] Implementar retry com backoff
  - [ ] Adicionar heartbeat
  - [ ] Criar indicador de conexão
  - [ ] Testar desconexão/reconexão
  - [ ] Documentar

### UX-003: Melhorar Feedback Visual de Erros
- **Prioridade:** 🟢 MÉDIA
- **Tempo:** 6 horas
- **Arquivos:** Todos componentes
- **Melhorias:**
  - Toast notifications (react-hot-toast)
  - Mensagens de erro claras
  - Loading states consistentes
  - Skeleton loaders
  - Confirmações de ações críticas
- **Checklist:**
  - [ ] Instalar react-hot-toast
  - [ ] Criar componente Toast customizado
  - [ ] Adicionar toasts em todas operações
  - [ ] Implementar skeleton loaders
  - [ ] Adicionar confirmações
  - [ ] Testar UX

### UX-004: Implementar Busca Rápida de Produtos
- **Prioridade:** ⚪ BAIXA
- **Tempo:** 4 horas
- **Arquivo:** Criar `/frontend/src/components/pdv/BuscaRapida.tsx`
- **Funcionalidades:**
  - Input de busca com autocomplete
  - Busca por nome ou código
  - Adicionar direto à comanda
- **Checklist:**
  - [ ] Criar componente BuscaRapida
  - [ ] Implementar autocomplete
  - [ ] Adicionar debounce
  - [ ] Integrar com PDV
  - [ ] Testar busca

### UX-005: Implementar PWA (Progressive Web App)
- **Prioridade:** ⚪ BAIXA
- **Tempo:** 2 dias
- **Arquivos:**
  - `/frontend/public/manifest.json`
  - `/frontend/src/service-worker.ts`
- **Funcionalidades:**
  - Instalável em dispositivos móveis
  - Funcionar offline (parcial)
  - Cache de recursos estáticos
  - Sincronização em background
- **Checklist:**
  - [ ] Criar manifest.json
  - [ ] Configurar service worker
  - [ ] Implementar cache strategies
  - [ ] Testar instalação
  - [ ] Testar offline
  - [ ] Documentar

### UX-006: Adicionar Animações e Transições
- **Prioridade:** ⚪ BAIXA
- **Tempo:** 1 dia
- **Biblioteca:** Framer Motion
- **Checklist:**
  - [ ] Instalar framer-motion
  - [ ] Adicionar transições de página
  - [ ] Adicionar animações de lista
  - [ ] Adicionar feedback em botões
  - [ ] Testar performance
  - [ ] Documentar

---

# 📋 RESUMO DO ROADMAP

## Visão Geral por Sprint

| Sprint | Duração | Prioridade | Tarefas | Objetivo |
|--------|---------|------------|---------|----------|
| 1 | 1 semana | 🔴 CRÍTICA | 7 | Corrigir vulnerabilidades de segurança |
| 2 | 1 semana | 🔴 CRÍTICA | 6 | Implementar Dashboard de Caixa |
| 3 | 1 semana | 🟡 ALTA | 6 | Completar Gerenciamento de Quartos |
| 4 | 2 semanas | 🟡 ALTA | 13 | Implementar Painel Administrativo |
| 5 | 1.5 semanas | 🟡 ALTA | 12 | Completar Módulo de Relatórios |
| 6 | 1 semana | 🟡 ALTA | 9 | Segurança e Infraestrutura |
| 7 | 1 semana | 🟢 MÉDIA | 11 | Testes e Documentação |
| 8 | 1 semana | ⚪ BAIXA | 6 | Melhorias de UX |
| **TOTAL** | **10 semanas** | - | **70 tarefas** | Sistema completo para produção |

## Distribuição de Esforço

### Por Criticidade
- 🔴 **CRÍTICA:** 13 tarefas (Sprint 1-2)
- 🟡 **ALTA:** 40 tarefas (Sprint 3-6)
- 🟢 **MÉDIA:** 11 tarefas (Sprint 7)
- ⚪ **BAIXA:** 6 tarefas (Sprint 8)

### Por Área
- **Backend:** 25 tarefas
- **Frontend:** 30 tarefas
- **Infraestrutura:** 9 tarefas
- **Testes:** 6 tarefas
- **Documentação:** 5 tarefas

## Marcos Importantes

### Fim da Sprint 2 (2 semanas)
✅ Sistema operacional para o caixa
✅ Vulnerabilidades críticas corrigidas

### Fim da Sprint 4 (5 semanas)
✅ Sistema completo de gestão
✅ Todas interfaces implementadas

### Fim da Sprint 6 (8 semanas)
✅ Sistema pronto para produção
✅ Segurança adequada
✅ Infraestrutura completa

### Fim da Sprint 7 (9 semanas)
✅ Sistema testado e documentado
✅ Pronto para deploy

### Fim da Sprint 8 (10 semanas)
✅ UX polida
✅ Features avançadas

## Checklist de Produção Final

### Funcionalidades Essenciais
- [ ] Dashboard de Caixa completo
- [ ] Painel Administrativo completo
- [ ] Módulo de Relatórios completo
- [ ] Gerenciamento de Quartos completo
- [ ] Sistema de Comissões funcionando
- [ ] PDV funcional
- [ ] Autenticação e autorização

### Segurança
- [ ] Todas vulnerabilidades críticas corrigidas
- [ ] SSL/TLS configurado
- [ ] Tokens em httpOnly cookies
- [ ] Sanitização de inputs
- [ ] Rate limiting configurado
- [ ] Backup automatizado
- [ ] Logs estruturados

### Infraestrutura
- [ ] Nginx configurado
- [ ] Redis com persistência
- [ ] PM2 configurado
- [ ] Health checks implementados
- [ ] Monitoramento de erros
- [ ] Procedimentos de backup/restore

### Qualidade
- [ ] Testes unitários (coverage > 70%)
- [ ] Testes de integração
- [ ] Documentação de API (Swagger)
- [ ] Manual do usuário
- [ ] Guia de deploy
- [ ] README atualizado

### Dados
- [ ] Senha do admin alterada
- [ ] Produtos cadastrados
- [ ] Categorias configuradas
- [ ] Acompanhantes cadastradas
- [ ] Preços de quartos ajustados
- [ ] Configurações do sistema

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **Revisar roadmap** com stakeholders
2. **Validar prioridades** e ajustar sprints se necessário
3. **Alocar recursos** (desenvolvedores, designers, QA)
4. **Setup de ambiente** de staging
5. **Iniciar Sprint 1** - Correções Críticas de Segurança

---

**Última atualização:** 14/11/2025
**Status:** Aguardando aprovação
**Próxima revisão:** Após Sprint 2
