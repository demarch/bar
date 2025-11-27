/**
 * Serviço de Contingência NF-e
 * Gerencia os modos de contingência quando SEFAZ está indisponível
 */

import pool from '../../config/database';
import logger from '../../config/logger';
import { NfeFormaEmissao, NfeAmbiente, NfeStatus } from '../types';
import { getSefazService } from './sefazService';
import { getNfeService } from './nfeService';

/**
 * Status do modo de contingência
 */
export interface ContingenciaStatus {
  ativo: boolean;
  formaEmissao: NfeFormaEmissao;
  dataEntrada?: Date;
  motivo?: string;
  nfesPendentes: number;
}

/**
 * Classe para gerenciamento de contingência
 */
export class ContingenciaService {
  private contingenciaAtiva: boolean = false;
  private formaEmissao: NfeFormaEmissao = NfeFormaEmissao.NORMAL;
  private dataEntradaContingencia?: Date;
  private motivoContingencia?: string;

  /**
   * Verifica se está em modo contingência
   */
  isContingenciaAtiva(): boolean {
    return this.contingenciaAtiva;
  }

  /**
   * Obtém forma de emissão atual
   */
  getFormaEmissao(): NfeFormaEmissao {
    return this.formaEmissao;
  }

  /**
   * Obtém status completo da contingência
   */
  async getStatus(): Promise<ContingenciaStatus> {
    const pendentes = await this.contarNfesPendentes();

    return {
      ativo: this.contingenciaAtiva,
      formaEmissao: this.formaEmissao,
      dataEntrada: this.dataEntradaContingencia,
      motivo: this.motivoContingencia,
      nfesPendentes: pendentes
    };
  }

  /**
   * Ativa modo contingência
   */
  async entrarContingencia(
    forma: NfeFormaEmissao,
    motivo: string
  ): Promise<void> {
    if (forma === NfeFormaEmissao.NORMAL) {
      throw new Error('Forma de emissão inválida para contingência');
    }

    this.contingenciaAtiva = true;
    this.formaEmissao = forma;
    this.dataEntradaContingencia = new Date();
    this.motivoContingencia = motivo;

    // Registra no banco
    await pool.query(`
      INSERT INTO logs_operacoes (operacao, detalhes, usuario_id)
      VALUES ('NFE_CONTINGENCIA_ENTRADA', $1, NULL)
    `, [JSON.stringify({
      forma,
      motivo,
      dataEntrada: this.dataEntradaContingencia
    })]);

    logger.warn(`NF-e: Entrou em modo contingência (${NfeFormaEmissao[forma]}): ${motivo}`);
  }

  /**
   * Sai do modo contingência
   */
  async sairContingencia(): Promise<void> {
    if (!this.contingenciaAtiva) {
      return;
    }

    const formaAnterior = this.formaEmissao;
    const dataEntradaAnterior = this.dataEntradaContingencia;

    this.contingenciaAtiva = false;
    this.formaEmissao = NfeFormaEmissao.NORMAL;
    this.dataEntradaContingencia = undefined;
    this.motivoContingencia = undefined;

    // Registra no banco
    await pool.query(`
      INSERT INTO logs_operacoes (operacao, detalhes, usuario_id)
      VALUES ('NFE_CONTINGENCIA_SAIDA', $1, NULL)
    `, [JSON.stringify({
      formaAnterior,
      dataEntrada: dataEntradaAnterior,
      dataSaida: new Date()
    })]);

    logger.info('NF-e: Saiu do modo contingência');

    // Inicia processamento de NF-e pendentes
    this.processarFilaContingencia();
  }

  /**
   * Verifica disponibilidade da SEFAZ e gerencia contingência automaticamente
   */
  async verificarEGerenciarContingencia(): Promise<boolean> {
    const sefazService = getSefazService();

    try {
      const status = await sefazService.consultarStatusServico();

      if (status.online) {
        // SEFAZ disponível
        if (this.contingenciaAtiva) {
          await this.sairContingencia();
        }
        return true;
      } else {
        // SEFAZ indisponível
        if (!this.contingenciaAtiva) {
          await this.entrarContingencia(
            NfeFormaEmissao.SVC_RS, // Ou FS_DA conforme configuração
            `Serviço SEFAZ indisponível: ${status.motivoStatus}`
          );
        }
        return false;
      }
    } catch (error: any) {
      // Erro de comunicação
      if (!this.contingenciaAtiva) {
        await this.entrarContingencia(
          NfeFormaEmissao.SVC_RS,
          `Erro de comunicação com SEFAZ: ${error.message}`
        );
      }
      return false;
    }
  }

