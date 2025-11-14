import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// Relatório de Fluxo de Caixa
export const relatorioFluxoCaixa = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data_inicio, data_fim } = req.query;

  if (!data_inicio || !data_fim) {
    throw new AppError('Data de início e fim são obrigatórias', 400);
  }

  // Buscar todos os caixas do período
  const caixasResult = await pool.query(
    `SELECT
      id,
      data_abertura,
      data_fechamento,
      valor_abertura,
      valor_fechamento,
      total_vendas,
      total_sangrias,
      total_comissoes,
      observacoes
    FROM movimentos_caixa
    WHERE DATE(data_abertura) BETWEEN $1 AND $2
    ORDER BY data_abertura DESC`,
    [data_inicio, data_fim]
  );

  // Calcular totais
  const totais = caixasResult.rows.reduce(
    (acc, caixa) => ({
      total_vendas: acc.total_vendas + parseFloat(caixa.total_vendas || '0'),
      total_sangrias: acc.total_sangrias + parseFloat(caixa.total_sangrias || '0'),
      total_comissoes: acc.total_comissoes + parseFloat(caixa.total_comissoes || '0'),
      lucro_liquido: acc.lucro_liquido + (parseFloat(caixa.total_vendas || '0') - parseFloat(caixa.total_comissoes || '0')),
    }),
    { total_vendas: 0, total_sangrias: 0, total_comissoes: 0, lucro_liquido: 0 }
  );

  const response: ApiResponse = {
    success: true,
    data: {
      caixas: caixasResult.rows,
      totais,
      periodo: {
        data_inicio,
        data_fim,
      },
    },
  };

  res.json(response);
});

// Relatório de Comissões por Acompanhante
export const relatorioComissoes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data_inicio, data_fim } = req.query;

  if (!data_inicio || !data_fim) {
    throw new AppError('Data de início e fim são obrigatórias', 400);
  }

  // Buscar comissões agrupadas por acompanhante
  const comissoesResult = await pool.query(
    `SELECT
      a.id as acompanhante_id,
      a.nome as acompanhante_nome,
      a.apelido as acompanhante_apelido,
      COUNT(DISTINCT ic.id) as total_servicos,
      COUNT(DISTINCT ic.comanda_id) as total_comandas,
      SUM(ic.valor_comissao) as total_comissoes,
      SUM(ic.subtotal) as total_vendido
    FROM acompanhantes a
    LEFT JOIN itens_comanda ic ON ic.acompanhante_id = a.id AND ic.cancelado = false
    LEFT JOIN comandas c ON c.id = ic.comanda_id AND c.status = 'fechada'
    WHERE c.data_fechamento BETWEEN $1 AND $2
    GROUP BY a.id, a.nome, a.apelido
    HAVING SUM(ic.valor_comissao) > 0
    ORDER BY total_comissoes DESC`,
    [data_inicio, data_fim]
  );

  // Calcular totais gerais
  const totais = comissoesResult.rows.reduce(
    (acc, item) => ({
      total_servicos: acc.total_servicos + parseInt(item.total_servicos),
      total_comissoes: acc.total_comissoes + parseFloat(item.total_comissoes || '0'),
      total_vendido: acc.total_vendido + parseFloat(item.total_vendido || '0'),
    }),
    { total_servicos: 0, total_comissoes: 0, total_vendido: 0 }
  );

  const response: ApiResponse = {
    success: true,
    data: {
      comissoes: comissoesResult.rows,
      totais,
      periodo: {
        data_inicio,
        data_fim,
      },
    },
  };

  res.json(response);
});

