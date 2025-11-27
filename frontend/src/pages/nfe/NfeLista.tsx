/**
 * Página de Listagem e Gerenciamento de NF-e
 */

import React, { useState } from 'react';
import {
  useNfeLista,
  useCancelarNfe,
  useGerarDanfe,
  useDownloadDanfe,
  useConsultarNfeSefaz,
  useNfeStatusServico,
  useNfeContingenciaStatus,
  NfeListaFiltros
} from '../../hooks/useNfe';
import { Nfe, NfeStatus } from '../../types';

// Cores por status
const STATUS_COLORS: Record<NfeStatus, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  AUTORIZADA: 'bg-green-100 text-green-800',
  REJEITADA: 'bg-red-100 text-red-800',
  DENEGADA: 'bg-gray-100 text-gray-800',
  CANCELADA: 'bg-orange-100 text-orange-800'
};

export default function NfeLista() {
  const [filtros, setFiltros] = useState<NfeListaFiltros>({
    page: 1,
    limit: 20
  });
  const [nfeSelecionada, setNfeSelecionada] = useState<Nfe | null>(null);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [justificativaCancelamento, setJustificativaCancelamento] = useState('');
  const [consultaChave, setConsultaChave] = useState('');

  const { data: listagem, isLoading } = useNfeLista(filtros);
  const { data: statusServico } = useNfeStatusServico();
  const { data: contingencia } = useNfeContingenciaStatus();

  const cancelarMutation = useCancelarNfe();
  const gerarDanfeMutation = useGerarDanfe();
  const downloadDanfeMutation = useDownloadDanfe();
  const consultarSefazMutation = useConsultarNfeSefaz();

  const handleCancelar = async () => {
    if (!nfeSelecionada || !justificativaCancelamento) return;

    if (justificativaCancelamento.length < 15) {
      alert('Justificativa deve ter no mínimo 15 caracteres');
      return;
    }

    try {
      await cancelarMutation.mutateAsync({
        nfeId: nfeSelecionada.id,
        justificativa: justificativaCancelamento
      });
      alert('NF-e cancelada com sucesso!');
      setShowCancelarModal(false);
      setNfeSelecionada(null);
      setJustificativaCancelamento('');
    } catch (error: any) {
      alert('Erro ao cancelar: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleGerarDanfe = async (nfe: Nfe) => {
    try {
      const result = await gerarDanfeMutation.mutateAsync(nfe.id);
      if (result.data?.pdfBase64) {
        // Abre em nova aba
        const blob = base64ToBlob(result.data.pdfBase64, 'application/pdf');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (error: any) {
      alert('Erro ao gerar DANFE: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDownloadDanfe = async (nfe: Nfe) => {
    try {
      const blob = await downloadDanfeMutation.mutateAsync(nfe.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `danfe_${nfe.chaveAcesso}.pdf`;
      a.click();
    } catch (error: any) {
      alert('Erro ao baixar DANFE: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleConsultarSefaz = async () => {
    if (!consultaChave || consultaChave.length !== 44) {
      alert('Chave de acesso deve ter 44 dígitos');
      return;
    }

    try {
      const result = await consultarSefazMutation.mutateAsync(consultaChave);
      alert(`Status: ${result.data?.status}\n${result.data?.mensagem}`);
    } catch (error: any) {
      alert('Erro na consulta: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatarChave = (chave: string) => {
    return chave.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const base64ToBlob = (base64: string, type: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notas Fiscais Eletrônicas</h1>

        <div className="flex items-center gap-4">
          {/* Status SEFAZ */}
          <div className={`px-3 py-1 rounded-full text-sm ${statusServico?.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            SEFAZ: {statusServico?.online ? 'Online' : 'Offline'}
          </div>

          {/* Status Contingência */}
          {contingencia?.ativo && (
            <div className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
              Contingência Ativa ({contingencia.nfesPendentes} pendentes)
            </div>
          )}
        </div>
      </div>

      {/* Consulta por Chave */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consultar NF-e na SEFAZ
            </label>
            <input
              type="text"
              value={consultaChave}
              onChange={(e) => setConsultaChave(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Chave de acesso (44 dígitos)"
              maxLength={44}
            />
          </div>
          <button
            onClick={handleConsultarSefaz}
            disabled={consultarSefazMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {consultarSefazMutation.isPending ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={filtros.dataInicio || ''}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={filtros.dataFim || ''}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filtros.status || ''}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="AUTORIZADA">Autorizada</option>
              <option value="REJEITADA">Rejeitada</option>
              <option value="DENEGADA">Denegada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
            <select
              value={filtros.ambiente || ''}
              onChange={(e) => setFiltros({ ...filtros, ambiente: e.target.value ? parseInt(e.target.value) : undefined, page: 1 })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Todos</option>
              <option value="1">Produção</option>
              <option value="2">Homologação</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de NF-e */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número/Série
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Emissão
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destinatário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ambiente
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listagem?.data.map((nfe) => (
                  <tr key={nfe.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{String(nfe.numero).padStart(9, '0')}</div>
                      <div className="text-xs text-gray-500">Série {nfe.serie}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {formatarData(nfe.dataEmissao)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{nfe.destinatario?.razaoSocial || 'Consumidor Final'}</div>
                      <div className="text-xs text-gray-500">{nfe.destinatario?.cnpjCpf || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {formatarMoeda(nfe.valorTotalNf)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[nfe.status]}`}>
                        {nfe.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs ${nfe.ambiente === 1 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {nfe.ambiente === 1 ? 'Produção' : 'Homologação'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2">
                        {/* DANFE */}
                        {nfe.status === 'AUTORIZADA' && (
                          <>
                            <button
                              onClick={() => handleGerarDanfe(nfe)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                              title="Visualizar DANFE"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => handleDownloadDanfe(nfe)}
                              className="text-green-600 hover:text-green-800 text-sm"
                              title="Download DANFE"
                            >
                              Download
                            </button>
                          </>
                        )}

                        {/* Cancelar */}
                        {nfe.status === 'AUTORIZADA' && (
                          <button
                            onClick={() => {
                              setNfeSelecionada(nfe);
                              setShowCancelarModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="Cancelar NF-e"
                          >
                            Cancelar
                          </button>
                        )}

                        {/* Detalhes */}
                        <button
                          onClick={() => setNfeSelecionada(nfe)}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                          title="Ver detalhes"
                        >
                          Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {listagem?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhuma NF-e encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Paginação */}
            {listagem?.pagination && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t">
                <div className="text-sm text-gray-500">
                  Mostrando {((filtros.page || 1) - 1) * (filtros.limit || 20) + 1} a{' '}
                  {Math.min((filtros.page || 1) * (filtros.limit || 20), listagem.pagination.total)} de{' '}
                  {listagem.pagination.total} registros
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiltros({ ...filtros, page: (filtros.page || 1) - 1 })}
                    disabled={filtros.page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1">
                    Página {filtros.page || 1} de {listagem.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setFiltros({ ...filtros, page: (filtros.page || 1) + 1 })}
                    disabled={(filtros.page || 1) >= listagem.pagination.totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalhes */}
      {nfeSelecionada && !showCancelarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Detalhes da NF-e</h2>
              <button
                onClick={() => setNfeSelecionada(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Número/Série:</span>
                  <p className="font-medium">{nfeSelecionada.numero} / {nfeSelecionada.serie}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[nfeSelecionada.status]}`}>
                      {nfeSelecionada.status}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-500">Chave de Acesso:</span>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {formatarChave(nfeSelecionada.chaveAcesso)}
                </p>
              </div>

              {nfeSelecionada.protocoloAutorizacao && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Protocolo:</span>
                    <p className="font-medium">{nfeSelecionada.protocoloAutorizacao}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Data Autorização:</span>
                    <p className="font-medium">
                      {nfeSelecionada.dataAutorizacao && formatarData(nfeSelecionada.dataAutorizacao)}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Valor Total:</span>
                  <p className="font-medium text-lg">{formatarMoeda(nfeSelecionada.valorTotalNf)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Ambiente:</span>
                  <p className={nfeSelecionada.ambiente === 1 ? 'text-green-600' : 'text-yellow-600'}>
                    {nfeSelecionada.ambiente === 1 ? 'Produção' : 'Homologação'}
                  </p>
                </div>
              </div>

              {nfeSelecionada.motivoStatus && (
                <div>
                  <span className="text-sm text-gray-500">Motivo Status:</span>
                  <p className="text-sm">{nfeSelecionada.motivoStatus}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => setNfeSelecionada(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento */}
      {showCancelarModal && nfeSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Cancelar NF-e</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                NF-e: {nfeSelecionada.numero}/{nfeSelecionada.serie}
              </p>
              <p className="text-sm text-gray-600">
                Valor: {formatarMoeda(nfeSelecionada.valorTotalNf)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justificativa (mínimo 15 caracteres)
              </label>
              <textarea
                value={justificativaCancelamento}
                onChange={(e) => setJustificativaCancelamento(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Informe o motivo do cancelamento"
              />
              <p className="text-xs text-gray-500 mt-1">
                {justificativaCancelamento.length}/15 caracteres mínimos
              </p>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">
                Atenção: O cancelamento é irreversível e deve ser realizado em até 24 horas após a autorização.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCancelarModal(false);
                  setJustificativaCancelamento('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelarMutation.isPending || justificativaCancelamento.length < 15}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {cancelarMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
