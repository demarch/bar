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
  const { nome, apelido, telefone, documento, percentual_comissao } = req.body;

  const result = await pool.query(
    `INSERT INTO acompanhantes (nome, apelido, telefone, documento, percentual_comissao)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [nome, apelido, telefone, documento, percentual_comissao || 40]
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
  const { nome, apelido, telefone, documento, percentual_comissao } = req.body;

  const result = await pool.query(
    `UPDATE acompanhantes
     SET nome = $1, apelido = $2, telefone = $3, documento = $4, percentual_comissao = $5
     WHERE id = $6
     RETURNING *`,
    [nome, apelido, telefone, documento, percentual_comissao, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Acompanhante não encontrada', 404);
  }

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

  const response: ApiResponse = {
    success: true,
    message: 'Acompanhante ativada para hoje',
  };

  res.json(response);
});

// Desativar acompanhante do dia
export const desativarAcompanhante = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await pool.query(
    'DELETE FROM acompanhantes_ativas_dia WHERE acompanhante_id = $1 AND data = CURRENT_DATE',
    [id]
  );

  const response: ApiResponse = {
    success: true,
    message: 'Acompanhante desativada do dia',
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