// Relatório de Vendas por Produto
export const relatorioVendas = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data_inicio, data_fim } = req.query;

  if (!data_inicio || !data_fim) {
    throw new AppError('Data de início e fim são obrigatórias', 400);
  }

  // Vendas por produto
  const vendasProdutoResult = await pool.query(
    `SELECT
      p.id as produto_id,
      p.nome as produto_nome,
      cat.nome as categoria_nome,
      p.tipo as produto_tipo,
      COUNT(ic.id) as quantidade_vendida,
      SUM(ic.quantidade) as total_unidades,
      SUM(ic.subtotal) as total_vendido,
      SUM(ic.valor_comissao) as total_comissoes
    FROM produtos p
    LEFT JOIN categorias cat ON cat.id = p.categoria_id
    LEFT JOIN itens_comanda ic ON ic.produto_id = p.id AND ic.cancelado = false
    LEFT JOIN comandas c ON c.id = ic.comanda_id AND c.status = 'fechada'
    WHERE c.data_fechamento BETWEEN $1 AND $2
    GROUP BY p.id, p.nome, cat.nome, p.tipo
    HAVING SUM(ic.subtotal) > 0
    ORDER BY total_vendido DESC`,
    [data_inicio, data_fim]
  );

  // Vendas por categoria
  const vendasCategoriaResult = await pool.query(
    `SELECT
      cat.id as categoria_id,
      cat.nome as categoria_nome,
      COUNT(DISTINCT p.id) as produtos_diferentes,
      SUM(ic.quantidade) as total_unidades,
      SUM(ic.subtotal) as total_vendido
    FROM categorias cat
    LEFT JOIN produtos p ON p.categoria_id = cat.id
    LEFT JOIN itens_comanda ic ON ic.produto_id = p.id AND ic.cancelado = false
    LEFT JOIN comandas c ON c.id = ic.comanda_id AND c.status = 'fechada'
    WHERE c.data_fechamento BETWEEN $1 AND $2
    GROUP BY cat.id, cat.nome
    HAVING SUM(ic.subtotal) > 0
    ORDER BY total_vendido DESC`,
    [data_inicio, data_fim]
  );

  // Totais gerais
  const totais = vendasProdutoResult.rows.reduce(
    (acc, item) => ({
      total_itens: acc.total_itens + parseInt(item.quantidade_vendida),
      total_unidades: acc.total_unidades + parseFloat(item.total_unidades || '0'),
      total_vendido: acc.total_vendido + parseFloat(item.total_vendido || '0'),
      total_comissoes: acc.total_comissoes + parseFloat(item.total_comissoes || '0'),
    }),
    { total_itens: 0, total_unidades: 0, total_vendido: 0, total_comissoes: 0 }
  );

  const response: ApiResponse = {
    success: true,
    data: {
      vendas_por_produto: vendasProdutoResult.rows,
      vendas_por_categoria: vendasCategoriaResult.rows,
      totais,
      periodo: {
        data_inicio,
        data_fim,
      },
    },
  };

  res.json(response);
});

// Relatório de Rentabilidade
export const relatorioRentabilidade = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data_inicio, data_fim } = req.query;

  if (!data_inicio || !data_fim) {
    throw new AppError('Data de início e fim são obrigatórias', 400);
  }

  // Receitas
  const receitasResult = await pool.query(
    `SELECT
      SUM(total_vendas) as total_vendas
    FROM movimentos_caixa
    WHERE DATE(data_abertura) BETWEEN $1 AND $2 AND status = 'fechado'`,
    [data_inicio, data_fim]
  );

  // Despesas (comissões)
  const despesasResult = await pool.query(
    `SELECT
      SUM(total_comissoes) as total_comissoes
    FROM movimentos_caixa
    WHERE DATE(data_abertura) BETWEEN $1 AND $2 AND status = 'fechado'`,
    [data_inicio, data_fim]
  );

  // Sangrias
  const sangriasResult = await pool.query(
    `SELECT
      SUM(total_sangrias) as total_sangrias
    FROM movimentos_caixa
    WHERE DATE(data_abertura) BETWEEN $1 AND $2 AND status = 'fechado'`,
    [data_inicio, data_fim]
  );

  // Vendas por tipo de produto
  const vendasTipoResult = await pool.query(
    `SELECT
      p.tipo,
      SUM(ic.subtotal) as total,
      SUM(ic.valor_comissao) as comissoes,
      COUNT(ic.id) as quantidade_itens
    FROM itens_comanda ic
    JOIN produtos p ON p.id = ic.produto_id
    JOIN comandas c ON c.id = ic.comanda_id
    WHERE c.data_fechamento BETWEEN $1 AND $2
      AND c.status = 'fechada'
      AND ic.cancelado = false
    GROUP BY p.tipo`,
    [data_inicio, data_fim]
  );

  // Vendas por forma de pagamento
  const vendasPagamentoResult = await pool.query(
    `SELECT
      forma_pagamento,
      COUNT(*) as quantidade_comandas,
      SUM(total) as total_valor
    FROM comandas
    WHERE data_fechamento BETWEEN $1 AND $2
      AND status = 'fechada'
    GROUP BY forma_pagamento
    ORDER BY total_valor DESC`,
    [data_inicio, data_fim]
  );

  const total_vendas = parseFloat(receitasResult.rows[0]?.total_vendas || '0');
  const total_comissoes = parseFloat(despesasResult.rows[0]?.total_comissoes || '0');
  const total_sangrias = parseFloat(sangriasResult.rows[0]?.total_sangrias || '0');
  const lucro_liquido = total_vendas - total_comissoes;
  const margem_liquida = total_vendas > 0 ? (lucro_liquido / total_vendas) * 100 : 0;

  const response: ApiResponse = {
    success: true,
    data: {
      resumo: {
        total_vendas,
        total_comissoes,
        total_sangrias,
        lucro_bruto: total_vendas,
        lucro_liquido,
        margem_liquida,
      },
      vendas_por_tipo: vendasTipoResult.rows,
      vendas_por_pagamento: vendasPagamentoResult.rows,
      periodo: {
        data_inicio,
        data_fim,
      },
    },
  };

  res.json(response);
});
