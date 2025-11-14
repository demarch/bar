import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useCaixa } from '../hooks/useCaixa';
import { useComandas } from '../hooks/useComandas';
import { AbrirCaixaModal } from '../components/caixa/AbrirCaixaModal';
import { SangriaModal } from '../components/caixa/SangriaModal';
import { FecharCaixaModal } from '../components/caixa/FecharCaixaModal';
import { FecharComandaModal } from '../components/caixa/FecharComandaModal';

export const Caixa: React.FC = () => {
  const { caixaAberto } = useCaixa();
  const { comandas } = useComandas();

  const [showAbrirCaixa, setShowAbrirCaixa] = useState(false);
  const [showSangria, setShowSangria] = useState(false);
  const [showFecharCaixa, setShowFecharCaixa] = useState(false);
  const [showFecharComanda, setShowFecharComanda] = useState(false);
  const [comandaSelecionada, setComandaSelecionada] = useState<number | null>(null);

  const handleFecharComanda = (comandaId: number) => {
    setComandaSelecionada(comandaId);
    setShowFecharComanda(true);
  };

  // Se não há caixa aberto, mostrar botão para abrir
  if (!caixaAberto) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Caixa Fechado</h2>
              <p className="text-gray-600 mb-6">
                Não há movimento de caixa aberto no momento. Abra o caixa para iniciar as
                operações.
              </p>
              <button onClick={() => setShowAbrirCaixa(true)} className="btn-primary w-full">
                Abrir Caixa
              </button>
            </div>
          </div>
        </div>

        {showAbrirCaixa && (
          <AbrirCaixaModal
            isOpen={showAbrirCaixa}
            onClose={() => setShowAbrirCaixa(false)}
          />
        )}
      </Layout>
    );
  }

  // Calcular totais
  const totalVendas = parseFloat(caixaAberto.total_vendas?.toString() || '0');
  const totalComissoes = parseFloat(caixaAberto.total_comissoes?.toString() || '0');
  const totalSangrias = parseFloat(caixaAberto.total_sangrias?.toString() || '0');
  const valorAbertura = parseFloat(caixaAberto.valor_abertura?.toString() || '0');
  const saldoAtual = valorAbertura + totalVendas - totalSangrias;
  const lucroLiquido = totalVendas - totalComissoes;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header com informações do caixa */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Caixa Aberto</h1>
              <div className="space-y-1 text-primary-100">
                <p>
                  <span className="font-semibold">Operador:</span>{' '}
                  {caixaAberto.operador_nome || 'Desconhecido'}
                </p>
                <p>
                  <span className="font-semibold">Abertura:</span>{' '}
                  {new Date(caixaAberto.data_abertura).toLocaleString('pt-BR')}
                </p>
                <p>
                  <span className="font-semibold">Valor Inicial:</span> R${' '}
                  {valorAbertura.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-100 mb-1">Saldo Atual</p>
              <p className="text-4xl font-bold">R$ {saldoAtual.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total de Vendas */}
          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Vendas</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalVendas.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Comissões a Pagar */}
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Comissões</p>
                <p className="text-2xl font-bold text-yellow-600">
                  R$ {totalComissoes.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Sangrias */}
          <div className="card bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Sangrias</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {totalSangrias.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Lucro Líquido */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Lucro Líquido</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {lucroLiquido.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowSangria(true)}
            className="btn-secondary py-4 text-lg"
          >
            <svg
              className="w-6 h-6 inline-block mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z"
              />
            </svg>
            Registrar Sangria
          </button>

          <button
            onClick={() => setShowFecharCaixa(true)}
            className="btn-danger py-4 text-lg"
            disabled={comandas && comandas.length > 0}
          >
            <svg
              className="w-6 h-6 inline-block mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Fechar Caixa
          </button>

          <button className="btn-primary py-4 text-lg">
            <svg
              className="w-6 h-6 inline-block mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Relatórios
          </button>
        </div>

        {/* Lista de comandas abertas */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Comandas Abertas</h2>
            <span className="badge badge-primary">
              {comandas?.length || 0} {comandas?.length === 1 ? 'comanda' : 'comandas'}
            </span>
          </div>

          {!comandas || comandas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>Nenhuma comanda aberta</p>
            </div>
          ) : (
            <div className="space-y-2">
              {comandas.map((comanda) => (
                <div
                  key={comanda.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary-600">
                        #{comanda.numero}
                      </span>
                      {comanda.cliente_nome && (
                        <span className="text-gray-700">{comanda.cliente_nome}</span>
                      )}
                      {(comanda.acompanhantes?.length || 0) > 0 && (
                        <span className="badge badge-warning">
                          {comanda.acompanhantes?.length || 0}{' '}
                          {(comanda.acompanhantes?.length || 0) === 1
                            ? 'acompanhante'
                            : 'acompanhantes'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {comanda.total_itens} itens • Aberta há{' '}
                      {Math.floor(
                        (Date.now() - new Date(comanda.data_abertura).getTime()) /
                          (1000 * 60)
                      )}{' '}
                      min
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">
                        R$ {parseFloat(comanda.total?.toString() || '0').toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleFecharComanda(comanda.id)}
                      className="btn-success"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {showSangria && (
        <SangriaModal isOpen={showSangria} onClose={() => setShowSangria(false)} />
      )}

      {showFecharCaixa && (
        <FecharCaixaModal
          isOpen={showFecharCaixa}
          onClose={() => setShowFecharCaixa(false)}
        />
      )}

      {showFecharComanda && comandaSelecionada && (
        <FecharComandaModal
          isOpen={showFecharComanda}
          onClose={() => {
            setShowFecharComanda(false);
            setComandaSelecionada(null);
          }}
          comandaId={comandaSelecionada}
        />
      )}
    </Layout>
  );
};
