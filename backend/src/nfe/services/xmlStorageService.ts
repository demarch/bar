/**
 * Serviço de Armazenamento e Backup de XMLs
 * Gerencia armazenamento de XMLs de NF-e por 5 anos (requisito legal)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import pool from '../../config/database';
import logger from '../../config/logger';
import { NfeStatus, NfeAmbiente } from '../types';

/**
 * Interface para resultado de exportação
 */
export interface ExportResult {
  success: boolean;
  filePath?: string;
  totalXmls: number;
  totalBytes: number;
  mensagem: string;
}

/**
 * Interface para estatísticas de armazenamento
 */
export interface StorageStats {
  totalXmls: number;
  totalBytesDb: number;
  totalBytesDisco: number;
  porAno: Record<string, number>;
  porStatus: Record<string, number>;
}

/**
 * Classe para gerenciamento de armazenamento de XMLs
 */
export class XmlStorageService {
  private storageDir: string;
  private backupDir: string;

  constructor() {
    this.storageDir = process.env.NFE_XML_STORAGE_DIR || '/home/user/bar/storage/nfe/xml';
    this.backupDir = process.env.NFE_BACKUP_DIR || '/home/user/bar/storage/nfe/backup';
    this.ensureDirectories();
  }

  /**
   * Garante que diretórios existem
   */
  private ensureDirectories(): void {
    [this.storageDir, this.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Salva XML em disco (além do banco de dados)
   */
  async salvarXmlDisco(
    chaveAcesso: string,
    xml: string,
    tipo: 'envio' | 'retorno' | 'autorizado' | 'cancelamento' | 'inutilizacao'
  ): Promise<string> {
    const ano = `20${chaveAcesso.substring(2, 4)}`;
    const mes = chaveAcesso.substring(4, 6);

    const dirPath = path.join(this.storageDir, ano, mes, tipo);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const fileName = `${chaveAcesso}_${tipo}.xml`;
    const filePath = path.join(dirPath, fileName);

    fs.writeFileSync(filePath, xml, 'utf8');

    logger.debug(`XML salvo em disco: ${filePath}`);

    return filePath;
  }

  /**
   * Lê XML do disco
   */
  lerXmlDisco(
    chaveAcesso: string,
    tipo: 'envio' | 'retorno' | 'autorizado' | 'cancelamento' | 'inutilizacao'
  ): string | null {
    const ano = `20${chaveAcesso.substring(2, 4)}`;
    const mes = chaveAcesso.substring(4, 6);

    const filePath = path.join(this.storageDir, ano, mes, tipo, `${chaveAcesso}_${tipo}.xml`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Exporta XMLs por período para arquivo ZIP
   */
  async exportarXmls(
    dataInicio: Date,
    dataFim: Date,
    status?: NfeStatus[],
    ambiente?: NfeAmbiente
  ): Promise<ExportResult> {
    try {
      // Busca NF-e no período
      let query = `
        SELECT chave_acesso, xml_envio, xml_retorno, xml_autorizado, status, data_emissao
        FROM nfe_emitidas
        WHERE data_emissao >= $1 AND data_emissao <= $2
      `;
      const params: any[] = [dataInicio, dataFim];

      if (status && status.length > 0) {
        query += ` AND status = ANY($${params.length + 1})`;
        params.push(status);
      }

      if (ambiente !== undefined) {
        query += ` AND ambiente = $${params.length + 1}`;
        params.push(ambiente);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return {
          success: false,
          totalXmls: 0,
          totalBytes: 0,
          mensagem: 'Nenhuma NF-e encontrada no período'
        };
      }

      // Cria diretório de exportação
      const exportDir = path.join(
        this.backupDir,
        'export',
        `${dataInicio.toISOString().split('T')[0]}_${dataFim.toISOString().split('T')[0]}`
      );
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      let totalBytes = 0;
      let totalXmls = 0;

      // Salva cada XML
      for (const row of result.rows) {
        const chave = row.chave_acesso;

        if (row.xml_envio) {
          const filePath = path.join(exportDir, `${chave}_envio.xml`);
          fs.writeFileSync(filePath, row.xml_envio);
          totalBytes += Buffer.byteLength(row.xml_envio);
          totalXmls++;
        }

        if (row.xml_autorizado) {
          const filePath = path.join(exportDir, `${chave}_autorizado.xml`);
          fs.writeFileSync(filePath, row.xml_autorizado);
          totalBytes += Buffer.byteLength(row.xml_autorizado);
          totalXmls++;
        }

        if (row.xml_retorno) {
          const filePath = path.join(exportDir, `${chave}_retorno.xml`);
          fs.writeFileSync(filePath, row.xml_retorno);
          totalBytes += Buffer.byteLength(row.xml_retorno);
          totalXmls++;
        }
      }

      // Cria arquivo de manifesto
      const manifesto = {
        dataExportacao: new Date().toISOString(),
        periodo: {
          inicio: dataInicio.toISOString(),
          fim: dataFim.toISOString()
        },
        filtros: {
          status,
          ambiente
        },
        totalNfes: result.rows.length,
        totalXmls,
        totalBytes
      };

      fs.writeFileSync(
        path.join(exportDir, 'manifesto.json'),
        JSON.stringify(manifesto, null, 2)
      );

      // Comprime em ZIP (simplificado - em produção usar biblioteca como archiver)
      const zipPath = `${exportDir}.tar.gz`;
      await this.compressDirectory(exportDir, zipPath);

      return {
        success: true,
        filePath: zipPath,
        totalXmls,
        totalBytes,
        mensagem: `Exportados ${totalXmls} XMLs de ${result.rows.length} NF-e`
      };
    } catch (error: any) {
      logger.error('Erro ao exportar XMLs:', error);
      return {
        success: false,
        totalXmls: 0,
        totalBytes: 0,
        mensagem: `Erro ao exportar: ${error.message}`
      };
    }
  }

  /**
   * Comprime diretório (simplificado)
   */
  private async compressDirectory(sourceDir: string, targetPath: string): Promise<void> {
    // Em produção, usar biblioteca como archiver
    // Por simplicidade, cria um arquivo tar.gz usando comandos do sistema
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      const command = `tar -czf "${targetPath}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`;
      exec(command, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Realiza backup incremental dos XMLs
   */
  async realizarBackup(): Promise<{ success: boolean; arquivos: number; mensagem: string }> {
    try {
      const dataBackup = new Date();
      const backupPath = path.join(
        this.backupDir,
        'incremental',
        dataBackup.toISOString().split('T')[0]
      );

      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      // Busca NF-e não backupeadas (do último dia)
      const ontemTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await pool.query(`
        SELECT chave_acesso, xml_envio, xml_autorizado, xml_retorno
        FROM nfe_emitidas
        WHERE created_at >= $1
        AND (xml_envio IS NOT NULL OR xml_autorizado IS NOT NULL)
      `, [ontemTimestamp]);

      let arquivos = 0;

      for (const row of result.rows) {
        const chave = row.chave_acesso;

        if (row.xml_autorizado) {
          fs.writeFileSync(
            path.join(backupPath, `${chave}_autorizado.xml`),
            row.xml_autorizado
          );
          arquivos++;
        } else if (row.xml_envio) {
          fs.writeFileSync(
            path.join(backupPath, `${chave}_envio.xml`),
            row.xml_envio
          );
          arquivos++;
        }
      }

      // Backup de cancelamentos
      const cancelamentos = await pool.query(`
        SELECT chave_acesso, xml_envio, xml_retorno
        FROM nfe_cancelamentos
        WHERE created_at >= $1
      `, [ontemTimestamp]);

      for (const row of cancelamentos.rows) {
        if (row.xml_envio) {
          fs.writeFileSync(
            path.join(backupPath, `${row.chave_acesso}_cancelamento.xml`),
            row.xml_envio
          );
          arquivos++;
        }
      }

      // Backup de inutilizações
      const inutilizacoes = await pool.query(`
        SELECT id, xml_envio
        FROM nfe_inutilizacoes
        WHERE created_at >= $1
      `, [ontemTimestamp]);

      for (const row of inutilizacoes.rows) {
        if (row.xml_envio) {
          fs.writeFileSync(
            path.join(backupPath, `inutilizacao_${row.id}.xml`),
            row.xml_envio
          );
          arquivos++;
        }
      }

      logger.info(`Backup incremental concluído: ${arquivos} arquivos`);

      return {
        success: true,
        arquivos,
        mensagem: `Backup realizado com sucesso: ${arquivos} arquivos`
      };
    } catch (error: any) {
      logger.error('Erro ao realizar backup:', error);
      return {
        success: false,
        arquivos: 0,
        mensagem: `Erro no backup: ${error.message}`
      };
    }
  }

  /**
   * Obtém estatísticas de armazenamento
   */
  async getEstatisticas(): Promise<StorageStats> {
    // Total de XMLs no banco
    const totalResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(LENGTH(xml_envio)), 0) +
        COALESCE(SUM(LENGTH(xml_retorno)), 0) +
        COALESCE(SUM(LENGTH(xml_autorizado)), 0) as bytes
      FROM nfe_emitidas
    `);

    // Por ano
    const porAnoResult = await pool.query(`
      SELECT EXTRACT(YEAR FROM data_emissao)::text as ano, COUNT(*) as total
      FROM nfe_emitidas
      GROUP BY EXTRACT(YEAR FROM data_emissao)
      ORDER BY ano
    `);

    // Por status
    const porStatusResult = await pool.query(`
      SELECT status, COUNT(*) as total
      FROM nfe_emitidas
      GROUP BY status
    `);

    // Tamanho em disco
    let totalBytesDisco = 0;
    try {
      totalBytesDisco = this.getDirSize(this.storageDir);
    } catch (e) {
      // Ignora erro se diretório não existir
    }

    return {
      totalXmls: parseInt(totalResult.rows[0].total),
      totalBytesDb: parseInt(totalResult.rows[0].bytes) || 0,
      totalBytesDisco,
      porAno: porAnoResult.rows.reduce((acc, row) => {
        acc[row.ano] = parseInt(row.total);
        return acc;
      }, {} as Record<string, number>),
      porStatus: porStatusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.total);
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Calcula tamanho de diretório recursivamente
   */
  private getDirSize(dirPath: string): number {
    let size = 0;

    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        size += this.getDirSize(filePath);
      } else {
        size += stat.size;
      }
    }

    return size;
  }

  /**
   * Limpa XMLs antigos do disco (mantém apenas últimos 5 anos)
   */
  async limparXmlsAntigos(): Promise<{ removidos: number; bytesLiberados: number }> {
    const limiteAno = new Date().getFullYear() - 5;
    let removidos = 0;
    let bytesLiberados = 0;

    try {
      const anos = fs.readdirSync(this.storageDir);

      for (const ano of anos) {
        if (parseInt(ano) < limiteAno) {
          const anoPath = path.join(this.storageDir, ano);
          const stat = fs.statSync(anoPath);

          if (stat.isDirectory()) {
            bytesLiberados += this.getDirSize(anoPath);
            removidos += this.countFiles(anoPath);
            fs.rmSync(anoPath, { recursive: true, force: true });
            logger.info(`Removido diretório de XMLs antigos: ${anoPath}`);
          }
        }
      }

      return { removidos, bytesLiberados };
    } catch (error: any) {
      logger.error('Erro ao limpar XMLs antigos:', error);
      return { removidos, bytesLiberados };
    }
  }

  /**
   * Conta arquivos em diretório recursivamente
   */
  private countFiles(dirPath: string): number {
    let count = 0;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        count += this.countFiles(itemPath);
      } else {
        count++;
      }
    }

    return count;
  }

  /**
   * Busca XML por chave de acesso
   */
  async buscarXml(chaveAcesso: string): Promise<{
    envio?: string;
    retorno?: string;
    autorizado?: string;
    fonte: 'banco' | 'disco';
  } | null> {
    // Primeiro tenta no banco
    const result = await pool.query(`
      SELECT xml_envio, xml_retorno, xml_autorizado
      FROM nfe_emitidas
      WHERE chave_acesso = $1
    `, [chaveAcesso]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        envio: row.xml_envio,
        retorno: row.xml_retorno,
        autorizado: row.xml_autorizado,
        fonte: 'banco'
      };
    }

    // Tenta no disco
    const envio = this.lerXmlDisco(chaveAcesso, 'envio');
    const retorno = this.lerXmlDisco(chaveAcesso, 'retorno');
    const autorizado = this.lerXmlDisco(chaveAcesso, 'autorizado');

    if (envio || retorno || autorizado) {
      return {
        envio: envio || undefined,
        retorno: retorno || undefined,
        autorizado: autorizado || undefined,
        fonte: 'disco'
      };
    }

    return null;
  }
}

// Singleton
let xmlStorageServiceInstance: XmlStorageService | null = null;

export function getXmlStorageService(): XmlStorageService {
  if (!xmlStorageServiceInstance) {
    xmlStorageServiceInstance = new XmlStorageService();
  }
  return xmlStorageServiceInstance;
}

export default XmlStorageService;
