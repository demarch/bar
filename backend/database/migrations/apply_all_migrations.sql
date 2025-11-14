-- ============================================
-- SCRIPT DE MIGRAÇÃO CONSOLIDADO
-- Data: 2025-11-14
-- Descrição: Aplica todas as migrações do sistema
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

-- Migration 003: Sistema de Pulseiras para Acompanhantes
DO $$
BEGIN
    -- Adicionar tipo_acompanhante se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'acompanhantes' AND column_name = 'tipo_acompanhante'
    ) THEN
        ALTER TABLE acompanhantes
        ADD COLUMN tipo_acompanhante VARCHAR(20) DEFAULT 'rotativa'
        CHECK (tipo_acompanhante IN ('fixa', 'rotativa'));
        RAISE NOTICE 'Campo tipo_acompanhante adicionado à tabela acompanhantes';
    END IF;

    -- Adicionar numero_pulseira_fixa se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'acompanhantes' AND column_name = 'numero_pulseira_fixa'
    ) THEN
        ALTER TABLE acompanhantes ADD COLUMN numero_pulseira_fixa INTEGER;
        RAISE NOTICE 'Campo numero_pulseira_fixa adicionado à tabela acompanhantes';
    END IF;

    -- Adicionar constraints se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'acompanhantes' AND constraint_name = 'uq_pulseira_fixa'
    ) THEN
        ALTER TABLE acompanhantes ADD CONSTRAINT uq_pulseira_fixa UNIQUE (numero_pulseira_fixa);
        RAISE NOTICE 'Constraint uq_pulseira_fixa adicionada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'acompanhantes' AND constraint_name = 'check_pulseira_fixa'
    ) THEN
        ALTER TABLE acompanhantes
        ADD CONSTRAINT check_pulseira_fixa
        CHECK (
            (tipo_acompanhante = 'fixa' AND numero_pulseira_fixa IS NOT NULL AND numero_pulseira_fixa BETWEEN 1 AND 1000) OR
            (tipo_acompanhante = 'rotativa' AND numero_pulseira_fixa IS NULL)
        );
        RAISE NOTICE 'Constraint check_pulseira_fixa adicionada';
    END IF;

    -- Criar tabela pulseiras_ativas_dia se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pulseiras_ativas_dia') THEN
        CREATE TABLE pulseiras_ativas_dia (
            id SERIAL PRIMARY KEY,
            numero_pulseira INTEGER NOT NULL CHECK (numero_pulseira BETWEEN 1 AND 1000),
            acompanhante_id INTEGER NOT NULL REFERENCES acompanhantes(id) ON DELETE CASCADE,
            data DATE NOT NULL DEFAULT CURRENT_DATE,
            hora_atribuicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            hora_devolucao TIMESTAMP,
            UNIQUE(numero_pulseira, data),
            UNIQUE(acompanhante_id, data)
        );
        RAISE NOTICE 'Tabela pulseiras_ativas_dia criada';
    END IF;

    -- Adicionar numero_pulseira à acompanhantes_ativas_dia se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'acompanhantes_ativas_dia' AND column_name = 'numero_pulseira'
    ) THEN
        ALTER TABLE acompanhantes_ativas_dia ADD COLUMN numero_pulseira INTEGER;
        ALTER TABLE acompanhantes_ativas_dia
        ADD CONSTRAINT check_numero_pulseira_range
        CHECK (numero_pulseira IS NULL OR (numero_pulseira BETWEEN 1 AND 1000));
        RAISE NOTICE 'Campo numero_pulseira adicionado à tabela acompanhantes_ativas_dia';
    END IF;

    -- Criar views e funções
    RAISE NOTICE 'Criando views e funções do sistema de pulseiras...';
END $$;

-- View para pulseiras disponíveis
CREATE OR REPLACE VIEW vw_pulseiras_disponiveis AS
WITH numeros AS (
    SELECT generate_series(1, 1000) AS numero
),
pulseiras_fixas AS (
    SELECT numero_pulseira_fixa as numero
    FROM acompanhantes
    WHERE tipo_acompanhante = 'fixa'
    AND numero_pulseira_fixa IS NOT NULL
),
pulseiras_em_uso_hoje AS (
    SELECT numero_pulseira
    FROM pulseiras_ativas_dia
    WHERE data = CURRENT_DATE
    AND hora_devolucao IS NULL
)
SELECT
    n.numero,
    CASE
        WHEN pf.numero IS NOT NULL THEN 'reservada_fixa'
        WHEN pu.numero_pulseira IS NOT NULL THEN 'em_uso'
        ELSE 'disponivel'
    END as status,
    a.id as acompanhante_id,
    a.nome as acompanhante_nome
