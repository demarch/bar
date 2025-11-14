-- Migration 003: Sistema de Pulseiras para Acompanhantes
-- Adiciona gerenciamento de pulseiras numeradas (1-1000) para acompanhantes fixas e rotativas

-- ============================================
-- 1. ADICIONAR CAMPOS À TABELA ACOMPANHANTES
-- ============================================

-- Tipo de acompanhante: fixa ou rotativa
ALTER TABLE acompanhantes
ADD COLUMN tipo_acompanhante VARCHAR(20) DEFAULT 'rotativa'
CHECK (tipo_acompanhante IN ('fixa', 'rotativa'));

-- Número de pulseira fixa (apenas para acompanhantes fixas)
ALTER TABLE acompanhantes
ADD COLUMN numero_pulseira_fixa INTEGER;

-- Adicionar constraint única para pulseira fixa (permitindo NULL)
ALTER TABLE acompanhantes
ADD CONSTRAINT uq_pulseira_fixa UNIQUE (numero_pulseira_fixa);

-- Adicionar constraint de check: se tipo=fixa, deve ter pulseira
ALTER TABLE acompanhantes
ADD CONSTRAINT check_pulseira_fixa
CHECK (
    (tipo_acompanhante = 'fixa' AND numero_pulseira_fixa IS NOT NULL AND numero_pulseira_fixa BETWEEN 1 AND 1000) OR
    (tipo_acompanhante = 'rotativa' AND numero_pulseira_fixa IS NULL)
);

-- Adicionar índice para busca rápida
CREATE INDEX idx_acompanhantes_tipo ON acompanhantes(tipo_acompanhante);
CREATE INDEX idx_acompanhantes_pulseira ON acompanhantes(numero_pulseira_fixa) WHERE numero_pulseira_fixa IS NOT NULL;

-- ============================================
-- 2. CRIAR TABELA DE PULSEIRAS ATIVAS DO DIA
-- ============================================

