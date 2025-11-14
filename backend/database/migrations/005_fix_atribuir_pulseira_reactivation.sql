-- Migration 005: Corrige função atribuir_pulseira para lidar com reativações
-- Problema: Quando uma acompanhante é desativada e reativada no mesmo dia,
-- a função tentava inserir um novo registro, violando a constraint UNIQUE(acompanhante_id, data)

-- ============================================
-- RECRIAR FUNÇÃO atribuir_pulseira
-- ============================================

CREATE OR REPLACE FUNCTION atribuir_pulseira(p_acompanhante_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_numero_pulseira INTEGER;
    v_tipo_acompanhante VARCHAR(20);
    v_pulseira_fixa INTEGER;
    v_registro_existente_id INTEGER;
BEGIN
    -- Buscar informações da acompanhante
    SELECT tipo_acompanhante, numero_pulseira_fixa
    INTO v_tipo_acompanhante, v_pulseira_fixa
    FROM acompanhantes
    WHERE id = p_acompanhante_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acompanhante não encontrada';
    END IF;

    -- Verificar se já tem pulseira ativa hoje (sem devolução)
    SELECT numero_pulseira, id INTO v_numero_pulseira, v_registro_existente_id
    FROM pulseiras_ativas_dia
    WHERE acompanhante_id = p_acompanhante_id
    AND data = CURRENT_DATE
    AND hora_devolucao IS NULL;

    IF FOUND THEN
        RETURN v_numero_pulseira; -- Já tem pulseira ativa
    END IF;

    -- Verificar se existe um registro devolvido hoje (para reutilizar)
    SELECT numero_pulseira, id INTO v_numero_pulseira, v_registro_existente_id
    FROM pulseiras_ativas_dia
    WHERE acompanhante_id = p_acompanhante_id
    AND data = CURRENT_DATE
    AND hora_devolucao IS NOT NULL;

    IF FOUND THEN
        -- Reativar o registro existente (limpar hora_devolucao e atualizar hora_atribuicao)
        UPDATE pulseiras_ativas_dia
        SET hora_devolucao = NULL,
            hora_atribuicao = CURRENT_TIMESTAMP
        WHERE id = v_registro_existente_id;

        -- Atualizar o número da pulseira em acompanhantes_ativas_dia
        UPDATE acompanhantes_ativas_dia
        SET numero_pulseira = v_numero_pulseira
        WHERE acompanhante_id = p_acompanhante_id
        AND data = CURRENT_DATE;

        RETURN v_numero_pulseira;
    END IF;

    -- Se chegou aqui, não existe registro para hoje, então criar um novo

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

    -- Atribuir a pulseira (novo registro)
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

COMMENT ON FUNCTION atribuir_pulseira IS 'Atribui uma pulseira para a acompanhante (fixa usa sua própria, rotativa recebe próxima disponível). Lida com reativações no mesmo dia.';
