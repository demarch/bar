/**
 * Módulo NF-e
 * Sistema de Nota Fiscal Eletrônica para PDV
 */

// Types
export * from './types';

// Services
export { CertificadoService, getCertificadoService, createCertificadoService } from './services/certificadoService';
export { XmlGeneratorService, getXmlGeneratorService } from './services/xmlGeneratorService';
export { SefazService, getSefazService, createSefazService, SEFAZ_URLS, SEFAZ_CONTINGENCIA_URLS } from './services/sefazService';
export { NfeService, getNfeService } from './services/nfeService';
export { DanfeService, getDanfeService } from './services/danfeService';
export {
  ContingenciaService,
  getContingenciaService,
  iniciarVerificacaoContingencia,
  pararVerificacaoContingencia
} from './services/contingenciaService';
export { XmlStorageService, getXmlStorageService } from './services/xmlStorageService';

// Controllers
export * as nfeController from './controllers/nfeController';

// Routes
export { default as nfeRoutes } from './routes/nfeRoutes';

/**
 * Inicializa o módulo NF-e
 * Deve ser chamado na inicialização do servidor
 */
export async function inicializarNfe(): Promise<boolean> {
  const { getNfeService } = await import('./services/nfeService');
  const { iniciarVerificacaoContingencia } = await import('./services/contingenciaService');

  try {
    const nfeService = getNfeService();
    const sucesso = await nfeService.inicializar();

    if (sucesso) {
      // Inicia verificação de contingência a cada 1 minuto
      iniciarVerificacaoContingencia(60000);
    }

    return sucesso;
  } catch (error) {
    console.error('Erro ao inicializar módulo NF-e:', error);
    return false;
  }
}
