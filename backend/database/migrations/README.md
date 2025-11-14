# Migrações de Banco de Dados

## Visão Geral

Este diretório contém as migrações SQL para o sistema de gerenciamento de bar.

## Migrações Disponíveis

### 001 - Adicionar Campo `comissao_fixa`
**Arquivo:** `001_add_comissao_fixa_to_produtos.sql`

Adiciona suporte para comissões fixas em produtos. Permite definir um valor fixo em reais para a comissão, ao invés de usar o percentual da acompanhante.

**Campos adicionados:**
- `produtos.comissao_fixa` (DECIMAL(10,2)): Valor fixo de comissão em reais

### 002 - Criar Produto "Drink Comissionado"
**Arquivo:** `002_add_drink_comissionado_produto.sql`

Cria o produto "Drink Comissionado" com as seguintes características:
- **Preço:** R$ 50,00
- **Comissão Fixa:** R$ 20,00 (acompanhante)
- **Lucro do Bar:** R$ 30,00
- **Categoria:** Comissionados (ID: 6)

## Como Aplicar as Migrações

### Opção 1: Script Consolidado (Recomendado)
Execute o script que aplica todas as migrações de uma vez:

```bash
psql -U seu_usuario -d nome_do_banco -f apply_all_migrations.sql
```

### Opção 2: Migrações Individuais
Execute cada migração individualmente, em ordem:

```bash
psql -U seu_usuario -d nome_do_banco -f 001_add_comissao_fixa_to_produtos.sql
psql -U seu_usuario -d nome_do_banco -f 002_add_drink_comissionado_produto.sql
```

### Opção 3: Banco de Dados Novo
Para novos bancos de dados, execute o script `init.sql` que já inclui todas as alterações:

```bash
psql -U seu_usuario -d nome_do_banco -f ../init.sql
```

## Como Funciona a Comissão Fixa

### Lógica de Cálculo

Quando um produto comissionado é adicionado a uma comanda:

1. **Se `comissao_fixa` está definida:**
   - Comissão = `comissao_fixa * quantidade`
   - Ignora o percentual da acompanhante

2. **Se `comissao_fixa` é NULL:**
   - Comissão = `(valor_total * percentual_acompanhante) / 100`
   - Usa o percentual configurado na acompanhante

### Exemplo Prático

**Produto: Drink Comissionado**
- Preço: R$ 50,00
- Comissão Fixa: R$ 20,00

**Venda de 1 unidade:**
- Cliente paga: R$ 50,00
- Acompanhante recebe: R$ 20,00
- Bar recebe: R$ 30,00

**Venda de 3 unidades:**
- Cliente paga: R$ 150,00
- Acompanhante recebe: R$ 60,00 (R$ 20 × 3)
- Bar recebe: R$ 90,00

## Uso no PDV

O produto "Drink Comissionado" aparecerá na categoria "Comissionados" no PDV. Para vendê-lo:

1. Abrir uma comanda
2. Selecionar o produto "Drink Comissionado"
3. Selecionar a acompanhante
4. Definir a quantidade
5. Adicionar à comanda

A comissão de R$ 20,00 por unidade será automaticamente creditada à acompanhante selecionada.

## Verificação

Para verificar os produtos com comissão fixa:

```sql
SELECT
    nome,
    preco,
    comissao_fixa,
    comissao_percentual
FROM produtos
WHERE tipo = 'comissionado' AND ativo = true;
```

## Notas Importantes

- A comissão fixa tem prioridade sobre o percentual da acompanhante
- Produtos com comissão fixa ainda requerem uma acompanhante selecionada
- A comissão fixa é multiplicada pela quantidade vendida
- O campo `comissao_fixa` pode ser NULL (usa percentual) ou um valor em reais
