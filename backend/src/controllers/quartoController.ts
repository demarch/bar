import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// Listar configurações de quartos
export const listarConfiguracoesQuartos = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM configuracao_quartos WHERE ativo = true ORDER BY ordem, minutos'
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Listar quartos disponíveis
export const listarQuartosDisponiveis = asyncHandler(async (_req: AuthRequest, res: Response) => {
  // Buscar configuração do número total de quartos (padrão: 10)
  const configResult = await pool.query(
    `SELECT valor FROM configuracoes_sistema WHERE chave = 'total_quartos'`
  );

  const totalQuartos = configResult.rows.length > 0 ? parseInt(configResult.rows[0].valor) : 10;

  // Buscar quartos ocupados
  const ocupadosResult = await pool.query(
    `SELECT DISTINCT numero_quarto FROM ocupacao_quartos WHERE status = 'ocupado'`
  );

  const quartosOcupados = ocupadosResult.rows.map(row => row.numero_quarto);

  // Gerar lista de todos os quartos com status
  const quartos = [];
  for (let i = 1; i <= totalQuartos; i++) {
    quartos.push({
      numero: i,
      nome: `Quarto ${i}`,
      ocupado: quartosOcupados.includes(i),
      disponivel: !quartosOcupados.includes(i),
    });
  }

  const response: ApiResponse = {
    success: true,
    data: quartos,
  };

  res.json(response);
});

