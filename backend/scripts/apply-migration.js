#!/usr/bin/env node
/**
 * Script para aplicar migrações no banco de dados
 * Uso: node scripts/apply-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurar conexão com o banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:admin123@postgres:5432/bar_system',
});

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectado ao banco de dados');

    // Ler o script de migração consolidado
    const migrationPath = path.join(__dirname, '../database/migrations/apply_all_migrations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Aplicando migração...');

    // Executar a migração
    const result = await client.query(migrationSQL);

    console.log('✅ Migração aplicada com sucesso!');

    // Verificar os produtos com comissão
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
    produtos.rows.forEach(p => {
      console.log(`  ${p.nome}`);
      console.log(`    Preço: R$ ${parseFloat(p.preco).toFixed(2)}`);
      console.log(`    ${p.tipo_comissao}`);
      console.log('');
    });
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);

    // Se a coluna já existe, não é um erro crítico
    if (error.message.includes('already exists') || error.message.includes('já existe')) {
      console.log('ℹ️  Algumas alterações já foram aplicadas anteriormente');
      process.exit(0);
    }

    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
applyMigration()
  .then(() => {
    console.log('\n✨ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha ao aplicar migração:', error);
    process.exit(1);
  });
