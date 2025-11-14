/**
 * Script para aplicar migrações no banco de dados
 * Uso: ts-node src/scripts/apply-migration.ts
 */

import { pool } from '../config/database';

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectado ao banco de dados');

    // Verificar se a coluna já existe
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'produtos' AND column_name = 'comissao_fixa'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('ℹ️  A coluna comissao_fixa já existe na tabela produtos');
    } else {
      console.log('📝 Adicionando coluna comissao_fixa...');
      await client.query(`
        ALTER TABLE produtos ADD COLUMN comissao_fixa DECIMAL(10,2) DEFAULT NULL
      `);
      await client.query(`
        COMMENT ON COLUMN produtos.comissao_fixa IS 'Valor fixo de comissão em reais. Quando definido, sobrescreve o cálculo percentual baseado na acompanhante.'
      `);
      console.log('✅ Coluna comissao_fixa adicionada com sucesso');
    }

    // Verificar se o produto já existe
    const checkProduct = await client.query(`
      SELECT id FROM produtos WHERE nome = 'Drink Comissionado'
    `);

    if (checkProduct.rows.length > 0) {
      console.log('ℹ️  O produto "Drink Comissionado" já existe');
    } else {
      console.log('📝 Criando produto "Drink Comissionado"...');
      await client.query(`
        INSERT INTO produtos (nome, categoria_id, preco, tipo, comissao_fixa, ativo)
        VALUES ('Drink Comissionado', 6, 50.00, 'comissionado', 20.00, true)
      `);
      console.log('✅ Produto "Drink Comissionado" criado com sucesso');
    }

    // Listar produtos comissionados
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

    console.log('\n📊 Produtos Comissionados:');
    console.log('═══════════════════════════════════════════════════════════════');
    produtos.rows.forEach((p: any) => {
      console.log(`  ${p.nome}`);
      console.log(`    Preço: R$ ${parseFloat(p.preco).toFixed(2)}`);
      console.log(`    ${p.tipo_comissao}`);
      console.log('');
    });
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error: any) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
applyMigration()
  .then(() => {
    console.log('\n✨ Migração concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha ao aplicar migração:', error);
    process.exit(1);
  });
