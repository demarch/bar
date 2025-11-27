/**
 * Serviço Principal de NF-e
 * Orquestra emissão, cancelamento, inutilização e consultas
 */

import pool from '../../config/database';
import logger from '../../config/logger';
import {
  NfeCompleta,
  NfeConfiguracao,
  NfeItem,
  NfeEmitirRequest,
  NfeEmitirResponse,
  NfeCancelarRequest,
  NfeCancelarResponse,
  NfeInutilizarRequest,
  NfeInutilizarResponse,
  NfeConsultarResponse,
  NfeStatus,
  NfeAmbiente,
  NfeFormaEmissao,
  NfeTipoOperacao,
  NfeFinalidadeEmissao,
  NfeCancelamento,
  NfeCancelamentoStatus,
  NfeInutilizacao,
  NfeInutilizacaoStatus,
  NfeIndicadorIE,
  NfeMeioPagamento,
  NfePagamento,
  NfeListarFiltros,
  NfeListarResponse,
  CFOP,
  NCM_COMUNS
} from '../types';
import { getCertificadoService, CertificadoService } from './certificadoService';
import { getXmlGeneratorService, XmlGeneratorService } from './xmlGeneratorService';
import { getSefazService, SefazService } from './sefazService';

/**
 * Classe principal do serviço de NF-e
 */
export class NfeService {
  private certificadoService: CertificadoService;
  private xmlGenerator: XmlGeneratorService;
  private sefazService: SefazService;

  constructor() {
    this.certificadoService = getCertificadoService();
    this.xmlGenerator = getXmlGeneratorService();
    this.sefazService = getSefazService();
  }

  /**
   * Carrega configuração do emitente ativo
   */
  async getConfiguracao(): Promise<NfeConfiguracao | null> {
    const result = await pool.query(`
      SELECT * FROM nfe_configuracao_emitente WHERE ativo = TRUE LIMIT 1
    `);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return this.mapRowToConfiguracao(row);
  }

  /**
   * Salva configuração do emitente
   */
  async salvarConfiguracao(config: NfeConfiguracao): Promise<NfeConfiguracao> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Desativa outras configurações
      await client.query('UPDATE nfe_configuracao_emitente SET ativo = FALSE');

