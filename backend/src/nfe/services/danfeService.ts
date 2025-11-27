/**
 * Serviço de Geração de DANFE
 * Documento Auxiliar da Nota Fiscal Eletrônica
 */

import * as fs from 'fs';
import * as path from 'path';
import pool from '../../config/database';
import logger from '../../config/logger';
import {
  NfeCompleta,
  NfeConfiguracao,
  DanfeConfig,
  DanfeGenerateRequest,
  DanfeGenerateResponse,
  NfeAmbiente,
  NfeStatus
} from '../types';
import { getNfeService } from './nfeService';

// Importação condicional do PDFKit
let PDFDocument: any;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  logger.warn('pdfkit não instalado. Geração de DANFE PDF não disponível.');
}

// Importação condicional do JsBarcode
let JsBarcode: any;
try {
  JsBarcode = require('jsbarcode');
} catch (e) {
  logger.warn('jsbarcode não instalado. Código de barras no DANFE pode não funcionar.');
}

/**
 * Configuração padrão do DANFE
 */
const DEFAULT_DANFE_CONFIG: DanfeConfig = {
  formato: 'RETRATO',
  margens: {
    superior: 20,
    inferior: 20,
    esquerda: 20,
    direita: 20
  },
  mostrarCodBarras: true,
  mostrarQrCode: true
};

/**
 * Classe para geração de DANFE
 */
export class DanfeService {
  private config: DanfeConfig;
  private storageDir: string;

  constructor() {
    this.config = DEFAULT_DANFE_CONFIG;
    this.storageDir = process.env.DANFE_STORAGE_DIR || '/home/user/bar/storage/danfe';
    this.ensureStorageDir();
  }

  /**
   * Garante que o diretório de storage existe
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Gera o DANFE em PDF
   */
  async gerarDanfe(request: DanfeGenerateRequest): Promise<DanfeGenerateResponse> {
    try {
      if (!PDFDocument) {
        return {
          success: false,
          mensagem: 'Biblioteca pdfkit não disponível. Instale com: npm install pdfkit'
        };
      }

      // Busca NF-e
      const nfeService = getNfeService();
      const nfe = await nfeService.getNfeById(request.nfeId);

      if (!nfe) {
        return {
          success: false,
          mensagem: 'NF-e não encontrada'
        };
      }

      if (nfe.status !== NfeStatus.AUTORIZADA && nfe.status !== NfeStatus.CANCELADA) {
        return {
          success: false,
          mensagem: 'DANFE só pode ser gerado para NF-e autorizada ou cancelada'
        };
      }

      // Busca configuração do emitente
      const configResult = await pool.query(`
        SELECT * FROM nfe_configuracao_emitente WHERE id = $1
      `, [nfe.emitenteId]);

      if (configResult.rows.length === 0) {
        return {
          success: false,
          mensagem: 'Configuração do emitente não encontrada'
        };
      }

      const emitente = configResult.rows[0];

      // Mescla configuração
      const config = { ...this.config, ...request.config };

      // Gera PDF
      const pdfBuffer = await this.gerarPdf(nfe, emitente, config);

      // Salva arquivo
      const fileName = `danfe_${nfe.chaveAcesso}.pdf`;
      const filePath = path.join(this.storageDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);

      // Atualiza registro da NF-e
      await pool.query(`
        UPDATE nfe_emitidas SET danfe_impresso = TRUE, danfe_url = $1 WHERE id = $2
      `, [filePath, nfe.id]);

      // Converte para base64
      const pdfBase64 = pdfBuffer.toString('base64');

      return {
        success: true,
        pdfBase64,
        pdfUrl: filePath,
        mensagem: 'DANFE gerado com sucesso'
      };
    } catch (error: any) {
      logger.error('Erro ao gerar DANFE:', error);
      return {
        success: false,
        mensagem: `Erro ao gerar DANFE: ${error.message}`
      };
    }
  }

