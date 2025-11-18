import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * GET /api/admin/dashboard
 * Retorna estatísticas gerais para o dashboard administrativo
 */
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - 7);

    // Total de vendas do mês
    const vendasMesResult = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as total_vendas_mes
       FROM comandas
       WHERE data_abertura >= $1
         AND status = 'fechada'`,
      [primeiroDiaMes]
    );

    // Comandas abertas hoje
    const comandasAbertasResult = await pool.query(
      `SELECT COUNT(*) as comandas_abertas
       FROM comandas
       WHERE DATE(data_abertura) = DATE(NOW())
         AND status = 'aberta'`
    );

    // Produtos mais vendidos (última semana)
    const produtosMaisVendidosResult = await pool.query(
      `SELECT
         p.nome as produto_nome,
         COUNT(ci.id) as quantidade,
         SUM(ci.preco_unitario * ci.quantidade) as total_vendas
       FROM comanda_itens ci
       INNER JOIN produtos p ON ci.produto_id = p.id
       INNER JOIN comandas c ON ci.comanda_id = c.id
       WHERE c.data_abertura >= $1
       GROUP BY p.id, p.nome
       ORDER BY quantidade DESC
       LIMIT 5`,
      [inicioSemana]
    );

    // Comissões pendentes
    const comissoesPendentesResult = await pool.query(
      `SELECT COALESCE(SUM(valor_comissao), 0) as comissoes_pendentes
       FROM comissao_periodos
       WHERE pago = false`
    );

    // Quartos ocupados no momento
    const quartosOcupadosResult = await pool.query(
      `SELECT COUNT(*) as quartos_ocupados
       FROM quarto_ocupacoes
       WHERE fim_ocupacao IS NULL`
    );

    // Vendas por dia (últimos 7 dias) para o gráfico
    const vendasPorDiaResult = await pool.query(
      `SELECT
         DATE(data_abertura) as data,
         COALESCE(SUM(total), 0) as total_vendas
       FROM comandas
       WHERE data_abertura >= $1
         AND status = 'fechada'
       GROUP BY DATE(data_abertura)
       ORDER BY DATE(data_abertura) ASC`,
      [inicioSemana]
    );

    // Total de comandas fechadas no mês
    const totalComandasMesResult = await pool.query(
      `SELECT COUNT(*) as total_comandas
       FROM comandas
       WHERE data_abertura >= $1
         AND status = 'fechada'`,
      [primeiroDiaMes]
    );

    // Ticket médio do mês
    const ticketMedioMes =
      parseInt(totalComandasMesResult.rows[0].total_comandas) > 0
        ? parseFloat(vendasMesResult.rows[0].total_vendas_mes) /
          parseInt(totalComandasMesResult.rows[0].total_comandas)
        : 0;

    const stats = {
      vendas_mes: parseFloat(vendasMesResult.rows[0].total_vendas_mes || 0),
      comandas_abertas: parseInt(comandasAbertasResult.rows[0].comandas_abertas || 0),
      comissoes_pendentes: parseFloat(comissoesPendentesResult.rows[0].comissoes_pendentes || 0),
      quartos_ocupados: parseInt(quartosOcupadosResult.rows[0].quartos_ocupados || 0),
      ticket_medio: ticketMedioMes,
      produtos_mais_vendidos: produtosMaisVendidosResult.rows.map(row => ({
        nome: row.produto_nome,
        quantidade: parseInt(row.quantidade),
        total: parseFloat(row.total_vendas),
      })),
      vendas_por_dia: vendasPorDiaResult.rows.map(row => ({
        data: row.data,
        total: parseFloat(row.total_vendas),
      })),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas do dashboard',
    });
  }
};
