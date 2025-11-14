import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// Listar comandas abertas
export const listarComandasAbertas = asyncHandler(async (_req: AuthRequest, res: Response) => {
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
      a.nome as acompanhante_nome,
      cq.descricao as tempo_quarto,
      CASE
        WHEN ic.tipo_item = 'quarto' THEN
          'Quarto ' || ic.numero_quarto || ' - ' || COALESCE(cq.descricao, '') ||
          ' - ' || (
            SELECT string_agg(acomp.nome, ', ')
            FROM servico_quarto_acompanhantes sqa
            JOIN acompanhantes acomp ON acomp.id = sqa.acompanhante_id
            WHERE sqa.item_comanda_id = ic.id
          )
        ELSE p.nome
      END as produto_nome
     FROM itens_comanda ic
     LEFT JOIN produtos p ON p.id = ic.produto_id
     LEFT JOIN acompanhantes a ON a.id = ic.acompanhante_id
     LEFT JOIN configuracao_quartos cq ON cq.id = ic.configuracao_quarto_id
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

    // Verificar se o produto tem comissão fixa
    if (produto.comissao_fixa !== null && produto.comissao_fixa !== undefined) {
      // Usar comissão fixa por quantidade
      valor_comissao = produto.comissao_fixa * quantidade;
    } else {
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

// ============================================
// SERVIÇO DE QUARTO
// ============================================

// Adicionar serviço de quarto com múltiplas acompanhantes
export const adicionarServicoQuarto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { comanda_id, numero_quarto, configuracao_quarto_id, acompanhante_ids } = req.body;
  const usuario_id = req.user!.id;

  // Validações
  if (!numero_quarto) {
    throw new AppError('Número do quarto é obrigatório', 400);
  }

  if (!configuracao_quarto_id) {
    throw new AppError('Configuração de tempo/preço é obrigatória', 400);
  }

  if (!acompanhante_ids || !Array.isArray(acompanhante_ids) || acompanhante_ids.length === 0) {
    throw new AppError('É obrigatório selecionar pelo menos uma acompanhante', 400);
  }

  // Verificar se a comanda está aberta
  const comandaResult = await pool.query(
    'SELECT * FROM comandas WHERE id = $1 AND status = $2',
    [comanda_id, 'aberta']
  );

  if (comandaResult.rows.length === 0) {
    throw new AppError('Comanda não encontrada ou já foi fechada', 404);
  }

  // Verificar se o quarto existe e está ativo
  const quartoResult = await pool.query(
    'SELECT * FROM quartos WHERE numero = $1 AND ativo = true',
    [numero_quarto]
  );

  if (quartoResult.rows.length === 0) {
    throw new AppError('Quarto não encontrado ou inativo', 404);
  }

  // Buscar configuração de preço
  const configResult = await pool.query(
    'SELECT * FROM configuracao_quartos WHERE id = $1 AND ativo = true',
    [configuracao_quarto_id]
  );

  if (configResult.rows.length === 0) {
    throw new AppError('Configuração de tempo/preço não encontrada ou inativa', 404);
  }

  const configuracao = configResult.rows[0];
  const valor_servico = parseFloat(configuracao.valor);

  // Verificar se todas as acompanhantes existem e estão ativas
  const acompanhantesResult = await pool.query(
    'SELECT id, nome FROM acompanhantes WHERE id = ANY($1) AND ativa = true',
    [acompanhante_ids]
  );

  if (acompanhantesResult.rows.length !== acompanhante_ids.length) {
    throw new AppError('Uma ou mais acompanhantes não foram encontradas ou estão inativas', 404);
  }

  // Iniciar transação
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Obter horário de Brasília
    const horaBrasiliaResult = await client.query('SELECT get_brasilia_time() as hora');
    const hora_entrada = horaBrasiliaResult.rows[0].hora;

    // Inserir item na comanda
    // Nota: Não tem comissão para serviço de quarto, conforme requisito
    const itemResult = await client.query(
      `INSERT INTO itens_comanda
       (comanda_id, produto_id, quantidade, valor_unitario, valor_total, valor_comissao,
        tipo_item, numero_quarto, hora_entrada, configuracao_quarto_id, usuario_id)
       VALUES ($1, NULL, 1, $2, $2, 0, 'quarto', $3, $4, $5, $6)
       RETURNING *`,
      [comanda_id, valor_servico, numero_quarto, hora_entrada, configuracao_quarto_id, usuario_id]
    );

    const item = itemResult.rows[0];

    // Inserir relacionamento com as acompanhantes
    for (const acompanhante_id of acompanhante_ids) {
      await client.query(
        `INSERT INTO servico_quarto_acompanhantes
         (item_comanda_id, acompanhante_id)
         VALUES ($1, $2)`,
        [item.id, acompanhante_id]
      );
    }

    await client.query('COMMIT');

    // Buscar dados completos do item com acompanhantes
    const itemCompletoResult = await pool.query(
      `SELECT
         ic.*,
         ARRAY_AGG(json_build_object(
           'id', a.id,
           'nome', a.nome,
           'apelido', a.apelido
         )) as acompanhantes
       FROM itens_comanda ic
       LEFT JOIN servico_quarto_acompanhantes sqa ON sqa.item_comanda_id = ic.id
       LEFT JOIN acompanhantes a ON a.id = sqa.acompanhante_id
       WHERE ic.id = $1
       GROUP BY ic.id`,
      [item.id]
    );

    const response: ApiResponse = {
      success: true,
      data: itemCompletoResult.rows[0],
      message: `Serviço de quarto ${numero_quarto} lançado com sucesso`,
    };

    res.status(201).json(response);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
