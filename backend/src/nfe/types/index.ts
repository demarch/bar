/**
 * Tipos e interfaces para o sistema NF-e
 * Baseado no Manual de Integração - Contribuinte e Manual de Credenciamento SEFA/PR
 */

// =====================================================
// ENUMS
// =====================================================

/** Ambiente de emissão */
export enum NfeAmbiente {
  PRODUCAO = 1,
  HOMOLOGACAO = 2
}

/** Forma de emissão */
export enum NfeFormaEmissao {
  NORMAL = 1,
  FS_DA = 2,         // Formulário de Segurança
  SCAN = 3,          // Sistema de Contingência Ambiente Nacional
  DPEC = 4,          // Declaração Prévia de Emissão em Contingência
  FS_DA_2 = 5,       // Formulário de Segurança (alternativo)
  SVC_AN = 6,        // SEFAZ Virtual de Contingência Ambiente Nacional
  SVC_RS = 7,        // SEFAZ Virtual de Contingência RS
  OFFLINE = 9        // Contingência Offline
}

/** Status da NF-e */
export enum NfeStatus {
  PENDENTE = 'PENDENTE',
  AUTORIZADA = 'AUTORIZADA',
  REJEITADA = 'REJEITADA',
  DENEGADA = 'DENEGADA',
  CANCELADA = 'CANCELADA'
}

/** Tipo de operação */
export enum NfeTipoOperacao {
  ENTRADA = 0,
  SAIDA = 1
}

/** Finalidade de emissão */
export enum NfeFinalidadeEmissao {
  NORMAL = 1,
  COMPLEMENTAR = 2,
  AJUSTE = 3,
  DEVOLUCAO = 4
}

/** Regime Tributário */
export enum NfeRegimeTributario {
  SIMPLES_NACIONAL = 1,
  SIMPLES_NACIONAL_EXCESSO = 2,
  REGIME_NORMAL = 3
}

/** Indicador de IE do destinatário */
export enum NfeIndicadorIE {
  CONTRIBUINTE = 1,
  ISENTO = 2,
  NAO_CONTRIBUINTE = 9
}

/** Tipo de impressão DANFE */
export enum NfeTipoImpressaoDanfe {
  SEM_DANFE = 0,
  RETRATO = 1,
  PAISAGEM = 2,
  SIMPLIFICADO = 3,
  NFCE = 4,
  NFCE_MSG_ELETRONICA = 5
}

/** Modalidade do frete */
export enum NfeModalidadeFrete {
  CONTRATACAO_POR_CONTA_REMETENTE = 0,
  CONTRATACAO_POR_CONTA_DESTINATARIO = 1,
  CONTRATACAO_POR_CONTA_TERCEIROS = 2,
  PROPRIO_POR_CONTA_REMETENTE = 3,
  PROPRIO_POR_CONTA_DESTINATARIO = 4,
  SEM_FRETE = 9
}

/** Meio de pagamento */
export enum NfeMeioPagamento {
  DINHEIRO = '01',
  CHEQUE = '02',
  CARTAO_CREDITO = '03',
  CARTAO_DEBITO = '04',
  CREDITO_LOJA = '05',
  VALE_ALIMENTACAO = '10',
  VALE_REFEICAO = '11',
  VALE_PRESENTE = '12',
  VALE_COMBUSTIVEL = '13',
  BOLETO = '15',
  DEPOSITO_BANCARIO = '16',
  PIX = '17',
  TRANSFERENCIA = '18',
  CASHBACK = '19',
  SEM_PAGAMENTO = '90',
  OUTROS = '99'
}

