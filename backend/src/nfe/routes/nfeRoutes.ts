/**
 * Rotas da API de NF-e
 * Endpoints para emissão, cancelamento, inutilização e consultas
 */

import { Router } from 'express';
import * as nfeController from '../controllers/nfeController';

const router = Router();

// =====================================================
// CONFIGURAÇÃO
// =====================================================

/**
 * @route GET /api/nfe/configuracao
 * @desc Obtém configuração do emitente
 * @access Admin
 */
router.get('/configuracao', nfeController.getConfiguracao);

/**
 * @route POST /api/nfe/configuracao
 * @desc Salva configuração do emitente
 * @access Admin
 */
router.post('/configuracao', nfeController.salvarConfiguracao);

/**
 * @route POST /api/nfe/certificado
 * @desc Upload de certificado digital
 * @access Admin
 */
router.post('/certificado', nfeController.uploadCertificado);

/**
 * @route GET /api/nfe/certificado/validar
 * @desc Valida certificado atual
 * @access Admin
 */
router.get('/certificado/validar', nfeController.validarCertificado);

// =====================================================
// EMISSÃO
// =====================================================

/**
 * @route POST /api/nfe/emitir
 * @desc Emite NF-e avulsa
 * @access Admin
 */
router.post('/emitir', nfeController.emitirNfe);

/**
 * @route POST /api/nfe/emitir/comanda/:comandaId
 * @desc Emite NF-e a partir de uma comanda
 * @access Admin
 */
router.post('/emitir/comanda/:comandaId', nfeController.emitirNfeComanda);

// =====================================================
// CANCELAMENTO E INUTILIZAÇÃO
// =====================================================

/**
 * @route POST /api/nfe/:nfeId/cancelar
 * @desc Cancela uma NF-e
 * @access Admin
 */
router.post('/:nfeId/cancelar', nfeController.cancelarNfe);

/**
 * @route POST /api/nfe/inutilizar
 * @desc Inutiliza faixa de numeração
 * @access Admin
 */
router.post('/inutilizar', nfeController.inutilizarNumeracao);

// =====================================================
// CONSULTAS
// =====================================================

/**
 * @route GET /api/nfe
 * @desc Lista NF-e com filtros
 * @access Admin
 */
router.get('/', nfeController.listarNfes);

/**
 * @route GET /api/nfe/:id
 * @desc Obtém NF-e por ID
 * @access Admin
 */
router.get('/:id', nfeController.getNfeById);

/**
 * @route GET /api/nfe/consultar/:chaveAcesso
 * @desc Consulta NF-e na SEFAZ por chave de acesso
 * @access Admin
 */
router.get('/consultar/:chaveAcesso', nfeController.consultarNfeSefaz);

// =====================================================
// DANFE
// =====================================================

/**
 * @route POST /api/nfe/:nfeId/danfe
 * @desc Gera DANFE para uma NF-e
 * @access Admin
 */
router.post('/:nfeId/danfe', nfeController.gerarDanfe);

/**
 * @route GET /api/nfe/:nfeId/danfe/download
 * @desc Download do DANFE em PDF
 * @access Admin
 */
router.get('/:nfeId/danfe/download', nfeController.downloadDanfe);

// =====================================================
// STATUS E CONTINGÊNCIA
// =====================================================

/**
 * @route GET /api/nfe/status/servico
 * @desc Consulta status do serviço SEFAZ
 * @access Admin
 */
router.get('/status/servico', nfeController.consultarStatusServico);

/**
 * @route GET /api/nfe/contingencia/status
 * @desc Obtém status da contingência
 * @access Admin
 */
router.get('/contingencia/status', nfeController.getStatusContingencia);

/**
 * @route POST /api/nfe/contingencia/entrar
 * @desc Entra em modo contingência
 * @access Admin
 */
router.post('/contingencia/entrar', nfeController.entrarContingencia);

/**
 * @route POST /api/nfe/contingencia/sair
 * @desc Sai do modo contingência
 * @access Admin
 */
router.post('/contingencia/sair', nfeController.sairContingencia);

/**
 * @route GET /api/nfe/contingencia/fila
 * @desc Lista fila de contingência
 * @access Admin
 */
router.get('/contingencia/fila', nfeController.listarFilaContingencia);

/**
 * @route POST /api/nfe/contingencia/processar
 * @desc Processa fila de contingência
 * @access Admin
 */
router.post('/contingencia/processar', nfeController.processarFilaContingencia);

// =====================================================
// XML E BACKUP
// =====================================================

/**
 * @route POST /api/nfe/xml/exportar
 * @desc Exporta XMLs por período
 * @access Admin
 */
router.post('/xml/exportar', nfeController.exportarXmls);

/**
 * @route GET /api/nfe/xml/:chaveAcesso/:tipo?
 * @desc Download de XML
 * @access Admin
 */
router.get('/xml/:chaveAcesso/:tipo?', nfeController.downloadXml);

/**
 * @route GET /api/nfe/storage/estatisticas
 * @desc Obtém estatísticas de armazenamento
 * @access Admin
 */
router.get('/storage/estatisticas', nfeController.getEstatisticasArmazenamento);

/**
 * @route POST /api/nfe/backup
 * @desc Realiza backup dos XMLs
 * @access Admin
 */
router.post('/backup', nfeController.realizarBackup);

// =====================================================
// RELATÓRIOS
// =====================================================

/**
 * @route GET /api/nfe/relatorios/diario
 * @desc Obtém relatório diário de NF-e
 * @access Admin
 */
router.get('/relatorios/diario', nfeController.getRelatorioDiario);

/**
 * @route GET /api/nfe/homologacao/progresso
 * @desc Obtém progresso dos testes de homologação
 * @access Admin
 */
router.get('/homologacao/progresso', nfeController.getProgressoHomologacao);

export default router;
