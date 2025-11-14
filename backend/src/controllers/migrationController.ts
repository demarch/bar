import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';

export const applyCommissionFixMigration = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const results = [];

    // 1. Verificar se a coluna já existe
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'produtos' AND column_name = 'comissao_fixa'
    `);

    if (checkColumn.rows.length > 0) {
      results.push('ℹ️  Coluna comissao_fixa já existe');
    } else {
      // Adicionar coluna
      await client.query(`
        ALTER TABLE produtos ADD COLUMN comissao_fixa DECIMAL(10,2) DEFAULT NULL
      `);
      await client.query(`
        COMMENT ON COLUMN produtos.comissao_fixa IS 'Valor fixo de comissão em reais. Quando definido, sobrescreve o cálculo percentual baseado na acompanhante.'
      `);
      results.push('✅ Coluna comissao_fixa adicionada com sucesso');
    }

    // 2. Verificar se o produto já existe
    const checkProduct = await client.query(`
      SELECT id FROM produtos WHERE nome = 'Drink Comissionado'
    `);

    if (checkProduct.rows.length > 0) {
      results.push('ℹ️  Produto "Drink Comissionado" já existe');
    } else {
      // Criar produto
      await client.query(`
        INSERT INTO produtos (nome, categoria_id, preco, tipo, comissao_fixa, ativo)
        VALUES ('Drink Comissionado', 6, 50.00, 'comissionado', 20.00, true)
      `);
      results.push('✅ Produto "Drink Comissionado" criado com sucesso');
    }

    // 3. Listar produtos comissionados
    const produtos = await client.query(`
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
      ORDER BY nome
    `);

    const response: ApiResponse = {
      success: true,
      data: {
        migration_results: results,
        produtos_comissionados: produtos.rows,
      },
      message: 'Migração aplicada com sucesso',
    };

    res.json(response);
  } catch (error: any) {
    throw error;
  } finally {
    client.release();
  }
});