// Listar quartos ocupados
export const listarQuartosOcupados = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT
      oq.*,
      a.nome as acompanhante_nome,
      c.numero as comanda_numero,
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - oq.hora_inicio))/60 as minutos_decorridos
    FROM ocupacao_quartos oq
    JOIN acompanhantes a ON a.id = oq.acompanhante_id
    JOIN comandas c ON c.id = oq.comanda_id
    WHERE oq.status = 'ocupado'
    ORDER BY oq.numero_quarto
  `);

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Ocupar quarto
export const ocuparQuarto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { comanda_id, acompanhante_id, numero_quarto } = req.body;
  const usuario_id = req.user!.id;

  // Verificar se a comanda existe e está aberta
  const comandaResult = await pool.query(
    'SELECT * FROM comandas WHERE id = $1 AND status = $2',
    [comanda_id, 'aberta']
  );

  if (comandaResult.rows.length === 0) {
    throw new AppError('Comanda não encontrada ou já foi fechada', 404);
  }

  // Verificar se a acompanhante existe
  const acompanhanteResult = await pool.query(
    'SELECT * FROM acompanhantes WHERE id = $1',
    [acompanhante_id]
  );

  if (acompanhanteResult.rows.length === 0) {
    throw new AppError('Acompanhante não encontrada', 404);
  }

  const acompanhante = acompanhanteResult.rows[0];

  // Verificar se o quarto já está ocupado (em ocupacao_quartos OU itens_comanda tempo_livre)
  // Nota: ocupacao_quartos.numero_quarto é INTEGER, itens_comanda.numero_quarto é VARCHAR
  const quartoOcupadoResult = await pool.query(
    `SELECT 1 FROM ocupacao_quartos WHERE numero_quarto = $1 AND status = 'ocupado'
     UNION
     SELECT 1 FROM itens_comanda WHERE numero_quarto = $1::text AND tipo_item = 'quarto'
       AND tempo_livre = true AND status_tempo_livre = 'em_andamento' AND cancelado = false`,
    [numero_quarto]
  );

  if (quartoOcupadoResult.rows.length > 0) {
    throw new AppError(`O quarto ${numero_quarto} já está ocupado`, 400);
  }

  // Verificar se a acompanhante já está em outro quarto
  const acompanhanteOcupadaResult = await pool.query(
    `SELECT 1 FROM ocupacao_quartos WHERE acompanhante_id = $1 AND status = 'ocupado'
     UNION
     SELECT 1 FROM servico_quarto_acompanhantes sqa
     JOIN itens_comanda ic ON ic.id = sqa.item_comanda_id
     WHERE sqa.acompanhante_id = $1
       AND ic.tipo_item = 'quarto'
       AND ic.tempo_livre = true
       AND ic.status_tempo_livre = 'em_andamento'
       AND ic.cancelado = false`,
    [acompanhante_id]
  );

  if (acompanhanteOcupadaResult.rows.length > 0) {
    throw new AppError(`A acompanhante ${acompanhante.nome} já está em outro quarto`, 400);
  }

  // Iniciar transação
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Obter horário de Brasília
    const horaBrasiliaResult = await client.query('SELECT get_brasilia_time() as hora');
    const hora_entrada = horaBrasiliaResult.rows[0].hora;

    // Inserir item na comanda com tempo_livre = true (valor inicial R$ 0)
    const itemResult = await client.query(
      `INSERT INTO itens_comanda
       (comanda_id, produto_id, quantidade, valor_unitario, valor_total, valor_comissao,
        tipo_item, numero_quarto, hora_entrada, tempo_livre, status_tempo_livre, usuario_id)
       VALUES ($1, NULL, 1, 0, 0, 0, 'quarto', $2, $3, true, 'em_andamento', $4)
       RETURNING *`,
      [comanda_id, numero_quarto, hora_entrada, usuario_id]
    );

    const item = itemResult.rows[0];

    // Inserir relacionamento com a acompanhante
    await client.query(
      `INSERT INTO servico_quarto_acompanhantes
       (item_comanda_id, acompanhante_id)
       VALUES ($1, $2)`,
      [item.id, acompanhante_id]
    );

    // Registrar ocupação com referência ao item da comanda
    const ocupacaoResult = await client.query(
      `INSERT INTO ocupacao_quartos (comanda_id, acompanhante_id, numero_quarto, status, item_comanda_id)
       VALUES ($1, $2, $3, 'ocupado', $4)
       RETURNING *`,
      [comanda_id, acompanhante_id, numero_quarto, item.id]
    );

    await client.query('COMMIT');

    const response: ApiResponse = {
      success: true,
      data: {
        ...ocupacaoResult.rows[0],
        item_comanda: item,
      },
      message: 'Quarto ocupado com sucesso',
    };

    res.status(201).json(response);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Finalizar ocupação de quarto
export const finalizarOcupacao = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Buscar ocupação
  const ocupacaoResult = await pool.query(
    'SELECT * FROM ocupacao_quartos WHERE id = $1 AND status = $2',
    [id, 'ocupado']
  );

  if (ocupacaoResult.rows.length === 0) {
    throw new AppError('Ocupação não encontrada ou já foi finalizada', 404);
  }

  const ocupacao = ocupacaoResult.rows[0];

  // Calcular tempo decorrido em minutos
  const tempoResult = await pool.query(
    'SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - $1))/60 as minutos',
    [ocupacao.hora_inicio]
  );

  const minutos_decorridos = Math.ceil(parseFloat(tempoResult.rows[0].minutos));

  // Buscar configuração de preço adequada (com tolerância de 10 minutos)
  const tolerancia = 10;
  const configResult = await pool.query(
    `SELECT * FROM configuracao_quartos
     WHERE minutos + $2 >= $1 AND ativo = true
     ORDER BY minutos ASC
     LIMIT 1`,
    [minutos_decorridos, tolerancia]
  );

  let configuracao_quarto_id = null;
  let valor_cobrado = 0;

  if (configResult.rows.length > 0) {
    configuracao_quarto_id = configResult.rows[0].id;
    valor_cobrado = parseFloat(configResult.rows[0].valor);
  } else {
    // Se ultrapassou o tempo máximo + tolerância, usar a configuração mais cara
    const maxConfigResult = await pool.query(
      `SELECT * FROM configuracao_quartos
       WHERE ativo = true
       ORDER BY minutos DESC
       LIMIT 1`
    );

    if (maxConfigResult.rows.length > 0) {
      configuracao_quarto_id = maxConfigResult.rows[0].id;
      valor_cobrado = parseFloat(maxConfigResult.rows[0].valor);
    }
  }

  // Obter horário de Brasília para hora_saida
  const horaBrasiliaResult = await pool.query('SELECT get_brasilia_time() as hora');
  const hora_saida = horaBrasiliaResult.rows[0].hora;

  // Finalizar ocupação
  const finalizacaoResult = await pool.query(
    `UPDATE ocupacao_quartos
     SET status = 'finalizado',
         hora_fim = CURRENT_TIMESTAMP,
         minutos_total = $1,
         valor_cobrado = $2,
         configuracao_quarto_id = $3
     WHERE id = $4
     RETURNING *`,
    [minutos_decorridos, valor_cobrado, configuracao_quarto_id, id]
  );

  // Atualizar ou inserir item na comanda
  if (ocupacao.item_comanda_id) {
    // Se já existe item vinculado, apenas atualiza
    await pool.query(
      `UPDATE itens_comanda
       SET valor_unitario = $1,
           valor_total = $1,
           hora_saida = $2,
           minutos_utilizados = $3,
           status_tempo_livre = 'finalizado',
           configuracao_quarto_id = $4
       WHERE id = $5`,
      [valor_cobrado, hora_saida, minutos_decorridos, configuracao_quarto_id, ocupacao.item_comanda_id]
    );
  } else if (valor_cobrado > 0) {
    // Retrocompatibilidade: se não tem item vinculado, insere novo
    await pool.query(
      `INSERT INTO itens_comanda
       (comanda_id, produto_id, acompanhante_id, quantidade, valor_unitario, valor_total, tipo_item, usuario_id)
       VALUES ($1, NULL, $2, 1, $3, $3, 'quarto', $4)`,
      [ocupacao.comanda_id, ocupacao.acompanhante_id, valor_cobrado, req.user!.id]
    );
  }

  const response: ApiResponse = {
    success: true,
    data: finalizacaoResult.rows[0],
    message: 'Ocupação finalizada e lançada na comanda',
  };

  res.json(response);
});

// Cancelar ocupação de quarto
export const cancelarOcupacao = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { observacoes } = req.body;

  // Buscar ocupação para verificar se tem item vinculado
  const ocupacaoResult = await pool.query(
    'SELECT * FROM ocupacao_quartos WHERE id = $1 AND status = $2',
    [id, 'ocupado']
  );

  if (ocupacaoResult.rows.length === 0) {
    throw new AppError('Ocupação não encontrada ou já foi finalizada', 404);
  }

  const ocupacao = ocupacaoResult.rows[0];

  // Cancelar ocupação
  const result = await pool.query(
    `UPDATE ocupacao_quartos
     SET status = 'cancelado', observacoes = $2
     WHERE id = $1
     RETURNING *`,
    [id, observacoes]
  );

  // Se tem item vinculado, cancelar também
  if (ocupacao.item_comanda_id) {
    await pool.query(
      `UPDATE itens_comanda
       SET cancelado = true, status_tempo_livre = NULL
       WHERE id = $1`,
      [ocupacao.item_comanda_id]
    );
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Ocupação cancelada com sucesso',
  };

  res.json(response);
});
