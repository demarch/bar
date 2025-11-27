# Documentacao do Banco de Dados - Sistema de Gestao para Bar

## Visao Geral

O sistema utiliza PostgreSQL 15 como banco de dados relacional principal, com Redis 7 para cache e gerenciamento de sessoes.

**Schema:** public
**Encoding:** UTF-8
**Timezone:** America/Sao_Paulo

---

## Indice

1. [Diagrama ER](#1-diagrama-er)
2. [Tabelas](#2-tabelas)
3. [Views](#3-views)
4. [Funcoes e Triggers](#4-funcoes-e-triggers)
5. [Indices](#5-indices)
6. [Migracoes](#6-migracoes)
7. [Dados Iniciais](#7-dados-iniciais)

---

## 1. Diagrama ER

```
+------------------+       +--------------------+       +------------------+
|     USUARIOS     |       |   ACOMPANHANTES    |       |    CATEGORIAS    |
+------------------+       +--------------------+       +------------------+
| id (PK)          |       | id (PK)            |       | id (PK)          |
| nome             |       | nome               |       | nome             |
| login (UNIQUE)   |       | apelido            |       | descricao        |
| senha            |       | telefone           |       | ordem            |
| tipo             |       | documento          |       | ativa            |
| ativo            |       | percentual_comissao|       +--------+---------+
| created_at       |       | ativa              |                |
| updated_at       |       | created_at         |                |
+--------+---------+       | updated_at         |                |
         |                 +----------+---------+                |
         |                            |                          |
         |                            |                          |
         |    +-------------------------------------------+      |
         |    |                                           |      |
         v    v                                           v      v
+--------+----+--------+       +------------------+    +--+------+--------+
| MOVIMENTOS_CAIXA     |       | ACOMPANHANTES    |    |    PRODUTOS      |
+----------------------+       | _ATIVAS_DIA      |    +------------------+
| id (PK)              |       +------------------+    | id (PK)          |
| usuario_id (FK)      |       | id (PK)          |    | nome             |
| data_abertura        |       | acompanhante_id  |    | categoria_id (FK)|
| data_fechamento      |       | data             |    | preco            |
| valor_abertura       |       | hora_ativacao    |    | tipo             |
| valor_fechamento     |       +------------------+    | comissao_percent |
| total_vendas         |                               | comissao_fixa    |
| total_comissoes      |                               | ativo            |
| total_sangrias       |                               +--------+---------+
| status               |                                        |
+----------+-----------+                                        |
           |                                                    |
           |                                                    |
           v                                                    |
+----------+-----------+                                        |
| LANCAMENTOS_CAIXA    |                                        |
+----------------------+                                        |
| id (PK)              |                                        |
| movimento_caixa_id   |                                        |
| tipo                 |                                        |
| valor                |                                        |
| descricao            |                                        |
| categoria            |                                        |
| usuario_id (FK)      |                                        |
+----------------------+                                        |
                                                                |
+----------------------+       +----------------------+         |
|      COMANDAS        |       |   ITENS_COMANDA      |<--------+
+----------------------+       +----------------------+
| id (PK)              |<------| id (PK)              |
| numero               |       | comanda_id (FK)      |
| movimento_caixa_id   |       | produto_id (FK)      |
| cliente_nome         |       | acompanhante_id (FK) |
| data_abertura        |       | quantidade           |
| data_fechamento      |       | valor_unitario       |
| total                |       | valor_total          |
| total_comissao       |       | valor_comissao       |
| status               |       | tipo_item            |
| forma_pagamento      |       | cancelado            |
+----------+-----------+       | tempo_livre          |
           |                   | status_tempo_livre   |
           |                   | hora_saida           |
           |                   | minutos_utilizados   |
           |                   +----------------------+
           |
           v
+----------------------+       +----------------------+
| OCUPACAO_QUARTOS     |       | CONFIG_QUARTOS       |
+----------------------+       +----------------------+
| id (PK)              |       | id (PK)              |
| comanda_id (FK)      |------>| minutos              |
| acompanhante_id (FK) |       | descricao            |
| numero_quarto        |       | valor                |
| hora_inicio          |       | ativo                |
| hora_fim             |       | ordem                |
| minutos_total        |       +----------------------+
| valor_cobrado        |
| config_quarto_id (FK)|
| status               |
+----------------------+

+----------------------+       +----------------------+
| CONFIG_SISTEMA       |       |   LOGS_OPERACOES     |
+----------------------+       +----------------------+
| id (PK)              |       | id (PK)              |
| chave (UNIQUE)       |       | usuario_id (FK)      |
| valor                |       | acao                 |
| tipo                 |       | tabela               |
| descricao            |       | registro_id          |
+----------------------+       | dados_anteriores     |
                               | dados_novos          |
                               | ip_address           |
                               | user_agent           |
                               +----------------------+
```

---

## 2. Tabelas

### 2.1 USUARIOS

Armazena usuarios do sistema com diferentes niveis de acesso.

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,           -- Hash bcrypt
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('admin', 'caixa', 'atendente')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | SERIAL | Identificador unico |
| nome | VARCHAR(100) | Nome completo |
| login | VARCHAR(50) | Login unico para autenticacao |
| senha | VARCHAR(255) | Hash bcrypt da senha |
| tipo | VARCHAR(20) | Nivel de acesso: admin, caixa, atendente |
| ativo | BOOLEAN | Status do usuario |

---

### 2.2 ACOMPANHANTES

Cadastro de acompanhantes que geram comissoes.

```sql
CREATE TABLE acompanhantes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    apelido VARCHAR(50),
    telefone VARCHAR(20),
    documento VARCHAR(20),
    percentual_comissao DECIMAL(5,2) DEFAULT 40.00,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | SERIAL | Identificador unico |
| nome | VARCHAR(100) | Nome completo |
| apelido | VARCHAR(50) | Nome de trabalho |
| telefone | VARCHAR(20) | Telefone de contato |
| documento | VARCHAR(20) | CPF ou RG |
| percentual_comissao | DECIMAL(5,2) | Percentual de comissao (padrao 40%) |
| ativa | BOOLEAN | Cadastro ativo |

---

### 2.3 ACOMPANHANTES_ATIVAS_DIA

Registro de presenca diaria das acompanhantes.

```sql
CREATE TABLE acompanhantes_ativas_dia (
    id SERIAL PRIMARY KEY,
    acompanhante_id INTEGER REFERENCES acompanhantes(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_ativacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(acompanhante_id, data)
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| acompanhante_id | INTEGER | FK para acompanhantes |
| data | DATE | Data de ativacao |
| hora_ativacao | TIMESTAMP | Horario de chegada |

---

### 2.4 CATEGORIAS

Categorias para organizacao de produtos.

```sql
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    ativa BOOLEAN DEFAULT true
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| nome | VARCHAR(50) | Nome da categoria (unico) |
| descricao | TEXT | Descricao detalhada |
| ordem | INTEGER | Ordem de exibicao |
| ativa | BOOLEAN | Categoria ativa |

---

### 2.5 PRODUTOS

Produtos vendidos no estabelecimento.

```sql
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id),
    preco DECIMAL(10,2) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('normal', 'comissionado')),
    comissao_percentual DECIMAL(5,2),
    comissao_fixa DECIMAL(10,2),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| nome | VARCHAR(100) | Nome do produto |
| categoria_id | INTEGER | FK para categorias |
| preco | DECIMAL(10,2) | Preco de venda |
| tipo | VARCHAR(20) | normal ou comissionado |
| comissao_percentual | DECIMAL(5,2) | Percentual de comissao |
| comissao_fixa | DECIMAL(10,2) | Valor fixo de comissao |

---

### 2.6 MOVIMENTOS_CAIXA

Controle de abertura e fechamento de caixa.

```sql
CREATE TABLE movimentos_caixa (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    data_abertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP,
    valor_abertura DECIMAL(10,2) NOT NULL,
    valor_fechamento DECIMAL(10,2),
    total_vendas DECIMAL(10,2) DEFAULT 0,
    total_comissoes DECIMAL(10,2) DEFAULT 0,
    total_sangrias DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| usuario_id | INTEGER | FK para usuarios (operador) |
| data_abertura | TIMESTAMP | Data/hora de abertura |
| data_fechamento | TIMESTAMP | Data/hora de fechamento |
| valor_abertura | DECIMAL(10,2) | Valor inicial em caixa |
| valor_fechamento | DECIMAL(10,2) | Valor final conferido |
| total_vendas | DECIMAL(10,2) | Total de vendas do periodo |
| total_comissoes | DECIMAL(10,2) | Total de comissoes |
| total_sangrias | DECIMAL(10,2) | Total de retiradas |
| status | VARCHAR(20) | aberto ou fechado |

---

### 2.7 LANCAMENTOS_CAIXA

Transacoes individuais de caixa.

```sql
CREATE TABLE lancamentos_caixa (
    id SERIAL PRIMARY KEY,
    movimento_caixa_id INTEGER REFERENCES movimentos_caixa(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'sangria')),
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(50),
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| movimento_caixa_id | INTEGER | FK para movimentos_caixa |
| tipo | VARCHAR(20) | entrada, saida ou sangria |
| valor | DECIMAL(10,2) | Valor do lancamento |
| descricao | TEXT | Descricao da transacao |
| categoria | VARCHAR(50) | Categoria do lancamento |

---

### 2.8 COMANDAS

Comandas de consumo dos clientes.

```sql
CREATE TABLE comandas (
    id SERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    movimento_caixa_id INTEGER REFERENCES movimentos_caixa(id),
    cliente_nome VARCHAR(100),
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP,
    total DECIMAL(10,2) DEFAULT 0,
    total_comissao DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
    forma_pagamento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(numero, movimento_caixa_id)
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| numero | INTEGER | Numero da comanda (unico por caixa) |
| movimento_caixa_id | INTEGER | FK para movimentos_caixa |
| cliente_nome | VARCHAR(100) | Nome do cliente |
| total | DECIMAL(10,2) | Total da comanda |
| total_comissao | DECIMAL(10,2) | Total de comissoes |
| status | VARCHAR(20) | aberta, fechada ou cancelada |
| forma_pagamento | VARCHAR(50) | Forma de pagamento |

---

### 2.9 ITENS_COMANDA

Itens lancados em cada comanda.

```sql
CREATE TABLE itens_comanda (
    id SERIAL PRIMARY KEY,
    comanda_id INTEGER REFERENCES comandas(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id),
    acompanhante_id INTEGER REFERENCES acompanhantes(id),
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    valor_comissao DECIMAL(10,2) DEFAULT 0,
    tipo_item VARCHAR(20) NOT NULL CHECK (tipo_item IN ('normal', 'comissionado', 'quarto')),
    cancelado BOOLEAN DEFAULT false,
    motivo_cancelamento TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Campos adicionados pela Migration 008 (Tempo Livre)
    tempo_livre BOOLEAN DEFAULT false,
    hora_saida TIMESTAMP,
    valor_sugerido DECIMAL(10,2),
    status_tempo_livre VARCHAR(30) CHECK (status_tempo_livre IN ('em_andamento', 'aguardando_confirmacao', 'finalizado')),
    minutos_utilizados INTEGER
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| comanda_id | INTEGER | FK para comandas |
| produto_id | INTEGER | FK para produtos |
| acompanhante_id | INTEGER | FK para acompanhantes (opcional) |
| quantidade | INTEGER | Quantidade do item |
| valor_unitario | DECIMAL(10,2) | Preco unitario |
| valor_total | DECIMAL(10,2) | Valor total (qtd x preco) |
| valor_comissao | DECIMAL(10,2) | Valor da comissao |
| tipo_item | VARCHAR(20) | normal, comissionado ou quarto |
| cancelado | BOOLEAN | Item cancelado |
| **tempo_livre** | BOOLEAN | Se e servico de tempo livre |
| **status_tempo_livre** | VARCHAR(30) | em_andamento, aguardando_confirmacao, finalizado |
| **minutos_utilizados** | INTEGER | Minutos totais do servico |

---

### 2.10 CONFIGURACAO_QUARTOS

Tabela de precos para servicos de quarto.

```sql
CREATE TABLE configuracao_quartos (
    id SERIAL PRIMARY KEY,
    minutos INTEGER NOT NULL,
    descricao VARCHAR(50) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| minutos | INTEGER | Duracao em minutos |
| descricao | VARCHAR(50) | Descricao (ex: "1 hora") |
| valor | DECIMAL(10,2) | Preco do periodo |
| ordem | INTEGER | Ordem de exibicao |

---

### 2.11 OCUPACAO_QUARTOS

Registro de ocupacao de quartos.

```sql
CREATE TABLE ocupacao_quartos (
    id SERIAL PRIMARY KEY,
    comanda_id INTEGER REFERENCES comandas(id) ON DELETE CASCADE,
    acompanhante_id INTEGER REFERENCES acompanhantes(id),
    numero_quarto INTEGER NOT NULL,
    hora_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hora_fim TIMESTAMP,
    minutos_total INTEGER,
    valor_cobrado DECIMAL(10,2),
    configuracao_quarto_id INTEGER REFERENCES configuracao_quartos(id),
    status VARCHAR(20) DEFAULT 'ocupado' CHECK (status IN ('ocupado', 'finalizado', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| comanda_id | INTEGER | FK para comandas |
| acompanhante_id | INTEGER | FK para acompanhantes |
| numero_quarto | INTEGER | Numero do quarto |
| hora_inicio | TIMESTAMP | Inicio da ocupacao |
| hora_fim | TIMESTAMP | Fim da ocupacao |
| minutos_total | INTEGER | Total de minutos |
| valor_cobrado | DECIMAL(10,2) | Valor final cobrado |
| status | VARCHAR(20) | ocupado, finalizado ou cancelado |

---

### 2.12 CONFIGURACOES_SISTEMA

Configuracoes globais do sistema.

```sql
CREATE TABLE configuracoes_sistema (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    descricao TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Chave | Tipo | Valor Padrao | Descricao |
|-------|------|--------------|-----------|
| nome_estabelecimento | string | "Meu Bar" | Nome do estabelecimento |
| percentual_comissao_padrao | number | 40 | Percentual padrao de comissao |
| tempo_maximo_quarto_horas | number | 4 | Tempo maximo de quarto |
| permitir_comanda_negativa | boolean | false | Permite saldo negativo |
| total_quartos | number | 10 | Total de quartos disponiveis |

---

### 2.13 LOGS_OPERACOES

Auditoria de operacoes do sistema.

```sql
CREATE TABLE logs_operacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    acao VARCHAR(100) NOT NULL,
    tabela VARCHAR(50),
    registro_id INTEGER,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| usuario_id | INTEGER | Usuario que executou |
| acao | VARCHAR(100) | Tipo de acao |
| tabela | VARCHAR(50) | Tabela afetada |
| registro_id | INTEGER | ID do registro |
| dados_anteriores | JSONB | Estado antes da alteracao |
| dados_novos | JSONB | Estado apos alteracao |

---

## 3. Views

### 3.1 vw_comandas_abertas

Comandas abertas com totais e acompanhantes.

```sql
CREATE VIEW vw_comandas_abertas AS
SELECT
    c.id,
    c.numero,
    c.cliente_nome,
    c.data_abertura,
    c.total,
    c.total_comissao,
    COUNT(ic.id) as total_itens,
    ARRAY_AGG(DISTINCT a.nome) FILTER (WHERE a.nome IS NOT NULL) as acompanhantes
FROM comandas c
LEFT JOIN itens_comanda ic ON ic.comanda_id = c.id AND ic.cancelado = false
LEFT JOIN acompanhantes a ON a.id = ic.acompanhante_id
WHERE c.status = 'aberta'
GROUP BY c.id, c.numero, c.cliente_nome, c.data_abertura, c.total, c.total_comissao
ORDER BY c.numero;
```

---

### 3.2 vw_comissoes_acompanhantes

Comissoes por acompanhante e data.

```sql
CREATE VIEW vw_comissoes_acompanhantes AS
SELECT
    a.id,
    a.nome,
    a.apelido,
    DATE(ic.created_at) as data,
    COUNT(ic.id) as total_itens,
    SUM(ic.valor_comissao) as total_comissoes
FROM acompanhantes a
JOIN itens_comanda ic ON ic.acompanhante_id = a.id
WHERE ic.cancelado = false
GROUP BY a.id, a.nome, a.apelido, DATE(ic.created_at);
```

---

### 3.3 vw_quartos_ocupados

Quartos atualmente ocupados com tempo decorrido.

```sql
CREATE VIEW vw_quartos_ocupados AS
SELECT
    oq.id,
    oq.numero_quarto,
    oq.hora_inicio,
    a.nome as acompanhante_nome,
    c.numero as comanda_numero,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - oq.hora_inicio))/60 as minutos_decorridos
FROM ocupacao_quartos oq
JOIN acompanhantes a ON a.id = oq.acompanhante_id
JOIN comandas c ON c.id = oq.comanda_id
WHERE oq.status = 'ocupado';
```

---

### 3.4 vw_servicos_tempo_livre_andamento

Servicos de tempo livre em andamento (Migration 008).

```sql
CREATE VIEW vw_servicos_tempo_livre_andamento AS
SELECT
    ic.id as item_id,
    ic.comanda_id,
    c.numero as comanda_numero,
    ic.numero_quarto,
    ic.hora_entrada,
    ic.status_tempo_livre,
    EXTRACT(EPOCH FROM (get_brasilia_time() - ic.hora_entrada))/60 as minutos_decorridos,
    -- acompanhantes como JSON
FROM itens_comanda ic
JOIN comandas c ON c.id = ic.comanda_id
WHERE ic.tipo_item = 'quarto'
  AND ic.tempo_livre = true
  AND ic.status_tempo_livre = 'em_andamento'
  AND ic.cancelado = false
  AND c.status = 'aberta';
```

---

## 4. Funcoes e Triggers

### 4.1 update_updated_at_column()

Atualiza automaticamente o campo updated_at.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Triggers que usam esta funcao:**
- `update_usuarios_updated_at`
- `update_acompanhantes_updated_at`
- `update_produtos_updated_at`
- `update_comandas_updated_at`

---

### 4.2 atualizar_total_comanda()

Atualiza automaticamente o total da comanda quando itens sao alterados.

```sql
CREATE OR REPLACE FUNCTION atualizar_total_comanda()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE comandas SET
        total = (
            SELECT COALESCE(SUM(valor_total), 0)
            FROM itens_comanda
            WHERE comanda_id = NEW.comanda_id AND cancelado = false
        ),
        total_comissao = (
            SELECT COALESCE(SUM(valor_comissao), 0)
            FROM itens_comanda
            WHERE comanda_id = NEW.comanda_id AND cancelado = false
        )
    WHERE id = NEW.comanda_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_total_comanda
    AFTER INSERT OR UPDATE ON itens_comanda
    FOR EACH ROW EXECUTE FUNCTION atualizar_total_comanda();
```

---

### 4.3 calcular_valor_tempo_livre()

Calcula o valor do servico de tempo livre baseado nos minutos decorridos.

```sql
CREATE OR REPLACE FUNCTION calcular_valor_tempo_livre(minutos_decorridos INTEGER)
RETURNS TABLE(
    configuracao_id INTEGER,
    descricao VARCHAR(50),
    minutos_configuracao INTEGER,
    valor DECIMAL(10,2)
) AS $$
DECLARE
    tolerancia INTEGER := 10;  -- Tolerancia de 10 minutos
BEGIN
    RETURN QUERY
    SELECT cq.id, cq.descricao, cq.minutos, cq.valor
    FROM configuracao_quartos cq
    WHERE cq.ativo = true
    AND cq.minutos >= (
        SELECT COALESCE(
            (SELECT MIN(cq2.minutos)
             FROM configuracao_quartos cq2
             WHERE cq2.ativo = true
             AND minutos_decorridos <= (cq2.minutos + tolerancia)),
            (SELECT MAX(cq3.minutos)
             FROM configuracao_quartos cq3
             WHERE cq3.ativo = true)
        )
    )
    ORDER BY cq.minutos ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

**Logica de tolerancia:**
- 30 minutos + 10 min = ate 40 min cobra R$ 70
- 60 minutos + 10 min = ate 70 min cobra R$ 100
- 90 minutos + 10 min = ate 100 min cobra R$ 150
- Acima de 100 min cobra R$ 200

---

## 5. Indices

```sql
-- Usuarios
CREATE INDEX idx_usuarios_login ON usuarios(login);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);

-- Acompanhantes
CREATE INDEX idx_acompanhantes_ativas ON acompanhantes_ativas_dia(data);

-- Produtos
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_produtos_tipo ON produtos(tipo);

-- Movimentos de Caixa
CREATE INDEX idx_movimentos_status ON movimentos_caixa(status);
CREATE INDEX idx_movimentos_data ON movimentos_caixa(data_abertura);

-- Lancamentos
CREATE INDEX idx_lancamentos_movimento ON lancamentos_caixa(movimento_caixa_id);
CREATE INDEX idx_lancamentos_tipo ON lancamentos_caixa(tipo);

-- Comandas
CREATE INDEX idx_comandas_numero ON comandas(numero);
CREATE INDEX idx_comandas_status ON comandas(status);
CREATE INDEX idx_comandas_movimento ON comandas(movimento_caixa_id);

-- Itens de Comanda
CREATE INDEX idx_itens_comanda ON itens_comanda(comanda_id);
CREATE INDEX idx_itens_produto ON itens_comanda(produto_id);
CREATE INDEX idx_itens_acompanhante ON itens_comanda(acompanhante_id);
CREATE INDEX idx_itens_comanda_tempo_livre ON itens_comanda(tempo_livre, status_tempo_livre)
    WHERE tempo_livre = true;

-- Ocupacao de Quartos
CREATE INDEX idx_ocupacao_comanda ON ocupacao_quartos(comanda_id);
CREATE INDEX idx_ocupacao_status ON ocupacao_quartos(status);
CREATE INDEX idx_ocupacao_acompanhante ON ocupacao_quartos(acompanhante_id);

-- Logs
CREATE INDEX idx_logs_usuario ON logs_operacoes(usuario_id);
CREATE INDEX idx_logs_tabela ON logs_operacoes(tabela);
CREATE INDEX idx_logs_created ON logs_operacoes(created_at);
```

---

## 6. Migracoes

O sistema possui 8 migracoes aplicadas em sequencia:

| # | Arquivo | Descricao |
|---|---------|-----------|
| 001 | `001_add_comissao_fixa_to_produtos.sql` | Adiciona campo comissao_fixa aos produtos |
| 002 | `002_add_drink_comissionado_produto.sql` | Adiciona produto drink comissionado |
| 003 | `003_add_companion_bracelet_system.sql` | Sistema de pulseiras para acompanhantes |
| 004 | `004_add_commission_payment_control.sql` | Controle de pagamento de comissoes |
| 005 | `005_fix_atribuir_pulseira_reactivation.sql` | Correcao reativacao de pulseiras |
| 006 | `006_add_room_service_improvements.sql` | Melhorias no servico de quartos |
| 007 | `007_add_config_quarto_to_itens.sql` | Configuracao de quarto nos itens |
| 008 | `008_add_free_time_service.sql` | **Servico de Tempo Livre** |

### Aplicar Migracoes

```bash
# Via script SQL
psql -U admin -d bar_system -f backend/database/migrations/apply_all_migrations.sql

# Via API (requer autenticacao admin)
curl -X POST http://localhost:3001/api/migrations/apply \
  -H "Authorization: Bearer TOKEN"
```

---

## 7. Dados Iniciais

### Categorias Padrao

```sql
INSERT INTO categorias (nome, descricao, ordem) VALUES
    ('Cervejas', 'Cervejas em geral', 1),
    ('Drinks', 'Drinks e coqueteis', 2),
    ('Destilados', 'Doses de destilados', 3),
    ('Refrigerantes', 'Refrigerantes e sucos', 4),
    ('Porcoes', 'Porcoes de comida', 5),
    ('Comissionados', 'Bebidas comissionadas', 6),
    ('Quartos', 'Servico de quartos', 7);
```

### Configuracao de Quartos

```sql
INSERT INTO configuracao_quartos (minutos, descricao, valor, ordem) VALUES
    (30, '30 minutos', 70.00, 1),
    (60, '1 hora', 100.00, 2),
    (90, '1 hora e meia', 150.00, 3),
    (120, '2 horas', 200.00, 4);
```

### Usuario Admin

```sql
-- Senha: admin123 (ALTERAR EM PRODUCAO!)
INSERT INTO usuarios (nome, login, senha, tipo, ativo) VALUES
    ('Administrador', 'admin',
     '$2b$10$4Vsi/NvzekGx1hMblmJ/hOI03acQHLQdtRksAYR.MXL6k55YXElES',
     'admin', true);
```

---

## Backup e Restore

### Backup

```bash
# Backup completo
docker-compose exec postgres pg_dump -U admin bar_system > backup_$(date +%Y%m%d).sql

# Backup apenas dados
docker-compose exec postgres pg_dump -U admin --data-only bar_system > backup_data.sql

# Backup apenas schema
docker-compose exec postgres pg_dump -U admin --schema-only bar_system > backup_schema.sql
```

### Restore

```bash
# Restore completo
docker-compose exec -T postgres psql -U admin bar_system < backup.sql

# Restore em banco novo
docker-compose exec -T postgres createdb -U admin bar_system_restore
docker-compose exec -T postgres psql -U admin bar_system_restore < backup.sql
```

---

*Documentacao gerada em Novembro 2025*
