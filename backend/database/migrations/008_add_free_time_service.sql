-- Migration 008: Adiciona suporte para Serviço de Tempo Livre
-- Permite que o atendente inicie um serviço de quarto sem tempo pré-definido
-- O sistema calcula automaticamente o valor quando o serviço é finalizado
-- com base no tempo decorrido e tolerância de 10 minutos

-- ============================================
-- ADICIONAR COLUNAS EM ITENS_COMANDA
-- ============================================

-- Flag para indicar se é um serviço de tempo livre
ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS tempo_livre BOOLEAN DEFAULT false;

-- Horário de saída/finalização do serviço (para tempo livre)
ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS hora_saida TIMESTAMP;

-- Valor sugerido pelo sistema (calculado automaticamente)
ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS valor_sugerido DECIMAL(10,2);

-- Status do serviço de tempo livre
-- 'em_andamento': serviço iniciado, aguardando finalização
-- 'aguardando_confirmacao': sistema calculou o valor, aguardando confirmação do atendente
-- 'finalizado': atendente confirmou o valor final
ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS status_tempo_livre VARCHAR(30) DEFAULT NULL
CHECK (status_tempo_livre IS NULL OR status_tempo_livre IN ('em_andamento', 'aguardando_confirmacao', 'finalizado'));

-- Minutos totais calculados
ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS minutos_utilizados INTEGER;

COMMENT ON COLUMN itens_comanda.tempo_livre IS 'Indica se é um serviço de quarto com tempo livre (sem tempo pré-definido)';
COMMENT ON COLUMN itens_comanda.hora_saida IS 'Horário de finalização do serviço de quarto (timezone: America/Sao_Paulo)';
COMMENT ON COLUMN itens_comanda.valor_sugerido IS 'Valor sugerido pelo sistema baseado no tempo decorrido';
COMMENT ON COLUMN itens_comanda.status_tempo_livre IS 'Status do serviço de tempo livre: em_andamento, aguardando_confirmacao, finalizado';
COMMENT ON COLUMN itens_comanda.minutos_utilizados IS 'Total de minutos utilizados no serviço de tempo livre';

-- ============================================
-- INDEX PARA BUSCA DE SERVIÇOS EM ANDAMENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_itens_comanda_tempo_livre
ON itens_comanda(tempo_livre, status_tempo_livre)
WHERE tempo_livre = true;

-- ============================================
-- FUNÇÃO PARA CALCULAR VALOR DO TEMPO LIVRE
-- ============================================

-- Função que calcula o valor baseado nos minutos e configurações existentes
-- Aplica tolerância de 10 minutos para cada faixa de preço
CREATE OR REPLACE FUNCTION calcular_valor_tempo_livre(minutos_decorridos INTEGER)
RETURNS TABLE(
    configuracao_id INTEGER,
    descricao VARCHAR(50),
    minutos_configuracao INTEGER,
    valor DECIMAL(10,2)
) AS $$
DECLARE
    tolerancia INTEGER := 10;
    minutos_ajustados INTEGER;
BEGIN
    -- Busca a configuração adequada considerando a tolerância de 10 minutos
    -- Exemplo: 41 min -> 60 min (1 hora), 31 min -> 60 min, 30 min -> 30 min
    -- A tolerância funciona assim:
    -- Se passou de 30 min + 10 min (tolerância) = 40 min, cobra 1 hora
    -- Se passou de 60 min + 10 min = 70 min, cobra 1h30

    RETURN QUERY
    SELECT
        cq.id,
        cq.descricao,
        cq.minutos,
        cq.valor
    FROM configuracao_quartos cq
    WHERE cq.ativo = true
    AND cq.minutos >= (
        -- Encontra a menor faixa que cobre o tempo decorrido
        -- considerando que a tolerância é de 10 minutos APÓS cada faixa
        SELECT COALESCE(
            (
                SELECT MIN(cq2.minutos)
                FROM configuracao_quartos cq2
                WHERE cq2.ativo = true
                AND minutos_decorridos <= (cq2.minutos + tolerancia)
            ),
            (
                -- Se excedeu todas as faixas + tolerância, pega a maior faixa
                SELECT MAX(cq3.minutos)
                FROM configuracao_quartos cq3
                WHERE cq3.ativo = true
            )
        )
    )
    ORDER BY cq.minutos ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_valor_tempo_livre(INTEGER) IS
'Calcula o valor do serviço de tempo livre baseado nos minutos decorridos.
Aplica tolerância de 10 minutos para cada faixa de preço.
Exemplo: 41 min cobra preço de 1 hora, 31 min cobra 1 hora, 30 min cobra 30 min.';

-- ============================================
-- VIEW PARA SERVIÇOS DE TEMPO LIVRE EM ANDAMENTO
-- ============================================

CREATE OR REPLACE VIEW vw_servicos_tempo_livre_andamento AS
SELECT
    ic.id as item_id,
    ic.comanda_id,
    c.numero as comanda_numero,
    ic.numero_quarto,
    ic.hora_entrada,
    ic.status_tempo_livre,
    EXTRACT(EPOCH FROM (get_brasilia_time() - ic.hora_entrada))/60 as minutos_decorridos,
    (
        SELECT json_agg(json_build_object(
            'id', a.id,
            'nome', a.nome,
            'apelido', a.apelido
        ))
        FROM servico_quarto_acompanhantes sqa
        JOIN acompanhantes a ON a.id = sqa.acompanhante_id
        WHERE sqa.item_comanda_id = ic.id
    ) as acompanhantes
FROM itens_comanda ic
JOIN comandas c ON c.id = ic.comanda_id
WHERE ic.tipo_item = 'quarto'
  AND ic.tempo_livre = true
  AND ic.status_tempo_livre = 'em_andamento'
  AND ic.cancelado = false
  AND c.status = 'aberta'
ORDER BY ic.hora_entrada ASC;

COMMENT ON VIEW vw_servicos_tempo_livre_andamento IS 'Lista de serviços de quarto com tempo livre em andamento';

-- ============================================
-- CONCLUÍDO
-- ============================================
