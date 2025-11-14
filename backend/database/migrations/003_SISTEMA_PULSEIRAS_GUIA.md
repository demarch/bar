# Sistema de Pulseiras para Acompanhantes

## Visão Geral

Este sistema implementa o gerenciamento de pulseiras numeradas (1-1000) para acompanhantes, diferenciando entre **acompanhantes fixas** (que trabalham regularmente) e **acompanhantes rotativas** (ocasionais).

## Conceitos Principais

### Tipos de Acompanhantes

1. **Acompanhante Fixa**
   - Trabalha regularmente no estabelecimento
   - Possui uma **pulseira fixa** (número reservado exclusivamente para ela)
   - Sempre recebe a mesma pulseira quando é ativada
   - Exemplo: Maria sempre usa a pulseira #5

2. **Acompanhante Rotativa**
   - Aparece ocasionalmente (1 dia, 2-3 dias)
   - Não possui pulseira fixa
   - Recebe pulseiras em **ordem de chegada** (próxima disponível)
   - Exemplo: Ana chegou hoje e recebeu a pulseira #15 (primeira disponível)

### Pulseiras

- **Total**: 1000 pulseiras numeradas (1-1000)
- **Status possíveis**:
  - `disponivel`: Pulseira livre para uso
  - `reservada_fixa`: Reservada para uma acompanhante fixa
  - `em_uso`: Atualmente sendo usada por uma acompanhante

## Fluxo de Uso

### 1. Cadastrar Acompanhante

#### Acompanhante Fixa
```json
POST /api/acompanhantes
{
  "nome": "Maria Silva",
  "apelido": "Maria",
  "tipo_acompanhante": "fixa",
  "numero_pulseira_fixa": 5,
  "percentual_comissao": 40
}
```

#### Acompanhante Rotativa
```json
POST /api/acompanhantes
{
  "nome": "Ana Santos",
  "apelido": "Ana",
  "tipo_acompanhante": "rotativa",
  "percentual_comissao": 40
}
```

### 2. Ativar Acompanhante para o Dia

```json
POST /api/acompanhantes/:id/ativar
```

**Comportamento:**
- Se for **fixa**: recebe sua pulseira fixa
- Se for **rotativa**: recebe a próxima pulseira disponível em ordem crescente
- Sistema valida se a pulseira está disponível
- Retorna o número da pulseira atribuída

### 3. Desativar Acompanhante

```json
DELETE /api/acompanhantes/:id/desativar
```

**Comportamento:**
- Marca a pulseira como devolvida
- Remove a acompanhante das ativas do dia
- Pulseira volta a ficar disponível (exceto se for fixa)

## Endpoints da API

### Acompanhantes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/acompanhantes` | Lista todas as acompanhantes |
| GET | `/api/acompanhantes/ativas` | Lista acompanhantes ativas hoje |
| POST | `/api/acompanhantes` | Cria nova acompanhante (admin) |
| PUT | `/api/acompanhantes/:id` | Atualiza acompanhante (admin) |
| POST | `/api/acompanhantes/:id/ativar` | Ativa acompanhante e atribui pulseira |
| DELETE | `/api/acompanhantes/:id/desativar` | Desativa e devolve pulseira |
| GET | `/api/acompanhantes/:id/comissoes` | Relatório de comissões |

