-- Migration 004: Controle de Pagamento de Comissões
-- Adiciona capacidade de múltiplos ciclos de ativação e controle de pagamento por período

-- ============================================
-- 1. MODIFICAR TABELA ACOMPANHANTES_ATIVAS_DIA
-- ============================================

-- Remover constraint de único por dia (permitir múltiplas ativações no mesmo dia)
ALTER TABLE acompanhantes_ativas_dia
DROP CONSTRAINT IF EXISTS acompanhantes_ativas_dia_acompanhante_id_data_key;

-- Adicionar novos campos
ALTER TABLE acompanhantes_ativas_dia
ADD COLUMN IF NOT EXISTS hora_desativacao TIMESTAMP,
ADD COLUMN IF NOT EXISTS status_periodo VARCHAR(20) DEFAULT 'ativa'
  CHECK (status_periodo IN ('ativa', 'encerrada_pendente', 'encerrada_paga')),
ADD COLUMN IF NOT EXISTS valor_comissoes_periodo DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP,
ADD COLUMN IF NOT EXISTS observacoes_pagamento TEXT;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_acompanhantes_ativas_status
  ON acompanhantes_ativas_dia(status_periodo);
CREATE INDEX IF NOT EXISTS idx_acompanhantes_ativas_data_status
  ON acompanhantes_ativas_dia(data, status_periodo);

-- ============================================
-- 2. CRIAR VIEW DE ACOMPANHANTES PRESENTES HOJE
-- ============================================

CREATE OR REPLACE VIEW vw_acompanhantes_presentes_hoje AS
SELECT
    a.id as acompanhante_id,
    a.nome,
    a.apelido,
    a.tipo_acompanhante,
    a.numero_pulseira_fixa,
    a.percentual_comissao,

    -- Pulseira atual (se estiver ativa)
    pad.numero_pulseira,

    -- Período atual ativo
    aad_atual.id as periodo_ativo_id,
    aad_atual.hora_ativacao as hora_ativacao_atual,
    aad_atual.status_periodo as status_atual,

    -- Estatísticas do dia
    COUNT(aad_todos.id) as total_ativacoes_dia,
    COUNT(CASE WHEN aad_todos.status_periodo = 'ativa' THEN 1 END) as periodos_ativos,
    COUNT(CASE WHEN aad_todos.status_periodo = 'encerrada_pendente' THEN 1 END) as periodos_pendentes,
    COUNT(CASE WHEN aad_todos.status_periodo = 'encerrada_paga' THEN 1 END) as periodos_pagos,

    -- Comissões do dia
    COALESCE(SUM(CASE WHEN aad_todos.status_periodo = 'ativa' THEN aad_todos.valor_comissoes_periodo END), 0) as comissoes_periodo_atual,
    COALESCE(SUM(CASE WHEN aad_todos.status_periodo = 'encerrada_pendente' THEN aad_todos.valor_comissoes_periodo END), 0) as comissoes_pendentes,
    COALESCE(SUM(CASE WHEN aad_todos.status_periodo = 'encerrada_paga' THEN aad_todos.valor_comissoes_periodo END), 0) as comissoes_pagas,
    COALESCE(SUM(aad_todos.valor_comissoes_periodo), 0) as comissoes_total_dia

FROM acompanhantes a

-- Todos os períodos do dia
LEFT JOIN acompanhantes_ativas_dia aad_todos
  ON aad_todos.acompanhante_id = a.id
  AND aad_todos.data = CURRENT_DATE

-- Período atualmente ativo (se houver)
LEFT JOIN acompanhantes_ativas_dia aad_atual
  ON aad_atual.acompanhante_id = a.id
  AND aad_atual.data = CURRENT_DATE
  AND aad_atual.status_periodo = 'ativa'

-- Pulseira ativa (se estiver presente)
LEFT JOIN pulseiras_ativas_dia pad
  ON pad.acompanhante_id = a.id
  AND pad.data = CURRENT_DATE
  AND pad.hora_devolucao IS NULL

WHERE
  -- Mostrar apenas acompanhantes que tiveram pelo menos uma ativação hoje
  aad_todos.id IS NOT NULL

GROUP BY
  a.id, a.nome, a.apelido, a.tipo_acompanhante, a.numero_pulseira_fixa,
  a.percentual_comissao, pad.numero_pulseira,
  aad_atual.id, aad_atual.hora_ativacao, aad_atual.status_periodo

ORDER BY
  -- Ativas primeiro, depois pendentes, depois pagas
  CASE
    WHEN aad_atual.status_periodo = 'ativa' THEN 1
    WHEN periodos_pendentes > 0 THEN 2
    ELSE 3
  END,
  a.nome;

-- ============================================
-- 3. CRIAR VIEW DE HISTÓRICO DE ATIVAÇÕES DO DIA
-- ============================================

