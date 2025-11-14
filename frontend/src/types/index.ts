// ============================================
// USER TYPES
// ============================================

export type UserType = 'admin' | 'caixa' | 'atendente';

export interface User {
  id: number;
  nome: string;
  login: string;
  tipo: UserType;
  ativo: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
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
  data_abertura: string;
  data_fechamento?: string;
  total: number;
  total_comissao: number;
  status: ComandaStatus;
  forma_pagamento?: string;
  observacoes?: string;
  total_itens?: number;
  acompanhantes?: string[];
}

export interface ItemComanda {
  id: number;
  comanda_id: number;
  produto_id: number;
  produto_nome?: string;
  acompanhante_id?: number;
  acompanhante_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_comissao: number;
  tipo_item: ItemTipo;
  cancelado: boolean;
  created_at: string;
}

export interface ComandaDetalhada extends Comanda {
  itens: ItemComanda[];
}

// ============================================
// PRODUTO TYPES
// ============================================

export type ProdutoTipo = 'normal' | 'comissionado';

export interface Produto {
  id: number;
  nome: string;
  categoria_id: number;
  categoria_nome?: string;
  preco: number;
  tipo: ProdutoTipo;
  comissao_percentual?: number;
  ativo: boolean;
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

export type TipoAcompanhante = 'fixa' | 'rotativa';

export interface Acompanhante {
  id: number;
  nome: string;
  apelido?: string;
  telefone?: string;
  documento?: string;
  percentual_comissao: number;
  tipo_acompanhante: TipoAcompanhante;
  numero_pulseira_fixa?: number;
  ativa: boolean;
}

export type StatusPulseira = 'disponivel' | 'reservada_fixa' | 'em_uso';

export interface PulseiraDisponivel {
  numero: number;
  status: StatusPulseira;
  acompanhante_id?: number;
  acompanhante_nome?: string;
}

export interface PulseiraAtivaHoje {
  numero_pulseira: number;
  acompanhante_id: number;
  acompanhante_nome: string;
  acompanhante_apelido?: string;
  tipo_acompanhante: TipoAcompanhante;
  hora_atribuicao: string;
  hora_ativacao?: string;
}

// ============================================
// CAIXA TYPES
// ============================================

export type CaixaStatus = 'aberto' | 'fechado';

export interface MovimentoCaixa {
  id: number;
  usuario_id: number;
  operador_nome?: string;
  data_abertura: string;
  data_fechamento?: string;
  valor_abertura: number;
  valor_fechamento?: number;
  total_vendas: number;
  total_comissoes: number;
  total_sangrias: number;
  status: CaixaStatus;
  comandas_abertas?: number;
  comandas_fechadas?: number;
}

// ============================================
// QUARTO TYPES
// ============================================

export type QuartoStatus = 'ocupado' | 'finalizado' | 'cancelado';

export interface OcupacaoQuarto {
  id: number;
  comanda_id: number;
  comanda_numero?: number;
  acompanhante_id: number;
  acompanhante_nome?: string;
  numero_quarto: number;
  hora_inicio: string;
  hora_fim?: string;
  minutos_total?: number;
  minutos_decorridos?: number;
  valor_cobrado?: number;
  status: QuartoStatus;
}

export interface ConfiguracaoQuarto {
  id: number;
  minutos: number;
  descricao: string;
  valor: number;
  ativo: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string[];
}
