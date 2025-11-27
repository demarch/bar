# API Reference - Sistema de Gestao para Bar

## Visao Geral

A API REST do sistema fornece endpoints para todas as operacoes de negocio.

**Base URL:** `http://localhost:3001/api`
**Autenticacao:** Bearer Token (JWT)
**Content-Type:** `application/json`

---

## Indice

1. [Autenticacao](#1-autenticacao)
2. [Comandas](#2-comandas)
3. [Produtos](#3-produtos)
4. [Acompanhantes](#4-acompanhantes)
5. [Caixa](#5-caixa)
6. [Quartos](#6-quartos)
7. [Usuarios](#7-usuarios)
8. [Relatorios](#8-relatorios)
9. [Admin](#9-admin)
10. [Health Check](#10-health-check)
11. [WebSocket Events](#11-websocket-events)

---

## Autenticacao

Todas as rotas protegidas requerem o header:
```
Authorization: Bearer <token>
```

### Niveis de Acesso

| Nivel | Descricao |
|-------|-----------|
| `admin` | Acesso total |
| `caixa` | Operacoes de caixa e fechamento |
| `atendente` | PDV e operacoes basicas |

---

## 1. Autenticacao

### POST /api/auth/login

Autentica usuario e retorna tokens.

**Request Body:**
```json
{
  "login": "admin",
  "senha": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "login": "admin",
    "tipo": "admin"
  }
}
```

**Rate Limit:** 5 tentativas por 15 minutos

---

### POST /api/auth/refresh

Renova o token de acesso.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### GET /api/auth/me

Retorna dados do usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": 1,
  "nome": "Administrador",
  "login": "admin",
  "tipo": "admin"
}
```

---

### POST /api/auth/logout

Revoga o token atual.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## 2. Comandas

### GET /api/comandas

Lista comandas abertas do caixa atual.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "comandas": [
    {
      "id": 1,
      "numero": 101,
      "cliente_nome": "Joao",
      "data_abertura": "2025-01-15T20:30:00.000Z",
      "total": 150.00,
      "total_comissao": 20.00,
      "status": "aberta",
      "itens": [
        {
          "id": 1,
          "produto_nome": "Heineken",
          "quantidade": 2,
          "valor_unitario": 10.00,
          "valor_total": 20.00
        }
      ]
    }
  ]
}
```

---

### POST /api/comandas

Cria nova comanda.

**Request Body:**
```json
{
  "numero": 102,
  "cliente_nome": "Maria"
}
```

**Response (201):**
```json
{
  "id": 2,
  "numero": 102,
  "cliente_nome": "Maria",
  "data_abertura": "2025-01-15T21:00:00.000Z",
  "total": 0,
  "status": "aberta"
}
```

**Erro (400):** Numero ja em uso no caixa atual

---

### GET /api/comandas/:numero

Busca comanda por numero.

**Response (200):**
```json
{
  "id": 1,
  "numero": 101,
  "cliente_nome": "Joao",
  "data_abertura": "2025-01-15T20:30:00.000Z",
  "total": 150.00,
  "total_comissao": 20.00,
  "status": "aberta",
  "itens": [...]
}
```

---

### POST /api/comandas/itens

Adiciona item a uma comanda.

**Request Body:**
```json
{
  "comanda_id": 1,
  "produto_id": 5,
  "quantidade": 2,
  "acompanhante_id": 3
}
```

**Response (201):**
```json
{
  "id": 10,
  "comanda_id": 1,
  "produto_id": 5,
  "quantidade": 2,
  "valor_unitario": 50.00,
  "valor_total": 100.00,
  "valor_comissao": 40.00,
  "tipo_item": "comissionado"
}
```

---

### PUT /api/comandas/:id/fechar

Fecha uma comanda. **Requer:** `caixa` ou `admin`

**Request Body:**
```json
{
  "forma_pagamento": "dinheiro",
  "observacoes": "Sem observacoes"
}
```

**Response (200):**
```json
{
  "message": "Comanda fechada com sucesso",
  "comanda": {
    "id": 1,
    "numero": 101,
    "total": 150.00,
    "total_comissao": 20.00,
    "forma_pagamento": "dinheiro",
    "status": "fechada",
    "data_fechamento": "2025-01-15T23:30:00.000Z"
  }
}
```

---

### PUT /api/comandas/itens/:id/cancelar

Cancela item da comanda. **Requer:** `caixa` ou `admin`

**Request Body:**
```json
{
  "motivo": "Produto enviado errado"
}
```

**Response (200):**
```json
{
  "message": "Item cancelado com sucesso"
}
```

---

### POST /api/comandas/servico-quarto

Adiciona servico de quarto com multiplas acompanhantes.

**Request Body:**
```json
{
  "comanda_id": 1,
  "numero_quarto": 5,
  "configuracao_quarto_id": 2,
  "acompanhantes_ids": [1, 3]
}
```

**Response (201):**
```json
{
  "message": "Servico de quarto adicionado",
  "item": {
    "id": 15,
    "numero_quarto": 5,
    "valor_total": 100.00,
    "acompanhantes": [
      {"id": 1, "nome": "Ana"},
      {"id": 3, "nome": "Paula"}
    ]
  }
}
```

---

### POST /api/comandas/tempo-livre

Inicia servico de tempo livre.

**Request Body:**
```json
{
  "comanda_id": 1,
  "numero_quarto": 7,
  "acompanhantes_ids": [2]
}
```

**Response (201):**
```json
{
  "message": "Servico de tempo livre iniciado",
  "item": {
    "id": 20,
    "numero_quarto": 7,
    "tempo_livre": true,
    "status_tempo_livre": "em_andamento",
    "hora_entrada": "2025-01-15T22:00:00.000Z"
  }
}
```

---

### GET /api/comandas/tempo-livre

Lista servicos de tempo livre em andamento.

**Response (200):**
```json
{
  "servicos": [
    {
      "item_id": 20,
      "comanda_numero": 101,
      "numero_quarto": 7,
      "hora_entrada": "2025-01-15T22:00:00.000Z",
      "minutos_decorridos": 45,
      "status_tempo_livre": "em_andamento",
      "acompanhantes": [
        {"id": 2, "nome": "Julia"}
      ]
    }
  ]
}
```

---

### PUT /api/comandas/tempo-livre/:id/calcular

Calcula valor do tempo livre baseado no tempo decorrido.

**Response (200):**
```json
{
  "item_id": 20,
  "minutos_utilizados": 45,
  "valor_sugerido": 100.00,
  "configuracao": {
    "descricao": "1 hora",
    "minutos": 60
  },
  "status_tempo_livre": "aguardando_confirmacao"
}
```

---

### PUT /api/comandas/tempo-livre/:id/confirmar

Confirma valor do tempo livre.

**Request Body:**
```json
{
  "valor_final": 100.00
}
```

**Response (200):**
```json
{
  "message": "Servico de tempo livre finalizado",
  "item": {
    "id": 20,
    "valor_total": 100.00,
    "minutos_utilizados": 45,
    "status_tempo_livre": "finalizado"
  }
}
```

---

### PUT /api/comandas/tempo-livre/:id/cancelar-calculo

Cancela calculo e volta para em_andamento.

**Response (200):**
```json
{
  "message": "Calculo cancelado",
  "status_tempo_livre": "em_andamento"
}
```

---

## 3. Produtos

### GET /api/produtos

Lista todos os produtos ativos.

**Query Params:**
- `categoria_id` (opcional): Filtrar por categoria
- `tipo` (opcional): `normal` ou `comissionado`

**Response (200):**
```json
{
  "produtos": [
    {
      "id": 1,
      "nome": "Heineken",
      "categoria_id": 1,
      "categoria_nome": "Cervejas",
      "preco": 10.00,
      "tipo": "normal",
      "ativo": true
    }
  ]
}
```

---

### GET /api/produtos/:id

Busca produto por ID.

**Response (200):**
```json
{
  "id": 1,
  "nome": "Heineken",
  "categoria_id": 1,
  "preco": 10.00,
  "tipo": "normal",
  "comissao_percentual": null,
  "comissao_fixa": null,
  "ativo": true
}
```

---

### POST /api/produtos

Cria novo produto. **Requer:** `admin`

**Request Body:**
```json
{
  "nome": "Vodka Premium",
  "categoria_id": 6,
  "preco": 80.00,
  "tipo": "comissionado",
  "comissao_percentual": 40.00
}
```

**Response (201):**
```json
{
  "id": 15,
  "nome": "Vodka Premium",
  "preco": 80.00,
  "tipo": "comissionado"
}
```

---

### PUT /api/produtos/:id

Atualiza produto. **Requer:** `admin`

**Request Body:**
```json
{
  "preco": 85.00
}
```

**Response (200):**
```json
{
  "message": "Produto atualizado com sucesso"
}
```

---

### DELETE /api/produtos/:id

Desativa produto. **Requer:** `admin`

**Response (200):**
```json
{
  "message": "Produto desativado com sucesso"
}
```

---

### GET /api/produtos/categorias

Lista todas as categorias ativas.

**Response (200):**
```json
{
  "categorias": [
    {
      "id": 1,
      "nome": "Cervejas",
      "descricao": "Cervejas em geral",
      "ordem": 1
    }
  ]
}
```

---

### POST /api/produtos/categorias

Cria categoria. **Requer:** `admin`

**Request Body:**
```json
{
  "nome": "Vinhos",
  "descricao": "Vinhos tintos e brancos",
  "ordem": 8
}
```

---

### PUT /api/produtos/categorias/:id

Atualiza categoria. **Requer:** `admin`

---

### DELETE /api/produtos/categorias/:id

Desativa categoria. **Requer:** `admin`

---

## 4. Acompanhantes

### GET /api/acompanhantes

Lista todas as acompanhantes cadastradas.

**Response (200):**
```json
{
  "acompanhantes": [
    {
      "id": 1,
      "nome": "Ana Silva",
      "apelido": "Ana",
      "telefone": "11999999999",
      "percentual_comissao": 40.00,
      "ativa": true
    }
  ]
}
```

---

### GET /api/acompanhantes/ativas

Lista acompanhantes ativas no dia atual.

**Response (200):**
```json
{
  "acompanhantes": [
    {
      "id": 1,
      "nome": "Ana Silva",
      "apelido": "Ana",
      "hora_ativacao": "2025-01-15T18:00:00.000Z"
    }
  ]
}
```

---

### GET /api/acompanhantes/presentes

Lista acompanhantes com status de presenca.

**Response (200):**
```json
{
  "acompanhantes": [
    {
      "id": 1,
      "nome": "Ana Silva",
      "apelido": "Ana",
      "presente_hoje": true,
      "hora_ativacao": "2025-01-15T18:00:00.000Z",
      "numero_pulseira": 5
    }
  ]
}
```

---

### POST /api/acompanhantes

Cria nova acompanhante. **Requer:** `admin`

**Request Body:**
```json
{
  "nome": "Maria Santos",
  "apelido": "Mari",
  "telefone": "11988888888",
  "documento": "123.456.789-00",
  "percentual_comissao": 45.00
}
```

---

### PUT /api/acompanhantes/:id

Atualiza acompanhante. **Requer:** `admin`

---

### DELETE /api/acompanhantes/:id

Remove acompanhante. **Requer:** `admin`

---

### POST /api/acompanhantes/:id/ativar

Ativa acompanhante para o dia.

**Request Body (opcional):**
```json
{
  "numero_pulseira": 5
}
```

**Response (200):**
```json
{
  "message": "Acompanhante ativada para hoje",
  "hora_ativacao": "2025-01-15T18:00:00.000Z"
}
```

---

### DELETE /api/acompanhantes/:id/desativar

Desativa acompanhante do dia.

**Response (200):**
```json
{
  "message": "Acompanhante desativada"
}
```

---

### GET /api/acompanhantes/:id/comissoes

Relatorio de comissoes da acompanhante.

**Query Params:**
- `data_inicio`: Data inicial (YYYY-MM-DD)
- `data_fim`: Data final (YYYY-MM-DD)

**Response (200):**
```json
{
  "acompanhante": {
    "id": 1,
    "nome": "Ana Silva"
  },
  "periodo": {
    "inicio": "2025-01-01",
    "fim": "2025-01-15"
  },
  "total_comissoes": 850.00,
  "total_itens": 25,
  "detalhes": [
    {
      "data": "2025-01-15",
      "itens": 5,
      "valor": 200.00
    }
  ]
}
```

---

### GET /api/acompanhantes/pulseiras/disponiveis

Lista pulseiras disponiveis.

**Response (200):**
```json
{
  "pulseiras": [1, 2, 3, 6, 8, 9, 10]
}
```

---

### GET /api/acompanhantes/pulseiras/ativas

Lista pulseiras em uso hoje.

**Response (200):**
```json
{
  "pulseiras": [
    {
      "numero": 5,
      "acompanhante_id": 1,
      "acompanhante_nome": "Ana",
      "hora_ativacao": "2025-01-15T18:00:00.000Z"
    }
  ]
}
```

---

### POST /api/acompanhantes/periodo/:periodoId/encerrar

Encerra periodo de comissoes.

**Response (200):**
```json
{
  "message": "Periodo encerrado"
}
```

---

### POST /api/acompanhantes/periodo/:periodoId/pagar

Marca comissoes como pagas. **Requer:** `admin`

**Response (200):**
```json
{
  "message": "Comissoes marcadas como pagas"
}
```

---

## 5. Caixa

### GET /api/caixa/aberto

Busca caixa aberto atual.

**Response (200):**
```json
{
  "id": 1,
  "usuario_id": 1,
  "usuario_nome": "Administrador",
  "data_abertura": "2025-01-15T18:00:00.000Z",
  "valor_abertura": 500.00,
  "total_vendas": 2500.00,
  "total_comissoes": 400.00,
  "total_sangrias": 300.00,
  "status": "aberto"
}
```

**Response (404):** Nenhum caixa aberto

---

### POST /api/caixa/abrir

Abre novo caixa. **Requer:** `caixa` ou `admin`

**Request Body:**
```json
{
  "valor_abertura": 500.00,
  "observacoes": "Abertura do turno noturno"
}
```

**Response (201):**
```json
{
  "id": 1,
  "data_abertura": "2025-01-15T18:00:00.000Z",
  "valor_abertura": 500.00,
  "status": "aberto"
}
```

**Erro (400):** Ja existe caixa aberto

---

### POST /api/caixa/sangria

Registra sangria (retirada). **Requer:** `caixa` ou `admin`

**Request Body:**
```json
{
  "valor": 200.00,
  "descricao": "Pagamento de fornecedor"
}
```

**Response (201):**
```json
{
  "id": 5,
  "tipo": "sangria",
  "valor": 200.00,
  "descricao": "Pagamento de fornecedor"
}
```

---

### PUT /api/caixa/fechar

Fecha o caixa. **Requer:** `caixa` ou `admin`

**Request Body:**
```json
{
  "valor_fechamento": 2700.00,
  "observacoes": "Fechamento sem ocorrencias"
}
```

**Response (200):**
```json
{
  "message": "Caixa fechado com sucesso",
  "resumo": {
    "valor_abertura": 500.00,
    "total_vendas": 2500.00,
    "total_comissoes": 400.00,
    "total_sangrias": 300.00,
    "valor_esperado": 2300.00,
    "valor_fechamento": 2700.00,
    "diferenca": 400.00
  }
}
```

**Erro (400):** Existem comandas abertas

---

### GET /api/caixa/:id/relatorio

Relatorio detalhado do caixa. **Requer:** `caixa` ou `admin`

**Response (200):**
```json
{
  "caixa": {
    "id": 1,
    "data_abertura": "2025-01-15T18:00:00.000Z",
    "data_fechamento": "2025-01-16T04:00:00.000Z",
    "valor_abertura": 500.00,
    "valor_fechamento": 2700.00
  },
  "vendas": {
    "total": 2500.00,
    "por_forma_pagamento": {
      "dinheiro": 1500.00,
      "cartao_credito": 800.00,
      "pix": 200.00
    }
  },
  "comissoes": {
    "total": 400.00,
    "por_acompanhante": [
      {"nome": "Ana", "valor": 250.00},
      {"nome": "Julia", "valor": 150.00}
    ]
  },
  "sangrias": {
    "total": 300.00,
    "lista": [
      {"valor": 200.00, "descricao": "Pagamento fornecedor"},
      {"valor": 100.00, "descricao": "Troco"}
    ]
  },
  "comandas_fechadas": 45
}
```

---

## 6. Quartos

### GET /api/quartos/configuracoes

Lista configuracoes de precos de quartos.

**Response (200):**
```json
{
  "configuracoes": [
    {"id": 1, "minutos": 30, "descricao": "30 minutos", "valor": 70.00},
    {"id": 2, "minutos": 60, "descricao": "1 hora", "valor": 100.00},
    {"id": 3, "minutos": 90, "descricao": "1 hora e meia", "valor": 150.00},
    {"id": 4, "minutos": 120, "descricao": "2 horas", "valor": 200.00}
  ]
}
```

---

### GET /api/quartos/disponiveis

Lista quartos disponiveis.

**Response (200):**
```json
{
  "quartos": [1, 2, 3, 5, 6, 8, 9, 10],
  "total_quartos": 10,
  "ocupados": 2
}
```

---

### GET /api/quartos/ocupados

Lista quartos ocupados.

**Response (200):**
```json
{
  "quartos": [
    {
      "id": 1,
      "numero_quarto": 4,
      "hora_inicio": "2025-01-15T22:00:00.000Z",
      "minutos_decorridos": 45,
      "comanda_numero": 101,
      "acompanhante_nome": "Ana",
      "configuracao": {
        "descricao": "1 hora",
        "valor": 100.00
      }
    }
  ]
}
```

---

### POST /api/quartos/ocupar

Registra ocupacao de quarto.

**Request Body:**
```json
{
  "comanda_id": 1,
  "numero_quarto": 5,
  "acompanhante_id": 2,
  "configuracao_quarto_id": 2
}
```

**Response (201):**
```json
{
  "id": 5,
  "numero_quarto": 5,
  "hora_inicio": "2025-01-15T23:00:00.000Z",
  "status": "ocupado"
}
```

---

### PUT /api/quartos/:id/finalizar

Finaliza ocupacao do quarto.

**Response (200):**
```json
{
  "message": "Quarto finalizado",
  "ocupacao": {
    "id": 5,
    "hora_inicio": "2025-01-15T23:00:00.000Z",
    "hora_fim": "2025-01-15T23:55:00.000Z",
    "minutos_total": 55,
    "valor_cobrado": 100.00
  }
}
```

---

### PUT /api/quartos/:id/cancelar

Cancela ocupacao sem cobrar.

**Request Body:**
```json
{
  "motivo": "Cliente desistiu"
}
```

**Response (200):**
```json
{
  "message": "Ocupacao cancelada"
}
```

---

## 7. Usuarios

**Todas as rotas requerem:** `admin`

### GET /api/usuarios

Lista todos os usuarios.

**Response (200):**
```json
{
  "usuarios": [
    {
      "id": 1,
      "nome": "Administrador",
      "login": "admin",
      "tipo": "admin",
      "ativo": true
    }
  ]
}
```

---

### GET /api/usuarios/:id

Busca usuario por ID.

---

### POST /api/usuarios

Cria novo usuario.

**Request Body:**
```json
{
  "nome": "Joao Operador",
  "login": "joao",
  "senha": "senha123",
  "tipo": "atendente"
}
```

---

### PUT /api/usuarios/:id

Atualiza usuario.

**Request Body:**
```json
{
  "nome": "Joao Silva",
  "tipo": "caixa"
}
```

---

### DELETE /api/usuarios/:id

Desativa usuario.

---

### PATCH /api/usuarios/:id/ativar

Reativa usuario desativado.

---

## 8. Relatorios

**Todas as rotas requerem:** `admin` ou `caixa`

### GET /api/relatorios/fluxo-caixa

Relatorio de fluxo de caixa.

**Query Params:**
- `data_inicio`: YYYY-MM-DD
- `data_fim`: YYYY-MM-DD

**Response (200):**
```json
{
  "periodo": {
    "inicio": "2025-01-01",
    "fim": "2025-01-15"
  },
  "resumo": {
    "total_entradas": 45000.00,
    "total_saidas": 8000.00,
    "saldo": 37000.00
  },
  "movimentos": [
    {
      "data": "2025-01-15",
      "entradas": 3500.00,
      "saidas": 600.00,
      "saldo_dia": 2900.00
    }
  ]
}
```

---

### GET /api/relatorios/comissoes

Relatorio de comissoes por acompanhante.

**Query Params:**
- `data_inicio`: YYYY-MM-DD
- `data_fim`: YYYY-MM-DD
- `acompanhante_id` (opcional): Filtrar por acompanhante

**Response (200):**
```json
{
  "periodo": {
    "inicio": "2025-01-01",
    "fim": "2025-01-15"
  },
  "total_geral": 5600.00,
  "por_acompanhante": [
    {
      "id": 1,
      "nome": "Ana",
      "total_itens": 45,
      "total_comissoes": 2800.00
    },
    {
      "id": 2,
      "nome": "Julia",
      "total_itens": 38,
      "total_comissoes": 2800.00
    }
  ]
}
```

---

### GET /api/relatorios/vendas

Relatorio de vendas.

**Query Params:**
- `data_inicio`: YYYY-MM-DD
- `data_fim`: YYYY-MM-DD
- `categoria_id` (opcional)

**Response (200):**
```json
{
  "periodo": {
    "inicio": "2025-01-01",
    "fim": "2025-01-15"
  },
  "total_vendas": 45000.00,
  "por_categoria": [
    {
      "categoria": "Cervejas",
      "quantidade": 450,
      "valor": 4500.00
    }
  ],
  "produtos_mais_vendidos": [
    {
      "produto": "Heineken",
      "quantidade": 200,
      "valor": 2000.00
    }
  ]
}
```

---

### GET /api/relatorios/rentabilidade

Relatorio de rentabilidade.

**Query Params:**
- `data_inicio`: YYYY-MM-DD
- `data_fim`: YYYY-MM-DD

**Response (200):**
```json
{
  "periodo": {
    "inicio": "2025-01-01",
    "fim": "2025-01-15"
  },
  "faturamento_bruto": 45000.00,
  "comissoes": 5600.00,
  "faturamento_liquido": 39400.00,
  "margem": 87.55,
  "ticket_medio": 125.00,
  "comandas_atendidas": 360
}
```

---

## 9. Admin

### GET /api/admin/dashboard

Dados do dashboard administrativo. **Requer:** `admin`

**Response (200):**
```json
{
  "hoje": {
    "faturamento": 3500.00,
    "comandas_abertas": 12,
    "comandas_fechadas": 35,
    "acompanhantes_ativas": 8,
    "quartos_ocupados": 3
  },
  "caixa_atual": {
    "valor_abertura": 500.00,
    "total_vendas": 3500.00,
    "total_comissoes": 560.00
  }
}
```

---

### GET /api/admin/quartos/configuracoes

Lista configuracoes de quartos para admin.

**Response (200):**
```json
{
  "configuracoes": [
    {
      "id": 1,
      "minutos": 30,
      "descricao": "30 minutos",
      "valor": 70.00,
      "ativo": true,
      "ordem": 1
    }
  ],
  "total_quartos": 10
}
```

---

## 10. Health Check

### GET /health

Verifica status do servidor.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T22:00:00.000Z",
  "uptime": 86400
}
```

---

## 11. WebSocket Events

### Conexao

```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'JWT_TOKEN' }
});
```

### Eventos Emitidos pelo Servidor

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `comanda:criada` | `{id, numero, cliente_nome}` | Nova comanda aberta |
| `comanda:atualizada` | `{id, numero, total, itens}` | Item adicionado/removido |
| `comanda:fechada` | `{id, numero}` | Comanda finalizada |
| `quarto:atualizado` | `{numero_quarto, status}` | Status de quarto alterado |
| `caixa:atualizado` | `{total_vendas, total_comissoes}` | Movimento de caixa alterado |

### Exemplo de Uso

```javascript
// Escutar atualizacoes de comanda
socket.on('comanda:atualizada', (data) => {
  console.log('Comanda atualizada:', data);
  // Atualizar UI
});

// Escutar mudancas em quartos
socket.on('quarto:atualizado', (data) => {
  console.log('Quarto:', data.numero_quarto, 'Status:', data.status);
});
```

---

## Codigos de Erro

| Codigo | Descricao |
|--------|-----------|
| 400 | Bad Request - Dados invalidos |
| 401 | Unauthorized - Token ausente ou invalido |
| 403 | Forbidden - Sem permissao |
| 404 | Not Found - Recurso nao encontrado |
| 409 | Conflict - Conflito (ex: numero de comanda duplicado) |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro interno |

### Formato de Erro

```json
{
  "error": "Mensagem de erro",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

*Documentacao gerada em Novembro 2025*
