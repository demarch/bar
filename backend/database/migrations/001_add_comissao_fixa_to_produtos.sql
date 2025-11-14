-- Migration: Add comissao_fixa field to produtos table
-- Date: 2025-11-14
-- Description: Adds support for fixed commission values on products

-- Add comissao_fixa column to produtos table
ALTER TABLE produtos
ADD COLUMN comissao_fixa DECIMAL(10,2) DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN produtos.comissao_fixa IS 'Valor fixo de comissão em reais. Quando definido, sobrescreve o cálculo percentual baseado na acompanhante.';

-- Update existing 'comissionado' products to use percentage calculation (no changes needed, just for documentation)
-- Products with comissao_fixa will use the fixed value instead of percentage
