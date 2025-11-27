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

-- Função para atribuir pulseira (Migration 005: Corrigida para lidar com reativações)
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

-- Migration 004: Controle de Pagamento de Comissões
DO $$
BEGIN
    -- Remover constraint única se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'acompanhantes_ativas_dia'
        AND constraint_name = 'acompanhantes_ativas_dia_acompanhante_id_data_key'
    ) THEN
        ALTER TABLE acompanhantes_ativas_dia
        DROP CONSTRAINT acompanhantes_ativas_dia_acompanhante_id_data_key;
        RAISE NOTICE 'Constraint única removida - permitindo múltiplas ativações por dia';
    END IF;

    -- Adicionar novos campos se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'acompanhantes_ativas_dia' AND column_name = 'hora_desativacao'
    ) THEN
        ALTER TABLE acompanhantes_ativas_dia
        ADD COLUMN hora_desativacao TIMESTAMP,
        ADD COLUMN status_periodo VARCHAR(20) DEFAULT 'ativa'
          CHECK (status_periodo IN ('ativa', 'encerrada_pendente', 'encerrada_paga')),
        ADD COLUMN valor_comissoes_periodo DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN data_pagamento TIMESTAMP,
        ADD COLUMN observacoes_pagamento TEXT;
        RAISE NOTICE 'Campos de controle de pagamento adicionados';
    END IF;

    -- Criar índices
    RAISE NOTICE 'Criando índices de performance...';
END $$;

CREATE INDEX IF NOT EXISTS idx_acompanhantes_ativas_status
  ON acompanhantes_ativas_dia(status_periodo);
CREATE INDEX IF NOT EXISTS idx_acompanhantes_ativas_data_status
  ON acompanhantes_ativas_dia(data, status_periodo);

-- View de acompanhantes presentes hoje
CREATE OR REPLACE VIEW vw_acompanhantes_presentes_hoje AS
SELECT
    a.id as acompanhante_id,
    a.nome,
    a.apelido,
    a.tipo_acompanhante,
    a.numero_pulseira_fixa,
    a.percentual_comissao,
    pad.numero_pulseira,
    aad_atual.id as periodo_ativo_id,
    aad_atual.hora_ativacao as hora_ativacao_atual,
    aad_atual.status_periodo as status_atual,
    COUNT(aad_todos.id) as total_ativacoes_dia,
    COUNT(CASE WHEN aad_todos.status_periodo = 'ativa' THEN 1 END) as periodos_ativos,
    COUNT(CASE WHEN aad_todos.status_periodo = 'encerrada_pendente' THEN 1 END) as periodos_pendentes,
    COUNT(CASE WHEN aad_todos.status_periodo = 'encerrada_paga' THEN 1 END) as periodos_pagos,
    COALESCE(SUM(CASE WHEN aad_todos.status_periodo = 'ativa' THEN aad_todos.valor_comissoes_periodo END), 0) as comissoes_periodo_atual,
    COALESCE(SUM(CASE WHEN aad_todos.status_periodo = 'encerrada_pendente' THEN aad_todos.valor_comissoes_periodo END), 0) as comissoes_pendentes,
    COALESCE(SUM(CASE WHEN aad_todos.status_periodo = 'encerrada_paga' THEN aad_todos.valor_comissoes_periodo END), 0) as comissoes_pagas,
    COALESCE(SUM(aad_todos.valor_comissoes_periodo), 0) as comissoes_total_dia
FROM acompanhantes a
LEFT JOIN acompanhantes_ativas_dia aad_todos
  ON aad_todos.acompanhante_id = a.id AND aad_todos.data = CURRENT_DATE
LEFT JOIN acompanhantes_ativas_dia aad_atual
  ON aad_atual.acompanhante_id = a.id AND aad_atual.data = CURRENT_DATE AND aad_atual.status_periodo = 'ativa'
LEFT JOIN pulseiras_ativas_dia pad
  ON pad.acompanhante_id = a.id AND pad.data = CURRENT_DATE AND pad.hora_devolucao IS NULL
