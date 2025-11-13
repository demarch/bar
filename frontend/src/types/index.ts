// Enums
export enum TipoUsuario {
  ADMIN = 'admin',
  CAIXA = 'caixa',
  ATENDENTE = 'atendente'
}

export enum StatusComanda {
  ABERTA = 'aberta',
  FECHADA = 'fechada',
  CANCELADA = 'cancelada'
}

export enum StatusCaixa {
  ABERTO = 'aberto',
  FECHADO = 'fechado'
}

export enum TipoItem {
  NORMAL = 'normal',
  COMISSIONADO = 'comissionado',
  QUARTO = 'quarto'
}

export enum TipoProduto {
  NORMAL = 'normal',
  COMISSIONADO = 'comissionado'
}

export enum StatusQuarto {
  OCUPADO = 'ocupado',
  FINALIZADO = 'finalizado'
}

export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  CARTAO_DEBITO = 'cartao_debito',
  CARTAO_CREDITO = 'cartao_credito',
  PIX = 'pix',
  OUTROS = 'outros'
}

// Interfaces principais
export interface Usuario {
  id: number;
  nome: string;
  login: string;
  tipo: TipoUsuario;
  ativo: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface Acompanhante {
  id: number;
  nome: string;
  apelido?: string;
  telefone?: string;
  documento?: string;
  percentualComissao: number;
  ativaHoje: boolean;
}

export interface Produto {
  id: number;
  nome: string;
  categoria: string;
  preco: number;
  tipo: TipoProduto;
  comissaoPercentual?: number;
  ativo: boolean;
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
  produto?: Produto;
  acompanhante?: Acompanhante;
  createdAt: string;
}

export interface OcupacaoQuarto {
  id: number;
  comandaId: number;
  acompanhanteId: number;
  numeroQuarto: number;
  horaInicio: string;
  horaFim?: string;
  minutosTotal?: number;
  valorCobrado?: number;
  status: StatusQuarto;
  acompanhante?: Acompanhante;
}

export interface Comanda {
  id: number;
  numero: number;
  movimentoCaixaId: number;
  clienteNome?: string;
  dataAbertura: string;
  dataFechamento?: string;
  total: number;
  status: StatusComanda;
  formaPagamento?: FormaPagamento;
  itens?: ItemComanda[];
  quartos?: OcupacaoQuarto[];
}

export interface MovimentoCaixa {
  id: number;
  usuarioId: number;
  dataAbertura: string;
  dataFechamento?: string;
  valorAbertura: number;
  valorFechamento?: number;
  status: StatusCaixa;
  usuario?: Usuario;
}

export interface ConfiguracaoQuarto {
  id: number;
  minutos: number;
  descricao: string;
  valor: number;
}

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

// DTOs para requests
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

export interface IniciarOcupacaoQuartoDTO {
  comandaId: number;
  numeroQuarto: number;
  acompanhanteId: number;
}

export interface FinalizarOcupacaoQuartoDTO {
  ocupacaoId: number;
}
