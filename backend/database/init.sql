-- Bar Management System Database Schema
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS DE USUÁRIOS E AUTENTICAÇÃO
-- ============================================

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('admin', 'caixa', 'atendente')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_login ON usuarios(login);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);

-- ============================================
-- TABELAS DE ACOMPANHANTES
-- ============================================

CREATE TABLE acompanhantes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    apelido VARCHAR(50),
    telefone VARCHAR(20),
    documento VARCHAR(20),
    percentual_comissao DECIMAL(5,2) DEFAULT 40.00,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE acompanhantes_ativas_dia (
    id SERIAL PRIMARY KEY,
    acompanhante_id INTEGER REFERENCES acompanhantes(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_ativacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(acompanhante_id, data)
);

CREATE INDEX idx_acompanhantes_ativas ON acompanhantes_ativas_dia(data);

-- ============================================
-- TABELAS DE PRODUTOS
-- ============================================

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    ativa BOOLEAN DEFAULT true
);

CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id),
    preco DECIMAL(10,2) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('normal', 'comissionado')),
    comissao_percentual DECIMAL(5,2),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_produtos_tipo ON produtos(tipo);

-- ============================================
-- TABELAS DE MOVIMENTO DE CAIXA
-- ============================================

CREATE TABLE movimentos_caixa (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    data_abertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP,
    valor_abertura DECIMAL(10,2) NOT NULL,
    valor_fechamento DECIMAL(10,2),
    total_vendas DECIMAL(10,2) DEFAULT 0,
    total_comissoes DECIMAL(10,2) DEFAULT 0,
    total_sangrias DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movimentos_status ON movimentos_caixa(status);
CREATE INDEX idx_movimentos_data ON movimentos_caixa(data_abertura);

CREATE TABLE lancamentos_caixa (
    id SERIAL PRIMARY KEY,
    movimento_caixa_id INTEGER REFERENCES movimentos_caixa(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'sangria')),
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(50),
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lancamentos_movimento ON lancamentos_caixa(movimento_caixa_id);
CREATE INDEX idx_lancamentos_tipo ON lancamentos_caixa(tipo);

-- ============================================
-- TABELAS DE COMANDAS
-- ============================================

CREATE TABLE comandas (
    id SERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    movimento_caixa_id INTEGER REFERENCES movimentos_caixa(id),
    cliente_nome VARCHAR(100),
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP,
    total DECIMAL(10,2) DEFAULT 0,
    total_comissao DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
    forma_pagamento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(numero, movimento_caixa_id)
);

CREATE INDEX idx_comandas_numero ON comandas(numero);
CREATE INDEX idx_comandas_status ON comandas(status);
CREATE INDEX idx_comandas_movimento ON comandas(movimento_caixa_id);

CREATE TABLE itens_comanda (
    id SERIAL PRIMARY KEY,
    comanda_id INTEGER REFERENCES comandas(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id),
    acompanhante_id INTEGER REFERENCES acompanhantes(id),
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    valor_comissao DECIMAL(10,2) DEFAULT 0,
    tipo_item VARCHAR(20) NOT NULL CHECK (tipo_item IN ('normal', 'comissionado', 'quarto')),
    cancelado BOOLEAN DEFAULT false,
    motivo_cancelamento TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_itens_comanda ON itens_comanda(comanda_id);
CREATE INDEX idx_itens_produto ON itens_comanda(produto_id);
CREATE INDEX idx_itens_acompanhante ON itens_comanda(acompanhante_id);

-- ============================================
-- TABELAS DE OCUPAÇÃO DE QUARTOS
-- ============================================

CREATE TABLE configuracao_quartos (
    id SERIAL PRIMARY KEY,
    minutos INTEGER NOT NULL,
    descricao VARCHAR(50) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0
);

CREATE TABLE ocupacao_quartos (
    id SERIAL PRIMARY KEY,
    comanda_id INTEGER REFERENCES comandas(id) ON DELETE CASCADE,
    acompanhante_id INTEGER REFERENCES acompanhantes(id),
    numero_quarto INTEGER NOT NULL,
    hora_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hora_fim TIMESTAMP,
    minutos_total INTEGER,
    valor_cobrado DECIMAL(10,2),
    configuracao_quarto_id INTEGER REFERENCES configuracao_quartos(id),
    status VARCHAR(20) DEFAULT 'ocupado' CHECK (status IN ('ocupado', 'finalizado', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ocupacao_comanda ON ocupacao_quartos(comanda_id);
CREATE INDEX idx_ocupacao_status ON ocupacao_quartos(status);
CREATE INDEX idx_ocupacao_acompanhante ON ocupacao_quartos(acompanhante_id);

-- ============================================
-- TABELAS DE CONFIGURAÇÃO
-- ============================================

CREATE TABLE configuracoes_sistema (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    descricao TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELAS DE AUDITORIA E LOGS
-- ============================================

CREATE TABLE logs_operacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    acao VARCHAR(100) NOT NULL,
    tabela VARCHAR(50),
    registro_id INTEGER,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_usuario ON logs_operacoes(usuario_id);
CREATE INDEX idx_logs_tabela ON logs_operacoes(tabela);
CREATE INDEX idx_logs_created ON logs_operacoes(created_at);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acompanhantes_updated_at BEFORE UPDATE ON acompanhantes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON comandas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar total da comanda
CREATE OR REPLACE FUNCTION atualizar_total_comanda()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE comandas SET
        total = (
            SELECT COALESCE(SUM(valor_total), 0)
            FROM itens_comanda
            WHERE comanda_id = NEW.comanda_id AND cancelado = false
        ),
        total_comissao = (
            SELECT COALESCE(SUM(valor_comissao), 0)
            FROM itens_comanda
            WHERE comanda_id = NEW.comanda_id AND cancelado = false
        )
    WHERE id = NEW.comanda_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_total_comanda
    AFTER INSERT OR UPDATE ON itens_comanda
    FOR EACH ROW EXECUTE FUNCTION atualizar_total_comanda();

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Categorias padrão
INSERT INTO categorias (nome, descricao, ordem) VALUES
    ('Cervejas', 'Cervejas em geral', 1),
    ('Drinks', 'Drinks e coquetéis', 2),
    ('Destilados', 'Doses de destilados', 3),
    ('Refrigerantes', 'Refrigerantes e sucos', 4),
    ('Porções', 'Porções de comida', 5),
    ('Comissionados', 'Bebidas comissionadas', 6),
    ('Quartos', 'Serviço de quartos', 7);

-- Configuração de quartos padrão
INSERT INTO configuracao_quartos (minutos, descricao, valor, ordem) VALUES
    (30, '30 minutos', 70.00, 1),
    (60, '1 hora', 100.00, 2),
    (90, '1 hora e meia', 150.00, 3),
    (120, '2 horas', 200.00, 4);

-- Produtos exemplo
INSERT INTO produtos (nome, categoria_id, preco, tipo, ativo) VALUES
    ('Heineken', 1, 10.00, 'normal', true),
    ('Budweiser', 1, 9.00, 'normal', true),
    ('Stella Artois', 1, 12.00, 'normal', true),
    ('Caipirinha', 2, 25.00, 'normal', true),
    ('Gin Tônica', 2, 30.00, 'normal', true),
    ('Cuba Libre', 2, 28.00, 'normal', true),
    ('Dose Whisky', 3, 35.00, 'normal', true),
    ('Dose Vodka', 3, 30.00, 'normal', true),
    ('Coca-Cola', 4, 8.00, 'normal', true),
    ('Água', 4, 5.00, 'normal', true);

-- Bebidas comissionadas
INSERT INTO produtos (nome, categoria_id, preco, tipo, comissao_percentual, ativo) VALUES
    ('Dose Whisky Premium (Com.)', 6, 50.00, 'comissionado', 40.00, true),
    ('Champanhe (Com.)', 6, 100.00, 'comissionado', 40.00, true),
    ('Energético (Com.)', 6, 20.00, 'comissionado', 40.00, true);

-- Configurações do sistema
INSERT INTO configuracoes_sistema (chave, valor, tipo, descricao) VALUES
    ('nome_estabelecimento', 'Meu Bar', 'string', 'Nome do estabelecimento'),
    ('percentual_comissao_padrao', '40', 'number', 'Percentual de comissão padrão para acompanhantes'),
    ('tempo_maximo_quarto_horas', '4', 'number', 'Tempo máximo de ocupação de quarto em horas'),
    ('permitir_comanda_negativa', 'false', 'boolean', 'Permitir que comandas fiquem com saldo negativo');

-- Usuário admin padrão (senha: admin123)
-- Hash gerado com bcrypt para 'admin123'
INSERT INTO usuarios (nome, login, senha, tipo, ativo) VALUES
    ('Administrador', 'admin', '$2b$10$J2Z.GBAkxZ4dkCsdQlo./eNGENaC9BV/KQvfcA5onM3lvwPHE21by', 'admin', true);

-- Comentário: A senha 'admin123' deve ser alterada no primeiro acesso!
-- Para gerar um novo hash, use: bcrypt.hash('sua_senha', 10)

COMMENT ON TABLE usuarios IS 'Usuários do sistema com diferentes níveis de acesso';
COMMENT ON TABLE acompanhantes IS 'Cadastro de acompanhantes que geram comissões';
COMMENT ON TABLE comandas IS 'Comandas de consumo dos clientes';
COMMENT ON TABLE itens_comanda IS 'Itens lançados em cada comanda';
COMMENT ON TABLE ocupacao_quartos IS 'Registro de ocupação de quartos';
COMMENT ON TABLE movimentos_caixa IS 'Controle de abertura e fechamento de caixa';

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View de comandas abertas com totais
CREATE VIEW vw_comandas_abertas AS
SELECT
    c.id,
    c.numero,
    c.cliente_nome,
    c.data_abertura,
    c.total,
    c.total_comissao,
    COUNT(ic.id) as total_itens,
    ARRAY_AGG(DISTINCT a.nome) FILTER (WHERE a.nome IS NOT NULL) as acompanhantes
FROM comandas c
LEFT JOIN itens_comanda ic ON ic.comanda_id = c.id AND ic.cancelado = false
LEFT JOIN acompanhantes a ON a.id = ic.acompanhante_id
WHERE c.status = 'aberta'
GROUP BY c.id, c.numero, c.cliente_nome, c.data_abertura, c.total, c.total_comissao
ORDER BY c.numero;

-- View de comissões por acompanhante
CREATE VIEW vw_comissoes_acompanhantes AS
SELECT
    a.id,
    a.nome,
    a.apelido,
    DATE(ic.created_at) as data,
    COUNT(ic.id) as total_itens,
    SUM(ic.valor_comissao) as total_comissoes
FROM acompanhantes a
JOIN itens_comanda ic ON ic.acompanhante_id = a.id
WHERE ic.cancelado = false
GROUP BY a.id, a.nome, a.apelido, DATE(ic.created_at);

-- View de quartos ocupados
CREATE VIEW vw_quartos_ocupados AS
SELECT
    oq.id,
    oq.numero_quarto,
    oq.hora_inicio,
    a.nome as acompanhante_nome,
    c.numero as comanda_numero,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - oq.hora_inicio))/60 as minutos_decorridos
FROM ocupacao_quartos oq
JOIN acompanhantes a ON a.id = oq.acompanhante_id
JOIN comandas c ON c.id = oq.comanda_id
WHERE oq.status = 'ocupado';

-- Fim do script de inicialização
