import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// Listar todas acompanhantes
export const listarAcompanhantes = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM acompanhantes ORDER BY nome`
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Listar acompanhantes ativas hoje
export const listarAcompanhantesAtivas = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT a.*, aad.data, aad.hora_ativacao
     FROM acompanhantes a
     JOIN acompanhantes_ativas_dia aad ON aad.acompanhante_id = a.id
     WHERE aad.data = CURRENT_DATE AND a.ativa = true
     ORDER BY a.nome`
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Criar acompanhante
export const criarAcompanhante = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome, apelido, telefone, documento, percentual_comissao, tipo_acompanhante, numero_pulseira_fixa } = req.body;

  // Validar tipo de acompanhante
  const tipo = tipo_acompanhante || 'rotativa';

  if (tipo !== 'fixa' && tipo !== 'rotativa') {
    throw new AppError('Tipo de acompanhante inválido. Use "fixa" ou "rotativa"', 400);
  }

  // Se for fixa, validar pulseira
  if (tipo === 'fixa') {
    if (!numero_pulseira_fixa) {
      throw new AppError('Acompanhante fixa deve ter um número de pulseira', 400);
    }
    if (numero_pulseira_fixa < 1 || numero_pulseira_fixa > 1000) {
      throw new AppError('Número de pulseira deve estar entre 1 e 1000', 400);
    }

    // Verificar se a pulseira já está sendo usada
    const pulseiraEmUso = await pool.query(
      'SELECT id, nome FROM acompanhantes WHERE numero_pulseira_fixa = $1 AND tipo_acompanhante = $2',
      [numero_pulseira_fixa, 'fixa']
    );

    if (pulseiraEmUso.rows.length > 0) {
      throw new AppError(`Pulseira ${numero_pulseira_fixa} já está reservada para ${pulseiraEmUso.rows[0].nome}`, 400);
    }
  }

  const result = await pool.query(
    `INSERT INTO acompanhantes (nome, apelido, telefone, documento, percentual_comissao, tipo_acompanhante, numero_pulseira_fixa)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [nome, apelido, telefone, documento, percentual_comissao || 40, tipo, numero_pulseira_fixa || null]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Acompanhante cadastrada com sucesso',
  };

  res.status(201).json(response);
});

// Atualizar acompanhante
export const atualizarAcompanhante = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nome, apelido, telefone, documento, percentual_comissao, tipo_acompanhante, numero_pulseira_fixa } = req.body;

  // Buscar acompanhante atual
  const acompanhanteAtual = await pool.query(
    'SELECT * FROM acompanhantes WHERE id = $1',
    [id]
  );

  if (acompanhanteAtual.rows.length === 0) {
    throw new AppError('Acompanhante não encontrada', 404);
  }

  const tipo = tipo_acompanhante || acompanhanteAtual.rows[0].tipo_acompanhante;

  // Validar tipo de acompanhante
  if (tipo !== 'fixa' && tipo !== 'rotativa') {
    throw new AppError('Tipo de acompanhante inválido. Use "fixa" ou "rotativa"', 400);
  }

  // Se for fixa, validar pulseira
  let numeroPulseiraFinal = numero_pulseira_fixa;
  if (tipo === 'fixa') {
    if (!numero_pulseira_fixa) {
      throw new AppError('Acompanhante fixa deve ter um número de pulseira', 400);
    }
    if (numero_pulseira_fixa < 1 || numero_pulseira_fixa > 1000) {
      throw new AppError('Número de pulseira deve estar entre 1 e 1000', 400);
    }

    // Verificar se a pulseira já está sendo usada (exceto pela própria acompanhante)
    const pulseiraEmUso = await pool.query(
      'SELECT id, nome FROM acompanhantes WHERE numero_pulseira_fixa = $1 AND tipo_acompanhante = $2 AND id != $3',
      [numero_pulseira_fixa, 'fixa', id]
    );

    if (pulseiraEmUso.rows.length > 0) {
      throw new AppError(`Pulseira ${numero_pulseira_fixa} já está reservada para ${pulseiraEmUso.rows[0].nome}`, 400);
    }
  } else {
    // Se mudou de fixa para rotativa, remover pulseira fixa
    numeroPulseiraFinal = null;
  }

  const result = await pool.query(
    `UPDATE acompanhantes
     SET nome = $1, apelido = $2, telefone = $3, documento = $4, percentual_comissao = $5,
         tipo_acompanhante = $6, numero_pulseira_fixa = $7
     WHERE id = $8
     RETURNING *`,
    [nome, apelido, telefone, documento, percentual_comissao, tipo, numeroPulseiraFinal, id]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Acompanhante atualizada com sucesso',
  };

  res.json(response);
});

// Ativar acompanhante para o dia
export const ativarAcompanhante = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Verificar se acompanhante existe
  const acompanhante = await pool.query(
    'SELECT * FROM acompanhantes WHERE id = $1',
    [id]
  );

  if (acompanhante.rows.length === 0) {
    throw new AppError('Acompanhante não encontrada', 404);
  }

  // Verificar se já está ativa hoje
  const jaAtiva = await pool.query(
    'SELECT id FROM acompanhantes_ativas_dia WHERE acompanhante_id = $1 AND data = CURRENT_DATE',
    [id]
  );

  if (jaAtiva.rows.length > 0) {
    throw new AppError('Acompanhante já está ativa para hoje', 400);
  }

  // Ativar
  await pool.query(
    `INSERT INTO acompanhantes_ativas_dia (acompanhante_id, data)
     VALUES ($1, CURRENT_DATE)`,
    [id]
  );

  // Atribuir pulseira usando a função do banco de dados
  try {
    const resultPulseira = await pool.query(
      'SELECT atribuir_pulseira($1) as numero_pulseira',
      [id]
    );

    const numeroPulseira = resultPulseira.rows[0].numero_pulseira;

    const response: ApiResponse = {
      success: true,
      message: `Acompanhante ativada para hoje com pulseira ${numeroPulseira}`,
      data: {
        numero_pulseira: numeroPulseira,
      },
    };

    res.json(response);
  } catch (error: any) {
    // Se falhou ao atribuir pulseira, desfazer a ativação
    await pool.query(
      'DELETE FROM acompanhantes_ativas_dia WHERE acompanhante_id = $1 AND data = CURRENT_DATE',
      [id]
    );
    throw new AppError(error.message || 'Erro ao atribuir pulseira', 400);
  }
});

// Desativar acompanhante do dia
export const desativarAcompanhante = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Devolver pulseira usando a função do banco de dados
  await pool.query(
    'SELECT devolver_pulseira($1)',
    [id]
  );

  // Desativar
  await pool.query(
    'DELETE FROM acompanhantes_ativas_dia WHERE acompanhante_id = $1 AND data = CURRENT_DATE',
    [id]
  );

  const response: ApiResponse = {
    success: true,
    message: 'Acompanhante desativada do dia e pulseira devolvida',
  };

  res.json(response);
});

// Relatório de comissões da acompanhante
export const relatorioComissoes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { data_inicio, data_fim } = req.query;

  let query = `
    SELECT
      ic.*,
      p.nome as produto_nome,
      c.numero as comanda_numero,
      c.data_fechamento
    FROM itens_comanda ic
    JOIN produtos p ON p.id = ic.produto_id
    JOIN comandas c ON c.id = ic.comanda_id
    WHERE ic.acompanhante_id = $1 AND ic.cancelado = false AND c.status = 'fechada'
  `;

  const params: any[] = [id];

  if (data_inicio && data_fim) {
    query += ' AND c.data_fechamento BETWEEN $2 AND $3';
    params.push(data_inicio, data_fim);
  }

  query += ' ORDER BY ic.created_at DESC';

  const itensResult = await pool.query(query, params);

  // Calcular totais
  const totalComissoes = itensResult.rows.reduce((sum, item) => sum + parseFloat(item.valor_comissao), 0);

  const response: ApiResponse = {
    success: true,
    data: {
      itens: itensResult.rows,
      total_comissoes: totalComissoes,
      total_itens: itensResult.rows.length,
    },
  };

  res.json(response);
});

// Listar pulseiras disponíveis
export const listarPulseirasDisponiveis = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM vw_pulseiras_disponiveis ORDER BY numero`
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Listar pulseiras ativas hoje
export const listarPulseirasAtivas = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM vw_pulseiras_ativas_hoje ORDER BY numero_pulseira`
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Buscar pulseira específica
export const buscarPulseira = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { numero } = req.params;

  if (parseInt(numero) < 1 || parseInt(numero) > 1000) {
    throw new AppError('Número de pulseira deve estar entre 1 e 1000', 400);
  }

  const result = await pool.query(
    `SELECT * FROM vw_pulseiras_disponiveis WHERE numero = $1`,
    [numero]
  );

  if (result.rows.length === 0) {
    throw new AppError('Pulseira não encontrada', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

// Estatísticas de pulseiras
export const estatisticasPulseiras = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'disponivel') as disponiveis,
      COUNT(*) FILTER (WHERE status = 'reservada_fixa') as reservadas_fixas,
      COUNT(*) FILTER (WHERE status = 'em_uso') as em_uso,
      COUNT(*) as total
    FROM vw_pulseiras_disponiveis
  `);

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

