-- Migration: Add 'Drink Comissionado' product with fixed commission
-- Date: 2025-11-14
-- Description: Creates the 'Drink Comissionado' product with R$ 50.00 price and R$ 20.00 fixed commission

-- Insert the product 'Drink Comissionado' with fixed commission
-- Category 6 = 'Comissionados'
-- Price: R$ 50,00
-- Fixed Commission: R$ 20,00
-- Bar profit: R$ 30,00
INSERT INTO produtos (nome, categoria_id, preco, tipo, comissao_fixa, ativo)
SELECT 'Drink Comissionado', 6, 50.00, 'comissionado', 20.00, true
WHERE NOT EXISTS (
    SELECT 1 FROM produtos WHERE nome = 'Drink Comissionado'
);
