import { Request } from 'express';

// ============================================
// USER TYPES
// ============================================

export type UserType = 'admin' | 'caixa' | 'atendente';

export interface User {
  id: number;
  nome: string;
  login: string;
  senha: string;
  tipo: UserType;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    login: string;
    tipo: UserType;
  };
}

// ============================================
// COMANDA TYPES
// ============================================

export type ComandaStatus = 'aberta' | 'fechada' | 'cancelada';
export type ItemTipo = 'normal' | 'comissionado' | 'quarto';

export interface Comanda {
  id: number;
  numero: number;
  movimento_caixa_id: number;
  cliente_nome?: string;
  data_abertura: Date;
  data_fechamento?: Date;
  total: number;
  total_comissao: number;
  status: ComandaStatus;
  forma_pagamento?: string;
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ItemComanda {
  id: number;
  comanda_id: number;
  produto_id: number;
  acompanhante_id?: number;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_comissao: number;
  tipo_item: ItemTipo;
  cancelado: boolean;
  motivo_cancelamento?: string;
  usuario_id: number;
  created_at: Date;
}

// ============================================
// PRODUTO TYPES
// ============================================

export type ProdutoTipo = 'normal' | 'comissionado';

export interface Produto {
  id: number;
  nome: string;
  categoria_id: number;
  preco: number;
  tipo: ProdutoTipo;
  comissao_percentual?: number;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  ordem: number;
  ativa: boolean;
}

// ============================================
// ACOMPANHANTE TYPES
// ============================================

export interface Acompanhante {
  id: number;
  nome: string;
  apelido?: string;
  telefone?: string;
  documento?: string;
  percentual_comissao: number;
  ativa: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AcompanhanteAtivaDia {
  id: number;
  acompanhante_id: number;
  data: Date;
  hora_ativacao: Date;
}

// ============================================
// CAIXA TYPES
// ============================================

export type CaixaStatus = 'aberto' | 'fechado';
export type LancamentoTipo = 'entrada' | 'saida' | 'sangria';

export interface MovimentoCaixa {
  id: number;
  usuario_id: number;
  data_abertura: Date;
  data_fechamento?: Date;
  valor_abertura: number;
  valor_fechamento?: number;
  total_vendas: number;
  total_comissoes: number;
  total_sangrias: number;
  status: CaixaStatus;
  observacoes?: string;
  created_at: Date;
}

export interface LancamentoCaixa {
  id: number;
  movimento_caixa_id: number;
  tipo: LancamentoTipo;
  valor: number;
  descricao: string;
  categoria?: string;
  usuario_id: number;
  created_at: Date;
}

// ============================================
// QUARTO TYPES
// ============================================

export type QuartoStatus = 'ocupado' | 'finalizado' | 'cancelado';

export interface OcupacaoQuarto {
  id: number;
  comanda_id: number;
  acompanhante_id: number;
  numero_quarto: number;
  hora_inicio: Date;
  hora_fim?: Date;
  minutos_total?: number;
  valor_cobrado?: number;
  configuracao_quarto_id?: number;
  status: QuartoStatus;
  observacoes?: string;
  created_at: Date;
}

export interface ConfiguracaoQuarto {
  id: number;
  minutos: number;
  descricao: string;
  valor: number;
  ativo: boolean;
  ordem: number;
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface LoginDTO {
  login: string;
  senha: string;
}

export interface CreateComandaDTO {
  numero: number;
  cliente_nome?: string;
}

export interface AddItemComandaDTO {
  comanda_id: number;
  produto_id: number;
  quantidade: number;
  acompanhante_id?: number;
}

export interface FinalizarOcupacaoQuartoDTO {
  ocupacao_id: number;
}

export interface AbrirCaixaDTO {
  valor_abertura: number;
}

export interface FecharCaixaDTO {
  valor_fechamento: number;
  observacoes?: string;
}

export interface SangriaDTO {
  valor: number;
  descricao: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