WHERE aad_todos.id IS NOT NULL
GROUP BY a.id, a.nome, a.apelido, a.tipo_acompanhante, a.numero_pulseira_fixa,
  a.percentual_comissao, pad.numero_pulseira, aad_atual.id, aad_atual.hora_ativacao, aad_atual.status_periodo
ORDER BY CASE WHEN aad_atual.status_periodo = 'ativa' THEN 1
  WHEN COUNT(CASE WHEN aad_todos.status_periodo = 'encerrada_pendente' THEN 1 END) > 0 THEN 2 ELSE 3 END, a.nome;

-- View de histórico de ativações
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
    CASE
      WHEN aad.hora_desativacao IS NOT NULL THEN
        EXTRACT(EPOCH FROM (aad.hora_desativacao - aad.hora_ativacao)) / 60
      ELSE
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - aad.hora_ativacao)) / 60
    END as duracao_minutos
FROM acompanhantes_ativas_dia aad
JOIN acompanhantes a ON a.id = aad.acompanhante_id
WHERE aad.data = CURRENT_DATE
ORDER BY aad.hora_ativacao DESC;

-- Função para encerrar período
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
    SELECT acompanhante_id, hora_ativacao
    INTO v_acompanhante_id, v_hora_ativacao
    FROM acompanhantes_ativas_dia
    WHERE id = p_periodo_id AND status_periodo = 'ativa';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Período não encontrado ou já encerrado';
    END IF;

    SELECT COALESCE(SUM(ic.valor_comissao), 0), COUNT(*)
    INTO v_valor_comissoes, v_total_itens
    FROM itens_comanda ic
    JOIN comandas c ON c.id = ic.comanda_id
    WHERE ic.acompanhante_id = v_acompanhante_id
      AND ic.valor_comissao > 0
      AND ic.cancelado = false
      AND ic.created_at >= v_hora_ativacao
      AND ic.created_at <= CURRENT_TIMESTAMP;

    v_novo_status := CASE WHEN p_marcar_como_paga THEN 'encerrada_paga' ELSE 'encerrada_pendente' END;

    UPDATE acompanhantes_ativas_dia
    SET hora_desativacao = CURRENT_TIMESTAMP,
        status_periodo = v_novo_status,
        valor_comissoes_periodo = v_valor_comissoes,
        data_pagamento = CASE WHEN p_marcar_como_paga THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE id = p_periodo_id;

    PERFORM devolver_pulseira(v_acompanhante_id);

    RETURN QUERY SELECT p_periodo_id, v_valor_comissoes, v_total_itens, v_novo_status;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar como paga
