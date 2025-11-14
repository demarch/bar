import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, ApiResponse, CreateQuartoDTO, UpdateQuartoDTO } from '../types';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

// ============================================
// CRUD DE QUARTOS (ADMIN)
// ============================================

// Listar todos os quartos
export const listarQuartos = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM quartos ORDER BY ordem, numero'
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Listar quartos ativos
export const listarQuartosAtivos = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM quartos WHERE ativo = true ORDER BY ordem, numero'
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Buscar quarto por ID
export const buscarQuarto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    'SELECT * FROM quartos WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Quarto não encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

// Criar novo quarto
export const criarQuarto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { numero, descricao, ordem = 0 }: CreateQuartoDTO = req.body;

  // Verificar se o número já existe
  const existente = await pool.query(
    'SELECT id FROM quartos WHERE numero = $1',
    [numero]
  );

  if (existente.rows.length > 0) {
    throw new AppError('Já existe um quarto com este número', 400);
  }

  // Inserir quarto
  const result = await pool.query(
    `INSERT INTO quartos (numero, descricao, ordem)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [numero, descricao, ordem]
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Quarto criado com sucesso',
  };

  res.status(201).json(response);
});

// Atualizar quarto
export const atualizarQuarto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { numero, descricao, ativo, ordem }: UpdateQuartoDTO = req.body;

  // Verificar se o quarto existe
  const quartoExistente = await pool.query(
    'SELECT * FROM quartos WHERE id = $1',
    [id]
  );

  if (quartoExistente.rows.length === 0) {
    throw new AppError('Quarto não encontrado', 404);
  }

  // Se alterou o número, verificar se já existe outro quarto com esse número
  if (numero && numero !== quartoExistente.rows[0].numero) {
    const numeroExistente = await pool.query(
      'SELECT id FROM quartos WHERE numero = $1 AND id != $2',
      [numero, id]
    );

    if (numeroExistente.rows.length > 0) {
      throw new AppError('Já existe outro quarto com este número', 400);
    }
  }

  // Construir query de atualização dinamicamente
  const campos: string[] = [];
  const valores: any[] = [];
  let paramIndex = 1;

  if (numero !== undefined) {
    campos.push(`numero = $${paramIndex++}`);
    valores.push(numero);
  }

  if (descricao !== undefined) {
    campos.push(`descricao = $${paramIndex++}`);
    valores.push(descricao);
  }

  if (ativo !== undefined) {
    campos.push(`ativo = $${paramIndex++}`);
    valores.push(ativo);
  }

  if (ordem !== undefined) {
    campos.push(`ordem = $${paramIndex++}`);
    valores.push(ordem);
  }

  if (campos.length === 0) {
    throw new AppError('Nenhum campo para atualizar', 400);
  }

  valores.push(id);

  const result = await pool.query(
    `UPDATE quartos SET ${campos.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    valores
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Quarto atualizado com sucesso',
  };

  res.json(response);
});

// Deletar quarto
export const deletarQuarto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Verificar se o quarto existe
  const quartoExistente = await pool.query(
    'SELECT * FROM quartos WHERE id = $1',
    [id]
  );

  if (quartoExistente.rows.length === 0) {
    throw new AppError('Quarto não encontrado', 404);
  }

  // Verificar se há serviços registrados para este quarto
  const servicosExistentes = await pool.query(
    'SELECT COUNT(*) as total FROM itens_comanda WHERE numero_quarto = $1',
    [quartoExistente.rows[0].numero]
  );

  if (parseInt(servicosExistentes.rows[0].total) > 0) {
    throw new AppError(
      'Não é possível deletar este quarto pois existem serviços registrados para ele. Desative-o ao invés de deletar.',
      400
    );
  }

  // Deletar quarto
  await pool.query('DELETE FROM quartos WHERE id = $1', [id]);

  const response: ApiResponse = {
    success: true,
    message: 'Quarto deletado com sucesso',
  };

  res.json(response);
});

// ============================================
// CONFIGURAÇÕES DE TEMPO/PREÇO
// ============================================

// Listar configurações de quartos (já existe em quartoController, mas vou adicionar versão para admin)
export const listarConfiguracoes = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM configuracao_quartos ORDER BY ordem, minutos'
  );

  const response: ApiResponse = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

// Atualizar configuração de quarto (tempo/preço)
export const atualizarConfiguracao = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { minutos, descricao, valor, ativo, ordem } = req.body;

  const campos: string[] = [];
  const valores: any[] = [];
  let paramIndex = 1;

  if (minutos !== undefined) {
    campos.push(`minutos = $${paramIndex++}`);
    valores.push(minutos);
  }

  if (descricao !== undefined) {
    campos.push(`descricao = $${paramIndex++}`);
    valores.push(descricao);
  }

  if (valor !== undefined) {
    campos.push(`valor = $${paramIndex++}`);
    valores.push(valor);
  }

  if (ativo !== undefined) {
    campos.push(`ativo = $${paramIndex++}`);
    valores.push(ativo);
  }

  if (ordem !== undefined) {
    campos.push(`ordem = $${paramIndex++}`);
    valores.push(ordem);
  }

  if (campos.length === 0) {
    throw new AppError('Nenhum campo para atualizar', 400);
  }

  valores.push(id);

  const result = await pool.query(
    `UPDATE configuracao_quartos SET ${campos.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    valores
  );

  if (result.rows.length === 0) {
    throw new AppError('Configuração não encontrada', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: result.rows[0],
    message: 'Configuração atualizada com sucesso',
  };

  res.json(response);
});
