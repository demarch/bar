/**
 * Serviço de Gerenciamento de Certificado Digital
 * Responsável por carregar, validar e assinar documentos com certificado ICP-Brasil
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { CertificadoInfo, CertificadoValidacao, NfeTipoCertificado } from '../types';
import logger from '../../config/logger';

// Importação condicional do node-forge para manipulação de certificados
let forge: any;
try {
  forge = require('node-forge');
} catch (e) {
  logger.warn('node-forge não instalado. Algumas funcionalidades de certificado podem não funcionar.');
}

/**
 * Classe para gerenciamento de certificados digitais A1 e A3
 */
export class CertificadoService {
  private certificado: any = null;
  private chavePrivada: any = null;
  private certificadoInfo: CertificadoInfo | null = null;

  /**
   * Carrega um certificado A1 (arquivo PFX/P12)
   */
  async carregarCertificadoA1(
    caminhoOuBase64: string,
    senha: string
  ): Promise<CertificadoValidacao> {
    try {
      let pfxBuffer: Buffer;

      // Verifica se é caminho de arquivo ou base64
      if (fs.existsSync(caminhoOuBase64)) {
        pfxBuffer = fs.readFileSync(caminhoOuBase64);
      } else {
        // Assume que é base64
        pfxBuffer = Buffer.from(caminhoOuBase64, 'base64');
      }

      if (!forge) {
        throw new Error('Biblioteca node-forge não disponível. Instale com: npm install node-forge');
      }

      // Converte o buffer para formato ASN1
      const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));

      // Decodifica o PKCS#12
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

      // Extrai o certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag];
      if (!certBag || certBag.length === 0) {
        throw new Error('Certificado não encontrado no arquivo PFX');
      }
      this.certificado = certBag[0].cert;

      // Extrai a chave privada
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (!keyBag || keyBag.length === 0) {
        throw new Error('Chave privada não encontrada no arquivo PFX');
      }
      this.chavePrivada = keyBag[0].key;

      // Extrai informações do certificado
      this.certificadoInfo = this.extrairInformacoes();