      const result = await client.query(`
        INSERT INTO nfe_configuracao_emitente (
          razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
          cnae_fiscal, codigo_regime_tributario, logradouro, numero, complemento,
          bairro, codigo_municipio, nome_municipio, uf, cep, codigo_pais, nome_pais,
          telefone, serie_nfe, proximo_numero_nfe, ambiente, tipo_impressao_danfe,
          forma_emissao, certificado_arquivo, certificado_senha_hash, certificado_validade,
          certificado_tipo, ws_autorizacao, ws_retorno_autorizacao, ws_cancelamento,
          ws_inutilizacao, ws_consulta_protocolo, ws_consulta_status_servico,
          ws_recepcao_evento, ativo
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          $33, $34, TRUE
        )
        ON CONFLICT (cnpj) DO UPDATE SET
          razao_social = EXCLUDED.razao_social,
          nome_fantasia = EXCLUDED.nome_fantasia,
          inscricao_estadual = EXCLUDED.inscricao_estadual,
          inscricao_municipal = EXCLUDED.inscricao_municipal,
          cnae_fiscal = EXCLUDED.cnae_fiscal,
          codigo_regime_tributario = EXCLUDED.codigo_regime_tributario,
          logradouro = EXCLUDED.logradouro,
          numero = EXCLUDED.numero,
          complemento = EXCLUDED.complemento,
          bairro = EXCLUDED.bairro,
          codigo_municipio = EXCLUDED.codigo_municipio,
          nome_municipio = EXCLUDED.nome_municipio,
          uf = EXCLUDED.uf,
          cep = EXCLUDED.cep,
          telefone = EXCLUDED.telefone,
          serie_nfe = EXCLUDED.serie_nfe,
          ambiente = EXCLUDED.ambiente,
          tipo_impressao_danfe = EXCLUDED.tipo_impressao_danfe,
          forma_emissao = EXCLUDED.forma_emissao,
          certificado_arquivo = COALESCE(EXCLUDED.certificado_arquivo, nfe_configuracao_emitente.certificado_arquivo),
          certificado_senha_hash = COALESCE(EXCLUDED.certificado_senha_hash, nfe_configuracao_emitente.certificado_senha_hash),
          certificado_validade = COALESCE(EXCLUDED.certificado_validade, nfe_configuracao_emitente.certificado_validade),
          ativo = TRUE,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        config.razaoSocial, config.nomeFantasia, config.cnpj, config.inscricaoEstadual,
        config.inscricaoMunicipal, config.cnaeFiscal, config.codigoRegimeTributario,
        config.logradouro, config.numero, config.complemento, config.bairro,
        config.codigoMunicipio, config.nomeMunicipio, config.uf, config.cep,
        config.codigoPais || '1058', config.nomePais || 'BRASIL', config.telefone,
        config.serieNfe, config.proximoNumeroNfe, config.ambiente, config.tipoImpressaoDanfe,
        config.formaEmissao, config.certificadoArquivo, config.certificadoSenha,
        config.certificadoValidade, config.certificadoTipo, config.wsAutorizacao,
        config.wsRetornoAutorizacao, config.wsCancelamento, config.wsInutilizacao,
        config.wsConsultaProtocolo, config.wsConsultaStatusServico, config.wsRecepcaoEvento
      ]);

      await client.query('COMMIT');
      return this.mapRowToConfiguracao(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Inicializa o serviço (carrega certificado)
   */
  async inicializar(): Promise<boolean> {
    try {
      const config = await this.getConfiguracao();
      if (!config) {
        logger.warn('NF-e: Configuração do emitente não encontrada');
        return false;
      }

      if (!config.certificadoArquivo || !config.certificadoSenha) {
        logger.warn('NF-e: Certificado digital não configurado');
        return false;
      }

      const validacao = await this.certificadoService.carregarCertificadoA1(
        config.certificadoArquivo,
        config.certificadoSenha
      );

      if (!validacao.valido) {
        logger.error('NF-e: Erro ao carregar certificado:', validacao.mensagem);
        return false;
      }

      this.sefazService.setAmbiente(config.ambiente);
      logger.info(`NF-e: Serviço inicializado (Ambiente: ${config.ambiente === NfeAmbiente.PRODUCAO ? 'Produção' : 'Homologação'})`);

      return true;
    } catch (error) {
      logger.error('NF-e: Erro ao inicializar serviço:', error);
      return false;
    }
  }

  /**
   * Emite uma NF-e a partir de uma comanda fechada
   */
  async emitirNfeComanda(comandaId: number, usuarioId: number): Promise<NfeEmitirResponse> {
    const config = await this.getConfiguracao();
    if (!config) {
      return {
        success: false,
        nfeId: 0,
        chaveAcesso: '',
        numero: 0,
        serie: config?.serieNfe || 1,
        status: NfeStatus.REJEITADA,
        mensagem: 'Configuração do emitente não encontrada'
      };
    }

    // Busca dados da comanda
    const comandaResult = await pool.query(`
      SELECT c.*, mc.id as movimento_caixa_id
      FROM comandas c
      LEFT JOIN movimentos_caixa mc ON c.movimento_caixa_id = mc.id
      WHERE c.id = $1
    `, [comandaId]);

    if (comandaResult.rows.length === 0) {
      return {
        success: false,
        nfeId: 0,
        chaveAcesso: '',
        numero: 0,
        serie: config.serieNfe,
        status: NfeStatus.REJEITADA,
        mensagem: 'Comanda não encontrada'
      };
    }

    const comanda = comandaResult.rows[0];

    // Busca itens da comanda
    const itensResult = await pool.query(`
      SELECT ic.*, p.nome as produto_nome, p.id as produto_id
      FROM itens_comanda ic
      LEFT JOIN produtos p ON ic.produto_id = p.id
      WHERE ic.comanda_id = $1 AND ic.cancelado = FALSE
    `, [comandaId]);

    // Converte itens da comanda para itens NF-e
    const itensNfe: NfeItem[] = itensResult.rows.map((item, index) => ({
      numeroItem: index + 1,
      codigoProduto: String(item.produto_id || item.id),
      descricao: item.produto_nome || item.descricao || 'PRODUTO',
      ncm: NCM_COMUNS.SERVICOS, // Ajustar conforme tipo de produto
      cfop: CFOP.VENDA_MERCADORIA_ADQUIRIDA,
      unidade: 'UN',
      quantidade: parseFloat(item.quantidade),
      valorUnitario: parseFloat(item.valor_unitario),
      valorTotal: parseFloat(item.valor_total),
      icmsOrigem: 0,
      icmsCsosn: '102', // Simples Nacional - tributada sem crédito
      produtoId: item.produto_id,
      itemComandaId: item.id
    }));

    // Monta pagamentos
    const pagamentos: NfePagamento[] = [{
      indicadorFormaPagamento: 0, // À vista
      meioPagamento: this.mapFormaPagamento(comanda.forma_pagamento),
      valorPagamento: parseFloat(comanda.total)
    }];

    // Monta a NF-e
    const nfe: NfeCompleta = {
      comandaId,
      movimentoCaixaId: comanda.movimento_caixa_id,
      tipoOperacao: NfeTipoOperacao.SAIDA,
      naturezaOperacao: 'VENDA DE MERCADORIAS',
      finalidadeEmissao: NfeFinalidadeEmissao.NORMAL,
      destinatario: comanda.cliente_nome ? {
        razaoSocial: comanda.cliente_nome,
        indicadorIe: NfeIndicadorIE.NAO_CONTRIBUINTE
      } : undefined,
      itens: itensNfe,
      totais: {
        valorTotalProdutos: parseFloat(comanda.total),
        valorTotalNf: parseFloat(comanda.total)
      },
      pagamentos,
      ambiente: config.ambiente
    };

    return this.emitirNfe(nfe, usuarioId);
  }

  /**
   * Emite uma NF-e
   */
  async emitirNfe(nfe: NfeCompleta, usuarioId: number): Promise<NfeEmitirResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const config = await this.getConfiguracao();
      if (!config) {
        throw new Error('Configuração do emitente não encontrada');
      }

      // Garante certificado carregado
      if (!this.certificadoService.isLoaded()) {
        const inicializado = await this.inicializar();
        if (!inicializado) {
          throw new Error('Não foi possível inicializar o certificado digital');
        }
      }

      // Obtém próximo número
      const numeroResult = await client.query(
        'SELECT nfe_gerar_proximo_numero($1) as numero',
        [config.id]
      );
      const numero = numeroResult.rows[0].numero;

      nfe.numero = numero;
      nfe.serie = config.serieNfe;
      nfe.emitenteId = config.id;
      nfe.ambiente = config.ambiente;
      nfe.dataEmissao = new Date();

      // Gera XML
      const xmlNfe = this.xmlGenerator.gerarXmlNfe(nfe, config);

      // Extrai chave de acesso do XML gerado
      const chaveMatch = xmlNfe.match(/Id="NFe(\d{44})"/);
      const chaveAcesso = chaveMatch ? chaveMatch[1] : '';
      nfe.chaveAcesso = chaveAcesso;

      // Assina XML
      const xmlAssinado = this.certificadoService.assinarXml(xmlNfe, 'infNFe');

      // Salva NF-e no banco (status pendente)
      const nfeInsert = await client.query(`
        INSERT INTO nfe_emitidas (
          chave_acesso, numero, serie, comanda_id, movimento_caixa_id, emitente_id,
          tipo_operacao, natureza_operacao, finalidade_emissao,
          dest_cnpj_cpf, dest_razao_social, dest_indicador_ie,
          valor_total_produtos, valor_total_nf,
          forma_pagamento, meio_pagamento,
          status, xml_envio, ambiente, usuario_id, data_emissao
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21
        ) RETURNING id
      `, [
        chaveAcesso, numero, config.serieNfe, nfe.comandaId, nfe.movimentoCaixaId,
        config.id, nfe.tipoOperacao, nfe.naturezaOperacao, nfe.finalidadeEmissao,
        nfe.destinatario?.cnpjCpf, nfe.destinatario?.razaoSocial,
        nfe.destinatario?.indicadorIe || NfeIndicadorIE.NAO_CONTRIBUINTE,
        nfe.totais.valorTotalProdutos, nfe.totais.valorTotalNf,
        nfe.pagamentos[0]?.indicadorFormaPagamento || 0,
        nfe.pagamentos[0]?.meioPagamento || NfeMeioPagamento.DINHEIRO,
        NfeStatus.PENDENTE, xmlAssinado, config.ambiente, usuarioId, nfe.dataEmissao
      ]);

      const nfeId = nfeInsert.rows[0].id;

      // Salva itens
      for (const item of nfe.itens) {
        await client.query(`
          INSERT INTO nfe_itens (
            nfe_id, numero_item, codigo_produto, descricao, ncm, cfop, unidade,
            quantidade, valor_unitario, valor_total, icms_origem, icms_csosn,
            item_comanda_id, produto_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          nfeId, item.numeroItem, item.codigoProduto, item.descricao,
          item.ncm, item.cfop, item.unidade, item.quantidade, item.valorUnitario,
          item.valorTotal, item.icmsOrigem, item.icmsCsosn,
          item.itemComandaId, item.produtoId
        ]);
      }

      // Envia para SEFAZ
      const resposta = await this.sefazService.autorizarNfe(xmlAssinado);

      // Atualiza status
      let status = NfeStatus.PENDENTE;
      if (resposta.success) {
        status = NfeStatus.AUTORIZADA;
      } else if (resposta.codigoStatus === 110) {
        status = NfeStatus.DENEGADA;
      } else {
        status = NfeStatus.REJEITADA;
      }

      await client.query(`
        UPDATE nfe_emitidas SET
          status = $1,
          codigo_status = $2,
          motivo_status = $3,
          protocolo_autorizacao = $4,
          data_autorizacao = $5,
          xml_retorno = $6,
          xml_autorizado = CASE WHEN $1 = 'AUTORIZADA' THEN $7 ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `, [
        status, resposta.codigoStatus, resposta.motivoStatus,
        resposta.protocolo, resposta.dataRecebimento,
        resposta.xmlRetorno, xmlAssinado, nfeId
      ]);

      await client.query('COMMIT');

      // Atualiza contadores de homologação se aplicável
      if (config.ambiente === NfeAmbiente.HOMOLOGACAO) {
        await this.atualizarContadorHomologacao(config.id!, 'autorizacao');
      }

      return {
        success: resposta.success,
        nfeId,
        chaveAcesso,
        numero,
        serie: config.serieNfe,
        protocolo: resposta.protocolo,
        status,
        mensagem: resposta.motivoStatus
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Erro ao emitir NF-e:', error);

      return {
        success: false,
        nfeId: 0,
        chaveAcesso: '',
        numero: 0,
        serie: 1,
        status: NfeStatus.REJEITADA,
        mensagem: error.message || 'Erro ao emitir NF-e'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Cancela uma NF-e
   */
  async cancelarNfe(request: NfeCancelarRequest, usuarioId: number): Promise<NfeCancelarResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Busca NF-e
      const nfeResult = await client.query(`
        SELECT n.*, e.cnpj, e.ambiente
        FROM nfe_emitidas n
        JOIN nfe_configuracao_emitente e ON n.emitente_id = e.id
        WHERE n.id = $1
      `, [request.nfeId]);

      if (nfeResult.rows.length === 0) {
        throw new Error('NF-e não encontrada');
      }

      const nfe = nfeResult.rows[0];

      if (nfe.status !== NfeStatus.AUTORIZADA) {
        throw new Error('Apenas NF-e autorizada pode ser cancelada');
      }

      if (!nfe.protocolo_autorizacao) {
        throw new Error('NF-e não possui protocolo de autorização');
      }

      // Valida justificativa
      if (!request.justificativa || request.justificativa.length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres');
      }

      // Verifica prazo de cancelamento (24 horas)
      const dataAutorizacao = new Date(nfe.data_autorizacao);
      const horasDecorridas = (Date.now() - dataAutorizacao.getTime()) / (1000 * 60 * 60);
      if (horasDecorridas > 24) {
        throw new Error('Prazo para cancelamento excedido (24 horas)');
      }

      const config = await this.getConfiguracao();
      if (!config) throw new Error('Configuração não encontrada');

      // Garante certificado
      if (!this.certificadoService.isLoaded()) {
        await this.inicializar();
      }

      const cancelamento: NfeCancelamento = {
        nfeId: request.nfeId,
        tipoEvento: '110111',
        sequenciaEvento: 1,
        chaveAcesso: nfe.chave_acesso,
        protocoloAutorizacaoNfe: nfe.protocolo_autorizacao,
        justificativa: request.justificativa,
        status: NfeCancelamentoStatus.PENDENTE
      };

      // Gera XML
      const xmlCancelamento = this.xmlGenerator.gerarXmlCancelamento(cancelamento, config);

      // Assina
      const xmlAssinado = this.certificadoService.assinarXml(xmlCancelamento, 'infEvento');

      // Salva cancelamento
      const cancelInsert = await client.query(`
        INSERT INTO nfe_cancelamentos (
          nfe_id, tipo_evento, sequencia_evento, chave_acesso,
          protocolo_autorizacao_nfe, justificativa, xml_envio,
          status, usuario_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        request.nfeId, '110111', 1, nfe.chave_acesso,
        nfe.protocolo_autorizacao, request.justificativa, xmlAssinado,
        NfeCancelamentoStatus.PENDENTE, usuarioId
      ]);

      // Envia para SEFAZ
      const resposta = await this.sefazService.enviarCancelamento(xmlAssinado);

      const status = resposta.success
        ? NfeCancelamentoStatus.HOMOLOGADO
        : NfeCancelamentoStatus.REJEITADO;

      // Atualiza cancelamento
      await client.query(`
        UPDATE nfe_cancelamentos SET
          protocolo_cancelamento = $1,
          data_cancelamento = $2,
          codigo_status = $3,
          motivo_status = $4,
          xml_retorno = $5,
          status = $6
        WHERE id = $7
      `, [
        resposta.protocolo, resposta.dataRecebimento,
        resposta.codigoStatus, resposta.motivoStatus,
        resposta.xmlRetorno, status, cancelInsert.rows[0].id
      ]);

      // Se homologado, atualiza NF-e
      if (resposta.success) {
        await client.query(`
          UPDATE nfe_emitidas SET
            status = 'CANCELADA',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [request.nfeId]);
      }

      await client.query('COMMIT');

      // Atualiza contadores de homologação
      if (nfe.ambiente === NfeAmbiente.HOMOLOGACAO && resposta.success) {
        await this.atualizarContadorHomologacao(config.id!, 'cancelamento');
      }

      return {
        success: resposta.success,
        protocolo: resposta.protocolo,
        status,
        mensagem: resposta.motivoStatus
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Erro ao cancelar NF-e:', error);

      return {
        success: false,
        status: NfeCancelamentoStatus.REJEITADO,
        mensagem: error.message || 'Erro ao cancelar NF-e'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Inutiliza uma faixa de numeração
   */
  async inutilizarNumeracao(request: NfeInutilizarRequest, usuarioId: number): Promise<NfeInutilizarResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const config = await this.getConfiguracao();
      if (!config) throw new Error('Configuração não encontrada');

      // Valida justificativa
      if (!request.justificativa || request.justificativa.length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres');
      }

      // Valida faixa
      if (request.numeroInicial > request.numeroFinal) {
        throw new Error('Número inicial deve ser menor ou igual ao número final');
      }

      // Garante certificado
      if (!this.certificadoService.isLoaded()) {
        await this.inicializar();
      }

      const inutilizacao: NfeInutilizacao = {
        emitenteId: config.id!,
        ano: new Date().getFullYear(),
        serie: request.serie,
        numeroInicial: request.numeroInicial,
        numeroFinal: request.numeroFinal,
        justificativa: request.justificativa,
        status: NfeInutilizacaoStatus.PENDENTE
      };

      // Gera XML
      const xmlInutilizacao = this.xmlGenerator.gerarXmlInutilizacao(inutilizacao, config);

      // Assina
      const xmlAssinado = this.certificadoService.assinarXml(xmlInutilizacao, 'infInut');

      // Salva inutilização
      const inutInsert = await client.query(`
        INSERT INTO nfe_inutilizacoes (
          emitente_id, ano, serie, numero_inicial, numero_final,
          justificativa, xml_envio, status, usuario_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        config.id, inutilizacao.ano, request.serie, request.numeroInicial,
        request.numeroFinal, request.justificativa, xmlAssinado,
        NfeInutilizacaoStatus.PENDENTE, usuarioId
      ]);

      // Envia para SEFAZ
      const resposta = await this.sefazService.enviarInutilizacao(xmlAssinado);

      const status = resposta.success
        ? NfeInutilizacaoStatus.HOMOLOGADA
        : NfeInutilizacaoStatus.REJEITADA;

      // Atualiza inutilização
      await client.query(`
        UPDATE nfe_inutilizacoes SET
          protocolo_inutilizacao = $1,
          data_inutilizacao = $2,
          codigo_status = $3,
          motivo_status = $4,
          xml_retorno = $5,
          status = $6
        WHERE id = $7
      `, [
        resposta.protocolo, resposta.dataRecebimento,
        resposta.codigoStatus, resposta.motivoStatus,
        resposta.xmlRetorno, status, inutInsert.rows[0].id
      ]);

      await client.query('COMMIT');

      // Atualiza contadores de homologação
      if (config.ambiente === NfeAmbiente.HOMOLOGACAO && resposta.success) {
        await this.atualizarContadorHomologacao(config.id!, 'inutilizacao');
      }

      return {
        success: resposta.success,
        protocolo: resposta.protocolo,
        status,
        mensagem: resposta.motivoStatus
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Erro ao inutilizar numeração:', error);

      return {
        success: false,
        status: NfeInutilizacaoStatus.REJEITADA,
        mensagem: error.message || 'Erro ao inutilizar numeração'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Consulta NF-e na SEFAZ
   */
  async consultarNfe(chaveAcesso: string): Promise<NfeConsultarResponse> {
    try {
      if (!this.certificadoService.isLoaded()) {
        await this.inicializar();
      }

      const resposta = await this.sefazService.consultarNfe(chaveAcesso);

      // Busca NF-e local
      const result = await pool.query(`
        SELECT * FROM nfe_emitidas WHERE chave_acesso = $1
      `, [chaveAcesso]);

      let nfe: NfeCompleta | undefined;
      if (result.rows.length > 0) {
        nfe = this.mapRowToNfe(result.rows[0]);
      }

      // Mapeia status
      let status = NfeStatus.PENDENTE;
      if (resposta.codigoStatus === 100) status = NfeStatus.AUTORIZADA;
      else if (resposta.codigoStatus === 101) status = NfeStatus.CANCELADA;
      else if (resposta.codigoStatus === 110) status = NfeStatus.DENEGADA;

      return {
        success: resposta.success,
        nfe,
        status,
        mensagem: resposta.motivoStatus
      };
    } catch (error: any) {
      logger.error('Erro ao consultar NF-e:', error);

      return {
        success: false,
        status: NfeStatus.PENDENTE,
        mensagem: error.message || 'Erro ao consultar NF-e'
      };
    }
  }

  /**
   * Lista NF-e com filtros
   */
  async listarNfe(filtros: NfeListarFiltros): Promise<NfeListarResponse> {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.dataInicio) {
      whereClause += ` AND n.data_emissao >= $${paramIndex++}`;
      params.push(filtros.dataInicio);
    }

    if (filtros.dataFim) {
      whereClause += ` AND n.data_emissao <= $${paramIndex++}`;
      params.push(filtros.dataFim);
    }

    if (filtros.status && filtros.status.length > 0) {
      whereClause += ` AND n.status = ANY($${paramIndex++})`;
      params.push(filtros.status);
    }

    if (filtros.ambiente !== undefined) {
      whereClause += ` AND n.ambiente = $${paramIndex++}`;
      params.push(filtros.ambiente);
    }

    if (filtros.numero) {
      whereClause += ` AND n.numero = $${paramIndex++}`;
      params.push(filtros.numero);
    }

    if (filtros.chaveAcesso) {
      whereClause += ` AND n.chave_acesso = $${paramIndex++}`;
      params.push(filtros.chaveAcesso);
    }

    if (filtros.comandaId) {
      whereClause += ` AND n.comanda_id = $${paramIndex++}`;
      params.push(filtros.comandaId);
    }

    const orderBy = filtros.orderBy || 'data_emissao';
    const orderDirection = filtros.orderDirection || 'DESC';

    // Count total
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM nfe_emitidas n ${whereClause}
    `, params);
    const total = parseInt(countResult.rows[0].total);

    // Busca dados
    const dataResult = await pool.query(`
      SELECT n.*, e.razao_social as emitente_razao_social
      FROM nfe_emitidas n
      LEFT JOIN nfe_configuracao_emitente e ON n.emitente_id = e.id
      ${whereClause}
      ORDER BY n.${orderBy} ${orderDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, [...params, limit, offset]);

    const data = dataResult.rows.map(row => this.mapRowToNfe(row));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Obtém NF-e por ID
   */
  async getNfeById(id: number): Promise<NfeCompleta | null> {
    const result = await pool.query(`
      SELECT n.*, e.razao_social as emitente_razao_social
      FROM nfe_emitidas n
      LEFT JOIN nfe_configuracao_emitente e ON n.emitente_id = e.id
      WHERE n.id = $1
    `, [id]);

    if (result.rows.length === 0) return null;

    const nfe = this.mapRowToNfe(result.rows[0]);

    // Busca itens
    const itensResult = await pool.query(`
      SELECT * FROM nfe_itens WHERE nfe_id = $1 ORDER BY numero_item
    `, [id]);

    nfe.itens = itensResult.rows.map(row => ({
      id: row.id,
      nfeId: row.nfe_id,
      numeroItem: row.numero_item,
      codigoProduto: row.codigo_produto,
      descricao: row.descricao,
      ncm: row.ncm,
      cfop: row.cfop,
      unidade: row.unidade,
      quantidade: parseFloat(row.quantidade),
      valorUnitario: parseFloat(row.valor_unitario),
      valorTotal: parseFloat(row.valor_total),
      valorDesconto: row.valor_desconto ? parseFloat(row.valor_desconto) : undefined,
      icmsOrigem: row.icms_origem,
      icmsCst: row.icms_cst,
      icmsCsosn: row.icms_csosn,
      produtoId: row.produto_id,
      itemComandaId: row.item_comanda_id
    }));

    return nfe;
  }

  /**
   * Consulta status do serviço SEFAZ
   */
  async consultarStatusServico() {
    if (!this.certificadoService.isLoaded()) {
      await this.inicializar();
    }
    return this.sefazService.consultarStatusServico();
  }

  /**
   * Atualiza contador de testes de homologação
   */
  private async atualizarContadorHomologacao(
    emitenteId: number,
    tipo: 'autorizacao' | 'cancelamento' | 'inutilizacao'
  ): Promise<void> {
    const coluna = tipo === 'autorizacao' ? 'autorizacoes_realizadas'
      : tipo === 'cancelamento' ? 'cancelamentos_realizados'
        : 'inutilizacoes_realizadas';

    await pool.query(`
      INSERT INTO nfe_homologacao_testes (
        emitente_id, data_teste, ${coluna},
        autorizacoes_meta, cancelamentos_meta, inutilizacoes_meta
      ) VALUES ($1, CURRENT_DATE, 1, 100, 10, 10)
      ON CONFLICT (emitente_id, data_teste)
      DO UPDATE SET ${coluna} = nfe_homologacao_testes.${coluna} + 1
    `, [emitenteId]);
  }

  /**
   * Mapeia forma de pagamento da comanda para NF-e
   */
  private mapFormaPagamento(formaPagamento: string | null): NfeMeioPagamento {
    if (!formaPagamento) return NfeMeioPagamento.DINHEIRO;

    const forma = formaPagamento.toLowerCase();
    if (forma.includes('dinheiro')) return NfeMeioPagamento.DINHEIRO;
    if (forma.includes('credito') || forma.includes('crédito')) return NfeMeioPagamento.CARTAO_CREDITO;
    if (forma.includes('debito') || forma.includes('débito')) return NfeMeioPagamento.CARTAO_DEBITO;
    if (forma.includes('pix')) return NfeMeioPagamento.PIX;
    if (forma.includes('cheque')) return NfeMeioPagamento.CHEQUE;

    return NfeMeioPagamento.OUTROS;
  }

  /**
   * Mapeia row do banco para objeto Configuracao
   */
  private mapRowToConfiguracao(row: any): NfeConfiguracao {
    return {
      id: row.id,
      razaoSocial: row.razao_social,
      nomeFantasia: row.nome_fantasia,
      cnpj: row.cnpj,
      inscricaoEstadual: row.inscricao_estadual,
      inscricaoMunicipal: row.inscricao_municipal,
      cnaeFiscal: row.cnae_fiscal,
      codigoRegimeTributario: row.codigo_regime_tributario,
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      codigoMunicipio: row.codigo_municipio,
      nomeMunicipio: row.nome_municipio,
      uf: row.uf,
      cep: row.cep,
      codigoPais: row.codigo_pais,
      nomePais: row.nome_pais,
      telefone: row.telefone,
      serieNfe: row.serie_nfe,
      proximoNumeroNfe: row.proximo_numero_nfe,
      ambiente: row.ambiente,
      tipoImpressaoDanfe: row.tipo_impressao_danfe,
      formaEmissao: row.forma_emissao,
      certificadoArquivo: row.certificado_arquivo,
      certificadoSenha: row.certificado_senha_hash,
      certificadoValidade: row.certificado_validade,
      certificadoTipo: row.certificado_tipo,
      wsAutorizacao: row.ws_autorizacao,
      wsRetornoAutorizacao: row.ws_retorno_autorizacao,
      wsCancelamento: row.ws_cancelamento,
      wsInutilizacao: row.ws_inutilizacao,
      wsConsultaProtocolo: row.ws_consulta_protocolo,
      wsConsultaStatusServico: row.ws_consulta_status_servico,
      wsRecepcaoEvento: row.ws_recepcao_evento,
      ativo: row.ativo,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Mapeia row do banco para objeto NF-e
   */
  private mapRowToNfe(row: any): NfeCompleta {
    return {
      id: row.id,
      chaveAcesso: row.chave_acesso,
      numero: row.numero,
      serie: row.serie,
      comandaId: row.comanda_id,
      movimentoCaixaId: row.movimento_caixa_id,
      emitenteId: row.emitente_id,
      tipoOperacao: row.tipo_operacao,
      naturezaOperacao: row.natureza_operacao,
      finalidadeEmissao: row.finalidade_emissao,
      destinatario: row.dest_cnpj_cpf ? {
        cnpjCpf: row.dest_cnpj_cpf,
        razaoSocial: row.dest_razao_social,
        inscricaoEstadual: row.dest_inscricao_estadual,
        indicadorIe: row.dest_indicador_ie
      } : undefined,
      itens: [],
      totais: {
        valorTotalProdutos: parseFloat(row.valor_total_produtos || 0),
        valorTotalNf: parseFloat(row.valor_total_nf || 0),
        valorDesconto: row.valor_desconto ? parseFloat(row.valor_desconto) : undefined,
        valorIcms: row.valor_icms ? parseFloat(row.valor_icms) : undefined
      },
      pagamentos: [{
        indicadorFormaPagamento: row.forma_pagamento || 0,
        meioPagamento: row.meio_pagamento || NfeMeioPagamento.DINHEIRO,
        valorPagamento: parseFloat(row.valor_total_nf || 0)
      }],
      status: row.status,
      codigoStatus: row.codigo_status,
      motivoStatus: row.motivo_status,
      protocoloAutorizacao: row.protocolo_autorizacao,
      dataAutorizacao: row.data_autorizacao,
      dataEmissao: row.data_emissao,
      formaEmissao: row.forma_emissao,
      xmlEnvio: row.xml_envio,
      xmlRetorno: row.xml_retorno,
      xmlAutorizado: row.xml_autorizado,
      danfeImpresso: row.danfe_impresso,
      ambiente: row.ambiente,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      usuarioId: row.usuario_id
    };
  }
}

// Singleton
let nfeServiceInstance: NfeService | null = null;

export function getNfeService(): NfeService {
  if (!nfeServiceInstance) {
    nfeServiceInstance = new NfeService();
  }
  return nfeServiceInstance;
}

export default NfeService;
