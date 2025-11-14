-- Migration 006: Melhorias no serviço de quarto
-- Adiciona suporte para:
-- - Múltiplas acompanhantes por serviço de quarto
-- - Lista de quartos disponíveis (números)
-- - Horário de Brasília (America/Sao_Paulo)
-- - Registro no histórico das acompanhantes sem comissão

-- ============================================
-- TABELA DE QUARTOS DISPONÍVEIS
-- ============================================

CREATE TABLE IF NOT EXISTS quartos (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(10) NOT NULL UNIQUE,
    descricao VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE quartos IS 'Cadastro de quartos disponíveis no estabelecimento';
COMMENT ON COLUMN quartos.numero IS 'Número/identificação do quarto (ex: 101, 102, VIP1)';
COMMENT ON COLUMN quartos.descricao IS 'Descrição adicional do quarto';

CREATE INDEX idx_quartos_ativo ON quartos(ativo);

-- ============================================
-- TABELA DE RELACIONAMENTO SERVIÇO-ACOMPANHANTES
-- ============================================

CREATE TABLE IF NOT EXISTS servico_quarto_acompanhantes (
    id SERIAL PRIMARY KEY,
    item_comanda_id INTEGER REFERENCES itens_comanda(id) ON DELETE CASCADE,
    acompanhante_id INTEGER REFERENCES acompanhantes(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE servico_quarto_acompanhantes IS 'Relacionamento N:N entre serviços de quarto e acompanhantes';

CREATE INDEX idx_servico_acomp_item ON servico_quarto_acompanhantes(item_comanda_id);
CREATE INDEX idx_servico_acomp_acompanhante ON servico_quarto_acompanhantes(acompanhante_id);

-- ============================================
-- ADICIONAR COLUNAS EM ITENS_COMANDA
-- ============================================

-- Adicionar coluna para número do quarto
ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS numero_quarto VARCHAR(10);

-- Adicionar coluna para horário de entrada (Brasília)
ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS hora_entrada TIMESTAMP;

COMMENT ON COLUMN itens_comanda.numero_quarto IS 'Número do quarto utilizado no serviço';
COMMENT ON COLUMN itens_comanda.hora_entrada IS 'Horário de entrada no quarto (timezone: America/Sao_Paulo)';

-- ============================================
-- FUNÇÃO PARA OBTER HORÁRIO DE BRASÍLIA
-- ============================================

CREATE OR REPLACE FUNCTION get_brasilia_time()
RETURNS TIMESTAMP AS $$
BEGIN
    RETURN CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_brasilia_time() IS 'Retorna o horário atual no timezone de Brasília (America/Sao_Paulo)';

-- ============================================
-- TRIGGER PARA UPDATED_AT EM QUARTOS
-- ============================================

CREATE TRIGGER update_quartos_updated_at
    BEFORE UPDATE ON quartos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS - QUARTOS
-- ============================================

-- Inserir quartos exemplo (ajuste conforme necessário)
INSERT INTO quartos (numero, descricao, ordem) VALUES
    ('101', 'Quarto 101', 1),
    ('102', 'Quarto 102', 2),
    ('103', 'Quarto 103', 3),
    ('104', 'Quarto 104', 4),
    ('105', 'Quarto 105', 5),
    ('VIP1', 'Quarto VIP 1', 10),
    ('VIP2', 'Quarto VIP 2', 11)
ON CONFLICT (numero) DO NOTHING;

-- ============================================
-- VIEW PARA HISTÓRICO DE ACOMPANHANTES
-- ============================================

-- View para visualizar histórico de serviços de quarto por acompanhante
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

COMMENT ON VIEW vw_historico_servicos_quarto IS 'Histórico de serviços de quarto por acompanhante';

-- ============================================
-- CONCLUÍDO
-- ============================================