FROM numeros n
LEFT JOIN pulseiras_fixas pf ON n.numero = pf.numero
LEFT JOIN pulseiras_em_uso_hoje pu ON n.numero = pu.numero_pulseira
LEFT JOIN acompanhantes a ON a.numero_pulseira_fixa = n.numero AND a.tipo_acompanhante = 'fixa'
ORDER BY n.numero;

-- View para pulseiras ativas hoje
CREATE OR REPLACE VIEW vw_pulseiras_ativas_hoje AS
SELECT
    pad.numero_pulseira,
    a.id as acompanhante_id,
    a.nome as acompanhante_nome,
    a.apelido as acompanhante_apelido,
    a.tipo_acompanhante,
    pad.hora_atribuicao,
    aad.hora_ativacao
FROM pulseiras_ativas_dia pad
JOIN acompanhantes a ON a.id = pad.acompanhante_id
LEFT JOIN acompanhantes_ativas_dia aad ON aad.acompanhante_id = a.id AND aad.data = pad.data
WHERE pad.data = CURRENT_DATE
AND pad.hora_devolucao IS NULL
ORDER BY pad.numero_pulseira;

-- Função para atribuir pulseira
CREATE OR REPLACE FUNCTION atribuir_pulseira(p_acompanhante_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_numero_pulseira INTEGER;
    v_tipo_acompanhante VARCHAR(20);
    v_pulseira_fixa INTEGER;
BEGIN
    SELECT tipo_acompanhante, numero_pulseira_fixa
    INTO v_tipo_acompanhante, v_pulseira_fixa
    FROM acompanhantes
    WHERE id = p_acompanhante_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acompanhante não encontrada';
    END IF;

    SELECT numero_pulseira INTO v_numero_pulseira
    FROM pulseiras_ativas_dia
    WHERE acompanhante_id = p_acompanhante_id
    AND data = CURRENT_DATE
    AND hora_devolucao IS NULL;

    IF FOUND THEN
        RETURN v_numero_pulseira;
    END IF;

    IF v_tipo_acompanhante = 'fixa' THEN
        v_numero_pulseira := v_pulseira_fixa;
        IF EXISTS (
            SELECT 1 FROM pulseiras_ativas_dia
            WHERE numero_pulseira = v_numero_pulseira
            AND data = CURRENT_DATE
            AND hora_devolucao IS NULL
        ) THEN
            RAISE EXCEPTION 'Pulseira fixa % já está em uso', v_numero_pulseira;
        END IF;
    ELSE
        SELECT numero INTO v_numero_pulseira
        FROM vw_pulseiras_disponiveis
        WHERE status = 'disponivel'
        ORDER BY numero
        LIMIT 1;

        IF v_numero_pulseira IS NULL THEN
            RAISE EXCEPTION 'Não há pulseiras disponíveis';
        END IF;
    END IF;

    INSERT INTO pulseiras_ativas_dia (numero_pulseira, acompanhante_id, data)
    VALUES (v_numero_pulseira, p_acompanhante_id, CURRENT_DATE);

    UPDATE acompanhantes_ativas_dia
    SET numero_pulseira = v_numero_pulseira
    WHERE acompanhante_id = p_acompanhante_id
    AND data = CURRENT_DATE;

    RETURN v_numero_pulseira;
END;
$$ LANGUAGE plpgsql;

-- Função para devolver pulseira
CREATE OR REPLACE FUNCTION devolver_pulseira(p_acompanhante_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE pulseiras_ativas_dia
    SET hora_devolucao = CURRENT_TIMESTAMP
    WHERE acompanhante_id = p_acompanhante_id
    AND data = CURRENT_DATE
    AND hora_devolucao IS NULL;
END;
$$ LANGUAGE plpgsql;

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
