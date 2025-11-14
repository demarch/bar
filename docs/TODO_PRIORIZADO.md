# TO-DO PRIORIZADO - Sistema de Gestão de Bar

**Baseado na Especificação Técnica e Análise de Implementação**
**Data:** 13/11/2025

---

## 📊 STATUS GERAL

- **Projeto:** 60% completo
- **Backend:** 90% funcional
- **Frontend:** 35% funcional
- **Pronto para produção:** ❌ NÃO

**Tempo estimado para produção:** 8-10 semanas

---

## 🔴 PRIORIDADE CRÍTICA (Bloqueadores de Produção)

### Segurança e Correções de Bugs

- [ ] **#1** - Corrigir hash da senha do admin no `init.sql:325`
  - **Localização:** `/home/user/bar/backend/database/init.sql`
  - **Problema:** Hash mockado não representa 'admin123'
  - **Tempo:** 15 minutos
  - **Impacto:** Login do admin não funciona

- [ ] **#2** - Corrigir `usuario_id` hardcoded em `quartoController.finalizarOcupacao`
  - **Localização:** `/home/user/bar/backend/src/controllers/quartoController.ts:167`
  - **Problema:** `usuario_id: 1` hardcoded ao invés de `req.user.id`
  - **Tempo:** 10 minutos
  - **Impacto:** Auditoria incorreta de quem finalizou quartos

- [ ] **#3** - Implementar autenticação no WebSocket
  - **Localização:** `/home/user/bar/backend/src/server.ts`
  - **Problema:** Qualquer cliente pode conectar sem validar JWT
  - **Tempo:** 2 horas
  - **Impacto:** Vulnerabilidade de segurança crítica
  - **Solução:**
    ```typescript
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      // validar JWT...
    });
    ```

- [ ] **#4** - Remover senhas hardcoded do `docker-compose.yml`
  - **Localização:** `/home/user/bar/docker-compose.yml`
  - **Problema:** Senhas visíveis no arquivo
  - **Tempo:** 30 minutos
  - **Solução:** Usar arquivo `.env` externo

### Frontend - Interfaces Críticas

- [ ] **#5** - Implementar Dashboard de Caixa (Especificação Seção 4.2)
  - **Status:** 0% implementado
  - **Tempo:** 3-4 dias
  - **Componentes necessários:**
    - [ ] Tela de abertura de caixa
    - [ ] Dashboard com resumo (vendas, comissões, lucro)
    - [ ] Tela de sangria
    - [ ] Tela de fechamento de caixa
  - **Impacto:** Caixa não consegue operar sem essa interface

- [ ] **#6** - Implementar tela de Fechamento de Comanda
  - **Status:** Backend pronto, frontend 0%
  - **Tempo:** 1 dia
  - **Funcionalidades:**
    - [ ] Validar quartos ocupados
    - [ ] Selecionar forma de pagamento
    - [ ] Confirmar fechamento
    - [ ] Exibir resumo
  - **Impacto:** Comandas não podem ser finalizadas via UI

- [ ] **#7** - Implementar Painel Administrativo (Especificação Seção 4.3)
  - **Status:** 0% implementado
  - **Tempo:** 2 semanas
  - **Módulos:**
    - [ ] Dashboard geral
    - [ ] CRUD de produtos
    - [ ] CRUD de categorias
    - [ ] CRUD de acompanhantes
    - [ ] CRUD de usuários
    - [ ] Tela de configurações do sistema
    - [ ] Ativação diária de acompanhantes
  - **Impacto:** Toda gestão precisa ser feita via SQL direto

---

## 🟡 PRIORIDADE ALTA (Funcionalidades Principais)

### Frontend - Módulos Faltantes

- [ ] **#8** - Implementar tela de Gerenciamento de Quartos
  - **Status:** Backend 95%, frontend 0%
  - **Tempo:** 2-3 dias
  - **Funcionalidades:**
    - [ ] Visualização de quartos ocupados em tempo real
    - [ ] Registrar ocupação de quarto
    - [ ] Finalizar ocupação
    - [ ] Controle de disponibilidade
    - [ ] Notificações de tempo próximo do limite
  - **Impacto:** Fluxo de quartos não operacional

- [ ] **#9** - Implementar Módulo de Relatórios completo (Especificação Seção 3.7)
  - **Status:** Backend 30%, frontend 0%
  - **Tempo:** 1.5 semanas
  - **Relatórios necessários:**
    - [ ] Fluxo de Caixa Diário (total vendas, comissões, lucro)
    - [ ] Relatório de Acompanhantes (ganhos por período)
    - [ ] Relatório de Vendas (por produto, categoria, período)
    - [ ] Análise de Rentabilidade
    - [ ] Comandas em Aberto (com tempo de permanência)
  - **Backend:**
    - [ ] Criar rotas `/api/relatorios/*`
    - [ ] Implementar controllers de relatórios
  - **Impacto:** Gestão financeira inviável sem relatórios

### Validações e UX