CREATE OR REPLACE VIEW vw_historico_ativacoes_dia AS
SELECT
    aad.id,
    aad.acompanhante_id,
    a.nome as acompanhante_nome,
    a.apelido as acompanhante_apelido,
    a.tipo_acompanhante,
    aad.data,
    aad.numero_pulseira,
    aad.hora_ativacao,
    aad.hora_desativacao,
    aad.status_periodo,
    aad.valor_comissoes_periodo,
    aad.data_pagamento,
    aad.observacoes_pagamento,

    -- Duração do período (em minutos)
    CASE
      WHEN aad.hora_desativacao IS NOT NULL THEN
        EXTRACT(EPOCH FROM (aad.hora_desativacao - aad.hora_ativacao)) / 60
      ELSE
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - aad.hora_ativacao)) / 60
    END as duracao_minutos,

    -- Total de itens comissionados no período
    (
      SELECT COUNT(*)
      FROM itens_comanda ic
      JOIN comandas c ON c.id = ic.comanda_id
      WHERE ic.acompanhante_id = aad.acompanhante_id
        AND ic.valor_comissao > 0
        AND ic.cancelado = false
        AND ic.created_at >= aad.hora_ativacao
        AND (aad.hora_desativacao IS NULL OR ic.created_at <= aad.hora_desativacao)
    ) as total_itens_comissionados

FROM acompanhantes_ativas_dia aad
JOIN acompanhantes a ON a.id = aad.acompanhante_id
WHERE aad.data = CURRENT_DATE
ORDER BY aad.hora_ativacao DESC;

-- ============================================
-- 4. FUNÇÃO PARA ENCERRAR PERÍODO E CALCULAR COMISSÕES
-- ============================================

CREATE OR REPLACE FUNCTION encerrar_periodo_acompanhante(
    p_periodo_id INTEGER,
    p_marcar_como_paga BOOLEAN DEFAULT false
)
RETURNS TABLE(
    periodo_id INTEGER,
    valor_comissoes DECIMAL,
    total_itens INTEGER,
    status VARCHAR
) AS $$
DECLARE
    v_acompanhante_id INTEGER;
    v_hora_ativacao TIMESTAMP;
    v_valor_comissoes DECIMAL;
    v_total_itens INTEGER;
    v_novo_status VARCHAR(20);
BEGIN
    -- Buscar informações do período
    SELECT
        acompanhante_id,
        hora_ativacao
    INTO
        v_acompanhante_id,
        v_hora_ativacao
    FROM acompanhantes_ativas_dia
    WHERE id = p_periodo_id AND status_periodo = 'ativa';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Período não encontrado ou já encerrado';
    END IF;

    -- Calcular comissões do período
    SELECT
        COALESCE(SUM(ic.valor_comissao), 0),
        COUNT(*)
    INTO
        v_valor_comissoes,
        v_total_itens
    FROM itens_comanda ic
    JOIN comandas c ON c.id = ic.comanda_id
    WHERE ic.acompanhante_id = v_acompanhante_id
      AND ic.valor_comissao > 0
      AND ic.cancelado = false
      AND ic.created_at >= v_hora_ativacao
      AND ic.created_at <= CURRENT_TIMESTAMP;

    -- Determinar status
    v_novo_status := CASE
        WHEN p_marcar_como_paga THEN 'encerrada_paga'
        ELSE 'encerrada_pendente'
    END;

    -- Atualizar período
    UPDATE acompanhantes_ativas_dia
    SET
        hora_desativacao = CURRENT_TIMESTAMP,
        status_periodo = v_novo_status,
        valor_comissoes_periodo = v_valor_comissoes,
        data_pagamento = CASE WHEN p_marcar_como_paga THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE id = p_periodo_id;

    -- Devolver pulseira
    PERFORM devolver_pulseira(v_acompanhante_id);

    -- Retornar resultados
    RETURN QUERY SELECT
        p_periodo_id,
        v_valor_comissoes,
        v_total_itens,
        v_novo_status;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. FUNÇÃO PARA MARCAR COMISSÕES COMO PAGAS
-- ============================================

CREATE OR REPLACE FUNCTION marcar_comissoes_pagas(
    p_periodo_id INTEGER,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE acompanhantes_ativas_dia
    SET
        status_periodo = 'encerrada_paga',
        data_pagamento = CURRENT_TIMESTAMP,
        observacoes_pagamento = p_observacoes
    WHERE id = p_periodo_id
      AND status_periodo = 'encerrada_pendente';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Período não encontrado ou não está pendente de pagamento';
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN acompanhantes_ativas_dia.hora_desativacao IS 'Hora que a acompanhante foi desativada (devolveu pulseira)';
COMMENT ON COLUMN acompanhantes_ativas_dia.status_periodo IS 'Status do período: ativa, encerrada_pendente, encerrada_paga';
COMMENT ON COLUMN acompanhantes_ativas_dia.valor_comissoes_periodo IS 'Valor total de comissões geradas neste período';
COMMENT ON COLUMN acompanhantes_ativas_dia.data_pagamento IS 'Data e hora que as comissões foram pagas';
COMMENT ON COLUMN acompanhantes_ativas_dia.observacoes_pagamento IS 'Observações sobre o pagamento';

COMMENT ON VIEW vw_acompanhantes_presentes_hoje IS 'Lista acompanhantes presentes hoje com status de comissões';
COMMENT ON VIEW vw_historico_ativacoes_dia IS 'Histórico detalhado de todas as ativações do dia';

COMMENT ON FUNCTION encerrar_periodo_acompanhante IS 'Encerra período ativo, calcula comissões e opcionalmente marca como paga';
COMMENT ON FUNCTION marcar_comissoes_pagas IS 'Marca comissões de um período pendente como pagas';