  /**
   * Adiciona NF-e à fila de contingência
   */
  async adicionarFilaContingencia(
    nfeId: number,
    motivo: string,
    forma: NfeFormaEmissao
  ): Promise<void> {
    await pool.query(`
      INSERT INTO nfe_contingencia_fila (nfe_id, motivo_contingencia, forma_contingencia)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [nfeId, motivo, forma]);
  }

  /**
   * Processa fila de NF-e em contingência
   */
  async processarFilaContingencia(): Promise<{
    processadas: number;
    erros: number;
  }> {
    const result = { processadas: 0, erros: 0 };

    // Busca NF-e pendentes
    const pendentes = await pool.query(`
      SELECT f.*, n.xml_envio, n.chave_acesso
      FROM nfe_contingencia_fila f
      JOIN nfe_emitidas n ON f.nfe_id = n.id
      WHERE f.status IN ('AGUARDANDO', 'ERRO')
      AND f.tentativas < 5
      ORDER BY f.data_entrada_contingencia
      LIMIT 50
    `);

    const nfeService = getNfeService();
    const sefazService = getSefazService();

    for (const item of pendentes.rows) {
      try {
        // Atualiza status para transmitindo
        await pool.query(`
          UPDATE nfe_contingencia_fila
          SET status = 'TRANSMITINDO', ultima_tentativa = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [item.id]);

        // Tenta transmitir
        const resposta = await sefazService.autorizarNfe(item.xml_envio);

        if (resposta.success) {
          // Sucesso - atualiza NF-e e remove da fila
          await pool.query(`
            UPDATE nfe_emitidas SET
              status = 'AUTORIZADA',
              codigo_status = $1,
              motivo_status = $2,
              protocolo_autorizacao = $3,
              data_autorizacao = $4,
              xml_retorno = $5,
              forma_emissao = 1, -- Volta para normal
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
          `, [
            resposta.codigoStatus, resposta.motivoStatus,
            resposta.protocolo, resposta.dataRecebimento,
            resposta.xmlRetorno, item.nfe_id
          ]);

          await pool.query(`
            UPDATE nfe_contingencia_fila
            SET status = 'TRANSMITIDA', transmitida_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [item.id]);

          result.processadas++;
          logger.info(`NF-e ${item.chave_acesso} transmitida com sucesso`);
        } else {
          // Erro - incrementa tentativas
          await pool.query(`
            UPDATE nfe_contingencia_fila
            SET status = 'ERRO',
                tentativas = tentativas + 1,
                mensagem_erro = $1
            WHERE id = $2
          `, [resposta.motivoStatus, item.id]);

          result.erros++;
        }
      } catch (error: any) {
        await pool.query(`
          UPDATE nfe_contingencia_fila
          SET status = 'ERRO',
              tentativas = tentativas + 1,
              mensagem_erro = $1
          WHERE id = $2
        `, [error.message, item.id]);

        result.erros++;
      }

      // Pausa entre transmissões para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return result;
  }

  /**
   * Conta NF-e pendentes na fila
   */
  private async contarNfesPendentes(): Promise<number> {
    const result = await pool.query(`
      SELECT COUNT(*) as total
      FROM nfe_contingencia_fila
      WHERE status IN ('AGUARDANDO', 'ERRO')
    `);
    return parseInt(result.rows[0].total);
  }

  /**
   * Obtém NF-e pendentes na fila
   */
  async listarFilaContingencia(): Promise<any[]> {
    const result = await pool.query(`
      SELECT f.*, n.numero, n.serie, n.chave_acesso, n.valor_total_nf, n.data_emissao
      FROM nfe_contingencia_fila f
      JOIN nfe_emitidas n ON f.nfe_id = n.id
      WHERE f.status IN ('AGUARDANDO', 'ERRO', 'TRANSMITINDO')
      ORDER BY f.data_entrada_contingencia
    `);
    return result.rows;
  }

  /**
   * Remove item da fila de contingência
   */
  async removerDaFila(id: number): Promise<void> {
    await pool.query('DELETE FROM nfe_contingencia_fila WHERE id = $1', [id]);
  }

  /**
   * Reprocessa item específico da fila
   */
  async reprocessarItem(id: number): Promise<boolean> {
    await pool.query(`
      UPDATE nfe_contingencia_fila
      SET status = 'AGUARDANDO', tentativas = 0
      WHERE id = $1
    `, [id]);

    const resultado = await this.processarFilaContingencia();
    return resultado.processadas > 0;
  }
}

// Singleton
let contingenciaServiceInstance: ContingenciaService | null = null;

export function getContingenciaService(): ContingenciaService {
  if (!contingenciaServiceInstance) {
    contingenciaServiceInstance = new ContingenciaService();
  }
  return contingenciaServiceInstance;
}

// Job para verificação periódica de contingência
let verificacaoInterval: NodeJS.Timeout | null = null;

/**
 * Inicia verificação periódica de contingência
 */
export function iniciarVerificacaoContingencia(intervalMs: number = 60000): void {
  if (verificacaoInterval) {
    clearInterval(verificacaoInterval);
  }

  verificacaoInterval = setInterval(async () => {
    try {
      const service = getContingenciaService();
      await service.verificarEGerenciarContingencia();
    } catch (error) {
      logger.error('Erro na verificação de contingência:', error);
    }
  }, intervalMs);

  logger.info(`Verificação de contingência iniciada (intervalo: ${intervalMs}ms)`);
}

/**
 * Para verificação periódica
 */
export function pararVerificacaoContingencia(): void {
  if (verificacaoInterval) {
    clearInterval(verificacaoInterval);
    verificacaoInterval = null;
    logger.info('Verificação de contingência parada');
  }
}

export default ContingenciaService;