CREATE OR REPLACE FUNCTION marcar_comissoes_pagas(
    p_periodo_id INTEGER,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE acompanhantes_ativas_dia
    SET status_periodo = 'encerrada_paga',
        data_pagamento = CURRENT_TIMESTAMP,
        observacoes_pagamento = p_observacoes
    WHERE id = p_periodo_id AND status_periodo = 'encerrada_pendente';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Período não encontrado ou não está pendente de pagamento';
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Migration 006: Melhorias no serviço de quarto
-- ============================================

-- Tabela de quartos disponíveis
CREATE TABLE IF NOT EXISTS quartos (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(10) NOT NULL UNIQUE,
    descricao VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de relacionamento serviço-acompanhantes
CREATE TABLE IF NOT EXISTS servico_quarto_acompanhantes (
    id SERIAL PRIMARY KEY,
    item_comanda_id INTEGER REFERENCES itens_comanda(id) ON DELETE CASCADE,
    acompanhante_id INTEGER REFERENCES acompanhantes(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar colunas em itens_comanda
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'itens_comanda' AND column_name = 'numero_quarto'
    ) THEN
        ALTER TABLE itens_comanda ADD COLUMN numero_quarto VARCHAR(10);
        COMMENT ON COLUMN itens_comanda.numero_quarto IS 'Número do quarto utilizado no serviço';
        RAISE NOTICE 'Campo numero_quarto adicionado à tabela itens_comanda';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'itens_comanda' AND column_name = 'hora_entrada'
    ) THEN
        ALTER TABLE itens_comanda ADD COLUMN hora_entrada TIMESTAMP;
        COMMENT ON COLUMN itens_comanda.hora_entrada IS 'Horário de entrada no quarto (timezone: America/Sao_Paulo)';
        RAISE NOTICE 'Campo hora_entrada adicionado à tabela itens_comanda';
    END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_quartos_ativo ON quartos(ativo);
CREATE INDEX IF NOT EXISTS idx_servico_acomp_item ON servico_quarto_acompanhantes(item_comanda_id);
CREATE INDEX IF NOT EXISTS idx_servico_acomp_acompanhante ON servico_quarto_acompanhantes(acompanhante_id);

-- Função para obter horário de Brasília
CREATE OR REPLACE FUNCTION get_brasilia_time()
RETURNS TIMESTAMP AS $$
BEGIN
    RETURN CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo';
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at em quartos
DROP TRIGGER IF EXISTS update_quartos_updated_at ON quartos;
CREATE TRIGGER update_quartos_updated_at
    BEFORE UPDATE ON quartos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir quartos exemplo
INSERT INTO quartos (numero, descricao, ordem) VALUES
    ('101', 'Quarto 101', 1),
    ('102', 'Quarto 102', 2),
    ('103', 'Quarto 103', 3),
    ('104', 'Quarto 104', 4),
    ('105', 'Quarto 105', 5),
    ('VIP1', 'Quarto VIP 1', 10),
    ('VIP2', 'Quarto VIP 2', 11)
ON CONFLICT (numero) DO NOTHING;

-- View para histórico de serviços de quarto
CREATE OR REPLACE VIEW vw_historico_servicos_quarto AS
SELECT
    sqa.acompanhante_id,
    a.nome as acompanhante_nome,
    a.apelido as acompanhante_apelido,
    ic.id as item_id,
    ic.comanda_id,
    c.numero as comanda_numero,
    ic.numero_quarto,
    ic.hora_entrada,
    ic.created_at as data_lancamento,
    ic.valor_total,
    mc.id as movimento_caixa_id,
    mc.data_abertura as caixa_abertura,
    u.nome as usuario_nome
FROM servico_quarto_acompanhantes sqa
JOIN acompanhantes a ON a.id = sqa.acompanhante_id
JOIN itens_comanda ic ON ic.id = sqa.item_comanda_id
JOIN comandas c ON c.id = ic.comanda_id
JOIN movimentos_caixa mc ON mc.id = c.movimento_caixa_id
LEFT JOIN usuarios u ON u.id = ic.usuario_id
WHERE ic.tipo_item = 'quarto' AND ic.cancelado = false
ORDER BY ic.created_at DESC;

-- ============================================
-- Migration 007: Adiciona configuracao_quarto_id em itens_comanda
-- ============================================

ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS configuracao_quarto_id INTEGER REFERENCES configuracao_quartos(id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_itens_comanda_config_quarto') THEN
        CREATE INDEX idx_itens_comanda_config_quarto ON itens_comanda(configuracao_quarto_id);
        RAISE NOTICE 'Índice idx_itens_comanda_config_quarto criado';
    ELSE
        RAISE NOTICE 'Índice idx_itens_comanda_config_quarto já existe';
    END IF;
END $$;

-- ============================================
-- Migration 008: Serviço de Tempo Livre
-- ============================================

DO $$
BEGIN
    -- Adicionar coluna tempo_livre
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'itens_comanda' AND column_name = 'tempo_livre'
    ) THEN
        ALTER TABLE itens_comanda ADD COLUMN tempo_livre BOOLEAN DEFAULT false;
        COMMENT ON COLUMN itens_comanda.tempo_livre IS 'Indica se é um serviço de quarto com tempo livre (sem tempo pré-definido)';
        RAISE NOTICE 'Campo tempo_livre adicionado à tabela itens_comanda';
    END IF;

    -- Adicionar coluna hora_saida
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'itens_comanda' AND column_name = 'hora_saida'
    ) THEN
        ALTER TABLE itens_comanda ADD COLUMN hora_saida TIMESTAMP;
        COMMENT ON COLUMN itens_comanda.hora_saida IS 'Horário de finalização do serviço de quarto (timezone: America/Sao_Paulo)';
        RAISE NOTICE 'Campo hora_saida adicionado à tabela itens_comanda';
    END IF;

    -- Adicionar coluna valor_sugerido
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'itens_comanda' AND column_name = 'valor_sugerido'
    ) THEN
        ALTER TABLE itens_comanda ADD COLUMN valor_sugerido DECIMAL(10,2);
        COMMENT ON COLUMN itens_comanda.valor_sugerido IS 'Valor sugerido pelo sistema baseado no tempo decorrido';
        RAISE NOTICE 'Campo valor_sugerido adicionado à tabela itens_comanda';
    END IF;

    -- Adicionar coluna status_tempo_livre
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'itens_comanda' AND column_name = 'status_tempo_livre'
    ) THEN
        ALTER TABLE itens_comanda ADD COLUMN status_tempo_livre VARCHAR(30) DEFAULT NULL
        CHECK (status_tempo_livre IS NULL OR status_tempo_livre IN ('em_andamento', 'aguardando_confirmacao', 'finalizado'));
        COMMENT ON COLUMN itens_comanda.status_tempo_livre IS 'Status do serviço de tempo livre: em_andamento, aguardando_confirmacao, finalizado';
        RAISE NOTICE 'Campo status_tempo_livre adicionado à tabela itens_comanda';
    END IF;

    -- Adicionar coluna minutos_utilizados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'itens_comanda' AND column_name = 'minutos_utilizados'
    ) THEN
        ALTER TABLE itens_comanda ADD COLUMN minutos_utilizados INTEGER;
        COMMENT ON COLUMN itens_comanda.minutos_utilizados IS 'Total de minutos utilizados no serviço de tempo livre';
        RAISE NOTICE 'Campo minutos_utilizados adicionado à tabela itens_comanda';
    END IF;
