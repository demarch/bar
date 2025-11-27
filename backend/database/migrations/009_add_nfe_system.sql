-- Migration 009: Sistema NF-e (Nota Fiscal Eletrônica)
-- Baseado no Manual de Credenciamento SEFA/PR versão 3.1

-- =====================================================
-- TABELA: nfe_configuracao_emitente
-- Armazena dados do emitente para geração de NF-e
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_configuracao_emitente (
    id SERIAL PRIMARY KEY,

    -- Dados da Empresa
    razao_social VARCHAR(60) NOT NULL,
    nome_fantasia VARCHAR(60),
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    inscricao_estadual VARCHAR(14) NOT NULL,
    inscricao_municipal VARCHAR(15),
    cnae_fiscal VARCHAR(7),

    -- Regime Tributário (1=Simples Nacional, 2=Simples Nacional Excesso, 3=Regime Normal)
    codigo_regime_tributario INTEGER NOT NULL DEFAULT 1,

    -- Endereço
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

    -- Configurações NF-e
    serie_nfe INTEGER NOT NULL DEFAULT 1,
    proximo_numero_nfe INTEGER NOT NULL DEFAULT 1,
    ambiente INTEGER NOT NULL DEFAULT 2, -- 1=Produção, 2=Homologação
    tipo_impressao_danfe INTEGER NOT NULL DEFAULT 1, -- 1=Retrato, 2=Paisagem
    forma_emissao INTEGER NOT NULL DEFAULT 1, -- 1=Normal, 2=FS-DA, 3=SCAN, 4=DPEC, 5=FS-DA, 6=SVC-AN, 7=SVC-RS, 9=Offline

    -- Certificado Digital
    certificado_arquivo TEXT, -- Caminho ou conteúdo base64 do certificado
    certificado_senha_hash TEXT, -- Senha criptografada
    certificado_validade TIMESTAMP,
    certificado_tipo VARCHAR(10) DEFAULT 'A1', -- A1 ou A3

    -- URLs dos Web Services (Paraná)
    ws_autorizacao VARCHAR(255),
    ws_retorno_autorizacao VARCHAR(255),
    ws_cancelamento VARCHAR(255),
    ws_inutilizacao VARCHAR(255),
    ws_consulta_protocolo VARCHAR(255),
    ws_consulta_status_servico VARCHAR(255),
    ws_recepcao_evento VARCHAR(255),

    -- Controle
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA: nfe_emitidas
-- Armazena todas as NF-e emitidas
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_emitidas (
    id SERIAL PRIMARY KEY,

    -- Identificação da NF-e
    chave_acesso CHAR(44) NOT NULL UNIQUE,
    numero INTEGER NOT NULL,
    serie INTEGER NOT NULL,

    -- Relacionamentos
    comanda_id INTEGER REFERENCES comandas(id),
    movimento_caixa_id INTEGER REFERENCES movimentos_caixa(id),
    emitente_id INTEGER REFERENCES nfe_configuracao_emitente(id),

    -- Tipo de Operação
    tipo_operacao INTEGER NOT NULL DEFAULT 1, -- 0=Entrada, 1=Saída
    natureza_operacao VARCHAR(60) NOT NULL DEFAULT 'VENDA DE MERCADORIAS',
    finalidade_emissao INTEGER NOT NULL DEFAULT 1, -- 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução

    -- Dados do Destinatário
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
    dest_indicador_ie INTEGER DEFAULT 9, -- 1=Contribuinte, 2=Isento, 9=Não contribuinte

    -- Valores Totais
    valor_total_produtos DECIMAL(15,2) NOT NULL DEFAULT 0,
    valor_total_nf DECIMAL(15,2) NOT NULL DEFAULT 0,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_frete DECIMAL(15,2) DEFAULT 0,
    valor_seguro DECIMAL(15,2) DEFAULT 0,
    valor_outros DECIMAL(15,2) DEFAULT 0,

    -- Impostos
    valor_icms DECIMAL(15,2) DEFAULT 0,
    valor_icms_st DECIMAL(15,2) DEFAULT 0,
    valor_ipi DECIMAL(15,2) DEFAULT 0,
    valor_pis DECIMAL(15,2) DEFAULT 0,
    valor_cofins DECIMAL(15,2) DEFAULT 0,
    valor_aproximado_tributos DECIMAL(15,2) DEFAULT 0,

    -- Forma de Pagamento
    forma_pagamento INTEGER DEFAULT 1, -- 0=À vista, 1=À prazo
    meio_pagamento INTEGER DEFAULT 1, -- 1=Dinheiro, 2=Cheque, 3=Cartão Crédito, 4=Cartão Débito, etc

    -- Status e Protocolo
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, AUTORIZADA, REJEITADA, DENEGADA, CANCELADA
    codigo_status INTEGER,
    motivo_status VARCHAR(255),
    protocolo_autorizacao VARCHAR(15),
    data_autorizacao TIMESTAMP,
    data_emissao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Contingência
    forma_emissao INTEGER DEFAULT 1, -- 1=Normal, 2-9=Contingência
    justificativa_contingencia TEXT,
    data_entrada_contingencia TIMESTAMP,

    -- XML
    xml_envio TEXT,
    xml_retorno TEXT,
    xml_autorizado TEXT,

    -- DANFE
    danfe_impresso BOOLEAN DEFAULT FALSE,
    danfe_url VARCHAR(255),

    -- Ambiente
    ambiente INTEGER NOT NULL DEFAULT 2, -- 1=Produção, 2=Homologação

    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- =====================================================
-- TABELA: nfe_itens
-- Itens/Produtos de cada NF-e
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_itens (
    id SERIAL PRIMARY KEY,
    nfe_id INTEGER NOT NULL REFERENCES nfe_emitidas(id) ON DELETE CASCADE,

    -- Identificação do Item
    numero_item INTEGER NOT NULL,

    -- Produto
    codigo_produto VARCHAR(60) NOT NULL,
    descricao VARCHAR(120) NOT NULL,
    ncm VARCHAR(8) NOT NULL DEFAULT '00000000',
    cfop VARCHAR(4) NOT NULL DEFAULT '5102', -- 5102 = Venda mercadoria adquirida
    unidade VARCHAR(6) NOT NULL DEFAULT 'UN',

    -- Valores
    quantidade DECIMAL(15,4) NOT NULL,
    valor_unitario DECIMAL(15,4) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    valor_desconto DECIMAL(15,2) DEFAULT 0,

    -- ICMS
    icms_origem INTEGER DEFAULT 0, -- 0=Nacional
    icms_cst VARCHAR(3) DEFAULT '00', -- 00, 10, 20, 30, 40, 41, 50, 51, 60, 70, 90
    icms_csosn VARCHAR(3), -- Para Simples Nacional: 101, 102, 103, 201, 202, 203, 300, 400, 500, 900
    icms_base_calculo DECIMAL(15,2) DEFAULT 0,
    icms_aliquota DECIMAL(5,2) DEFAULT 0,
    icms_valor DECIMAL(15,2) DEFAULT 0,

    -- PIS
    pis_cst VARCHAR(2) DEFAULT '01',
    pis_base_calculo DECIMAL(15,2) DEFAULT 0,
    pis_aliquota DECIMAL(5,4) DEFAULT 0,
    pis_valor DECIMAL(15,2) DEFAULT 0,

    -- COFINS
    cofins_cst VARCHAR(2) DEFAULT '01',
    cofins_base_calculo DECIMAL(15,2) DEFAULT 0,
    cofins_aliquota DECIMAL(5,4) DEFAULT 0,
    cofins_valor DECIMAL(15,2) DEFAULT 0,

    -- Valor aproximado de tributos (Lei da Transparência)
    valor_aproximado_tributos DECIMAL(15,2) DEFAULT 0,

    -- Informações Adicionais
    informacoes_adicionais TEXT,

    -- Relacionamento com item da comanda
    item_comanda_id INTEGER REFERENCES itens_comanda(id),
    produto_id INTEGER REFERENCES produtos(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA: nfe_cancelamentos
-- Registro de cancelamentos de NF-e
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_cancelamentos (
    id SERIAL PRIMARY KEY,
    nfe_id INTEGER NOT NULL REFERENCES nfe_emitidas(id),

    -- Identificação do Evento
    tipo_evento VARCHAR(6) DEFAULT '110111', -- 110111 = Cancelamento
    sequencia_evento INTEGER DEFAULT 1,

    -- Dados do Cancelamento
    chave_acesso CHAR(44) NOT NULL,
    protocolo_autorizacao_nfe VARCHAR(15) NOT NULL, -- Protocolo da NF-e original
    justificativa VARCHAR(255) NOT NULL, -- Mínimo 15 caracteres

    -- Retorno SEFAZ
    protocolo_cancelamento VARCHAR(15),
    data_cancelamento TIMESTAMP,
    codigo_status INTEGER,
    motivo_status VARCHAR(255),

    -- XML
    xml_envio TEXT,
    xml_retorno TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, HOMOLOGADO, REJEITADO

    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- =====================================================
-- TABELA: nfe_inutilizacoes
-- Registro de inutilizações de numeração
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_inutilizacoes (
    id SERIAL PRIMARY KEY,
    emitente_id INTEGER REFERENCES nfe_configuracao_emitente(id),

    -- Identificação
    ano INTEGER NOT NULL,
    serie INTEGER NOT NULL,
    numero_inicial INTEGER NOT NULL,
    numero_final INTEGER NOT NULL,

    -- Justificativa
    justificativa VARCHAR(255) NOT NULL, -- Mínimo 15 caracteres

    -- Retorno SEFAZ
    protocolo_inutilizacao VARCHAR(15),
    data_inutilizacao TIMESTAMP,
    codigo_status INTEGER,
    motivo_status VARCHAR(255),

    -- XML
    xml_envio TEXT,
    xml_retorno TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, HOMOLOGADA, REJEITADA

    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id),

    -- Constraint para evitar duplicações
    CONSTRAINT uk_inutilizacao UNIQUE (ano, serie, numero_inicial, numero_final)
);

-- =====================================================
-- TABELA: nfe_eventos
-- Registro genérico de eventos relacionados à NF-e
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_eventos (
    id SERIAL PRIMARY KEY,
    nfe_id INTEGER REFERENCES nfe_emitidas(id),

    -- Identificação do Evento
    tipo_evento VARCHAR(6) NOT NULL, -- 110110=CCe, 110111=Cancelamento, etc
    descricao_evento VARCHAR(60) NOT NULL,
    sequencia_evento INTEGER DEFAULT 1,

    -- Dados do Evento
    chave_acesso CHAR(44) NOT NULL,
    data_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Conteúdo do Evento (JSON ou texto específico)
    detalhes_evento TEXT,

    -- Retorno SEFAZ
    protocolo_evento VARCHAR(15),
    codigo_status INTEGER,
    motivo_status VARCHAR(255),

    -- XML
    xml_envio TEXT,
    xml_retorno TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',

    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- =====================================================
-- TABELA: nfe_comunicacao_log
-- Log de todas as comunicações com SEFAZ
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_comunicacao_log (
    id SERIAL PRIMARY KEY,

    -- Identificação
    tipo_operacao VARCHAR(30) NOT NULL, -- AUTORIZACAO, CANCELAMENTO, INUTILIZACAO, CONSULTA_STATUS, CONSULTA_NFE
    nfe_id INTEGER REFERENCES nfe_emitidas(id),

    -- Requisição
    url_requisicao VARCHAR(255),
    xml_requisicao TEXT,
    data_requisicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Resposta
    xml_resposta TEXT,
    codigo_http INTEGER,
    tempo_resposta_ms INTEGER,
    data_resposta TIMESTAMP,

    -- Status
    sucesso BOOLEAN DEFAULT FALSE,
    mensagem_erro TEXT,

    -- Ambiente
    ambiente INTEGER NOT NULL DEFAULT 2, -- 1=Produção, 2=Homologação

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA: nfe_contingencia_fila
-- Fila de NF-e para transmissão quando em contingência
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_contingencia_fila (
    id SERIAL PRIMARY KEY,
    nfe_id INTEGER NOT NULL REFERENCES nfe_emitidas(id),

    -- Dados da Contingência
    motivo_contingencia VARCHAR(256) NOT NULL,
    data_entrada_contingencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    forma_contingencia INTEGER NOT NULL, -- 2=FS-DA, 3=SCAN, 4=DPEC, etc

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO', -- AGUARDANDO, TRANSMITINDO, TRANSMITIDA, ERRO
    tentativas INTEGER DEFAULT 0,
    ultima_tentativa TIMESTAMP,
    mensagem_erro TEXT,

    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transmitida_at TIMESTAMP
);

-- =====================================================
-- TABELA: nfe_homologacao_testes
-- Controle de testes para homologação junto à SEFA
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_homologacao_testes (
    id SERIAL PRIMARY KEY,
    emitente_id INTEGER REFERENCES nfe_configuracao_emitente(id),

    -- Período do Teste
    data_teste DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Contadores
    autorizacoes_realizadas INTEGER DEFAULT 0,
    autorizacoes_meta INTEGER NOT NULL, -- Pico diário informado no requerimento
    cancelamentos_realizados INTEGER DEFAULT 0,
    cancelamentos_meta INTEGER NOT NULL, -- 1/10 do pico, máximo 20
    inutilizacoes_realizadas INTEGER DEFAULT 0,
    inutilizacoes_meta INTEGER NOT NULL, -- 1/10 do pico, máximo 20

    -- Status
    status VARCHAR(20) DEFAULT 'EM_ANDAMENTO', -- EM_ANDAMENTO, CONCLUIDO, APROVADO
    observacoes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_teste_dia UNIQUE (emitente_id, data_teste)
);

-- =====================================================
-- VIEWS
-- =====================================================

-- View: Resumo de NF-e por status
CREATE OR REPLACE VIEW vw_nfe_resumo_status AS
SELECT
    ambiente,
    status,
    COUNT(*) as quantidade,
    SUM(valor_total_nf) as valor_total
FROM nfe_emitidas
GROUP BY ambiente, status;

-- View: NF-e pendentes de transmissão (contingência)
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

-- View: Numeração disponível
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

-- View: Relatório diário de NF-e
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

-- =====================================================
-- ÍNDICES
-- =====================================================

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

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_nfe_configuracao_updated_at
    BEFORE UPDATE ON nfe_configuracao_emitente
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfe_emitidas_updated_at
    BEFORE UPDATE ON nfe_emitidas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfe_homologacao_testes_updated_at
    BEFORE UPDATE ON nfe_homologacao_testes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÃO: Gerar próximo número de NF-e
-- =====================================================
CREATE OR REPLACE FUNCTION nfe_gerar_proximo_numero(p_emitente_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_numero INTEGER;
BEGIN
    -- Bloqueia a linha para evitar concorrência
    UPDATE nfe_configuracao_emitente
    SET proximo_numero_nfe = proximo_numero_nfe + 1
    WHERE id = p_emitente_id
    RETURNING proximo_numero_nfe - 1 INTO v_numero;

    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Calcular dígito verificador da chave de acesso
-- =====================================================
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

-- =====================================================
-- FUNÇÃO: Verificar se pode cancelar NF-e
-- =====================================================
CREATE OR REPLACE FUNCTION nfe_pode_cancelar(p_nfe_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(20);
    v_data_autorizacao TIMESTAMP;
    v_horas_limite INTEGER := 24; -- Configurável
BEGIN
    SELECT status, data_autorizacao
    INTO v_status, v_data_autorizacao
    FROM nfe_emitidas
    WHERE id = p_nfe_id;

    -- Só pode cancelar se estiver autorizada
    IF v_status != 'AUTORIZADA' THEN
        RETURN FALSE;
    END IF;

    -- Verifica prazo (padrão 24 horas, mas pode variar conforme legislação)
    IF v_data_autorizacao + INTERVAL '24 hours' < CURRENT_TIMESTAMP THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONFIGURAÇÃO INICIAL: URLs Web Services SEFA/PR
-- =====================================================
-- Nota: Estas URLs são de referência e devem ser atualizadas
-- conforme versão mais recente do manual da SEFA

COMMENT ON TABLE nfe_configuracao_emitente IS 'Configurações do emitente para NF-e. URLs de Web Services devem ser atualizadas conforme versão atual do manual SEFA/PR.';
COMMENT ON COLUMN nfe_configuracao_emitente.ambiente IS '1=Produção (NF-e com validade jurídica), 2=Homologação (apenas testes)';
COMMENT ON COLUMN nfe_configuracao_emitente.forma_emissao IS '1=Normal, 2=FS-DA, 3=SCAN, 4=DPEC, 5=FS-DA, 6=SVC-AN, 7=SVC-RS, 9=Offline';

COMMENT ON TABLE nfe_emitidas IS 'Armazena todas as NF-e emitidas. XMLs devem ser mantidos por 5 anos conforme legislação.';
COMMENT ON TABLE nfe_cancelamentos IS 'Registro de cancelamentos. Prazo para cancelamento conforme legislação vigente.';
COMMENT ON TABLE nfe_inutilizacoes IS 'Registro de numerações inutilizadas. Usado para saltos de numeração.';
COMMENT ON TABLE nfe_homologacao_testes IS 'Controle de testes para credenciamento SEFA/PR conforme manual versão 3.1.';

-- Inserir registro de migração
INSERT INTO logs_operacoes (operacao, detalhes, usuario_id)
VALUES ('MIGRATION', 'Migration 009: Sistema NF-e implementado', NULL)
ON CONFLICT DO NOTHING;