      return {
        valido: true,
        mensagem: 'Certificado carregado com sucesso',
        certificadoInfo: this.certificadoInfo
      };
    } catch (error: any) {
      logger.error('Erro ao carregar certificado A1:', error);
      return {
        valido: false,
        mensagem: `Erro ao carregar certificado: ${error.message}`
      };
    }
  }

  /**
   * Extrai informações do certificado carregado
   */
  private extrairInformacoes(): CertificadoInfo {
    if (!this.certificado) {
      throw new Error('Nenhum certificado carregado');
    }

    const subject = this.certificado.subject;
    const issuer = this.certificado.issuer;

    // Extrai CN (Common Name)
    const cnAttr = subject.getField('CN');
    const titular = cnAttr ? cnAttr.value : 'Não identificado';

    // Tenta extrair CNPJ do certificado (pode estar em diferentes campos)
    let cnpj = '';
    const serialNumberAttr = subject.getField({ shortName: 'serialNumber' });
    if (serialNumberAttr && serialNumberAttr.value) {
      // O CNPJ geralmente está no formato: número:CPF ou número:CNPJ
      const match = serialNumberAttr.value.match(/(\d{14})/);
      if (match) {
        cnpj = match[1];
      }
    }

    const validadeInicio = this.certificado.validity.notBefore;
    const validadeFim = this.certificado.validity.notAfter;

    const agora = new Date();
    const diasParaExpirar = Math.ceil(
      (validadeFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
    );

    const valido = agora >= validadeInicio && agora <= validadeFim;

    // Extrai emissor
    const emissorCn = issuer.getField('CN');
    const emissor = emissorCn ? emissorCn.value : 'Não identificado';

    return {
      tipo: NfeTipoCertificado.A1,
      titular,
      cnpj,
      serialNumber: this.certificado.serialNumber,
      validadeInicio,
      validadeFim,
      emissor,
      valido,
      diasParaExpirar
    };
  }

  /**
   * Valida se o certificado está válido
   */
  validarCertificado(): CertificadoValidacao {
    if (!this.certificado || !this.certificadoInfo) {
      return {
        valido: false,
        mensagem: 'Nenhum certificado carregado'
      };
    }

    const agora = new Date();

    if (agora < this.certificadoInfo.validadeInicio) {
      return {
        valido: false,
        mensagem: 'Certificado ainda não é válido',
        certificadoInfo: this.certificadoInfo
      };
    }

    if (agora > this.certificadoInfo.validadeFim) {
      return {
        valido: false,
        mensagem: 'Certificado expirado',
        certificadoInfo: this.certificadoInfo
      };
    }

    // Alerta se expirar em menos de 30 dias
    if (this.certificadoInfo.diasParaExpirar <= 30) {
      return {
        valido: true,
        mensagem: `Atenção: Certificado expira em ${this.certificadoInfo.diasParaExpirar} dias`,
        certificadoInfo: this.certificadoInfo
      };
    }

    return {
      valido: true,
      mensagem: 'Certificado válido',
      certificadoInfo: this.certificadoInfo
    };
  }

  /**
   * Assina um XML usando o certificado carregado
   * Implementa assinatura XMLDSig conforme especificação NF-e
   */
  assinarXml(xml: string, tagParaAssinar: string = 'infNFe'): string {
    if (!this.certificado || !this.chavePrivada) {
      throw new Error('Nenhum certificado carregado');
    }

    if (!forge) {
      throw new Error('Biblioteca node-forge não disponível');
    }

    try {
      // Encontra o ID do elemento a ser assinado
      const idMatch = xml.match(new RegExp(`<${tagParaAssinar}[^>]*Id="([^"]+)"`));
      if (!idMatch) {
        throw new Error(`Tag ${tagParaAssinar} com atributo Id não encontrada`);
      }
      const referenceUri = idMatch[1];

      // Extrai o conteúdo a ser assinado (elemento completo)
      const tagRegex = new RegExp(`<${tagParaAssinar}[^>]*>([\\s\\S]*?)<\\/${tagParaAssinar}>`);
      const tagMatch = xml.match(tagRegex);
      if (!tagMatch) {
        throw new Error(`Tag ${tagParaAssinar} não encontrada no XML`);
      }

      // Canonicaliza o XML (simplificado - produção deve usar biblioteca de canonicalização)
      const xmlCanonicalizado = this.canonicalizarXml(tagMatch[0]);

      // Calcula o digest SHA-1
      const md = forge.md.sha1.create();
      md.update(xmlCanonicalizado, 'utf8');
      const digestValue = forge.util.encode64(md.digest().bytes());

      // Cria o SignedInfo
      const signedInfo = this.criarSignedInfo(referenceUri, digestValue);

      // Canonicaliza o SignedInfo
      const signedInfoCanonicalizado = this.canonicalizarXml(signedInfo);

      // Assina o SignedInfo
      const mdSign = forge.md.sha1.create();
      mdSign.update(signedInfoCanonicalizado, 'utf8');
      const signature = this.chavePrivada.sign(mdSign);
      const signatureValue = forge.util.encode64(signature);

      // Obtém o certificado em formato PEM
      const certPem = forge.pki.certificateToPem(this.certificado);

      // Remove cabeçalho/rodapé do PEM e quebras de linha
      const certBase64 = certPem
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\r?\n|\r/g, '');

      // Monta o elemento Signature
      const signatureElement = this.criarElementoSignature(
        signedInfo,
        signatureValue,
        certBase64
      );

      // Insere a assinatura no XML
      const xmlAssinado = this.inserirAssinatura(xml, tagParaAssinar, signatureElement);

      return xmlAssinado;
    } catch (error: any) {
      logger.error('Erro ao assinar XML:', error);
      throw new Error(`Erro ao assinar XML: ${error.message}`);
    }
  }

  /**
   * Canonicalização simplificada do XML (Canonical XML 1.0)
   * Em produção, usar biblioteca como xml-crypto
   */
  private canonicalizarXml(xml: string): string {
    // Remove declaração XML
    let resultado = xml.replace(/<\?xml[^?]*\?>/gi, '');

    // Remove espaços em branco desnecessários
    resultado = resultado.replace(/>\s+</g, '><');

    // Remove espaços antes de />
    resultado = resultado.replace(/\s+\/>/g, '/>');

    return resultado.trim();
  }

  /**
   * Cria o elemento SignedInfo
   */
  private criarSignedInfo(referenceUri: string, digestValue: string): string {
    return `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
      `<Reference URI="#${referenceUri}">` +
      `<Transforms>` +
      `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
      `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `</Transforms>` +
      `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
      `<DigestValue>${digestValue}</DigestValue>` +
      `</Reference>` +
      `</SignedInfo>`;
  }

  /**
   * Cria o elemento Signature completo
   */
  private criarElementoSignature(
    signedInfo: string,
    signatureValue: string,
    certBase64: string
  ): string {
    return `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      signedInfo +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo>` +
      `<X509Data>` +
      `<X509Certificate>${certBase64}</X509Certificate>` +
      `</X509Data>` +
      `</KeyInfo>` +
      `</Signature>`;
  }

  /**
   * Insere a assinatura no XML
   */
  private inserirAssinatura(xml: string, tagParaAssinar: string, signature: string): string {
    // Insere após o fechamento da tag assinada
    const closeTag = `</${tagParaAssinar}>`;
    const position = xml.indexOf(closeTag);
    if (position === -1) {
      throw new Error(`Tag de fechamento ${closeTag} não encontrada`);
    }

    return xml.slice(0, position + closeTag.length) +
      signature +
      xml.slice(position + closeTag.length);
  }

  /**
   * Obtém informações do certificado
   */
  getInfo(): CertificadoInfo | null {
    return this.certificadoInfo;
  }

  /**
   * Verifica se o certificado está carregado
   */
  isLoaded(): boolean {
    return this.certificado !== null && this.chavePrivada !== null;
  }

  /**
   * Obtém o certificado em formato PEM
   */
  getCertificadoPem(): string {
    if (!this.certificado) {
      throw new Error('Nenhum certificado carregado');
    }
    return forge.pki.certificateToPem(this.certificado);
  }

  /**
   * Obtém a chave privada em formato PEM
   */
  getChavePrivadaPem(): string {
    if (!this.chavePrivada) {
      throw new Error('Nenhuma chave privada carregada');
    }
    return forge.pki.privateKeyToPem(this.chavePrivada);
  }

  /**
   * Cria as opções de agente HTTPS para comunicação com SEFAZ
   */
  getHttpsAgentOptions(): { cert: string; key: string; passphrase?: string } {
    return {
      cert: this.getCertificadoPem(),
      key: this.getChavePrivadaPem()
    };
  }
}

// Instância singleton do serviço
let certificadoServiceInstance: CertificadoService | null = null;

/**
 * Obtém a instância do serviço de certificado
 */
export function getCertificadoService(): CertificadoService {
  if (!certificadoServiceInstance) {
    certificadoServiceInstance = new CertificadoService();
  }
  return certificadoServiceInstance;
}

/**
 * Cria uma nova instância do serviço de certificado
 */
export function createCertificadoService(): CertificadoService {
  return new CertificadoService();
}

export default CertificadoService;