// Listar acompanhantes presentes hoje (com status de comissões)
export const listarAcompanhantesPresentes = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM vw_acompanhantes_presentes_hoje ORDER BY
     CASE
       WHEN status_atual = 'ativa' THEN 1
       WHEN periodos_pendentes > 0 THEN 2
       ELSE 3
     END,
     nome`
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Encerrar período de acompanhante
export const encerrarPeriodo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { periodoId } = req.params;
  const { marcar_como_paga } = req.body;

  const result = await pool.query(
    'SELECT * FROM encerrar_periodo_acompanhante($1, $2)',
    [periodoId, marcar_como_paga || false]
  );

  if (result.rows.length === 0) {
    throw new AppError('Erro ao encerrar período', 500);
  }

  const periodo = result.rows[0];

  const response: ApiResponse = {
    success: true,
    data: {
      periodo_id: periodo.periodo_id,
      valor_comissoes: parseFloat(periodo.valor_comissoes),
      total_itens: periodo.total_itens,
      status: periodo.status,
    },
    message: `Período encerrado. ${periodo.status === 'encerrada_paga' ? 'Comissões pagas' : 'Comissões pendentes de pagamento'}`,
  };

  res.json(response);
});

// Marcar comissões como pagas
export const marcarComissoesPagas = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { periodoId } = req.params;
  const { observacoes } = req.body;

  await pool.query(
    'SELECT marcar_comissoes_pagas($1, $2)',
    [periodoId, observacoes || null]
  );

  const response: ApiResponse = {
    success: true,
    message: 'Comissões marcadas como pagas com sucesso',
  };

  res.json(response);
});

// Listar histórico de ativações do dia
export const listarHistoricoAtivacoes = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM vw_historico_ativacoes_dia ORDER BY hora_ativacao DESC`
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Estatísticas do dia
export const estatisticasDia = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT
      COUNT(DISTINCT acompanhante_id) as total_acompanhantes,
      COUNT(*) as total_ativacoes,
      COUNT(*) FILTER (WHERE status_periodo = 'ativa') as periodos_ativos,
      COUNT(*) FILTER (WHERE status_periodo = 'encerrada_pendente') as periodos_pendentes,
      COUNT(*) FILTER (WHERE status_periodo = 'encerrada_paga') as periodos_pagos,
      COALESCE(SUM(valor_comissoes_periodo) FILTER (WHERE status_periodo = 'ativa'), 0) as comissoes_ativas,
      COALESCE(SUM(valor_comissoes_periodo) FILTER (WHERE status_periodo = 'encerrada_pendente'), 0) as comissoes_pendentes,
      COALESCE(SUM(valor_comissoes_periodo) FILTER (WHERE status_periodo = 'encerrada_paga'), 0) as comissoes_pagas,
      COALESCE(SUM(valor_comissoes_periodo), 0) as comissoes_total
    FROM acompanhantes_ativas_dia
    WHERE data = CURRENT_DATE
  `);

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});
