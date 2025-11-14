# CHECKLIST DE EXECUÇÃO - Sistema de Gestão de Bar

**Documento de acompanhamento diário**
**Versão:** 1.0
**Data:** 14/11/2025

---

## 🔴 SPRINT 1: SEGURANÇA CRÍTICA (Semana 1)

### Dia 1
- [ ] **SEC-001** - Gerar hash correto da senha do admin com bcrypt
- [ ] **SEC-001** - Atualizar init.sql linha 325
- [ ] **SEC-001** - Testar login admin/admin123
- [ ] **SEC-002** - Corrigir usuario_id hardcoded em quartoController.ts:167
- [ ] **SEC-002** - Testar finalização de quarto com auditoria

### Dia 2
- [ ] **SEC-003** - Criar middleware de autenticação WebSocket
- [ ] **SEC-003** - Atualizar server.ts
- [ ] **SEC-003** - Atualizar frontend para enviar token
- [ ] **SEC-003** - Testar conexão autenticada

### Dia 3
- [ ] **SEC-004** - Criar arquivo .env na raiz
- [ ] **SEC-004** - Mover senhas para .env
- [ ] **SEC-004** - Atualizar docker-compose.yml
- [ ] **SEC-004** - Criar .env.example
- [ ] **SEC-005** - Configurar persistência do Redis
- [ ] **SEC-005** - Testar persistência após restart

### Dia 4
- [ ] **SEC-006** - Criar loginLimiter específico
- [ ] **SEC-006** - Aplicar em /api/auth/login
- [ ] **SEC-006** - Testar bloqueio após 5 tentativas
- [ ] **SEC-007** - Criar serviço tokenBlacklist.ts
- [ ] **SEC-007** - Atualizar middleware authenticate

### Dia 5
- [ ] **SEC-007** - Criar endpoint POST /api/auth/logout
- [ ] **SEC-007** - Testar logout e revogação
- [ ] Sprint Review
- [ ] Preparar para Sprint 2

---

## 🔴 SPRINT 2: DASHBOARD DE CAIXA (Semana 2)

### Dia 1
- [ ] **CAI-001** - Criar componente AberturaCaixa.tsx
- [ ] **CAI-001** - Implementar formulário
- [ ] **CAI-001** - Integrar com hook useCaixa
- [ ] **CAI-001** - Testar abertura

### Dia 2
- [ ] **CAI-002** - Criar DashboardCaixa.tsx
- [ ] **CAI-002** - Implementar cabeçalho com info do caixa
- [ ] **CAI-002** - Implementar seção de resumo
- [ ] **CAI-002** - Adicionar botões de ação
- [ ] **CAI-002** - Integrar com WebSocket

### Dia 3
- [ ] **CAI-003** - Criar FecharComanda.tsx
- [ ] **CAI-003** - Implementar busca de comanda
- [ ] **CAI-003** - Criar seção de resumo detalhado
- [ ] **CAI-003** - Adicionar validação de quartos
- [ ] **CAI-003** - Implementar seletor de forma de pagamento

### Dia 4
- [ ] **CAI-003** - Finalizar FecharComanda
- [ ] **CAI-004** - Criar Sangria.tsx
- [ ] **CAI-004** - Implementar validações
- [ ] **CAI-004** - Testar sangria

### Dia 5
- [ ] **CAI-005** - Criar FechamentoCaixa.tsx
- [ ] **CAI-005** - Implementar resumo completo
- [ ] **CAI-005** - Adicionar validações
- [ ] **CAI-006** - Criar página Caixa.tsx
- [ ] **CAI-006** - Testar fluxo completo
- [ ] Sprint Review

---

## 🟡 SPRINT 3: QUARTOS (Semana 3)

### Dia 1
- [ ] **QUA-001** - Criar endpoint GET /api/quartos/disponiveis
- [ ] **QUA-002** - Criar QuartosOcupados.tsx
- [ ] **QUA-002** - Implementar lista de quartos
- [ ] **QUA-002** - Adicionar cálculo de tempo

### Dia 2
- [ ] **QUA-002** - Finalizar QuartosOcupados
- [ ] **QUA-003** - Criar OcuparQuarto.tsx
- [ ] **QUA-003** - Implementar seletor de quarto
- [ ] **QUA-003** - Adicionar seleção de acompanhante

### Dia 3
- [ ] **QUA-003** - Finalizar OcuparQuarto
- [ ] **QUA-004** - Criar FinalizarQuarto.tsx
- [ ] **QUA-004** - Implementar cálculo de valor
- [ ] **QUA-004** - Testar finalização

