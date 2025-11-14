-- Migration 007: Adiciona configuracao_quarto_id em itens_comanda
-- Para armazenar qual configuração de tempo/preço foi usada no serviço de quarto

ALTER TABLE itens_comanda
ADD COLUMN IF NOT EXISTS configuracao_quarto_id INTEGER REFERENCES configuracao_quartos(id);

COMMENT ON COLUMN itens_comanda.configuracao_quarto_id IS 'Configuração de tempo/preço utilizada no serviço de quarto';

CREATE INDEX IF NOT EXISTS idx_itens_comanda_config_quarto ON itens_comanda(configuracao_quarto_id);