  /**
   * Gera o PDF do DANFE
   */
  private gerarPdf(
    nfe: NfeCompleta,
    emitente: any,
    config: DanfeConfig
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: config.margens.superior,
          bottom: config.margens.inferior,
          left: config.margens.esquerda,
          right: config.margens.direita
        }
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Dimensões
      const pageWidth = 595.28 - config.margens.esquerda - config.margens.direita;
      const startX = config.margens.esquerda;
      let currentY = config.margens.superior;

      // =====================================================
      // CABEÇALHO
      // =====================================================

      // Quadro do emitente (lado esquerdo)
      doc.rect(startX, currentY, pageWidth * 0.4, 80).stroke();

      // Logo (se configurado)
      if (config.logo) {
        try {
          const logoBuffer = Buffer.from(config.logo, 'base64');
          doc.image(logoBuffer, startX + 5, currentY + 5, { width: 60, height: 60 });
        } catch (e) {
          // Logo não disponível
        }
      }

      // Dados do emitente
      doc.fontSize(8)
        .text(emitente.razao_social, startX + 70, currentY + 5, { width: pageWidth * 0.4 - 75 })
        .text(`CNPJ: ${this.formatarCnpj(emitente.cnpj)}`, startX + 70, currentY + 20)
        .text(`IE: ${emitente.inscricao_estadual}`, startX + 70, currentY + 30)
        .text(`${emitente.logradouro}, ${emitente.numero}`, startX + 70, currentY + 40)
        .text(`${emitente.bairro} - ${emitente.nome_municipio}/${emitente.uf}`, startX + 70, currentY + 50)
        .text(`CEP: ${this.formatarCep(emitente.cep)}`, startX + 70, currentY + 60);

      // Quadro central - DANFE
      const centroX = startX + pageWidth * 0.4;
      doc.rect(centroX, currentY, pageWidth * 0.2, 80).stroke();

      doc.fontSize(10).font('Helvetica-Bold')
        .text('DANFE', centroX + 5, currentY + 5, { width: pageWidth * 0.2 - 10, align: 'center' })
        .fontSize(6).font('Helvetica')
        .text('Documento Auxiliar da', centroX + 5, currentY + 20, { width: pageWidth * 0.2 - 10, align: 'center' })
        .text('Nota Fiscal Eletrônica', centroX + 5, currentY + 28, { width: pageWidth * 0.2 - 10, align: 'center' });

      doc.fontSize(8)
        .text(`0 - ENTRADA`, centroX + 10, currentY + 42)
        .text(`1 - SAÍDA`, centroX + 10, currentY + 52);

      // Quadrado do tipo
      doc.rect(centroX + pageWidth * 0.15, currentY + 40, 20, 20).stroke();
      doc.fontSize(12).font('Helvetica-Bold')
        .text(String(nfe.tipoOperacao), centroX + pageWidth * 0.15 + 6, currentY + 45);

      doc.fontSize(8).font('Helvetica')
        .text(`Nº ${String(nfe.numero).padStart(9, '0')}`, centroX + 5, currentY + 65, { width: pageWidth * 0.2 - 10, align: 'center' })
        .text(`Série ${nfe.serie}`, centroX + 5, currentY + 73, { width: pageWidth * 0.2 - 10, align: 'center' });

      // Quadro direito - Código de barras
      const direitaX = startX + pageWidth * 0.6;
      doc.rect(direitaX, currentY, pageWidth * 0.4, 80).stroke();

      // Código de barras da chave de acesso
      if (config.mostrarCodBarras && nfe.chaveAcesso) {
        doc.fontSize(6)
          .text('CHAVE DE ACESSO', direitaX + 5, currentY + 3, { width: pageWidth * 0.4 - 10, align: 'center' });

        // Desenha código de barras simplificado (texto formatado)
        doc.fontSize(7).font('Courier')
          .text(this.formatarChaveAcesso(nfe.chaveAcesso), direitaX + 5, currentY + 15, {
            width: pageWidth * 0.4 - 10,
            align: 'center'
          });

        // Linha do código de barras (representação visual)
        this.desenharCodigoBarras(doc, nfe.chaveAcesso, direitaX + 10, currentY + 30, pageWidth * 0.4 - 20, 25);
      }

