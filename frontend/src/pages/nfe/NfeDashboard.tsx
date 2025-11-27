/**
 * Dashboard de NF-e
 * Mostra status do serviço, contingência e progresso de homologação
 */

import {
  useNfeStatusServico,
  useNfeContingenciaStatus,
  useNfeHomologacaoProgresso,
  useNfeRelatorioDiario,
  useNfeStorageStats,
  useEntrarContingencia,
  useSairContingencia,
  useProcessarFilaContingencia
} from '../../hooks/useNfe';

export default function NfeDashboard() {
  const { data: statusServico, refetch: refetchStatus } = useNfeStatusServico();
  const { data: contingencia } = useNfeContingenciaStatus();
  const { data: progresso } = useNfeHomologacaoProgresso();
  const { data: relatorioDiario } = useNfeRelatorioDiario();
  const { data: storageStats } = useNfeStorageStats();

  const entrarContingenciaMutation = useEntrarContingencia();
  const sairContingenciaMutation = useSairContingencia();
  const processarFilaMutation = useProcessarFilaContingencia();

  const handleEntrarContingencia = async () => {
    const motivo = window.prompt('Informe o motivo para entrar em contingência (mínimo 15 caracteres):');
    if (!motivo || motivo.length < 15) {
      alert('Motivo deve ter no mínimo 15 caracteres');
      return;
    }

    try {
      await entrarContingenciaMutation.mutateAsync({ motivo });
      alert('Modo contingência ativado');
    } catch (error: any) {
      alert('Erro: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSairContingencia = async () => {
    if (!window.confirm('Deseja sair do modo contingência?')) return;

    try {
      await sairContingenciaMutation.mutateAsync();
      alert('Modo contingência desativado');
    } catch (error: any) {
      alert('Erro: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleProcessarFila = async () => {
    try {
      const result = await processarFilaMutation.mutateAsync();
      alert(`Processadas: ${result.data?.processadas} | Erros: ${result.data?.erros}`);
    } catch (error: any) {
      alert('Erro: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatarBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatarMoeda = (valor: number) => {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard NF-e</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Status SEFAZ */}
        <div className={`p-6 rounded-lg shadow ${statusServico?.online ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Status SEFAZ</h3>
            <button
              onClick={() => refetchStatus()}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Atualizar
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className={`w-4 h-4 rounded-full ${statusServico?.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-lg font-medium">
              {statusServico?.online ? 'Online' : 'Offline'}
            </span>
          </div>

          {statusServico && (
            <div className="mt-4 text-sm">
              <p>Ambiente: {statusServico.ambiente === 1 ? 'Produção' : 'Homologação'}</p>
              <p>Tempo médio: {statusServico.tempoMedio}ms</p>
              <p className="text-gray-500 mt-2">{statusServico.motivoStatus}</p>
            </div>
          )}
        </div>

        {/* Contingência */}
        <div className={`p-6 rounded-lg shadow ${contingencia?.ativo ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-gray-50'}`}>
          <h3 className="font-medium mb-4">Modo Contingência</h3>

          <div className="flex items-center gap-3 mb-4">
            <span className={`w-4 h-4 rounded-full ${contingencia?.ativo ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-lg font-medium">
              {contingencia?.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {contingencia?.ativo && (
            <div className="text-sm mb-4">
              <p>NF-e pendentes: <span className="font-medium">{contingencia.nfesPendentes}</span></p>
              {contingencia.motivo && <p className="text-gray-600">{contingencia.motivo}</p>}
            </div>
          )}

          <div className="flex gap-2">
            {!contingencia?.ativo ? (
              <button
                onClick={handleEntrarContingencia}
                className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Entrar em Contingência
              </button>
            ) : (
              <>
                <button
                  onClick={handleSairContingencia}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Sair
                </button>
                <button
                  onClick={handleProcessarFila}
                  disabled={processarFilaMutation.isPending}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Processar Fila
                </button>
              </>
            )}
          </div>
        </div>

        {/* Resumo do Dia */}
        <div className="p-6 rounded-lg shadow bg-blue-50 border-2 border-blue-200">
          <h3 className="font-medium mb-4">Resumo do Dia</h3>

          {relatorioDiario?.resumo ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Autorizadas:</span>
                <span className="font-medium text-green-600">{relatorioDiario.resumo.autorizadas}</span>
              </div>
              <div className="flex justify-between">
                <span>Canceladas:</span>
                <span className="font-medium text-orange-600">{relatorioDiario.resumo.canceladas}</span>
              </div>
              <div className="flex justify-between">
                <span>Rejeitadas:</span>
                <span className="font-medium text-red-600">{relatorioDiario.resumo.rejeitadas}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span>Valor Total:</span>
                <span className="font-medium">{formatarMoeda(relatorioDiario.resumo.valorTotal)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma NF-e hoje</p>
          )}
        </div>
      </div>

      {/* Progresso Homologação */}
      {progresso && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-medium mb-4">Progresso dos Testes de Homologação</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Autorizações */}
            <div>
              <div className="flex justify-between mb-2">
                <span>Autorizações</span>
                <span className="font-medium">{progresso.autorizacoes.realizadas}/{progresso.autorizacoes.meta}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(progresso.autorizacoes.percentual, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">{progresso.autorizacoes.percentual}% concluído</p>
            </div>

            {/* Cancelamentos */}
            <div>
              <div className="flex justify-between mb-2">
                <span>Cancelamentos</span>
                <span className="font-medium">{progresso.cancelamentos.realizadas}/{progresso.cancelamentos.meta}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-orange-500 h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(progresso.cancelamentos.percentual, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">{progresso.cancelamentos.percentual}% concluído</p>
            </div>

            {/* Inutilizações */}
            <div>
              <div className="flex justify-between mb-2">
                <span>Inutilizações</span>
                <span className="font-medium">{progresso.inutilizacoes.realizadas}/{progresso.inutilizacoes.meta}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(progresso.inutilizacoes.percentual, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">{progresso.inutilizacoes.percentual}% concluído</p>
            </div>
          </div>

          {progresso.status === 'APROVADO' && (
            <div className="mt-4 p-3 bg-green-100 rounded-lg text-green-800 text-center">
              Parabéns! Todos os testes foram concluídos com sucesso.
            </div>
          )}
        </div>
      )}

      {/* Estatísticas de Armazenamento */}
      {storageStats && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Armazenamento de XMLs</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total de XMLs</p>
              <p className="text-2xl font-bold">{storageStats.totalXmls}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Tamanho no Banco</p>
              <p className="text-2xl font-bold">{formatarBytes(storageStats.totalBytesDb)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Tamanho em Disco</p>
              <p className="text-2xl font-bold">{formatarBytes(storageStats.totalBytesDisco)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Por Status</p>
              <div className="text-sm mt-1">
                {Object.entries(storageStats.porStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span>{status}:</span>
                    <span className="font-medium">{String(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {storageStats.porAno && Object.keys(storageStats.porAno).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Por Ano</h4>
              <div className="flex gap-4">
                {Object.entries(storageStats.porAno).map(([ano, count]) => (
                  <div key={ano} className="px-3 py-1 bg-blue-100 rounded-full text-sm">
                    {ano}: <span className="font-medium">{String(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Links Rápidos */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <a
          href="/nfe/lista"
          className="p-4 bg-white rounded-lg shadow text-center hover:bg-gray-50"
        >
          <span className="text-2xl">📋</span>
          <p className="mt-2 font-medium">Listar NF-e</p>
        </a>
        <a
          href="/nfe/config"
          className="p-4 bg-white rounded-lg shadow text-center hover:bg-gray-50"
        >
          <span className="text-2xl">⚙️</span>
          <p className="mt-2 font-medium">Configuração</p>
        </a>
        <a
          href="/nfe/inutilizacao"
          className="p-4 bg-white rounded-lg shadow text-center hover:bg-gray-50"
        >
          <span className="text-2xl">🚫</span>
          <p className="mt-2 font-medium">Inutilização</p>
        </a>
        <a
          href="https://www.nfe.fazenda.gov.br/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-white rounded-lg shadow text-center hover:bg-gray-50"
        >
          <span className="text-2xl">🌐</span>
          <p className="mt-2 font-medium">Portal NF-e</p>
        </a>
      </div>
    </div>
  );
}