/** Origem do produto */
export enum NfeOrigemProduto {
  NACIONAL = 0,
  ESTRANGEIRA_IMPORTACAO_DIRETA = 1,
  ESTRANGEIRA_ADQUIRIDA_MERCADO_INTERNO = 2,
  NACIONAL_CONTEUDO_IMPORTADO_SUPERIOR_40 = 3,
  NACIONAL_CONFORMIDADE_PROCESSOS_BASICOS = 4,
  NACIONAL_CONTEUDO_IMPORTADO_INFERIOR_40 = 5,
  ESTRANGEIRA_IMPORTACAO_DIRETA_SEM_SIMILAR = 6,
  ESTRANGEIRA_MERCADO_INTERNO_SEM_SIMILAR = 7,
  NACIONAL_CONTEUDO_IMPORTADO_SUPERIOR_70 = 8
}

/** Tipo de certificado digital */
export enum NfeTipoCertificado {
  A1 = 'A1',
  A3 = 'A3'
}

/** Status do cancelamento */
export enum NfeCancelamentoStatus {
  PENDENTE = 'PENDENTE',
  HOMOLOGADO = 'HOMOLOGADO',
  REJEITADO = 'REJEITADO'
}

/** Status da inutilização */
export enum NfeInutilizacaoStatus {
  PENDENTE = 'PENDENTE',
  HOMOLOGADA = 'HOMOLOGADA',
  REJEITADA = 'REJEITADA'
}

/** Tipo de evento */
export enum NfeTipoEvento {
  CARTA_CORRECAO = '110110',
  CANCELAMENTO = '110111',
  CIENCIA_OPERACAO = '210200',
  CONFIRMACAO_OPERACAO = '210210',
  DESCONHECIMENTO_OPERACAO = '210220',
  NAO_REALIZADA = '210240'
}

// =====================================================
// INTERFACES - Configuração do Emitente
// =====================================================

export interface NfeConfiguracao {
  id?: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  cnaeFiscal?: string;
  codigoRegimeTributario: NfeRegimeTributario;

  // Endereço
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  nomeMunicipio: string;
  uf: string;
  cep: string;
  codigoPais?: string;
  nomePais?: string;
  telefone?: string;

  // Configurações NF-e
  serieNfe: number;
  proximoNumeroNfe: number;
  ambiente: NfeAmbiente;
  tipoImpressaoDanfe: NfeTipoImpressaoDanfe;
  formaEmissao: NfeFormaEmissao;

  // Certificado Digital
  certificadoArquivo?: string;
  certificadoSenha?: string;
  certificadoValidade?: Date;
  certificadoTipo: NfeTipoCertificado;

  // URLs Web Services
  wsAutorizacao?: string;
  wsRetornoAutorizacao?: string;
  wsCancelamento?: string;
  wsInutilizacao?: string;
  wsConsultaProtocolo?: string;
  wsConsultaStatusServico?: string;
  wsRecepcaoEvento?: string;

  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// =====================================================
// INTERFACES - NF-e Completa
// =====================================================

/** Dados do destinatário */
export interface NfeDestinatario {
  cnpjCpf?: string;
  razaoSocial?: string;
  inscricaoEstadual?: string;
  indicadorIe: NfeIndicadorIE;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    codigoMunicipio?: string;
    nomeMunicipio?: string;
    uf?: string;
    cep?: string;
    codigoPais?: string;
    nomePais?: string;
    telefone?: string;
  };
  email?: string;
}

/** Item da NF-e */
export interface NfeItem {
  id?: number;
  nfeId?: number;
  numeroItem: number;

  // Produto
  codigoProduto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;

  // Valores
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto?: number;

  // ICMS
  icmsOrigem: NfeOrigemProduto;
  icmsCst?: string;
  icmsCsosn?: string;
  icmsBaseCalculo?: number;
  icmsAliquota?: number;
  icmsValor?: number;

  // PIS
  pisCst?: string;
  pisBaseCalculo?: number;
  pisAliquota?: number;
  pisValor?: number;

  // COFINS
  cofinsCst?: string;
  cofinsBaseCalculo?: number;
  cofinsAliquota?: number;
  cofinsValor?: number;

  // Valor aproximado de tributos
  valorAproximadoTributos?: number;

  // Informações adicionais
  informacoesAdicionais?: string;

  // Relacionamentos
  itemComandaId?: number;
  produtoId?: number;
}