      doc.fontSize(6)
        .text('Consulta de autenticidade no portal nacional da NF-e', direitaX + 5, currentY + 60, {
          width: pageWidth * 0.4 - 10,
          align: 'center'
        })
        .text('www.nfe.fazenda.gov.br/portal', direitaX + 5, currentY + 68, {
          width: pageWidth * 0.4 - 10,
          align: 'center'
        });

      currentY += 85;

      // =====================================================
      // NATUREZA DA OPERAÇÃO E PROTOCOLO
      // =====================================================

      // Natureza da operação
      doc.rect(startX, currentY, pageWidth * 0.6, 20).stroke();
      doc.fontSize(6)
        .text('NATUREZA DA OPERAÇÃO', startX + 2, currentY + 2);
      doc.fontSize(8)
        .text(nfe.naturezaOperacao, startX + 2, currentY + 10);

      // Protocolo de autorização
      doc.rect(startX + pageWidth * 0.6, currentY, pageWidth * 0.4, 20).stroke();
      doc.fontSize(6)
        .text('PROTOCOLO DE AUTORIZAÇÃO DE USO', startX + pageWidth * 0.6 + 2, currentY + 2);
      doc.fontSize(8)
        .text(
          nfe.protocoloAutorizacao
            ? `${nfe.protocoloAutorizacao} - ${this.formatarDataHora(nfe.dataAutorizacao)}`
            : '',
          startX + pageWidth * 0.6 + 2, currentY + 10
        );

      currentY += 25;

      // =====================================================
      // DESTINATÁRIO
      // =====================================================

      doc.rect(startX, currentY, pageWidth, 50).stroke();
      doc.fontSize(8).font('Helvetica-Bold')
        .text('DESTINATÁRIO/REMETENTE', startX + 2, currentY + 2);

      doc.font('Helvetica').fontSize(6);

      // Razão Social
      doc.text('NOME/RAZÃO SOCIAL', startX + 2, currentY + 12);
      doc.fontSize(8)
        .text(nfe.destinatario?.razaoSocial || 'CONSUMIDOR NÃO IDENTIFICADO', startX + 2, currentY + 20);

      // CNPJ/CPF
      doc.fontSize(6)
        .text('CNPJ/CPF', startX + pageWidth * 0.6, currentY + 12);
      doc.fontSize(8)
        .text(
          nfe.destinatario?.cnpjCpf
            ? this.formatarCnpjCpf(nfe.destinatario.cnpjCpf)
            : '',
          startX + pageWidth * 0.6, currentY + 20
        );

      // IE
      doc.fontSize(6)
        .text('INSCRIÇÃO ESTADUAL', startX + pageWidth * 0.8, currentY + 12);
      doc.fontSize(8)
        .text(nfe.destinatario?.inscricaoEstadual || '', startX + pageWidth * 0.8, currentY + 20);

      currentY += 55;

      // =====================================================
      // PRODUTOS
      // =====================================================

      doc.rect(startX, currentY, pageWidth, 20).stroke();
      doc.fontSize(8).font('Helvetica-Bold')
        .text('DADOS DOS PRODUTOS/SERVIÇOS', startX + 2, currentY + 6, {
          width: pageWidth - 4,
          align: 'center'
        });

      currentY += 20;

      // Cabeçalho da tabela de produtos
      const colWidths = {
        codigo: pageWidth * 0.1,
        descricao: pageWidth * 0.35,
        ncm: pageWidth * 0.1,
        cfop: pageWidth * 0.08,
        un: pageWidth * 0.05,
        qtd: pageWidth * 0.08,
        vUnit: pageWidth * 0.12,
        vTotal: pageWidth * 0.12
      };

      doc.rect(startX, currentY, pageWidth, 15).stroke();
      doc.fontSize(6).font('Helvetica-Bold');

