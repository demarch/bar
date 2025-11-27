/**
 * Controller de NF-e
 * Endpoints da API para operações de NF-e
 */

import { Request, Response, NextFunction } from 'express';
import { getNfeService } from '../services/nfeService';
import { getDanfeService } from '../services/danfeService';
import { getContingenciaService } from '../services/contingenciaService';
import { getXmlStorageService } from '../services/xmlStorageService';
import { getCertificadoService } from '../services/certificadoService';
import { getSefazService } from '../services/sefazService';
import {
  NfeStatus,
  NfeAmbiente,
  NfeFormaEmissao,
  NfeListarFiltros
} from '../types';
import logger from '../../config/logger';

/**
 * Obtém configuração do emitente
 */
export async function getConfiguracao(req: Request, res: Response, next: NextFunction) {
  try {
    const nfeService = getNfeService();
    const config = await nfeService.getConfiguracao();

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada'
      });
    }

    // Remove dados sensíveis
    const configSafe = { ...config };
    delete configSafe.certificadoArquivo;
    delete configSafe.certificadoSenha;

    res.json({
      success: true,
      data: configSafe
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Salva configuração do emitente
 */
export async function salvarConfiguracao(req: Request, res: Response, next: NextFunction) {
  try {
    const nfeService = getNfeService();
    const config = await nfeService.salvarConfiguracao(req.body);

    // Remove dados sensíveis
    const configSafe = { ...config };
    delete configSafe.certificadoArquivo;
    delete configSafe.certificadoSenha;

    res.json({
      success: true,
      data: configSafe,
      message: 'Configuração salva com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload de certificado digital
 */
export async function uploadCertificado(req: Request, res: Response, next: NextFunction) {
  try {
    const { certificado, senha } = req.body;

    if (!certificado || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Certificado e senha são obrigatórios'
      });
    }

    const certificadoService = getCertificadoService();
    const validacao = await certificadoService.carregarCertificadoA1(certificado, senha);

    if (!validacao.valido) {
      return res.status(400).json({
        success: false,
        message: validacao.mensagem
      });
    }

    // Salva certificado na configuração
    const nfeService = getNfeService();
    const configAtual = await nfeService.getConfiguracao();

    if (configAtual) {
      await nfeService.salvarConfiguracao({
        ...configAtual,
        certificadoArquivo: certificado,
        certificadoSenha: senha,
        certificadoValidade: validacao.certificadoInfo?.validadeFim,
        certificadoTipo: validacao.certificadoInfo?.tipo || 'A1'
      });
    }

    res.json({
      success: true,
      data: validacao.certificadoInfo,
      message: 'Certificado carregado com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Valida certificado atual
 */
export async function validarCertificado(req: Request, res: Response, next: NextFunction) {
  try {
    const certificadoService = getCertificadoService();
    const validacao = certificadoService.validarCertificado();

    res.json({
      success: true,
      data: validacao
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Emite NF-e a partir de uma comanda
 */
export async function emitirNfeComanda(req: Request, res: Response, next: NextFunction) {
  try {
    const { comandaId } = req.params;
    const usuarioId = (req as any).user?.id || 1;

    const nfeService = getNfeService();
    const resultado = await nfeService.emitirNfeComanda(parseInt(comandaId), usuarioId);

    if (!resultado.success) {
      return res.status(400).json({
        success: false,
        message: resultado.mensagem,
        data: resultado
      });
    }

    res.json({
      success: true,
      data: resultado,
      message: 'NF-e emitida com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Emite NF-e avulsa
 */
export async function emitirNfe(req: Request, res: Response, next: NextFunction) {
  try {
    const usuarioId = (req as any).user?.id || 1;
    const nfeService = getNfeService();

    const resultado = await nfeService.emitirNfe(req.body, usuarioId);

    if (!resultado.success) {
      return res.status(400).json({
        success: false,
        message: resultado.mensagem,
        data: resultado
      });
    }

    res.json({
      success: true,
      data: resultado,
      message: 'NF-e emitida com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancela NF-e
 */
export async function cancelarNfe(req: Request, res: Response, next: NextFunction) {
  try {
    const { nfeId } = req.params;
    const { justificativa } = req.body;
    const usuarioId = (req as any).user?.id || 1;

    if (!justificativa || justificativa.length < 15) {
      return res.status(400).json({
        success: false,
        message: 'Justificativa deve ter no mínimo 15 caracteres'
      });
    }

    const nfeService = getNfeService();
    const resultado = await nfeService.cancelarNfe(
      { nfeId: parseInt(nfeId), justificativa },
      usuarioId
    );

    if (!resultado.success) {
      return res.status(400).json({
        success: false,
        message: resultado.mensagem,
        data: resultado
      });
    }

    res.json({
      success: true,
      data: resultado,
      message: 'NF-e cancelada com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Inutiliza numeração
 */
export async function inutilizarNumeracao(req: Request, res: Response, next: NextFunction) {
  try {
    const { serie, numeroInicial, numeroFinal, justificativa } = req.body;
    const usuarioId = (req as any).user?.id || 1;

    if (!justificativa || justificativa.length < 15) {
      return res.status(400).json({
        success: false,
        message: 'Justificativa deve ter no mínimo 15 caracteres'
      });
    }

    const nfeService = getNfeService();
    const resultado = await nfeService.inutilizarNumeracao(
      { serie, numeroInicial, numeroFinal, justificativa },
      usuarioId
    );

    if (!resultado.success) {
      return res.status(400).json({
        success: false,
        message: resultado.mensagem,
        data: resultado
      });
    }

    res.json({
      success: true,
      data: resultado,
      message: 'Numeração inutilizada com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Consulta NF-e na SEFAZ
 */
export async function consultarNfeSefaz(req: Request, res: Response, next: NextFunction) {
  try {
    const { chaveAcesso } = req.params;

    if (!chaveAcesso || chaveAcesso.length !== 44) {
      return res.status(400).json({
        success: false,
        message: 'Chave de acesso inválida (deve ter 44 dígitos)'
      });
    }

    const nfeService = getNfeService();
    const resultado = await nfeService.consultarNfe(chaveAcesso);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lista NF-e com filtros
 */
export async function listarNfes(req: Request, res: Response, next: NextFunction) {
  try {
    const filtros: NfeListarFiltros = {
      dataInicio: req.query.dataInicio ? new Date(req.query.dataInicio as string) : undefined,
      dataFim: req.query.dataFim ? new Date(req.query.dataFim as string) : undefined,
      status: req.query.status ? (req.query.status as string).split(',') as NfeStatus[] : undefined,
      ambiente: req.query.ambiente ? parseInt(req.query.ambiente as string) : undefined,
      numero: req.query.numero ? parseInt(req.query.numero as string) : undefined,
      chaveAcesso: req.query.chaveAcesso as string,
      comandaId: req.query.comandaId ? parseInt(req.query.comandaId as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      orderBy: req.query.orderBy as string,
      orderDirection: (req.query.orderDirection as 'ASC' | 'DESC') || 'DESC'
    };

    const nfeService = getNfeService();
    const resultado = await nfeService.listarNfe(filtros);

    res.json({
      success: true,
      data: resultado.data,
      pagination: {
        total: resultado.total,
        page: resultado.page,
        limit: resultado.limit,
        totalPages: resultado.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtém NF-e por ID
 */
export async function getNfeById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const nfeService = getNfeService();
    const nfe = await nfeService.getNfeById(parseInt(id));

    if (!nfe) {
      return res.status(404).json({
        success: false,
        message: 'NF-e não encontrada'
      });
    }

    res.json({
      success: true,
      data: nfe
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gera DANFE
 */
export async function gerarDanfe(req: Request, res: Response, next: NextFunction) {
  try {
    const { nfeId } = req.params;
    const config = req.body.config;

    const danfeService = getDanfeService();
    const resultado = await danfeService.gerarDanfe({
      nfeId: parseInt(nfeId),
      config
    });

    if (!resultado.success) {
      return res.status(400).json({
        success: false,
        message: resultado.mensagem
      });
    }

    res.json({
      success: true,
      data: resultado,
      message: 'DANFE gerado com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download do DANFE em PDF
 */
export async function downloadDanfe(req: Request, res: Response, next: NextFunction) {
  try {
    const { nfeId } = req.params;

    const danfeService = getDanfeService();
    const pdfBuffer = await danfeService.obterDanfe(parseInt(nfeId));

    if (!pdfBuffer) {
      // Tenta gerar se não existir
      const resultado = await danfeService.gerarDanfe({ nfeId: parseInt(nfeId) });
      if (!resultado.success || !resultado.pdfBase64) {
        return res.status(404).json({
          success: false,
          message: 'DANFE não encontrado'
        });
      }

      const buffer = Buffer.from(resultado.pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=danfe_${nfeId}.pdf`);
      return res.send(buffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=danfe_${nfeId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * Consulta status do serviço SEFAZ
 */
export async function consultarStatusServico(req: Request, res: Response, next: NextFunction) {
  try {
    const nfeService = getNfeService();
    const status = await nfeService.consultarStatusServico();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtém status da contingência
 */
export async function getStatusContingencia(req: Request, res: Response, next: NextFunction) {
  try {
    const contingenciaService = getContingenciaService();
    const status = await contingenciaService.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Entra em modo contingência
 */
export async function entrarContingencia(req: Request, res: Response, next: NextFunction) {
  try {
    const { forma, motivo } = req.body;

    if (!motivo || motivo.length < 15) {
      return res.status(400).json({
        success: false,
        message: 'Motivo deve ter no mínimo 15 caracteres'
      });
    }

    const contingenciaService = getContingenciaService();
    await contingenciaService.entrarContingencia(forma || NfeFormaEmissao.SVC_RS, motivo);

    const status = await contingenciaService.getStatus();

    res.json({
      success: true,
      data: status,
      message: 'Modo contingência ativado'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Sai do modo contingência
 */
export async function sairContingencia(req: Request, res: Response, next: NextFunction) {
  try {
    const contingenciaService = getContingenciaService();
    await contingenciaService.sairContingencia();

    const status = await contingenciaService.getStatus();

    res.json({
      success: true,
      data: status,
      message: 'Modo contingência desativado'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lista fila de contingência
 */
export async function listarFilaContingencia(req: Request, res: Response, next: NextFunction) {
  try {
    const contingenciaService = getContingenciaService();
    const fila = await contingenciaService.listarFilaContingencia();

    res.json({
      success: true,
      data: fila
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Processa fila de contingência
 */
export async function processarFilaContingencia(req: Request, res: Response, next: NextFunction) {
  try {
    const contingenciaService = getContingenciaService();
    const resultado = await contingenciaService.processarFilaContingencia();

    res.json({
      success: true,
      data: resultado,
      message: `Processadas ${resultado.processadas} NF-e, ${resultado.erros} erros`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Exporta XMLs
 */
export async function exportarXmls(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim, status, ambiente } = req.body;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        success: false,
        message: 'Período obrigatório'
      });
    }

    const xmlStorageService = getXmlStorageService();
    const resultado = await xmlStorageService.exportarXmls(
      new Date(dataInicio),
      new Date(dataFim),
      status,
      ambiente
    );

    res.json({
      success: resultado.success,
      data: resultado,
      message: resultado.mensagem
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download de XML
 */
export async function downloadXml(req: Request, res: Response, next: NextFunction) {
  try {
    const { chaveAcesso, tipo } = req.params;

    const xmlStorageService = getXmlStorageService();
    const xmls = await xmlStorageService.buscarXml(chaveAcesso);

    if (!xmls) {
      return res.status(404).json({
        success: false,
        message: 'XML não encontrado'
      });
    }

    let xml: string | undefined;
    switch (tipo) {
      case 'envio':
        xml = xmls.envio;
        break;
      case 'retorno':
        xml = xmls.retorno;
        break;
      case 'autorizado':
        xml = xmls.autorizado;
        break;
      default:
        xml = xmls.autorizado || xmls.envio;
    }

    if (!xml) {
      return res.status(404).json({
        success: false,
        message: `XML do tipo ${tipo} não encontrado`
      });
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=${chaveAcesso}_${tipo || 'nfe'}.xml`);
    res.send(xml);
  } catch (error) {
    next(error);
  }
}

/**
 * Obtém estatísticas de armazenamento
 */
export async function getEstatisticasArmazenamento(req: Request, res: Response, next: NextFunction) {
  try {
    const xmlStorageService = getXmlStorageService();
    const stats = await xmlStorageService.getEstatisticas();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Realiza backup
 */
export async function realizarBackup(req: Request, res: Response, next: NextFunction) {
  try {
    const xmlStorageService = getXmlStorageService();
    const resultado = await xmlStorageService.realizarBackup();

    res.json({
      success: resultado.success,
      data: resultado,
      message: resultado.mensagem
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtém relatório diário de NF-e
 */
export async function getRelatorioDiario(req: Request, res: Response, next: NextFunction) {
  try {
    const { data } = req.query;
    const dataConsulta = data ? new Date(data as string) : new Date();

    const nfeService = getNfeService();
    const filtros: NfeListarFiltros = {
      dataInicio: new Date(dataConsulta.setHours(0, 0, 0, 0)),
      dataFim: new Date(dataConsulta.setHours(23, 59, 59, 999)),
      limit: 1000
    };

    const nfes = await nfeService.listarNfe(filtros);

    // Agrupa por status
    const resumo = {
      data: dataConsulta.toISOString().split('T')[0],
      autorizadas: 0,
      canceladas: 0,
      rejeitadas: 0,
      pendentes: 0,
      valorTotal: 0
    };

    for (const nfe of nfes.data) {
      switch (nfe.status) {
        case NfeStatus.AUTORIZADA:
          resumo.autorizadas++;
          resumo.valorTotal += nfe.totais.valorTotalNf;
          break;
        case NfeStatus.CANCELADA:
          resumo.canceladas++;
          break;
        case NfeStatus.REJEITADA:
          resumo.rejeitadas++;
          break;
        default:
          resumo.pendentes++;
      }
    }

    res.json({
      success: true,
      data: {
        resumo,
        nfes: nfes.data
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtém progresso dos testes de homologação
 */
export async function getProgressoHomologacao(req: Request, res: Response, next: NextFunction) {
  try {
    const pool = require('../../config/database').default;

    const nfeService = getNfeService();
    const config = await nfeService.getConfiguracao();

    if (!config || !config.id) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada'
      });
    }

    const result = await pool.query(`
      SELECT * FROM nfe_homologacao_testes
      WHERE emitente_id = $1 AND data_teste = CURRENT_DATE
    `, [config.id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          autorizacoes: { realizadas: 0, meta: 0, percentual: 0 },
          cancelamentos: { realizadas: 0, meta: 0, percentual: 0 },
          inutilizacoes: { realizadas: 0, meta: 0, percentual: 0 },
          status: 'NAO_INICIADO'
        }
      });
    }

    const teste = result.rows[0];

    res.json({
      success: true,
      data: {
        autorizacoes: {
          realizadas: teste.autorizacoes_realizadas,
          meta: teste.autorizacoes_meta,
          percentual: Math.round((teste.autorizacoes_realizadas / teste.autorizacoes_meta) * 100)
        },
        cancelamentos: {
          realizadas: teste.cancelamentos_realizados,
          meta: teste.cancelamentos_meta,
          percentual: Math.round((teste.cancelamentos_realizados / teste.cancelamentos_meta) * 100)
        },
        inutilizacoes: {
          realizadas: teste.inutilizacoes_realizadas,
          meta: teste.inutilizacoes_meta,
          percentual: Math.round((teste.inutilizacoes_realizadas / teste.inutilizacoes_meta) * 100)
        },
        status: teste.status,
        dataTeste: teste.data_teste
      }
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getConfiguracao,
  salvarConfiguracao,
  uploadCertificado,
  validarCertificado,
  emitirNfeComanda,
  emitirNfe,
  cancelarNfe,
  inutilizarNumeracao,
  consultarNfeSefaz,
  listarNfes,
  getNfeById,
  gerarDanfe,
  downloadDanfe,
  consultarStatusServico,
  getStatusContingencia,
  entrarContingencia,
  sairContingencia,
  listarFilaContingencia,
  processarFilaContingencia,
  exportarXmls,
  downloadXml,
  getEstatisticasArmazenamento,
  realizarBackup,
  getRelatorioDiario,
  getProgressoHomologacao
};