/** Pagamento da NF-e */
export interface NfePagamento {
  indicadorFormaPagamento: number; // 0=À Vista, 1=À Prazo
  meioPagamento: NfeMeioPagamento;
  valorPagamento: number;

  // Cartão (se aplicável)
  tipoIntegracao?: number;
  cnpjCredenciadora?: string;
  bandeira?: string;
  autorizacao?: string;
}

/** Totais da NF-e */
export interface NfeTotais {
  valorTotalProdutos: number;
  valorTotalNf: number;
  valorDesconto?: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorOutros?: number;
  valorIcms?: number;
  valorIcmsSt?: number;
  valorIpi?: number;
  valorPis?: number;
  valorCofins?: number;
  valorAproximadoTributos?: number;
}

/** NF-e completa */
export interface NfeCompleta {
  id?: number;

  // Identificação
  chaveAcesso?: string;
  numero?: number;
  serie?: number;

  // Tipo de operação
  tipoOperacao: NfeTipoOperacao;
  naturezaOperacao: string;
  finalidadeEmissao: NfeFinalidadeEmissao;

  // Relacionamentos
  comandaId?: number;
  movimentoCaixaId?: number;
  emitenteId?: number;

  // Destinatário
  destinatario?: NfeDestinatario;

  // Itens
  itens: NfeItem[];

  // Totais
  totais: NfeTotais;

  // Pagamentos
  pagamentos: NfePagamento[];

  // Transporte
  modalidadeFrete?: NfeModalidadeFrete;
  transportador?: {
    cnpjCpf?: string;
    razaoSocial?: string;
    inscricaoEstadual?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
  };

  // Status e protocolo
  status?: NfeStatus;
  codigoStatus?: number;
  motivoStatus?: string;
  protocoloAutorizacao?: string;
  dataAutorizacao?: Date;
  dataEmissao?: Date;

  // Contingência
  formaEmissao?: NfeFormaEmissao;
  justificativaContingencia?: string;
  dataEntradaContingencia?: Date;

  // XML
  xmlEnvio?: string;
  xmlRetorno?: string;
  xmlAutorizado?: string;

  // DANFE
  danfeImpresso?: boolean;
  danfeUrl?: string;

  // Ambiente
  ambiente?: NfeAmbiente;

  // Informações adicionais
  informacoesAdicionaisContribuinte?: string;
  informacoesAdicionaisFisco?: string;

  // Controle
  createdAt?: Date;
  updatedAt?: Date;
  usuarioId?: number;
}

// =====================================================
// INTERFACES - Cancelamento
// =====================================================

export interface NfeCancelamento {
  id?: number;
  nfeId: number;
  tipoEvento?: string;
  sequenciaEvento?: number;

  chaveAcesso: string;
  protocoloAutorizacaoNfe: string;
  justificativa: string;

  protocoloCancelamento?: string;
  dataCancelamento?: Date;
  codigoStatus?: number;
  motivoStatus?: string;

  xmlEnvio?: string;
  xmlRetorno?: string;

  status: NfeCancelamentoStatus;
  createdAt?: Date;
  usuarioId?: number;
}

// =====================================================
// INTERFACES - Inutilização
// =====================================================

export interface NfeInutilizacao {
  id?: number;
  emitenteId: number;

  ano: number;
  serie: number;
  numeroInicial: number;
  numeroFinal: number;
  justificativa: string;

  protocoloInutilizacao?: string;
  dataInutilizacao?: Date;
  codigoStatus?: number;
  motivoStatus?: string;

  xmlEnvio?: string;
  xmlRetorno?: string;

  status: NfeInutilizacaoStatus;
  createdAt?: Date;
  usuarioId?: number;
}

// =====================================================
// INTERFACES - Evento Genérico
// =====================================================

export interface NfeEvento {
  id?: number;
  nfeId?: number;

  tipoEvento: string;
  descricaoEvento: string;
  sequenciaEvento: number;

  chaveAcesso: string;
  dataEvento: Date;
  detalhesEvento?: string;

