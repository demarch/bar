-- Aplicar migração de comissão fixa
-- Execute este arquivo com: psql -U admin -d bar_system -f apply-migration-simple.sql

-- Início da transação
BEGIN;

-- Adicionar coluna comissao_fixa se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'produtos' AND column_name = 'comissao_fixa'
    ) THEN
        ALTER TABLE produtos ADD COLUMN comissao_fixa DECIMAL(10,2) DEFAULT NULL;
        RAISE NOTICE 'Coluna comissao_fixa adicionada';
    ELSE
        RAISE NOTICE 'Coluna comissao_fixa já existe';
    END IF;
END $$;

-- Criar produto Drink Comissionado se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM produtos WHERE nome = 'Drink Comissionado'
    ) THEN
        INSERT INTO produtos (nome, categoria_id, preco, tipo, comissao_fixa, ativo)
        VALUES ('Drink Comissionado', 6, 50.00, 'comissionado', 20.00, true);
        RAISE NOTICE 'Produto Drink Comissionado criado';
    ELSE
        RAISE NOTICE 'Produto Drink Comissionado já existe';
    END IF;
END $$;

COMMIT;

-- Mostrar produtos comissionados
\echo ''
\echo '===== PRODUTOS COMISSIONADOS ====='
SELECT
    nome,
    'R$ ' || preco::TEXT as preco,
    CASE
        WHEN comissao_fixa IS NOT NULL THEN 'Fixa: R$ ' || comissao_fixa::TEXT
        WHEN comissao_percentual IS NOT NULL THEN 'Percentual: ' || comissao_percentual::TEXT || '%'
        ELSE 'Sem comissão'
    END as comissao
FROM produtos
WHERE tipo = 'comissionado' AND ativo = true
ORDER BY nome;
