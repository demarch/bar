-- ============================================
-- SCRIPT DE MIGRAÇÃO CONSOLIDADO
-- Data: 2025-11-14
-- Descrição: Aplica todas as migrações relacionadas a comissão fixa
-- ============================================

-- Executar as migrações em ordem
BEGIN;

-- Migration 001: Add comissao_fixa field to produtos table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'produtos' AND column_name = 'comissao_fixa'
    ) THEN
        ALTER TABLE produtos ADD COLUMN comissao_fixa DECIMAL(10,2) DEFAULT NULL;
        COMMENT ON COLUMN produtos.comissao_fixa IS 'Valor fixo de comissão em reais. Quando definido, sobrescreve o cálculo percentual baseado na acompanhante.';
        RAISE NOTICE 'Campo comissao_fixa adicionado à tabela produtos';
    ELSE
        RAISE NOTICE 'Campo comissao_fixa já existe na tabela produtos';
    END IF;
END $$;

-- Migration 002: Add 'Drink Comissionado' product
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM produtos WHERE nome = 'Drink Comissionado'
    ) THEN
        INSERT INTO produtos (nome, categoria_id, preco, tipo, comissao_fixa, ativo)
        VALUES ('Drink Comissionado', 6, 50.00, 'comissionado', 20.00, true);
        RAISE NOTICE 'Produto "Drink Comissionado" criado com sucesso';
    ELSE
        RAISE NOTICE 'Produto "Drink Comissionado" já existe';
    END IF;
END $$;

COMMIT;

-- Verificar as alterações
SELECT
    nome,
    preco,
    tipo,
    comissao_percentual,
    comissao_fixa,
    CASE
        WHEN comissao_fixa IS NOT NULL THEN 'Comissão Fixa: R$ ' || comissao_fixa::TEXT
        WHEN comissao_percentual IS NOT NULL THEN 'Comissão Percentual: ' || comissao_percentual::TEXT || '%'
        ELSE 'Sem comissão'
    END as tipo_comissao
FROM produtos
WHERE tipo = 'comissionado' AND ativo = true
ORDER BY nome;