### Dia 4
- [ ] **QUA-005** - Criar hook useQuartoNotifications
- [ ] **QUA-005** - Implementar notificações
- [ ] **QUA-006** - Criar página Quartos.tsx
- [ ] **QUA-006** - Testar fluxo completo

### Dia 5
- [ ] Testes gerais do módulo de quartos
- [ ] Correção de bugs
- [ ] Sprint Review

---

## 🟡 SPRINT 4: PAINEL ADMIN - SEMANA 1 (Semana 4)

### Dia 1
- [ ] **ADM-001** - Criar AdminLayout.tsx
- [ ] **ADM-001** - Implementar sidebar
- [ ] **ADM-001** - Configurar navegação

### Dia 2
- [ ] **ADM-002** - Criar ListaProdutos.tsx
- [ ] **ADM-002** - Implementar tabela
- [ ] **ADM-003** - Criar FormProduto.tsx
- [ ] **ADM-003** - Implementar validações

### Dia 3
- [ ] **ADM-003** - Testar CRUD de produtos
- [ ] **ADM-004** - Criar GerenciarCategorias.tsx
- [ ] **ADM-004** - Implementar CRUD
- [ ] **ADM-004** - Testar categorias

### Dia 4-5
- [ ] **ADM-005** - Criar DashboardAdmin.tsx
- [ ] **ADM-005** - Implementar widgets
- [ ] **ADM-005** - Criar backend para estatísticas
- [ ] **ADM-005** - Adicionar gráficos
- [ ] Sprint Review Parcial

---

## 🟡 SPRINT 4: PAINEL ADMIN - SEMANA 2 (Semana 5)

### Dia 1
- [ ] **ADM-006** - Criar ListaAcompanhantes.tsx
- [ ] **ADM-007** - Criar FormAcompanhante.tsx
- [ ] **ADM-007** - Testar CRUD

### Dia 2
- [ ] **ADM-008** - Criar AtivacaoDiaria.tsx
- [ ] **ADM-008** - Implementar seleção em massa
- [ ] **ADM-008** - Testar ativação

### Dia 3
- [ ] **ADM-009** - Criar GerenciarUsuarios.tsx
- [ ] **ADM-009** - Implementar CRUD de usuários
- [ ] **ADM-009** - Adicionar reset de senha
- [ ] **ADM-009** - Testar

### Dia 4
- [ ] **ADM-010** - Criar GerenciarQuartos.tsx
- [ ] **ADM-011** - Criar ConfiguracaoPrecos.tsx
- [ ] **ADM-012** - Criar endpoint backend /api/configuracoes

### Dia 5
- [ ] **ADM-012** - Criar ConfiguracoesGerais.tsx
- [ ] **ADM-013** - Criar página Admin.tsx
- [ ] **ADM-013** - Testar navegação completa
- [ ] Sprint Review

---

## 🟡 SPRINT 5: RELATÓRIOS - SEMANA 1 (Semana 6)

### Dia 1
- [ ] **REL-001** - Criar rotas /api/relatorios
- [ ] **REL-002** - Implementar controller de Fluxo de Caixa
- [ ] **REL-002** - Testar endpoint

### Dia 2
- [ ] **REL-003** - Implementar controller de Comissões
- [ ] **REL-003** - Testar endpoint
- [ ] **REL-004** - Implementar controller de Vendas
- [ ] **REL-004** - Testar endpoint

### Dia 3
- [ ] **REL-005** - Implementar controller de Rentabilidade
- [ ] **REL-005** - Testar endpoint
- [ ] **REL-006** - Criar FiltroPeriodo.tsx

### Dia 4-5
- [ ] **REL-007** - Criar FluxoCaixa.tsx
- [ ] **REL-007** - Implementar cards de resumo
- [ ] **REL-007** - Adicionar gráficos
- [ ] **REL-007** - Testar relatório

---

## 🟡 SPRINT 5: RELATÓRIOS - SEMANA 2 (Semana 7 - 3 dias)

### Dia 1-2
- [ ] **REL-008** - Criar RelatorioComissoes.tsx
- [ ] **REL-009** - Criar endpoint para marcar como pago
- [ ] **REL-008** - Testar relatório
- [ ] **REL-010** - Criar RelatorioVendas.tsx

### Dia 3
- [ ] **REL-011** - Criar AnaliseRentabilidade.tsx
- [ ] **REL-012** - Criar página Relatorios.tsx
- [ ] Sprint Review

---

## 🟡 SPRINT 6: INFRAESTRUTURA (Semana 8)

### Dia 1-2
- [ ] **INF-001** - Atualizar backend para usar cookies
- [ ] **INF-001** - Atualizar frontend
- [ ] **INF-001** - Testar login/logout
- [ ] **INF-002** - Criar middleware de sanitização
- [ ] **INF-002** - Aplicar em todas rotas
- [ ] **INF-002** - Testar