- [ ] **#10** - Adicionar validações de campos obrigatórios no frontend
  - **Tempo:** 1-2 dias
  - **Exemplos:**
    - [ ] Validar acompanhante obrigatória em produtos comissionados
    - [ ] Validar quantidade > 0
    - [ ] Validar forma de pagamento no fechamento
    - [ ] Validar valores numéricos positivos
  - **Impacto:** Usuários podem enviar dados inválidos

- [ ] **#11** - Implementar feedback visual e mensagens de erro adequadas
  - **Tempo:** 2 dias
  - **Melhorias:**
    - [ ] Toasts de sucesso/erro
    - [ ] Loading states em todas operações
    - [ ] Mensagens de erro claras do backend
    - [ ] Confirmações de operações críticas (deletar, fechar, etc)
  - **Impacto:** UX prejudicada, erros difíceis de identificar

### Backend - Funcionalidades

- [ ] **#12** - Implementar rotas de relatórios no backend
  - **Localização:** Criar `/home/user/bar/backend/src/routes/relatorios.ts`
  - **Tempo:** 2-3 dias
  - **Rotas necessárias:**
    - [ ] `GET /api/relatorios/fluxo-caixa?data_inicio&data_fim`
    - [ ] `GET /api/relatorios/vendas?data_inicio&data_fim&categoria_id`
    - [ ] `GET /api/relatorios/comissoes?data_inicio&data_fim&acompanhante_id`
    - [ ] `GET /api/relatorios/rentabilidade?periodo`
  - **Impacto:** Frontend de relatórios depende disso

---

## 🟢 PRIORIDADE MÉDIA (Segurança e Otimizações)

### Segurança

- [ ] **#13** - Implementar sistema de revogação de tokens (blacklist)
  - **Tempo:** 1 dia
  - **Solução:** Usar Redis para armazenar tokens revogados
  - **Impacto:** Tokens permanecem válidos após logout

- [ ] **#14** - Migrar armazenamento de tokens para httpOnly cookies
  - **Tempo:** 1 dia
  - **Problema:** localStorage vulnerável a XSS
  - **Impacto:** Segurança melhorada contra ataques XSS

- [ ] **#15** - Implementar middleware de sanitização de inputs (XSS, SQL injection)
  - **Tempo:** 1 dia
  - **Biblioteca:** `express-validator`, `xss-clean`
  - **Impacto:** Proteção contra ataques comuns

- [ ] **#16** - Configurar rate limiting mais restritivo para endpoints críticos
  - **Tempo:** 2 horas
  - **Endpoints:** `/api/auth/login`, `/api/caixa/*`
  - **Atual:** 100 req/15min (muito permissivo)
  - **Sugestão:** 5 req/15min para login
  - **Impacto:** Proteção contra força bruta

### Logs e Monitoramento

- [ ] **#17** - Adicionar sistema de logs estruturado com Winston
  - **Status:** Winston configurado mas não usado
  - **Tempo:** 1 dia
  - **Implementar:**
    - [ ] Logs de operações financeiras
    - [ ] Logs de autenticação
    - [ ] Logs de erros com stack trace
    - [ ] Rotação de logs diária
  - **Impacto:** Dificulta debug e auditoria

### DevOps e Infraestrutura

- [ ] **#18** - Configurar persistência do Redis
  - **Tempo:** 1 hora
  - **Configuração:** AOF ou RDB
  - **Problema:** Restart do container perde sessões
  - **Impacto:** Usuários deslogados ao reiniciar

- [ ] **#19** - Adicionar nginx como reverse proxy
  - **Especificação:** Seção 2.1
  - **Tempo:** 1 dia
  - **Benefícios:**
    - Load balancing
    - SSL termination
    - Cache de estáticos
    - Compressão gzip
  - **Impacto:** Melhor performance e segurança

- [ ] **#20** - Configurar backup automatizado do PostgreSQL
  - **Especificação:** Seção 6.2 (backup a cada hora)
  - **Tempo:** 1 dia
  - **Implementar:**
    - [ ] Cron job para pg_dump
    - [ ] Rotação de backups
    - [ ] Upload para S3 ou storage externo
  - **Impacto:** Risco de perda de dados

### Banco de Dados

- [ ] **#21** - Adicionar índices compostos otimizados no banco de dados
  - **Tempo:** 2 horas
  - **Índices necessários:**
    ```sql
    CREATE INDEX idx_comandas_movimento_status ON comandas(movimento_caixa_id, status);
    CREATE INDEX idx_itens_comanda_tipo ON itens_comanda(comanda_id, tipo_item);
    CREATE INDEX idx_acompanhantes_ativas ON acompanhantes_ativas_dia(data, ativa);
    ```
  - **Impacto:** Performance em queries frequentes

---

## ⚪ PRIORIDADE BAIXA (Melhorias e Recursos Avançados)

### Testes

- [ ] **#22** - Adicionar testes unitários para cálculos de comissão
  - **Especificação:** Seção 10.2
  - **Tempo:** 2 dias
  - **Framework:** Jest
  - **Cobrir:**
    - [ ] Cálculo de comissão por percentual
    - [ ] Cálculo de tempo de quarto
    - [ ] Cálculo de totais de comanda

