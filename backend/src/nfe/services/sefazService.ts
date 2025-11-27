/**
 * Serviço de Comunicação com SEFAZ
 * Responsável pela comunicação SOAP com os Web Services da SEFAZ
 */

import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import {
  NfeAmbiente,
  NfeSefazResponse,
  NfeStatusServico,
  NfeWebServicesUrls,
  NfeConfiguracao,
  SEFAZ_STATUS_CODES
} from '../types';
import { CertificadoService, getCertificadoService } from './certificadoService';
import logger from '../../config/logger';
import pool from '../../config/database';

/**
 * URLs dos Web Services SEFAZ/PR
 * Versão 4.00 - Atualizar conforme manual mais recente
 */
export const SEFAZ_URLS: Record<NfeAmbiente, NfeWebServicesUrls> = {
  [NfeAmbiente.PRODUCAO]: {
    autorizacao: 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
    retornoAutorizacao: 'https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4',
    cancelamento: 'https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
    inutilizacao: 'https://nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4',
    consultaProtocolo: 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
    consultaStatusServico: 'https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    recepcaoEvento: 'https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4'
  },
  [NfeAmbiente.HOMOLOGACAO]: {
    autorizacao: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
    retornoAutorizacao: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4',
    cancelamento: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
    inutilizacao: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4',
    consultaProtocolo: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
    consultaStatusServico: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    recepcaoEvento: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4'
  }
};

/**
 * URLs de contingência (SVC-RS para PR)
 */
export const SEFAZ_CONTINGENCIA_URLS: NfeWebServicesUrls = {
  autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
  retornoAutorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
  cancelamento: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
  inutilizacao: 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
  consultaProtocolo: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
  consultaStatusServico: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  recepcaoEvento: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx'
};

/**
 * Ações SOAP para cada serviço
 */
const SOAP_ACTIONS: Record<string, string> = {
  autorizacao: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
  retornoAutorizacao: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4/nfeRetAutorizacaoLote',
  cancelamento: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
  inutilizacao: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4/nfeInutilizacaoNF',
  consultaProtocolo: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
  consultaStatusServico: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF',
  recepcaoEvento: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento'
};

/**
 * Classe para comunicação com a SEFAZ
 */
export class SefazService {
  private certificadoService: CertificadoService;
  private ambiente: NfeAmbiente;
  private timeout: number = 60000; // 60 segundos
  private maxRetries: number = 3;

  constructor(ambiente: NfeAmbiente = NfeAmbiente.HOMOLOGACAO) {
    this.certificadoService = getCertificadoService();
    this.ambiente = ambiente;
  }

  /**
   * Define o ambiente de operação
   */
  setAmbiente(ambiente: NfeAmbiente): void {
    this.ambiente = ambiente;
  }

  /**
   * Obtém as URLs do ambiente atual
   */
  getUrls(contingencia: boolean = false): NfeWebServicesUrls {
    if (contingencia) {
      return SEFAZ_CONTINGENCIA_URLS;
    }
    return SEFAZ_URLS[this.ambiente];
  }