      let colX = startX;
      doc.text('CÓDIGO', colX + 2, currentY + 5, { width: colWidths.codigo - 4 });
      colX += colWidths.codigo;
      doc.text('DESCRIÇÃO DO PRODUTO/SERVIÇO', colX + 2, currentY + 5, { width: colWidths.descricao - 4 });
      colX += colWidths.descricao;
      doc.text('NCM/SH', colX + 2, currentY + 5, { width: colWidths.ncm - 4 });
      colX += colWidths.ncm;
      doc.text('CFOP', colX + 2, currentY + 5, { width: colWidths.cfop - 4 });
      colX += colWidths.cfop;
      doc.text('UN', colX + 2, currentY + 5, { width: colWidths.un - 4 });
      colX += colWidths.un;
      doc.text('QTD', colX + 2, currentY + 5, { width: colWidths.qtd - 4 });
      colX += colWidths.qtd;
      doc.text('V. UNIT', colX + 2, currentY + 5, { width: colWidths.vUnit - 4 });
      colX += colWidths.vUnit;
      doc.text('V. TOTAL', colX + 2, currentY + 5, { width: colWidths.vTotal - 4 });

      currentY += 15;

      // Linhas dos produtos
      doc.font('Helvetica').fontSize(7);
      const itemHeight = 12;

      for (const item of nfe.itens) {
        if (currentY + itemHeight > 700) {
          // Nova página se necessário
          doc.addPage();
          currentY = config.margens.superior;
        }

        doc.rect(startX, currentY, pageWidth, itemHeight).stroke();

        colX = startX;
        doc.text(item.codigoProduto.substring(0, 10), colX + 2, currentY + 3, { width: colWidths.codigo - 4 });
        colX += colWidths.codigo;
        doc.text(item.descricao.substring(0, 40), colX + 2, currentY + 3, { width: colWidths.descricao - 4 });
        colX += colWidths.descricao;
        doc.text(item.ncm, colX + 2, currentY + 3, { width: colWidths.ncm - 4 });
        colX += colWidths.ncm;
        doc.text(item.cfop, colX + 2, currentY + 3, { width: colWidths.cfop - 4 });
        colX += colWidths.cfop;
        doc.text(item.unidade, colX + 2, currentY + 3, { width: colWidths.un - 4 });
        colX += colWidths.un;
        doc.text(this.formatarNumero(item.quantidade, 4), colX + 2, currentY + 3, { width: colWidths.qtd - 4 });
        colX += colWidths.qtd;
        doc.text(this.formatarMoeda(item.valorUnitario), colX + 2, currentY + 3, { width: colWidths.vUnit - 4 });
        colX += colWidths.vUnit;
        doc.text(this.formatarMoeda(item.valorTotal), colX + 2, currentY + 3, { width: colWidths.vTotal - 4 });

        currentY += itemHeight;
      }

      currentY += 10;

      // =====================================================
      // TOTAIS
      // =====================================================

      doc.rect(startX, currentY, pageWidth, 40).stroke();
      doc.fontSize(8).font('Helvetica-Bold')
        .text('CÁLCULO DO IMPOSTO', startX + 2, currentY + 2);

      doc.font('Helvetica').fontSize(6);

      // Linha 1 de totais
      const totalColWidth = pageWidth / 5;
      let totalX = startX;
      const totalY1 = currentY + 12;

      doc.text('BASE DE CÁLCULO ICMS', totalX + 2, totalY1);
      doc.fontSize(8).text(this.formatarMoeda(nfe.totais.valorIcms || 0), totalX + 2, totalY1 + 8);
      totalX += totalColWidth;

      doc.fontSize(6).text('VALOR DO ICMS', totalX + 2, totalY1);
      doc.fontSize(8).text(this.formatarMoeda(nfe.totais.valorIcms || 0), totalX + 2, totalY1 + 8);
      totalX += totalColWidth;