- [ ] **#23** - Adicionar testes de integração para fluxo de caixa
  - **Tempo:** 3 dias
  - **Cobrir:**
    - [ ] Abertura → lançamentos → fechamento
    - [ ] Sangrias
    - [ ] Validações de comandas abertas

### Documentação

- [ ] **#24** - Implementar documentação de API com Swagger
  - **Tempo:** 2 dias
  - **Biblioteca:** `swagger-ui-express`
  - **Benefício:** Facilita integração e testes

### UX Avançado

- [ ] **#25** - Adicionar sistema de reconexão automática no WebSocket
  - **Tempo:** 1 dia
  - **Implementar:**
    - [ ] Retry com backoff exponencial
    - [ ] Heartbeat/ping-pong
    - [ ] Reconexão automática ao perder conexão
  - **Impacto:** Melhor estabilidade em conexões instáveis

- [ ] **#26** - Implementar atalhos de teclado para PDV desktop
  - **Especificação:** Seção 6.3
  - **Tempo:** 1 dia
  - **Exemplos:**
    - `F1` - Buscar comanda
    - `F2` - Nova comanda
    - `F3` - Adicionar item
    - `Enter` - Confirmar
    - `Esc` - Cancelar

### Features Avançadas (PWA, Offline)

- [ ] **#27** - Implementar PWA para funcionamento offline parcial
  - **Especificação:** Seção 6.4
  - **Tempo:** 1 semana
  - **Funcionalidades:**
    - [ ] Service Worker
    - [ ] Cache de recursos estáticos
    - [ ] Fila de sincronização
    - [ ] Notificações push

---

## 📈 ROADMAP SUGERIDO

### Sprint 1 - Correções Críticas (1 semana)
**Objetivo:** Corrigir bugs e vulnerabilidades
- #1 - Hash da senha do admin
- #2 - usuario_id hardcoded
- #3 - Autenticação WebSocket
- #4 - Senhas hardcoded Docker
- #18 - Persistência Redis

### Sprint 2 - Dashboard de Caixa (1 semana)
**Objetivo:** Permitir operação do caixa
- #5 - Dashboard completo de Caixa
- #6 - Tela de fechamento de comanda
- #10 - Validações de frontend (parte)

### Sprint 3 - Quartos e Relatórios Backend (1 semana)
**Objetivo:** Completar funcionalidades principais
- #8 - Gerenciamento de quartos
- #12 - Rotas de relatórios backend
- #21 - Índices otimizados

### Sprint 4 - Painel Administrativo (2 semanas)
**Objetivo:** Permitir configuração do sistema
- #7 - Painel administrativo completo
- #11 - Feedback visual e mensagens de erro

### Sprint 5 - Relatórios Frontend (1.5 semanas)
**Objetivo:** Completar módulo de relatórios
- #9 - Módulo de relatórios completo
- #17 - Logs estruturados

### Sprint 6 - Segurança e Infraestrutura (1 semana)
**Objetivo:** Preparar para produção
- #13 - Revogação de tokens
- #14 - httpOnly cookies
- #15 - Sanitização de inputs
- #16 - Rate limiting
- #19 - Nginx
- #20 - Backup automatizado

### Sprint 7 - Testes e Documentação (1 semana)
**Objetivo:** Garantir qualidade
- #22 - Testes unitários
- #23 - Testes de integração
- #24 - Swagger
- Manual do usuário

**Total: 8.5 semanas (~2 meses)**

---

## 🎯 CHECKLIST PARA PRODUÇÃO

### Antes de Ir para Produção

**Funcionalidades:**
- [ ] Dashboard de Caixa completo
- [ ] Painel Administrativo completo
- [ ] Módulo de Relatórios completo
- [ ] Gerenciamento de Quartos completo
- [ ] Todas validações implementadas

**Segurança:**
- [ ] Autenticação WebSocket
- [ ] Sistema de revogação de tokens
- [ ] Rate limiting configurado
- [ ] Sanitização de inputs
- [ ] SSL/TLS configurado
- [ ] Senhas seguras (sem hardcode)

**Infraestrutura:**
- [ ] Nginx configurado
- [ ] Redis com persistência
- [ ] Backup automatizado
- [ ] Logs estruturados
- [ ] Monitoramento configurado

**Qualidade:**
- [ ] Testes unitários (coverage > 70%)
- [ ] Testes de integração
- [ ] Testes de carga (100+ comandas)
- [ ] Documentação de API
- [ ] Manual do usuário

**Dados:**
- [ ] Senha do admin alterada
- [ ] Produtos reais cadastrados
- [ ] Acompanhantes cadastradas
- [ ] Configurações do estabelecimento
- [ ] Preços de quartos ajustados

---

## 📞 PRÓXIMOS PASSOS

1. **Revisar prioridades** com stakeholders
2. **Definir timeline** de desenvolvimento
3. **Alocar recursos** (desenvolvedores, designers)
4. **Iniciar Sprint 1** (correções críticas)
5. **Setup de ambiente** de staging

---

**Última atualização:** 13/11/2025
**Responsável:** Claude Code
**Branch:** claude/verify-technical-specification-01JumYCPkckPwNyNyE4espux