  /**
   * Envelopa o XML em SOAP
   */
  private criarEnvelopeSoap(xml: string, servico: string): string {
    // Remove declaração XML do conteúdo
    const xmlLimpo = xml.replace(/<\?xml[^?]*\?>/gi, '').trim();

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${this.getNomeWsdl(servico)}">
      ${xmlLimpo}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Obtém nome do WSDL baseado no serviço
   */
  private getNomeWsdl(servico: string): string {
    const nomes: Record<string, string> = {
      autorizacao: 'NFeAutorizacao4',
      retornoAutorizacao: 'NFeRetAutorizacao4',
      cancelamento: 'NFeRecepcaoEvento4',
      inutilizacao: 'NFeInutilizacao4',
      consultaProtocolo: 'NFeConsultaProtocolo4',
      consultaStatusServico: 'NFeStatusServico4',
      recepcaoEvento: 'NFeRecepcaoEvento4'
    };
    return nomes[servico] || 'NFeAutorizacao4';
  }

  /**
   * Realiza requisição SOAP para a SEFAZ
   */
  async enviarRequisicao(
    servico: keyof NfeWebServicesUrls,
    xml: string,
    contingencia: boolean = false
  ): Promise<string> {
    const urls = this.getUrls(contingencia);
    const url = urls[servico];
    const soapAction = SOAP_ACTIONS[servico];

    if (!url) {
      throw new Error(`URL não configurada para o serviço: ${servico}`);
    }

    if (!this.certificadoService.isLoaded()) {
      throw new Error('Certificado digital não carregado');
    }

    const envelope = this.criarEnvelopeSoap(xml, servico);
    const startTime = Date.now();

    try {
      const response = await this.httpRequest(url, envelope, soapAction);
      const tempoResposta = Date.now() - startTime;

      // Log da comunicação
      await this.logComunicacao(servico, url, xml, response, 200, tempoResposta, true);

      return this.extrairConteudoSoap(response);
    } catch (error: any) {
      const tempoResposta = Date.now() - startTime;

      // Log do erro
      await this.logComunicacao(
        servico, url, xml, null,
        error.statusCode || 0,
        tempoResposta, false, error.message
      );

      throw error;
    }
  }

  /**
   * Executa requisição HTTP/HTTPS com certificado
   */
  private httpRequest(url: string, body: string, soapAction: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const httpsOptions = this.certificadoService.getHttpsAgentOptions();

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
          'SOAPAction': soapAction
        },
        cert: httpsOptions.cert,
        key: httpsOptions.key,
        rejectUnauthorized: true,
        timeout: this.timeout
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${data}`) as any;
            error.statusCode = res.statusCode;
            error.body = data;
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout na conexão com SEFAZ'));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Extrai conteúdo da resposta SOAP
   */
  private extrairConteudoSoap(soapResponse: string): string {
    // Tenta extrair o conteúdo do Body
    const bodyMatch = soapResponse.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/i)
      || soapResponse.match(/<soap12:Body[^>]*>([\s\S]*?)<\/soap12:Body>/i)
      || soapResponse.match(/<Body[^>]*>([\s\S]*?)<\/Body>/i);

    if (bodyMatch) {
      return bodyMatch[1].trim();
    }

    // Se não encontrar, retorna o XML completo
    return soapResponse;
  }

  /**
   * Consulta status do serviço
   */
  async consultarStatusServico(): Promise<NfeStatusServico> {
    const { getXmlGeneratorService } = await import('./xmlGeneratorService');
    const xmlGenerator = getXmlGeneratorService();

    const xmlConsulta = xmlGenerator.gerarXmlConsultaStatusServico(this.ambiente);
    const startTime = Date.now();

    try {
      const response = await this.enviarRequisicao('consultaStatusServico', xmlConsulta);
      const tempoMedio = Date.now() - startTime;

      // Parse da resposta
      const cStatMatch = response.match(/<cStat>(\d+)<\/cStat>/);
      const xMotivoMatch = response.match(/<xMotivo>([^<]+)<\/xMotivo>/);

      const codigoStatus = cStatMatch ? parseInt(cStatMatch[1]) : 0;
      const motivoStatus = xMotivoMatch ? xMotivoMatch[1] : 'Resposta não processada';

      return {
        online: codigoStatus === 107, // 107 = Serviço em operação
        ambiente: this.ambiente,
        codigoStatus,
        motivoStatus,
        tempoMedio,
        dataConsulta: new Date()
      };
    } catch (error: any) {
      logger.error('Erro ao consultar status SEFAZ:', error);

      return {
        online: false,
        ambiente: this.ambiente,
        codigoStatus: 0,
        motivoStatus: error.message || 'Erro de conexão',
        tempoMedio: Date.now() - startTime,
        dataConsulta: new Date()
      };
    }
  }

  /**
   * Envia NF-e para autorização
   */
  async autorizarNfe(xmlAssinado: string): Promise<NfeSefazResponse> {
    const { getXmlGeneratorService } = await import('./xmlGeneratorService');
    const xmlGenerator = getXmlGeneratorService();

    const idLote = String(Date.now());
    const xmlEnvio = xmlGenerator.gerarXmlEnviNfe([xmlAssinado], idLote);

    const response = await this.enviarRequisicao('autorizacao', xmlEnvio);

    return this.processarRespostaAutorizacao(response);
  }

  /**
   * Processa resposta de autorização
   */
  private processarRespostaAutorizacao(xmlResposta: string): NfeSefazResponse {
    const cStatMatch = xmlResposta.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = xmlResposta.match(/<xMotivo>([^<]+)<\/xMotivo>/);
    const nProtMatch = xmlResposta.match(/<nProt>(\d+)<\/nProt>/);
    const dhRecbtoMatch = xmlResposta.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);

    const codigoStatus = cStatMatch ? parseInt(cStatMatch[1]) : 0;
    const motivoStatus = xMotivoMatch ? this.decodeXml(xMotivoMatch[1]) : 'Resposta não processada';
    const protocolo = nProtMatch ? nProtMatch[1] : undefined;
    const dataRecebimento = dhRecbtoMatch ? new Date(dhRecbtoMatch[1]) : undefined;

    // Verifica se foi autorizada
    const success = codigoStatus === SEFAZ_STATUS_CODES.AUTORIZADA;

    return {
      success,
      codigoStatus,
      motivoStatus,
      protocolo,
      dataRecebimento,
      xmlRetorno: xmlResposta,
      erros: success ? undefined : [{
        codigo: String(codigoStatus),
        mensagem: motivoStatus
      }]
    };
  }

  /**
   * Envia evento de cancelamento
   */
  async enviarCancelamento(xmlAssinado: string): Promise<NfeSefazResponse> {
    const response = await this.enviarRequisicao('recepcaoEvento', xmlAssinado);

    return this.processarRespostaEvento(response, '110111');
  }

  /**
   * Envia inutilização de numeração
   */
  async enviarInutilizacao(xmlAssinado: string): Promise<NfeSefazResponse> {
    const response = await this.enviarRequisicao('inutilizacao', xmlAssinado);

    return this.processarRespostaInutilizacao(response);
  }

  /**
   * Processa resposta de evento (cancelamento, CCe, etc)
   */
  private processarRespostaEvento(xmlResposta: string, tipoEvento: string): NfeSefazResponse {
    const cStatMatch = xmlResposta.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = xmlResposta.match(/<xMotivo>([^<]+)<\/xMotivo>/);
    const nProtMatch = xmlResposta.match(/<nProt>(\d+)<\/nProt>/);
    const dhRegEventoMatch = xmlResposta.match(/<dhRegEvento>([^<]+)<\/dhRegEvento>/);

    const codigoStatus = cStatMatch ? parseInt(cStatMatch[1]) : 0;
    const motivoStatus = xMotivoMatch ? this.decodeXml(xMotivoMatch[1]) : 'Resposta não processada';
    const protocolo = nProtMatch ? nProtMatch[1] : undefined;
    const dataRecebimento = dhRegEventoMatch ? new Date(dhRegEventoMatch[1]) : undefined;

    // Para cancelamento, sucesso é código 135 ou 155
    const success = codigoStatus === 135 || codigoStatus === 155;

    return {
      success,
      codigoStatus,
      motivoStatus,
      protocolo,
      dataRecebimento,
      xmlRetorno: xmlResposta,
      erros: success ? undefined : [{
        codigo: String(codigoStatus),
        mensagem: motivoStatus
      }]
    };
  }

  /**
   * Processa resposta de inutilização
   */
  private processarRespostaInutilizacao(xmlResposta: string): NfeSefazResponse {
    const cStatMatch = xmlResposta.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = xmlResposta.match(/<xMotivo>([^<]+)<\/xMotivo>/);
    const nProtMatch = xmlResposta.match(/<nProt>(\d+)<\/nProt>/);
    const dhRecbtoMatch = xmlResposta.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);

    const codigoStatus = cStatMatch ? parseInt(cStatMatch[1]) : 0;
    const motivoStatus = xMotivoMatch ? this.decodeXml(xMotivoMatch[1]) : 'Resposta não processada';
    const protocolo = nProtMatch ? nProtMatch[1] : undefined;
    const dataRecebimento = dhRecbtoMatch ? new Date(dhRecbtoMatch[1]) : undefined;

    // Para inutilização, sucesso é código 102
    const success = codigoStatus === SEFAZ_STATUS_CODES.INUTILIZADA;

    return {
      success,
      codigoStatus,
      motivoStatus,
      protocolo,
      dataRecebimento,
      xmlRetorno: xmlResposta,
      erros: success ? undefined : [{
        codigo: String(codigoStatus),
        mensagem: motivoStatus
      }]
    };
  }

  /**
   * Consulta situação de NF-e por chave de acesso
   */
  async consultarNfe(chaveAcesso: string): Promise<NfeSefazResponse> {
    const { getXmlGeneratorService } = await import('./xmlGeneratorService');
    const xmlGenerator = getXmlGeneratorService();

    const xmlConsulta = xmlGenerator.gerarXmlConsultaNfe(chaveAcesso, this.ambiente);
    const response = await this.enviarRequisicao('consultaProtocolo', xmlConsulta);

    return this.processarRespostaConsulta(response);
  }

  /**
   * Processa resposta de consulta
   */
  private processarRespostaConsulta(xmlResposta: string): NfeSefazResponse {
    const cStatMatch = xmlResposta.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = xmlResposta.match(/<xMotivo>([^<]+)<\/xMotivo>/);
    const nProtMatch = xmlResposta.match(/<nProt>(\d+)<\/nProt>/);

    const codigoStatus = cStatMatch ? parseInt(cStatMatch[1]) : 0;
    const motivoStatus = xMotivoMatch ? this.decodeXml(xMotivoMatch[1]) : 'Resposta não processada';
    const protocolo = nProtMatch ? nProtMatch[1] : undefined;

    // 100 = Autorizada, 101 = Cancelada, 110 = Denegada
    const success = [100, 101, 110].includes(codigoStatus);

    return {
      success,
      codigoStatus,
      motivoStatus,
      protocolo,
      xmlRetorno: xmlResposta
    };
  }

  /**
   * Verifica se a SEFAZ está disponível
   */
  async verificarDisponibilidade(): Promise<boolean> {
    try {
      const status = await this.consultarStatusServico();
      return status.online;
    } catch {
      return false;
    }
  }

  /**
   * Registra log de comunicação no banco de dados
   */
  private async logComunicacao(
    tipoOperacao: string,
    url: string,
    xmlRequisicao: string,
    xmlResposta: string | null,
    codigoHttp: number,
    tempoRespostaMs: number,
    sucesso: boolean,
    mensagemErro?: string
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO nfe_comunicacao_log (
          tipo_operacao, url_requisicao, xml_requisicao,
          xml_resposta, codigo_http, tempo_resposta_ms,
          data_resposta, sucesso, mensagem_erro, ambiente
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        tipoOperacao, url, xmlRequisicao,
        xmlResposta, codigoHttp, tempoRespostaMs,
        new Date(), sucesso, mensagemErro, this.ambiente
      ]);
    } catch (error) {
      logger.error('Erro ao registrar log de comunicação:', error);
    }
  }

  /**
   * Decodifica entidades XML
   */
  private decodeXml(texto: string): string {
    return texto
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}

// Instância singleton
let sefazServiceInstance: SefazService | null = null;

export function getSefazService(ambiente?: NfeAmbiente): SefazService {
  if (!sefazServiceInstance) {
    sefazServiceInstance = new SefazService(ambiente);
  } else if (ambiente !== undefined) {
    sefazServiceInstance.setAmbiente(ambiente);
  }
  return sefazServiceInstance;
}

export function createSefazService(ambiente: NfeAmbiente): SefazService {
  return new SefazService(ambiente);
}

export default SefazService;