      doc.fontSize(6).text('VALOR DO FRETE', totalX + 2, totalY1);
      doc.fontSize(8).text(this.formatarMoeda(nfe.totais.valorFrete || 0), totalX + 2, totalY1 + 8);
      totalX += totalColWidth;

      doc.fontSize(6).text('VALOR DO DESCONTO', totalX + 2, totalY1);
      doc.fontSize(8).text(this.formatarMoeda(nfe.totais.valorDesconto || 0), totalX + 2, totalY1 + 8);
      totalX += totalColWidth;

      doc.fontSize(6).text('VALOR TOTAL DA NOTA', totalX + 2, totalY1);
      doc.fontSize(10).font('Helvetica-Bold')
        .text(this.formatarMoeda(nfe.totais.valorTotalNf), totalX + 2, totalY1 + 8);

      currentY += 45;

      // =====================================================
      // INFORMAÇÕES ADICIONAIS
      // =====================================================

      doc.rect(startX, currentY, pageWidth, 60).stroke();
      doc.fontSize(8).font('Helvetica-Bold')
        .text('INFORMAÇÕES COMPLEMENTARES', startX + 2, currentY + 2);

      doc.font('Helvetica').fontSize(7);

      let infAdic = '';

      // Adiciona alerta de homologação se aplicável
      if (nfe.ambiente === NfeAmbiente.HOMOLOGACAO) {
        infAdic += 'EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL\n';
      }

      // Adiciona alerta de cancelamento se aplicável
      if (nfe.status === NfeStatus.CANCELADA) {
        infAdic += 'NOTA FISCAL CANCELADA\n';
      }

      if (nfe.informacoesAdicionaisContribuinte) {
        infAdic += nfe.informacoesAdicionaisContribuinte;
      }

      doc.text(infAdic, startX + 2, currentY + 14, {
        width: pageWidth - 4,
        height: 45
      });

      // Finaliza documento
      doc.end();
    });
  }

  /**
   * Desenha representação visual do código de barras
   */
  private desenharCodigoBarras(
    doc: any,
    codigo: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Desenha barras alternadas para representar o código
    const barWidth = width / codigo.length;

    for (let i = 0; i < codigo.length; i++) {
      const charCode = parseInt(codigo[i]);
      const barHeight = height * (0.7 + (charCode % 3) * 0.1);

      if (i % 2 === 0) {
        doc.rect(x + i * barWidth, y + (height - barHeight), barWidth * 0.8, barHeight).fill('black');
      }
    }
  }

  /**
   * Obtém DANFE salvo
   */
  async obterDanfe(nfeId: number): Promise<Buffer | null> {
    const result = await pool.query(`
      SELECT danfe_url FROM nfe_emitidas WHERE id = $1
    `, [nfeId]);

    if (result.rows.length === 0 || !result.rows[0].danfe_url) {
      return null;
    }

    const filePath = result.rows[0].danfe_url;

    if (!fs.existsSync(filePath)) {
      return null;
    }

    return fs.readFileSync(filePath);
  }

  // =====================================================
  // MÉTODOS AUXILIARES DE FORMATAÇÃO
  // =====================================================

  private formatarCnpj(cnpj: string): string {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private formatarCpf(cpf: string): string {
    if (!cpf) return '';
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  private formatarCnpjCpf(doc: string): string {
    if (!doc) return '';
    return doc.length === 14 ? this.formatarCnpj(doc) : this.formatarCpf(doc);
  }

  private formatarCep(cep: string): string {
    if (!cep) return '';
    return cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  private formatarChaveAcesso(chave: string): string {
    if (!chave) return '';
    return chave.replace(/(.{4})/g, '$1 ').trim();
  }

  private formatarDataHora(data?: Date): string {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private formatarNumero(valor: number, casas: number): string {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas
    });
  }
}

// Singleton
let danfeServiceInstance: DanfeService | null = null;

export function getDanfeService(): DanfeService {
  if (!danfeServiceInstance) {
    danfeServiceInstance = new DanfeService();
  }
  return danfeServiceInstance;
}

export default DanfeService;
