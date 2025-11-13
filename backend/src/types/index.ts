// Tipos de usuário
export enum TipoUsuario {
  ADMIN = 'admin',
  CAIXA = 'caixa',
  ATENDENTE = 'atendente'
}

// Status de comanda
export enum StatusComanda {
  ABERTA = 'aberta',
  FECHADA = 'fechada',
  CANCELADA = 'cancelada'
}

// Status de movimento de caixa
export enum StatusCaixa {
  ABERTO = 'aberto',
  FECHADO = 'fechado'
}

// Tipo de item na comanda
export enum TipoItem {
  NORMAL = 'normal',
  COMISSIONADO = 'comissionado',
  QUARTO = 'quarto'
}

// Tipo de produto
export enum TipoProduto {
  NORMAL = 'normal',
  COMISSIONADO = 'comissionado'
}

// Status de ocupação de quarto
export enum StatusQuarto {
  OCUPADO = 'ocupado',
  FINALIZADO = 'finalizado'
}

// Tipo de lançamento no caixa
export enum TipoLancamentoCaixa {
  ENTRADA = 'entrada',
  SAIDA = 'saida'
}

// Categoria de lançamento
export enum CategoriaLancamento {
  VENDA = 'venda',
  SANGRIA = 'sangria',
  PAGAMENTO_COMISSAO = 'pagamento_comissao',
  OUTROS = 'outros'
}

// Forma de pagamento
export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  CARTAO_DEBITO = 'cartao_debito',
  CARTAO_CREDITO = 'cartao_credito',
  PIX = 'pix',
  OUTROS = 'outros'
}

// Interfaces de request/response
export interface LoginRequest {
  login: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  usuario: {
    id: number;
    nome: string;
    login: string;
    tipo: TipoUsuario;
  };
}

export interface TokenPayload {
  id: number;
  login: string;
  tipo: TipoUsuario;
  iat?: number;
  exp?: number;
}

// Interface para Request com usuário autenticado
export interface AuthRequest extends Express.Request {
  user?: TokenPayload;
}

// DTOs
export interface CriarComandaDTO {
  numero: number;
  clienteNome?: string;
  movimentoCaixaId: number;
}

export interface LancarItemDTO {
  comandaId: number;
  produtoId: number;
  quantidade: number;
  acompanhanteId?: number;
}

export interface IniciarOcupacaoQuartoDTO {
  comandaId: number;
  numeroQuarto: number;
  acompanhanteId: number;
}

export interface FinalizarOcupacaoQuartoDTO {
  ocupacaoId: number;
}

export interface FecharComandaDTO {
  comandaId: number;
  formaPagamento: FormaPagamento;
}

export interface AbrirCaixaDTO {
  valorAbertura: number;
}

export interface FecharCaixaDTO {
  movimentoCaixaId: number;
}

export interface SangriaDTO {
  movimentoCaixaId: number;
  valor: number;
  descricao: string;
}

// Interfaces de domínio
export interface Usuario {
  id: number;
  nome: string;
  login: string;
  senha: string;
  tipo: TipoUsuario;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Acompanhante {
  id: number;
  nome: string;
  apelido?: string;
  telefone?: string;
  documento?: string;
  percentualComissao: number;
  ativaHoje: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Produto {
  id: number;
  nome: string;
  categoria: string;
  preco: number;
  tipo: TipoProduto;
  comissaoPercentual?: number;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comanda {
  id: number;
  numero: number;
  movimentoCaixaId: number;
  clienteNome?: string;
  dataAbertura: Date;
  dataFechamento?: Date;
  total: number;
  status: StatusComanda;
  formaPagamento?: FormaPagamento;
}

export interface ItemComanda {
  id: number;
  comandaId: number;
  produtoId: number;
  acompanhanteId?: number;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorComissao?: number;
  tipoItem: TipoItem;
  createdAt: Date;
}

export interface OcupacaoQuarto {
  id: number;
  comandaId: number;
  acompanhanteId: number;
  numeroQuarto: number;
  horaInicio: Date;
  horaFim?: Date;
  minutosTotal?: number;
  valorCobrado?: number;
  status: StatusQuarto;
}

export interface MovimentoCaixa {
  id: number;
  usuarioId: number;
  dataAbertura: Date;
  dataFechamento?: Date;
  valorAbertura: number;
  valorFechamento?: number;
  status: StatusCaixa;
}

export interface LancamentoCaixa {
  id: number;
  movimentoCaixaId: number;
  tipo: TipoLancamentoCaixa;
  categoria: CategoriaLancamento;
  valor: number;
  descricao: string;
  createdAt: Date;
}

export interface ConfiguracaoQuarto {
  id: number;
  minutos: number;
  descricao: string;
  valor: number;
}

// Interfaces para relatórios
export interface RelatorioVendas {
  totalVendas: number;
  quantidadeComandas: number;
  ticketMedio: number;
  vendasPorCategoria: { categoria: string; total: number }[];
  vendasPorProduto: { produto: string; quantidade: number; total: number }[];
}

export interface RelatorioComissoes {
  totalComissoes: number;
  comissoesPorAcompanhante: {
    acompanhanteId: number;
    nome: string;
    totalComissao: number;
    quantidadeItens: number;
    valorQuartos: number;
  }[];
}

export interface RelatorioFluxoCaixa {
  valorAbertura: number;
  totalEntradas: number;
  totalSaidas: number;
  totalVendas: number;
  totalComissoes: number;
  saldoEsperado: number;
  valorFechamento?: number;
  diferencaCaixa?: number;
}
