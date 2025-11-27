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
  // Tokens agora são enviados via httpOnly cookies (não no body)
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

export type StatusTempoLivre = 'em_andamento' | 'aguardando_confirmacao' | 'finalizado';

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
  // Campos para serviço de quarto
  numero_quarto?: string;
  hora_entrada?: string;
  configuracao_quarto_id?: number;
  // Campos para tempo livre
  tempo_livre?: boolean;
  hora_saida?: string;
  valor_sugerido?: number;
  status_tempo_livre?: StatusTempoLivre;
  minutos_utilizados?: number;
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

export interface ServicoTempoLivreEmAndamento {
  item_id: number;
  comanda_id: number;
  comanda_numero: number;
  numero_quarto: string;
  hora_entrada: string;
  status_tempo_livre: StatusTempoLivre;
  minutos_decorridos: number;
  acompanhantes: Array<{
    id: number;
    nome: string;
    apelido?: string;
  }>;
}

export interface CalculoTempoLivre {
  item_id: number;
  minutos_decorridos: number;
  hora_entrada: string;
  hora_saida: string;
  configuracao_sugerida: {
    id: number;
    descricao: string;
    minutos: number;
    valor: number;
  };
  valor_sugerido: number;
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

// ============================================
// NF-E TYPES
// ============================================

export type NfeAmbiente = 1 | 2; // 1=Produção, 2=Homologação
export type NfeStatus = 'PENDENTE' | 'AUTORIZADA' | 'REJEITADA' | 'DENEGADA' | 'CANCELADA';
export type NfeTipoCertificado = 'A1' | 'A3';

export interface NfeConfiguracao {
  id?: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  cnaeFiscal?: string;
  codigoRegimeTributario: number;

  // Endereço
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  nomeMunicipio: string;
  uf: string;
  cep: string;
  telefone?: string;

  // Configurações NF-e
  serieNfe: number;
  proximoNumeroNfe: number;
  ambiente: NfeAmbiente;
  tipoImpressaoDanfe: number;
  formaEmissao: number;

  // Certificado
  certificadoValidade?: string;
  certificadoTipo: NfeTipoCertificado;

  ativo?: boolean;
}

export interface NfeItem {
  numeroItem: number;
  codigoProduto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface Nfe {
  id: number;
  chaveAcesso: string;
  numero: number;
  serie: number;
  comandaId?: number;
  naturezaOperacao: string;
  status: NfeStatus;
  codigoStatus?: number;
  motivoStatus?: string;
  protocoloAutorizacao?: string;
  dataAutorizacao?: string;
  dataEmissao: string;
  valorTotalNf: number;
  valorTotalProdutos: number;
  ambiente: NfeAmbiente;
  itens?: NfeItem[];
  destinatario?: {
    cnpjCpf?: string;
    razaoSocial?: string;
  };
  danfeImpresso?: boolean;
}

export interface NfeEmitirResponse {
  success: boolean;
  nfeId: number;
  chaveAcesso: string;
  numero: number;
  serie: number;
  protocolo?: string;
  status: NfeStatus;
  mensagem: string;
}

export interface NfeStatusServico {
  online: boolean;
  ambiente: NfeAmbiente;
  codigoStatus: number;
  motivoStatus: string;
  tempoMedio: number;
  dataConsulta: string;
}

export interface NfeContingenciaStatus {
  ativo: boolean;
  formaEmissao: number;
  dataEntrada?: string;
  motivo?: string;
  nfesPendentes: number;
}

export interface CertificadoInfo {
  tipo: NfeTipoCertificado;
  titular: string;
  cnpj: string;
  serialNumber: string;
  validadeInicio: string;
  validadeFim: string;
  emissor: string;
  valido: boolean;
  diasParaExpirar: number;
}

export interface NfeHomologacaoProgresso {
  autorizacoes: {
    realizadas: number;
    meta: number;
    percentual: number;
  };
  cancelamentos: {
    realizadas: number;
    meta: number;
    percentual: number;
  };
  inutilizacoes: {
    realizadas: number;
    meta: number;
    percentual: number;
  };
  status: string;
  dataTeste?: string;
}