  protocoloEvento?: string;
  codigoStatus?: number;
  motivoStatus?: string;

  xmlEnvio?: string;
  xmlRetorno?: string;

  status: string;
  createdAt?: Date;
  usuarioId?: number;
}

// =====================================================
// INTERFACES - Log de Comunicação
// =====================================================

export interface NfeComunicacaoLog {
  id?: number;
  tipoOperacao: string;
  nfeId?: number;

  urlRequisicao?: string;
  xmlRequisicao?: string;
  dataRequisicao?: Date;

  xmlResposta?: string;
  codigoHttp?: number;
  tempoRespostaMs?: number;
  dataResposta?: Date;

  sucesso: boolean;
  mensagemErro?: string;

  ambiente: NfeAmbiente;
  createdAt?: Date;
}

// =====================================================
// INTERFACES - Contingência
// =====================================================

export interface NfeContingenciaFila {
  id?: number;
  nfeId: number;
  motivoContingencia: string;
  dataEntradaContingencia?: Date;
  formaContingencia: NfeFormaEmissao;

  status: 'AGUARDANDO' | 'TRANSMITINDO' | 'TRANSMITIDA' | 'ERRO';
  tentativas: number;
  ultimaTentativa?: Date;
  mensagemErro?: string;

  createdAt?: Date;
  transmitidaAt?: Date;
}

// =====================================================
// INTERFACES - Testes de Homologação
// =====================================================

export interface NfeHomologacaoTeste {
  id?: number;
  emitenteId: number;
  dataTeste: Date;

  autorizacoesRealizadas: number;
  autorizacoesMeta: number;
  cancelamentosRealizados: number;
  cancelamentosMeta: number;
  inutilizacoesRealizadas: number;
  inutilizacoesMeta: number;