### Dia 3
- [ ] **INF-003** - Criar nginx.conf
- [ ] **INF-003** - Configurar reverse proxy
- [ ] **INF-003** - Configurar gzip e cache
- [ ] **INF-003** - Testar

### Dia 4
- [ ] **INF-004** - Configurar SSL/TLS
- [ ] **INF-004** - Configurar HSTS
- [ ] **INF-004** - Testar SSL
- [ ] **INF-005** - Criar script backup.sh
- [ ] **INF-005** - Configurar cron job

### Dia 5
- [ ] **INF-006** - Configurar Winston
- [ ] **INF-006** - Adicionar logs em controllers
- [ ] **INF-007** - Configurar Sentry (opcional)
- [ ] **INF-008** - Criar health check endpoints
- [ ] **INF-009** - Configurar PM2
- [ ] Sprint Review

---

## 🟢 SPRINT 7: TESTES E DOCS (Semana 9)

### Dia 1
- [ ] **TST-001** - Configurar Jest
- [ ] **TST-002** - Testes unitários de comissão
- [ ] **TST-003** - Testes unitários de quarto

### Dia 2
- [ ] **TST-004** - Testes de integração - Auth
- [ ] **TST-005** - Testes de integração - Caixa

### Dia 3
- [ ] **TST-006** - Testes de integração - Comandas
- [ ] **DOC-001** - Documentar API com Swagger (início)

### Dia 4
- [ ] **DOC-001** - Finalizar Swagger
- [ ] **DOC-002** - Criar Manual do Usuário (início)

### Dia 5
- [ ] **DOC-002** - Finalizar Manual
- [ ] **DOC-003** - Atualizar README.md
- [ ] **DOC-004** - Criar Guia de Deploy
- [ ] **DOC-005** - Criar doc de Backup/Restore
- [ ] Sprint Review

---

## ⚪ SPRINT 8: UX (Semana 10 - OPCIONAL)

### Dia 1-2
- [ ] **UX-001** - Implementar atalhos de teclado
- [ ] **UX-002** - Reconexão automática WebSocket
- [ ] **UX-003** - Melhorar feedback visual

### Dia 3-4
- [ ] **UX-004** - Busca rápida de produtos
- [ ] **UX-005** - Implementar PWA

### Dia 5
- [ ] **UX-006** - Adicionar animações
- [ ] Sprint Review Final
- [ ] Preparação para Deploy

---

## 📊 MÉTRICAS DE PROGRESSO

### Por Sprint
- [ ] Sprint 1: 0/7 tarefas (0%)
- [ ] Sprint 2: 0/6 tarefas (0%)
- [ ] Sprint 3: 0/6 tarefas (0%)
- [ ] Sprint 4: 0/13 tarefas (0%)
- [ ] Sprint 5: 0/12 tarefas (0%)
- [ ] Sprint 6: 0/9 tarefas (0%)
- [ ] Sprint 7: 0/11 tarefas (0%)
- [ ] Sprint 8: 0/6 tarefas (0%)

### Geral
**Progresso Total:** 0/70 tarefas (0%)

---

## 🎯 CHECKLIST FINAL DE PRODUÇÃO

### Funcionalidades
- [ ] Dashboard de Caixa funcional
- [ ] Painel Administrativo completo
- [ ] Módulo de Relatórios completo
- [ ] Gerenciamento de Quartos completo
- [ ] PDV funcional
- [ ] Sistema de Comissões

### Segurança
- [ ] Vulnerabilidades corrigidas
- [ ] SSL/TLS configurado
- [ ] Tokens seguros (httpOnly cookies)
- [ ] Rate limiting
- [ ] Sanitização de inputs
- [ ] Backup automatizado

### Infraestrutura
- [ ] Nginx configurado
- [ ] Redis com persistência
- [ ] PM2 configurado
- [ ] Logs estruturados
- [ ] Monitoramento

### Qualidade
- [ ] Testes unitários (>70% coverage)
- [ ] Testes de integração
- [ ] Documentação API
- [ ] Manual do usuário
- [ ] Guia de deploy

### Dados
- [ ] Senha admin alterada
- [ ] Produtos cadastrados
- [ ] Configurações ajustadas

---

## 📝 NOTAS DE EXECUÇÃO

### Bloqueios Encontrados
```
[Espaço para anotar bloqueios durante execução]
```

### Decisões Técnicas
```
[Espaço para documentar decisões importantes]
```

### Mudanças de Escopo
```
[Espaço para registrar mudanças no planejamento]
```

---

**Última atualização:** 14/11/2025
**Responsável:** [Nome do desenvolvedor]
**Status:** Não iniciado