END $$;

-- Criar índice para busca de serviços em andamento
CREATE INDEX IF NOT EXISTS idx_itens_comanda_tempo_livre
ON itens_comanda(tempo_livre, status_tempo_livre)
WHERE tempo_livre = true;

-- Função para calcular valor do tempo livre com tolerância de 10 minutos
CREATE OR REPLACE FUNCTION calcular_valor_tempo_livre(minutos_decorridos INTEGER)
RETURNS TABLE(
    configuracao_id INTEGER,
    descricao VARCHAR(50),
    minutos_configuracao INTEGER,
    valor DECIMAL(10,2)
) AS $$
DECLARE
    tolerancia INTEGER := 10;
BEGIN
    RETURN QUERY
    SELECT
        cq.id,
        cq.descricao,
        cq.minutos,
        cq.valor
    FROM configuracao_quartos cq
    WHERE cq.ativo = true
    AND cq.minutos >= (
        SELECT COALESCE(
            (
                SELECT MIN(cq2.minutos)
                FROM configuracao_quartos cq2
                WHERE cq2.ativo = true
                AND minutos_decorridos <= (cq2.minutos + tolerancia)
            ),
            (
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

-- View para serviços de tempo livre em andamento
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

-- ============================================
-- Migration 009: Vincular ocupacao_quartos com itens_comanda
-- ============================================

DO $$
BEGIN
    -- Adicionar coluna item_comanda_id para vincular ocupação com item da comanda
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ocupacao_quartos' AND column_name = 'item_comanda_id'
    ) THEN
        ALTER TABLE ocupacao_quartos ADD COLUMN item_comanda_id INTEGER REFERENCES itens_comanda(id);
        COMMENT ON COLUMN ocupacao_quartos.item_comanda_id IS 'Referência ao item da comanda criado para esta ocupação';
        RAISE NOTICE 'Campo item_comanda_id adicionado à tabela ocupacao_quartos';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ocupacao_item_comanda ON ocupacao_quartos(item_comanda_id);

-- ============================================
-- Migration 010: Sistema NF-e (Nota Fiscal Eletrônica)
-- Baseado no Manual de Credenciamento SEFA/PR versão 3.1
-- ============================================

-- TABELA: nfe_configuracao_emitente
CREATE TABLE IF NOT EXISTS nfe_configuracao_emitente (
    id SERIAL PRIMARY KEY,
    razao_social VARCHAR(60) NOT NULL,
    nome_fantasia VARCHAR(60),
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    inscricao_estadual VARCHAR(14) NOT NULL,
    inscricao_municipal VARCHAR(15),
    cnae_fiscal VARCHAR(7),
    codigo_regime_tributario INTEGER NOT NULL DEFAULT 1,
    logradouro VARCHAR(60) NOT NULL,
    numero VARCHAR(60) NOT NULL,
    complemento VARCHAR(60),
    bairro VARCHAR(60) NOT NULL,
    codigo_municipio VARCHAR(7) NOT NULL,
    nome_municipio VARCHAR(60) NOT NULL,
    uf CHAR(2) NOT NULL DEFAULT 'PR',
    cep VARCHAR(8) NOT NULL,
    codigo_pais VARCHAR(4) DEFAULT '1058',
    nome_pais VARCHAR(60) DEFAULT 'BRASIL',
    telefone VARCHAR(14),
    serie_nfe INTEGER NOT NULL DEFAULT 1,
    proximo_numero_nfe INTEGER NOT NULL DEFAULT 1,
    ambiente INTEGER NOT NULL DEFAULT 2,
    tipo_impressao_danfe INTEGER NOT NULL DEFAULT 1,
    forma_emissao INTEGER NOT NULL DEFAULT 1,
    certificado_arquivo TEXT,
    certificado_senha_hash TEXT,
    certificado_validade TIMESTAMP,
    certificado_tipo VARCHAR(10) DEFAULT 'A1',
    ws_autorizacao VARCHAR(255),
    ws_retorno_autorizacao VARCHAR(255),
    ws_cancelamento VARCHAR(255),
    ws_inutilizacao VARCHAR(255),
    ws_consulta_protocolo VARCHAR(255),
    ws_consulta_status_servico VARCHAR(255),
    ws_recepcao_evento VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABELA: nfe_emitidas
CREATE TABLE IF NOT EXISTS nfe_emitidas (
    id SERIAL PRIMARY KEY,
    chave_acesso CHAR(44) NOT NULL UNIQUE,
    numero INTEGER NOT NULL,
    serie INTEGER NOT NULL,
    comanda_id INTEGER REFERENCES comandas(id),
    movimento_caixa_id INTEGER REFERENCES movimentos_caixa(id),
    emitente_id INTEGER REFERENCES nfe_configuracao_emitente(id),
    tipo_operacao INTEGER NOT NULL DEFAULT 1,
    natureza_operacao VARCHAR(60) NOT NULL DEFAULT 'VENDA DE MERCADORIAS',
    finalidade_emissao INTEGER NOT NULL DEFAULT 1,
    dest_cnpj_cpf VARCHAR(14),
    dest_razao_social VARCHAR(60),
    dest_inscricao_estadual VARCHAR(14),
    dest_endereco_logradouro VARCHAR(60),
    dest_endereco_numero VARCHAR(60),
    dest_endereco_complemento VARCHAR(60),
    dest_endereco_bairro VARCHAR(60),
    dest_endereco_municipio VARCHAR(60),
    dest_endereco_uf CHAR(2),
    dest_endereco_cep VARCHAR(8),
    dest_indicador_ie INTEGER DEFAULT 9,
    valor_total_produtos DECIMAL(15,2) NOT NULL DEFAULT 0,
    valor_total_nf DECIMAL(15,2) NOT NULL DEFAULT 0,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_frete DECIMAL(15,2) DEFAULT 0,
    valor_seguro DECIMAL(15,2) DEFAULT 0,
    valor_outros DECIMAL(15,2) DEFAULT 0,
    valor_icms DECIMAL(15,2) DEFAULT 0,
    valor_icms_st DECIMAL(15,2) DEFAULT 0,
    valor_ipi DECIMAL(15,2) DEFAULT 0,
    valor_pis DECIMAL(15,2) DEFAULT 0,
    valor_cofins DECIMAL(15,2) DEFAULT 0,
    valor_aproximado_tributos DECIMAL(15,2) DEFAULT 0,
    forma_pagamento INTEGER DEFAULT 1,
    meio_pagamento INTEGER DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    codigo_status INTEGER,
    motivo_status VARCHAR(255),
    protocolo_autorizacao VARCHAR(15),
    data_autorizacao TIMESTAMP,
    data_emissao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    forma_emissao INTEGER DEFAULT 1,
    justificativa_contingencia TEXT,
    data_entrada_contingencia TIMESTAMP,
    xml_envio TEXT,
    xml_retorno TEXT,
    xml_autorizado TEXT,
    danfe_impresso BOOLEAN DEFAULT FALSE,
    danfe_url VARCHAR(255),
    ambiente INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- TABELA: nfe_itens
CREATE TABLE IF NOT EXISTS nfe_itens (
    id SERIAL PRIMARY KEY,
    nfe_id INTEGER NOT NULL REFERENCES nfe_emitidas(id) ON DELETE CASCADE,
    numero_item INTEGER NOT NULL,
    codigo_produto VARCHAR(60) NOT NULL,
    descricao VARCHAR(120) NOT NULL,
    ncm VARCHAR(8) NOT NULL DEFAULT '00000000',
    cfop VARCHAR(4) NOT NULL DEFAULT '5102',
    unidade VARCHAR(6) NOT NULL DEFAULT 'UN',
    quantidade DECIMAL(15,4) NOT NULL,
    valor_unitario DECIMAL(15,4) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    icms_origem INTEGER DEFAULT 0,
    icms_cst VARCHAR(3) DEFAULT '00',
    icms_csosn VARCHAR(3),
    icms_base_calculo DECIMAL(15,2) DEFAULT 0,
    icms_aliquota DECIMAL(5,2) DEFAULT 0,
    icms_valor DECIMAL(15,2) DEFAULT 0,
    pis_cst VARCHAR(2) DEFAULT '01',
    pis_base_calculo DECIMAL(15,2) DEFAULT 0,
    pis_aliquota DECIMAL(5,4) DEFAULT 0,
    pis_valor DECIMAL(15,2) DEFAULT 0,
    cofins_cst VARCHAR(2) DEFAULT '01',
    cofins_base_calculo DECIMAL(15,2) DEFAULT 0,
    cofins_aliquota DECIMAL(5,4) DEFAULT 0,
    cofins_valor DECIMAL(15,2) DEFAULT 0,
    valor_aproximado_tributos DECIMAL(15,2) DEFAULT 0,
    informacoes_adicionais TEXT,
    item_comanda_id INTEGER REFERENCES itens_comanda(id),
    produto_id INTEGER REFERENCES produtos(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABELA: nfe_cancelamentos
CREATE TABLE IF NOT EXISTS nfe_cancelamentos (
    id SERIAL PRIMARY KEY,
    nfe_id INTEGER NOT NULL REFERENCES nfe_emitidas(id),
    tipo_evento VARCHAR(6) DEFAULT '110111',
    sequencia_evento INTEGER DEFAULT 1,
    chave_acesso CHAR(44) NOT NULL,
    protocolo_autorizacao_nfe VARCHAR(15) NOT NULL,
    justificativa VARCHAR(255) NOT NULL,
    protocolo_cancelamento VARCHAR(15),
    data_cancelamento TIMESTAMP,
    codigo_status INTEGER,
    motivo_status VARCHAR(255),
    xml_envio TEXT,
    xml_retorno TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- TABELA: nfe_inutilizacoes
CREATE TABLE IF NOT EXISTS nfe_inutilizacoes (
    id SERIAL PRIMARY KEY,
    emitente_id INTEGER REFERENCES nfe_configuracao_emitente(id),
    ano INTEGER NOT NULL,
    serie INTEGER NOT NULL,
    numero_inicial INTEGER NOT NULL,
    numero_final INTEGER NOT NULL,
    justificativa VARCHAR(255) NOT NULL,
    protocolo_inutilizacao VARCHAR(15),
    data_inutilizacao TIMESTAMP,
    codigo_status INTEGER,
    motivo_status VARCHAR(255),
    xml_envio TEXT,
    xml_retorno TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id),
    CONSTRAINT uk_inutilizacao UNIQUE (ano, serie, numero_inicial, numero_final)
);

-- TABELA: nfe_eventos
CREATE TABLE IF NOT EXISTS nfe_eventos (
    id SERIAL PRIMARY KEY,
    nfe_id INTEGER REFERENCES nfe_emitidas(id),
    tipo_evento VARCHAR(6) NOT NULL,
    descricao_evento VARCHAR(60) NOT NULL,
    sequencia_evento INTEGER DEFAULT 1,
    chave_acesso CHAR(44) NOT NULL,
    data_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detalhes_evento TEXT,
    protocolo_evento VARCHAR(15),
    codigo_status INTEGER,
    motivo_status VARCHAR(255),
    xml_envio TEXT,
    xml_retorno TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- TABELA: nfe_comunicacao_log
CREATE TABLE IF NOT EXISTS nfe_comunicacao_log (
    id SERIAL PRIMARY KEY,
    tipo_operacao VARCHAR(30) NOT NULL,
    nfe_id INTEGER REFERENCES nfe_emitidas(id),
    url_requisicao VARCHAR(255),
    xml_requisicao TEXT,
    data_requisicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    xml_resposta TEXT,
    codigo_http INTEGER,
    tempo_resposta_ms INTEGER,
    data_resposta TIMESTAMP,
    sucesso BOOLEAN DEFAULT FALSE,
    mensagem_erro TEXT,
    ambiente INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABELA: nfe_contingencia_fila
CREATE TABLE IF NOT EXISTS nfe_contingencia_fila (
    id SERIAL PRIMARY KEY,
    nfe_id INTEGER NOT NULL REFERENCES nfe_emitidas(id),
    motivo_contingencia VARCHAR(256) NOT NULL,
    data_entrada_contingencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    forma_contingencia INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO',
    tentativas INTEGER DEFAULT 0,
    ultima_tentativa TIMESTAMP,
    mensagem_erro TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transmitida_at TIMESTAMP
);

-- TABELA: nfe_homologacao_testes
CREATE TABLE IF NOT EXISTS nfe_homologacao_testes (
    id SERIAL PRIMARY KEY,
    emitente_id INTEGER REFERENCES nfe_configuracao_emitente(id),
    data_teste DATE NOT NULL DEFAULT CURRENT_DATE,
    autorizacoes_realizadas INTEGER DEFAULT 0,
    autorizacoes_meta INTEGER NOT NULL,
    cancelamentos_realizados INTEGER DEFAULT 0,
    cancelamentos_meta INTEGER NOT NULL,
    inutilizacoes_realizadas INTEGER DEFAULT 0,
    inutilizacoes_meta INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'EM_ANDAMENTO',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_teste_dia UNIQUE (emitente_id, data_teste)
);

-- Views NF-e
CREATE OR REPLACE VIEW vw_nfe_resumo_status AS
SELECT
    ambiente,
    status,
    COUNT(*) as quantidade,
    SUM(valor_total_nf) as valor_total
FROM nfe_emitidas
GROUP BY ambiente, status;

CREATE OR REPLACE VIEW vw_nfe_pendentes_transmissao AS
SELECT
    n.id,
    n.numero,
    n.serie,
    n.chave_acesso,
    n.valor_total_nf,
    n.data_emissao,
    n.forma_emissao,
    f.motivo_contingencia,
    f.tentativas,
    f.ultima_tentativa
FROM nfe_emitidas n
JOIN nfe_contingencia_fila f ON f.nfe_id = n.id
WHERE f.status IN ('AGUARDANDO', 'ERRO')
ORDER BY n.data_emissao;

CREATE OR REPLACE VIEW vw_nfe_proxima_numeracao AS
SELECT
    e.id as emitente_id,
    e.razao_social,
    e.serie_nfe as serie,
    e.proximo_numero_nfe as proximo_numero,
    e.ambiente,
    COALESCE(
        (SELECT MAX(numero) FROM nfe_emitidas WHERE emitente_id = e.id AND serie = e.serie_nfe),
        0
    ) as ultimo_numero_emitido
FROM nfe_configuracao_emitente e
WHERE e.ativo = TRUE;

CREATE OR REPLACE VIEW vw_nfe_relatorio_diario AS
SELECT
    DATE(data_emissao) as data,
    ambiente,
    COUNT(*) FILTER (WHERE status = 'AUTORIZADA') as autorizadas,
    COUNT(*) FILTER (WHERE status = 'CANCELADA') as canceladas,
    COUNT(*) FILTER (WHERE status = 'REJEITADA') as rejeitadas,
    COUNT(*) FILTER (WHERE status = 'DENEGADA') as denegadas,
    SUM(valor_total_nf) FILTER (WHERE status = 'AUTORIZADA') as valor_total_autorizado
FROM nfe_emitidas
GROUP BY DATE(data_emissao), ambiente
ORDER BY data DESC;

-- Índices NF-e
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_chave ON nfe_emitidas(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_numero_serie ON nfe_emitidas(numero, serie);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_data ON nfe_emitidas(data_emissao);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_status ON nfe_emitidas(status);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_comanda ON nfe_emitidas(comanda_id);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_ambiente ON nfe_emitidas(ambiente);
CREATE INDEX IF NOT EXISTS idx_nfe_itens_nfe ON nfe_itens(nfe_id);
CREATE INDEX IF NOT EXISTS idx_nfe_cancelamentos_nfe ON nfe_cancelamentos(nfe_id);
CREATE INDEX IF NOT EXISTS idx_nfe_cancelamentos_chave ON nfe_cancelamentos(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_inutilizacoes_ano_serie ON nfe_inutilizacoes(ano, serie);
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_nfe ON nfe_eventos(nfe_id);
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_tipo ON nfe_eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_nfe_comunicacao_log_nfe ON nfe_comunicacao_log(nfe_id);
CREATE INDEX IF NOT EXISTS idx_nfe_comunicacao_log_tipo ON nfe_comunicacao_log(tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_nfe_contingencia_fila_status ON nfe_contingencia_fila(status);

-- Triggers NF-e
DROP TRIGGER IF EXISTS update_nfe_configuracao_updated_at ON nfe_configuracao_emitente;
CREATE TRIGGER update_nfe_configuracao_updated_at
    BEFORE UPDATE ON nfe_configuracao_emitente
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nfe_emitidas_updated_at ON nfe_emitidas;
CREATE TRIGGER update_nfe_emitidas_updated_at
    BEFORE UPDATE ON nfe_emitidas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nfe_homologacao_testes_updated_at ON nfe_homologacao_testes;
CREATE TRIGGER update_nfe_homologacao_testes_updated_at
    BEFORE UPDATE ON nfe_homologacao_testes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Funções NF-e
CREATE OR REPLACE FUNCTION nfe_gerar_proximo_numero(p_emitente_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_numero INTEGER;
BEGIN
    UPDATE nfe_configuracao_emitente
    SET proximo_numero_nfe = proximo_numero_nfe + 1
    WHERE id = p_emitente_id
    RETURNING proximo_numero_nfe - 1 INTO v_numero;
    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION nfe_calcular_dv_chave(p_chave VARCHAR(43))
RETURNS INTEGER AS $$
DECLARE
    v_soma INTEGER := 0;
    v_peso INTEGER := 2;
    v_i INTEGER;
    v_digito INTEGER;
BEGIN
    FOR v_i IN REVERSE 43..1 LOOP
        v_soma := v_soma + (CAST(SUBSTRING(p_chave, v_i, 1) AS INTEGER) * v_peso);
        v_peso := v_peso + 1;
        IF v_peso > 9 THEN
            v_peso := 2;
        END IF;
    END LOOP;
    v_digito := 11 - (v_soma % 11);
    IF v_digito >= 10 THEN
        v_digito := 0;
    END IF;
    RETURN v_digito;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION nfe_pode_cancelar(p_nfe_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(20);
    v_data_autorizacao TIMESTAMP;
BEGIN
    SELECT status, data_autorizacao
    INTO v_status, v_data_autorizacao
    FROM nfe_emitidas
    WHERE id = p_nfe_id;
    IF v_status != 'AUTORIZADA' THEN
        RETURN FALSE;
    END IF;
    IF v_data_autorizacao + INTERVAL '24 hours' < CURRENT_TIMESTAMP THEN
        RETURN FALSE;
    END IF;
    RETURN TRUE;
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