-- Tabela para rastrear quais pulseiras estão sendo usadas hoje
CREATE TABLE pulseiras_ativas_dia (
    id SERIAL PRIMARY KEY,
    numero_pulseira INTEGER NOT NULL CHECK (numero_pulseira BETWEEN 1 AND 1000),
    acompanhante_id INTEGER NOT NULL REFERENCES acompanhantes(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_atribuicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hora_devolucao TIMESTAMP,
    -- Uma pulseira só pode ser usada por uma pessoa por dia
    UNIQUE(numero_pulseira, data),
    -- Uma acompanhante só pode ter uma pulseira ativa por dia
    UNIQUE(acompanhante_id, data)
);

CREATE INDEX idx_pulseiras_ativas_data ON pulseiras_ativas_dia(data);
CREATE INDEX idx_pulseiras_ativas_numero ON pulseiras_ativas_dia(numero_pulseira, data);
CREATE INDEX idx_pulseiras_ativas_acompanhante ON pulseiras_ativas_dia(acompanhante_id, data);

-- ============================================
-- 3. ATUALIZAR TABELA ACOMPANHANTES_ATIVAS_DIA
-- ============================================

-- Adicionar referência à pulseira ativa
ALTER TABLE acompanhantes_ativas_dia
ADD COLUMN numero_pulseira INTEGER;

-- Adicionar constraint para garantir que o número da pulseira está entre 1-1000
ALTER TABLE acompanhantes_ativas_dia
ADD CONSTRAINT check_numero_pulseira_range
CHECK (numero_pulseira IS NULL OR (numero_pulseira BETWEEN 1 AND 1000));

-- ============================================
-- 4. CRIAR VIEW PARA PULSEIRAS DISPONÍVEIS
-- ============================================

-- View que mostra quais pulseiras estão disponíveis hoje
CREATE OR REPLACE VIEW vw_pulseiras_disponiveis AS
WITH numeros AS (
    SELECT generate_series(1, 1000) AS numero
),
pulseiras_fixas AS (
    -- Pulseiras reservadas para acompanhantes fixas
    SELECT numero_pulseira_fixa as numero
    FROM acompanhantes
    WHERE tipo_acompanhante = 'fixa'
    AND numero_pulseira_fixa IS NOT NULL
),
pulseiras_em_uso_hoje AS (
    -- Pulseiras atualmente em uso hoje
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

-- ============================================
-- 5. CRIAR VIEW PARA PULSEIRAS ATIVAS HOJE
-- ============================================

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

-- ============================================
-- 6. FUNÇÃO PARA ATRIBUIR PULSEIRA
-- ============================================

CREATE OR REPLACE FUNCTION atribuir_pulseira(p_acompanhante_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_numero_pulseira INTEGER;
    v_tipo_acompanhante VARCHAR(20);
    v_pulseira_fixa INTEGER;
BEGIN
    -- Buscar informações da acompanhante
    SELECT tipo_acompanhante, numero_pulseira_fixa
    INTO v_tipo_acompanhante, v_pulseira_fixa
    FROM acompanhantes
    WHERE id = p_acompanhante_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acompanhante não encontrada';
    END IF;

    -- Verificar se já tem pulseira ativa hoje
    SELECT numero_pulseira INTO v_numero_pulseira
    FROM pulseiras_ativas_dia
    WHERE acompanhante_id = p_acompanhante_id
    AND data = CURRENT_DATE
    AND hora_devolucao IS NULL;

    IF FOUND THEN
        RETURN v_numero_pulseira; -- Já tem pulseira
    END IF;

    -- Se for acompanhante fixa, usar a pulseira fixa
    IF v_tipo_acompanhante = 'fixa' THEN
        v_numero_pulseira := v_pulseira_fixa;

        -- Verificar se a pulseira fixa já está em uso
        IF EXISTS (
            SELECT 1 FROM pulseiras_ativas_dia
            WHERE numero_pulseira = v_numero_pulseira
            AND data = CURRENT_DATE
            AND hora_devolucao IS NULL
        ) THEN
            RAISE EXCEPTION 'Pulseira fixa % já está em uso', v_numero_pulseira;
        END IF;
    ELSE
        -- Se for rotativa, buscar próxima pulseira disponível
        SELECT numero INTO v_numero_pulseira
        FROM vw_pulseiras_disponiveis
        WHERE status = 'disponivel'
        ORDER BY numero
        LIMIT 1;

        IF v_numero_pulseira IS NULL THEN
            RAISE EXCEPTION 'Não há pulseiras disponíveis';
        END IF;
    END IF;

    -- Atribuir a pulseira
    INSERT INTO pulseiras_ativas_dia (numero_pulseira, acompanhante_id, data)
    VALUES (v_numero_pulseira, p_acompanhante_id, CURRENT_DATE);

    -- Atualizar o número da pulseira em acompanhantes_ativas_dia
    UPDATE acompanhantes_ativas_dia
    SET numero_pulseira = v_numero_pulseira
    WHERE acompanhante_id = p_acompanhante_id
    AND data = CURRENT_DATE;

    RETURN v_numero_pulseira;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNÇÃO PARA DEVOLVER PULSEIRA
-- ============================================

CREATE OR REPLACE FUNCTION devolver_pulseira(p_acompanhante_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Marcar hora de devolução
    UPDATE pulseiras_ativas_dia
    SET hora_devolucao = CURRENT_TIMESTAMP
    WHERE acompanhante_id = p_acompanhante_id
    AND data = CURRENT_DATE
    AND hora_devolucao IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN acompanhantes.tipo_acompanhante IS 'Tipo de acompanhante: fixa (trabalha regularmente) ou rotativa (ocasional)';
COMMENT ON COLUMN acompanhantes.numero_pulseira_fixa IS 'Número da pulseira fixa (1-1000) para acompanhantes fixas';
COMMENT ON TABLE pulseiras_ativas_dia IS 'Registro de pulseiras atribuídas às acompanhantes por dia';
COMMENT ON VIEW vw_pulseiras_disponiveis IS 'Mostra status de todas as pulseiras (1-1000): disponível, reservada_fixa ou em_uso';
COMMENT ON VIEW vw_pulseiras_ativas_hoje IS 'Lista todas as pulseiras em uso hoje com informações das acompanhantes';
COMMENT ON FUNCTION atribuir_pulseira IS 'Atribui uma pulseira para a acompanhante (fixa usa sua própria, rotativa recebe próxima disponível)';
COMMENT ON FUNCTION devolver_pulseira IS 'Marca a pulseira como devolvida ao final do dia';