  status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'APROVADO';
  observacoes?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

// =====================================================
// INTERFACES - Web Services SEFAZ
// =====================================================

/** URLs dos Web Services por UF */
export interface NfeWebServicesUrls {
  autorizacao: string;
  retornoAutorizacao: string;
  cancelamento: string;
  inutilizacao: string;
  consultaProtocolo: string;
  consultaStatusServico: string;
  recepcaoEvento: string;
}

/** Resposta genérica dos Web Services */
export interface NfeSefazResponse {
  success: boolean;
  codigoStatus: number;
  motivoStatus: string;
  protocolo?: string;
  dataRecebimento?: Date;
  xmlRetorno?: string;
  erros?: Array<{
    codigo: string;
    mensagem: string;
  }>;
}

/** Status do serviço SEFAZ */
export interface NfeStatusServico {
  online: boolean;
  ambiente: NfeAmbiente;
  codigoStatus: number;
  motivoStatus: string;
  tempoMedio: number;
  dataConsulta: Date;
  previsaoRetorno?: Date;
}

// =====================================================
// INTERFACES - Requisições da API
// =====================================================

export interface NfeEmitirRequest {
  comandaId?: number;
  destinatario?: NfeDestinatario;
  itens?: NfeItem[];
  pagamentos?: NfePagamento[];
  naturezaOperacao?: string;
  finalidadeEmissao?: NfeFinalidadeEmissao;
  informacoesAdicionais?: string;
}

export interface NfeCancelarRequest {
  nfeId: number;
  justificativa: string;
}

export interface NfeInutilizarRequest {
  serie: number;
  numeroInicial: number;
  numeroFinal: number;
  justificativa: string;
}

export interface NfeConsultarRequest {
  chaveAcesso?: string;
  nfeId?: number;
}

// =====================================================
// INTERFACES - Respostas da API
// =====================================================

export interface NfeEmitirResponse {
  success: boolean;
  nfeId: number;
  chaveAcesso: string;
  numero: number;
  serie: number;
  protocolo?: string;
  status: NfeStatus;
  mensagem: string;
  danfeUrl?: string;
}

export interface NfeCancelarResponse {
  success: boolean;
  protocolo?: string;
  status: NfeCancelamentoStatus;
  mensagem: string;
}

export interface NfeInutilizarResponse {
  success: boolean;
  protocolo?: string;
  status: NfeInutilizacaoStatus;
  mensagem: string;
}

export interface NfeConsultarResponse {
  success: boolean;
  nfe?: NfeCompleta;
  status: NfeStatus;
  mensagem: string;
}

// =====================================================
// INTERFACES - Filtros e Paginação
// =====================================================

export interface NfeListarFiltros {
  dataInicio?: Date;
  dataFim?: Date;
  status?: NfeStatus[];
  ambiente?: NfeAmbiente;
  numero?: number;
  serie?: number;
  chaveAcesso?: string;
  destinatarioCnpjCpf?: string;
  comandaId?: number;

  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface NfeListarResponse {
  data: NfeCompleta[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =====================================================
// INTERFACES - DANFE
// =====================================================

export interface DanfeConfig {
  formato: 'RETRATO' | 'PAISAGEM' | 'SIMPLIFICADO';
  margens: {
    superior: number;
    inferior: number;
    esquerda: number;
    direita: number;
  };
  logo?: string; // Base64 ou URL
  mostrarCodBarras: boolean;
  mostrarQrCode: boolean;
}

export interface DanfeGenerateRequest {
  nfeId: number;
  config?: Partial<DanfeConfig>;
}

export interface DanfeGenerateResponse {
  success: boolean;
  pdfBase64?: string;
  pdfUrl?: string;
  mensagem: string;
}

// =====================================================
// INTERFACES - Certificado Digital
// =====================================================

export interface CertificadoInfo {
  tipo: NfeTipoCertificado;
  titular: string;
  cnpj: string;
  serialNumber: string;
  validadeInicio: Date;
  validadeFim: Date;
  emissor: string;
  valido: boolean;
  diasParaExpirar: number;
}

export interface CertificadoValidacao {
  valido: boolean;
  mensagem: string;
  certificadoInfo?: CertificadoInfo;
}

// =====================================================
// CONSTANTES - Códigos de Status SEFAZ
// =====================================================

export const SEFAZ_STATUS_CODES = {
  // Sucesso
  AUTORIZADA: 100,
  CANCELADA: 101,
  INUTILIZADA: 102,
  LOTE_RECEBIDO: 103,
  LOTE_PROCESSADO: 104,
  LOTE_EM_PROCESSAMENTO: 105,

  // Denegação
  USO_DENEGADO: 110,

  // Rejeições comuns
  REJEICAO_DUPLICIDADE: 204,
  REJEICAO_ASSINATURA: 213,
  REJEICAO_CERTIFICADO: 280,

  // Serviço
  SERVICO_PARALISADO: 108,
  SERVICO_SEM_PREVISAO: 109
} as const;

// =====================================================
// CONSTANTES - CFOPs Comuns
// =====================================================

export const CFOP = {
  // Vendas internas
  VENDA_MERCADORIA_ADQUIRIDA: '5102',
  VENDA_PRODUCAO_PROPRIA: '5101',
  VENDA_FORA_ESTABELECIMENTO: '5103',
  DEVOLUCAO_COMPRA: '5202',

  // Vendas interestaduais
  VENDA_INTERESTADUAL_MERCADORIA_ADQUIRIDA: '6102',
  VENDA_INTERESTADUAL_PRODUCAO_PROPRIA: '6101',

  // Exportação
  EXPORTACAO: '7101'
} as const;

// =====================================================
// CONSTANTES - NCMs Comuns (Bar/Restaurante)
// =====================================================

export const NCM_COMUNS = {
  BEBIDAS_ALCOOLICAS: '22089000', // Outras bebidas alcoólicas
  CERVEJA: '22030000',
  REFRIGERANTE: '22021000',
  AGUA_MINERAL: '22011000',
  CAFE: '09011100',
  ALIMENTOS_PREPARADOS: '21069090', // Preparações alimentícias diversas
  SERVICOS: '00000000'
} as const;
