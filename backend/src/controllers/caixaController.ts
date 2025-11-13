import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// Abrir caixa
export const abrirCaixa = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { valor_abertura } = req.body;
  const usuario_id = req.user!.id;

  // Verificar se já existe um caixa aberto
  const caixaAberto = await pool.query(
    'SELECT id FROM movimentos_caixa WHERE status = $1',
    ['aberto']
  );

  if (caixaAberto.rows.length > 0) {
    throw new AppError('Já existe um caixa aberto. Feche-o antes de abrir um novo.', 400);
  }

  // Abrir novo caixa
  const result = await pool.query(
    `INSERT INTO movimentos_caixa (usuario_id, valor_abertura, status)
     VALUES ($1, $2, 'aberto')
     RETURNING *`,
    [usuario_id, valor_abertura]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Caixa aberto com sucesso',
  };

  res.status(201).json(response);
});

// Buscar caixa aberto
export const buscarCaixaAberto = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT
      mc.*,
      u.nome as operador_nome,
      (SELECT COUNT(*) FROM comandas WHERE movimento_caixa_id = mc.id AND status = 'aberta') as comandas_abertas,
      (SELECT COUNT(*) FROM comandas WHERE movimento_caixa_id = mc.id AND status = 'fechada') as comandas_fechadas,
      (SELECT COALESCE(SUM(total), 0) FROM comandas WHERE movimento_caixa_id = mc.id AND status = 'fechada') as total_vendas_calculado,
      (SELECT COALESCE(SUM(total_comissao), 0) FROM comandas WHERE movimento_caixa_id = mc.id AND status = 'fechada') as total_comissoes_calculado
     FROM movimentos_caixa mc
     JOIN usuarios u ON u.id = mc.usuario_id
     WHERE mc.status = 'aberto'
     ORDER BY mc.data_abertura DESC
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    throw new AppError('Não há caixa aberto', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

// Registrar sangria
export const registrarSangria = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { valor, descricao } = req.body;
  const usuario_id = req.user!.id;

  // Buscar caixa aberto
  const caixaResult = await pool.query(
    'SELECT id FROM movimentos_caixa WHERE status = $1',
    ['aberto']
  );

  if (caixaResult.rows.length === 0) {
    throw new AppError('Não há caixa aberto', 404);
  }

  const movimento_caixa_id = caixaResult.rows[0].id;

  // Registrar sangria
  const result = await pool.query(
    `INSERT INTO lancamentos_caixa (movimento_caixa_id, tipo, valor, descricao, usuario_id)
     VALUES ($1, 'sangria', $2, $3, $4)
     RETURNING *`,
    [movimento_caixa_id, valor, descricao, usuario_id]
  );

  // Atualizar total de sangrias no movimento
  await pool.query(
    `UPDATE movimentos_caixa
     SET total_sangrias = total_sangrias + $1
     WHERE id = $2`,
    [valor, movimento_caixa_id]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Sangria registrada com sucesso',
  };

  res.status(201).json(response);
});

// Fechar caixa
export const fecharCaixa = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { valor_fechamento, observacoes } = req.body;

  // Buscar caixa aberto
  const caixaResult = await pool.query(
    'SELECT * FROM movimentos_caixa WHERE status = $1',
    ['aberto']
  );

  if (caixaResult.rows.length === 0) {
    throw new AppError('Não há caixa aberto', 404);
  }

  const caixa = caixaResult.rows[0];

  // Verificar se há comandas abertas
  const comandasAbertas = await pool.query(
    'SELECT COUNT(*) as total FROM comandas WHERE movimento_caixa_id = $1 AND status = $2',
    [caixa.id, 'aberta']
  );

  if (parseInt(comandasAbertas.rows[0].total) > 0) {
    throw new AppError('Não é possível fechar o caixa. Há comandas ainda abertas.', 400);
  }

  // Calcular totais
  const totaisResult = await pool.query(
    `SELECT
      COALESCE(SUM(total), 0) as total_vendas,
      COALESCE(SUM(total_comissao), 0) as total_comissoes
     FROM comandas
     WHERE movimento_caixa_id = $1 AND status = 'fechada'`,
    [caixa.id]
  );

  const { total_vendas, total_comissoes } = totaisResult.rows[0];

  // Fechar caixa
  const result = await pool.query(
    `UPDATE movimentos_caixa
     SET status = 'fechado',
         data_fechamento = CURRENT_TIMESTAMP,
         valor_fechamento = $1,
         total_vendas = $2,
         total_comissoes = $3,
         observacoes = $4
     WHERE id = $5
     RETURNING *`,
    [valor_fechamento, total_vendas, total_comissoes, observacoes, caixa.id]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Caixa fechado com sucesso',
  };

  res.json(response);
});

// Relatório do caixa
export const relatorioCaixa = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Buscar dados do caixa
  const caixaResult = await pool.query(
    `SELECT mc.*, u.nome as operador_nome
     FROM movimentos_caixa mc
     JOIN usuarios u ON u.id = mc.usuario_id
     WHERE mc.id = $1`,
    [id]
  );

  if (caixaResult.rows.length === 0) {
    throw new AppError('Caixa não encontrado', 404);
  }

  const caixa = caixaResult.rows[0];

  // Buscar comandas
  const comandasResult = await pool.query(
    `SELECT * FROM comandas
     WHERE movimento_caixa_id = $1
     ORDER BY numero`,
    [id]
  );

  // Buscar lançamentos
  const lancamentosResult = await pool.query(
    `SELECT lc.*, u.nome as usuario_nome
     FROM lancamentos_caixa lc
     JOIN usuarios u ON u.id = lc.usuario_id
     WHERE lc.movimento_caixa_id = $1
     ORDER BY lc.created_at`,
    [id]
  );

  // Buscar comissões por acompanhante
  const comissoesResult = await pool.query(
    `SELECT
      a.id,
      a.nome,
      a.apelido,
      COUNT(ic.id) as total_itens,
      COALESCE(SUM(ic.valor_comissao), 0) as total_comissoes
     FROM acompanhantes a
     JOIN itens_comanda ic ON ic.acompanhante_id = a.id
     JOIN comandas c ON c.id = ic.comanda_id
     WHERE c.movimento_caixa_id = $1 AND ic.cancelado = false
     GROUP BY a.id, a.nome, a.apelido
     ORDER BY a.nome`,
    [id]
  );

  const response: ApiResponse = {
    success: true,
    data: {
      caixa,
      comandas: comandasResult.rows,
      lancamentos: lancamentosResult.rows,
      comissoes: comissoesResult.rows,
    },
  };

  res.json(response);
});
