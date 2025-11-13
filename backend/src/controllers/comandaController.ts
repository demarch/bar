import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse, Comanda, ItemComanda } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// Listar comandas abertas
export const listarComandasAbertas = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT
      c.*,
      COUNT(ic.id) as total_itens,
      ARRAY_AGG(DISTINCT a.nome) FILTER (WHERE a.nome IS NOT NULL) as acompanhantes
    FROM comandas c
    LEFT JOIN itens_comanda ic ON ic.comanda_id = c.id AND ic.cancelado = false
    LEFT JOIN acompanhantes a ON a.id = ic.acompanhante_id
    WHERE c.status = 'aberta'
    GROUP BY c.id
    ORDER BY c.numero
  `);

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Criar nova comanda
export const criarComanda = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { numero, cliente_nome } = req.body;

  // Verificar se há um caixa aberto
  const caixaAberto = await pool.query(
    'SELECT id FROM movimentos_caixa WHERE status = $1 ORDER BY data_abertura DESC LIMIT 1',
    ['aberto']
  );

  if (caixaAberto.rows.length === 0) {
    throw new AppError('Não há caixa aberto. Abra um caixa antes de criar comandas.', 400);
  }

  const movimento_caixa_id = caixaAberto.rows[0].id;

  // Verificar se já existe comanda com este número no movimento atual
  const comandaExistente = await pool.query(
    'SELECT id FROM comandas WHERE numero = $1 AND movimento_caixa_id = $2',
    [numero, movimento_caixa_id]
  );

  if (comandaExistente.rows.length > 0) {
    throw new AppError('Já existe uma comanda com este número no movimento atual', 400);
  }

  // Criar comanda
  const result = await pool.query(
    `INSERT INTO comandas (numero, movimento_caixa_id, cliente_nome)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [numero, movimento_caixa_id, cliente_nome]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Comanda criada com sucesso',
  };

  res.status(201).json(response);
});

// Buscar comanda por número
export const buscarComanda = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { numero } = req.params;

  // Buscar comanda
  const comandaResult = await pool.query(
    `SELECT c.* FROM comandas c
     JOIN movimentos_caixa mc ON mc.id = c.movimento_caixa_id
     WHERE c.numero = $1 AND mc.status = 'aberto'
     ORDER BY c.data_abertura DESC
     LIMIT 1`,
    [numero]
  );

  if (comandaResult.rows.length === 0) {
    throw new AppError('Comanda não encontrada', 404);
  }

  const comanda = comandaResult.rows[0];

  // Buscar itens da comanda
  const itensResult = await pool.query(
    `SELECT
      ic.*,
      p.nome as produto_nome,
      p.categoria_id,
      a.nome as acompanhante_nome
     FROM itens_comanda ic
     JOIN produtos p ON p.id = ic.produto_id
     LEFT JOIN acompanhantes a ON a.id = ic.acompanhante_id
     WHERE ic.comanda_id = $1 AND ic.cancelado = false
     ORDER BY ic.created_at DESC`,
    [comanda.id]
  );

  const response: ApiResponse = {
    success: true,
    data: {
      ...comanda,
      itens: itensResult.rows,
    },
  };

  res.json(response);
});

// Adicionar item à comanda
export const adicionarItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { comanda_id, produto_id, quantidade, acompanhante_id } = req.body;
  const usuario_id = req.user!.id;

  // Buscar produto
  const produtoResult = await pool.query(
    'SELECT * FROM produtos WHERE id = $1 AND ativo = true',
    [produto_id]
  );

  if (produtoResult.rows.length === 0) {
    throw new AppError('Produto não encontrado ou inativo', 404);
  }

  const produto = produtoResult.rows[0];

  // Verificar se a comanda está aberta
  const comandaResult = await pool.query(
    'SELECT * FROM comandas WHERE id = $1 AND status = $2',
    [comanda_id, 'aberta']
  );

  if (comandaResult.rows.length === 0) {
    throw new AppError('Comanda não encontrada ou já foi fechada', 404);
  }

  // Calcular valores
  const valor_unitario = produto.preco;
  const valor_total = valor_unitario * quantidade;
  let valor_comissao = 0;
  let tipo_item: 'normal' | 'comissionado' = 'normal';

  // Se for produto comissionado, calcular comissão
  if (produto.tipo === 'comissionado' && acompanhante_id) {
    tipo_item = 'comissionado';

    // Buscar percentual de comissão da acompanhante
    const acompanhanteResult = await pool.query(
      'SELECT percentual_comissao FROM acompanhantes WHERE id = $1 AND ativa = true',
      [acompanhante_id]
    );

    if (acompanhanteResult.rows.length === 0) {
      throw new AppError('Acompanhante não encontrada ou inativa', 404);
    }

    const percentual = acompanhanteResult.rows[0].percentual_comissao;
    valor_comissao = (valor_total * percentual) / 100;
  }

  // Inserir item
  const result = await pool.query(
    `INSERT INTO itens_comanda
     (comanda_id, produto_id, acompanhante_id, quantidade, valor_unitario, valor_total, valor_comissao, tipo_item, usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [comanda_id, produto_id, acompanhante_id, quantidade, valor_unitario, valor_total, valor_comissao, tipo_item, usuario_id]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Item adicionado com sucesso',
  };

  res.status(201).json(response);
});

// Fechar comanda
export const fecharComanda = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { forma_pagamento, observacoes } = req.body;

  // Verificar se há quartos ocupados
  const quartosOcupados = await pool.query(
    'SELECT id FROM ocupacao_quartos WHERE comanda_id = $1 AND status = $2',
    [id, 'ocupado']
  );

  if (quartosOcupados.rows.length > 0) {
    throw new AppError('Não é possível fechar a comanda. Há quartos ainda ocupados.', 400);
  }

  // Fechar comanda
  const result = await pool.query(
    `UPDATE comandas
     SET status = 'fechada',
         data_fechamento = CURRENT_TIMESTAMP,
         forma_pagamento = $2,
         observacoes = $3
     WHERE id = $1 AND status = 'aberta'
     RETURNING *`,
    [id, forma_pagamento, observacoes]
  );

  if (result.rows.length === 0) {
    throw new AppError('Comanda não encontrada ou já foi fechada', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Comanda fechada com sucesso',
  };

  res.json(response);
});

// Cancelar item da comanda
export const cancelarItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { motivo_cancelamento } = req.body;

  if (!motivo_cancelamento) {
    throw new AppError('Motivo do cancelamento é obrigatório', 400);
  }

  const result = await pool.query(
    `UPDATE itens_comanda
     SET cancelado = true, motivo_cancelamento = $2
     WHERE id = $1 AND cancelado = false
     RETURNING *`,
    [id, motivo_cancelamento]
  );

  if (result.rows.length === 0) {
    throw new AppError('Item não encontrado ou já foi cancelado', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Item cancelado com sucesso',
  };

  res.json(response);
});