### Pulseiras

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/acompanhantes/pulseiras/disponiveis` | Lista todas as 1000 pulseiras e seus status |
| GET | `/api/acompanhantes/pulseiras/ativas` | Lista pulseiras em uso hoje |
| GET | `/api/acompanhantes/pulseiras/estatisticas` | Estatísticas (disponíveis, reservadas, em uso) |
| GET | `/api/acompanhantes/pulseiras/:numero` | Busca pulseira específica |

## Estrutura do Banco de Dados

### Tabela: `acompanhantes`
```sql
- tipo_acompanhante: 'fixa' | 'rotativa'
- numero_pulseira_fixa: INTEGER (1-1000) -- Apenas para fixas
```

### Tabela: `pulseiras_ativas_dia`
```sql
- numero_pulseira: INTEGER (1-1000)
- acompanhante_id: INTEGER
- data: DATE
- hora_atribuicao: TIMESTAMP
- hora_devolucao: TIMESTAMP (NULL quando em uso)
```

### Tabela: `acompanhantes_ativas_dia`
```sql
- acompanhante_id: INTEGER
- data: DATE
- hora_ativacao: TIMESTAMP
- numero_pulseira: INTEGER
```

## Views Úteis

### `vw_pulseiras_disponiveis`
Mostra o status de todas as pulseiras (1-1000):
```sql
SELECT * FROM vw_pulseiras_disponiveis;
```

Retorna:
- `numero`: Número da pulseira
- `status`: disponivel | reservada_fixa | em_uso
- `acompanhante_id`: ID da acompanhante (se reservada/em uso)
- `acompanhante_nome`: Nome da acompanhante (se reservada/em uso)

### `vw_pulseiras_ativas_hoje`
Lista todas as pulseiras em uso hoje:
```sql
SELECT * FROM vw_pulseiras_ativas_hoje;
```

## Funções do Banco de Dados

### `atribuir_pulseira(acompanhante_id)`
Atribui automaticamente uma pulseira para a acompanhante:
- Fixa: usa sua pulseira reservada
- Rotativa: recebe próxima disponível

```sql
SELECT atribuir_pulseira(123) as numero_pulseira;
```

### `devolver_pulseira(acompanhante_id)`
Marca a pulseira como devolvida:
```sql
SELECT devolver_pulseira(123);
```

## Validações e Regras

1. **Pulseira Fixa**:
   - Deve estar entre 1 e 1000
   - Não pode estar reservada para outra acompanhante fixa
   - Apenas acompanhantes fixas podem ter pulseira reservada

2. **Ativação**:
   - Acompanhante não pode estar ativa no mesmo dia
   - Pulseira fixa não pode estar em uso
   - Deve haver pulseiras disponíveis (para rotativas)

3. **Atualização**:
   - Ao mudar de fixa para rotativa, pulseira fixa é removida
   - Ao mudar de rotativa para fixa, deve informar número da pulseira

## Exemplos de Uso

### Cenário 1: Dia Normal de Trabalho

**Manhã:**
1. Maria (fixa, pulseira #5) chega → Recebe pulseira #5
2. Juliana (fixa, pulseira #12) chega → Recebe pulseira #12
3. Ana (rotativa) chega → Recebe pulseira #1 (primeira disponível)
4. Paula (rotativa) chega → Recebe pulseira #2

**Tarde:**
5. Carla (rotativa) chega → Recebe pulseira #3
6. Ana sai → Devolve pulseira #1
7. Beatriz (rotativa) chega → Recebe pulseira #1 (ficou disponível)

**Fim do Dia:**
- Todas devolvem as pulseiras
- Pulseiras #5 e #12 voltam ao status `reservada_fixa`
- Outras voltam ao status `disponivel`

### Cenário 2: Verificar Pulseiras Disponíveis

```bash
GET /api/acompanhantes/pulseiras/estatisticas

Response:
{
  "disponiveis": 985,
  "reservadas_fixas": 10,
  "em_uso": 5,
  "total": 1000
}
```

### Cenário 3: Ver Quem Está Usando Cada Pulseira

```bash
GET /api/acompanhantes/pulseiras/ativas

Response:
[
  {
    "numero_pulseira": 5,
    "acompanhante_nome": "Maria Silva",
    "acompanhante_apelido": "Maria",
    "tipo_acompanhante": "fixa",
    "hora_atribuicao": "2024-11-14T08:00:00Z"
  },
  ...
]
```

## Aplicando a Migration

### Opção 1: Via Script SQL Direto
```bash
psql -U seu_usuario -d seu_banco -f backend/database/migrations/003_add_companion_bracelet_system.sql
```

### Opção 2: Via Script Consolidado
```bash
psql -U seu_usuario -d seu_banco -f backend/database/migrations/apply_all_migrations.sql
```

### Opção 3: Via API (se disponível)
```bash
curl -X POST http://localhost:3000/api/migrations/apply \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Erro: "Pulseira fixa já está em uso"
- **Causa**: Tentando ativar acompanhante fixa cuja pulseira já está sendo usada
- **Solução**: Verificar quem está usando a pulseira e desativar antes

### Erro: "Não há pulseiras disponíveis"
- **Causa**: Todas as 1000 pulseiras estão em uso ou reservadas
- **Solução**: Desativar acompanhantes que não estão mais presentes

### Erro: "Pulseira X já está reservada para Y"
- **Causa**: Tentando cadastrar acompanhante fixa com pulseira já reservada
- **Solução**: Escolher outro número de pulseira ou liberar a atual

## Manutenção

### Limpeza Diária Automática
O sistema mantém histórico por data. Para limpar dados antigos:

```sql
-- Remover registros de pulseiras de mais de 30 dias
DELETE FROM pulseiras_ativas_dia
WHERE data < CURRENT_DATE - INTERVAL '30 days';
```

### Backup de Dados
```sql
-- Exportar histórico de pulseiras
COPY (SELECT * FROM pulseiras_ativas_dia)
TO '/path/to/backup/pulseiras_historico.csv'
WITH CSV HEADER;
```

## Melhorias Futuras

1. **Dashboard de Pulseiras**: Visualização em tempo real do uso
2. **Alertas**: Notificar quando pulseiras estiverem acabando
3. **Relatórios**: Análise de uso por período
4. **Reserva Temporária**: Permitir reservar pulseiras para eventos
5. **QR Code**: Integrar pulseiras com QR Code para check-in rápido
