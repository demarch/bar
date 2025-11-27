import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useComandas } from '../hooks/useComandas';
import { useProdutos, useCategorias } from '../hooks/useProdutos';
import { useAcompanhantesAtivas } from '../hooks/useAcompanhantes';
import { useCaixa } from '../hooks/useCaixa';
import { ComandaDetalhada, Produto } from '../types';
import { ServicoQuartoModal } from '../components/pdv/ServicoQuartoModal';
import { ServicosTempoLivreList } from '../components/pdv/ServicosTempoLivreList';

export const PDV: React.FC = () => {
  const { comandas, buscarComanda, criarComanda, adicionarItem } = useComandas();
  const { categorias } = useCategorias();
  const { acompanhantesAtivas } = useAcompanhantesAtivas();
  const { caixaAberto } = useCaixa();

  const [numeroComanda, setNumeroComanda] = useState('');
  const [comandaSelecionada, setComandaSelecionada] = useState<ComandaDetalhada | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | undefined>();
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [acompanhanteSelecionada, setAcompanhanteSelecionada] = useState<number | undefined>();
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState('');
  const [showServicoQuartoModal, setShowServicoQuartoModal] = useState(false);

  const { produtos } = useProdutos(categoriaSelecionada);

  const handleBuscarComanda = async () => {
    if (!numeroComanda) return;

    const comanda = await buscarComanda(parseInt(numeroComanda));
    if (comanda) {
      setComandaSelecionada(comanda);
      setMensagem('');
    } else {
      setMensagem('Comanda não encontrada');
      setComandaSelecionada(null);
    }
  };

  const handleCriarComanda = async () => {
    if (!numeroComanda) return;

    try {
      await criarComanda({ numero: parseInt(numeroComanda) });
      setMensagem('Comanda criada com sucesso!');
      handleBuscarComanda();
    } catch (error: any) {
      setMensagem(error.response?.data?.error || 'Erro ao criar comanda');
    }
  };

  const handleAdicionarItem = async () => {
    if (!comandaSelecionada || !produtoSelecionado) return;

    try {
      await adicionarItem({
        comanda_id: comandaSelecionada.id,
        produto_id: produtoSelecionado.id,
        quantidade,
        acompanhante_id:
          produtoSelecionado.tipo === 'comissionado' ? acompanhanteSelecionada : undefined,
      });

      setMensagem('Item adicionado com sucesso!');
      setProdutoSelecionado(null);
      setQuantidade(1);
      setAcompanhanteSelecionada(undefined);

      // Atualizar comanda
      const comandaAtualizada = await buscarComanda(comandaSelecionada.numero);
      if (comandaAtualizada) {
        setComandaSelecionada(comandaAtualizada);
      }
    } catch (error: any) {
      setMensagem(error.response?.data?.error || 'Erro ao adicionar item');
    }
  };

  const handleServicoQuartoSuccess = async () => {
    setMensagem('Serviço de quarto lançado com sucesso!');
    if (comandaSelecionada) {
      const comandaAtualizada = await buscarComanda(comandaSelecionada.numero);
      if (comandaAtualizada) {
        setComandaSelecionada(comandaAtualizada);
      }
    }
  };

  if (!caixaAberto) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-yellow-800 mb-4">Caixa Fechado</h2>
            <p className="text-yellow-700">
              Não há caixa aberto no momento. Solicite ao caixa ou administrador que abra um
              caixa.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Buscar/Criar Comanda */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Buscar Comanda</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número da Comanda
                </label>
                <input
                  type="number"
                  value={numeroComanda}
                  onChange={(e) => setNumeroComanda(e.target.value)}
                  className="input"
                  placeholder="Digite o número"
                  onKeyPress={(e) => e.key === 'Enter' && handleBuscarComanda()}
                />
              </div>

              <div className="flex gap-2">
                <button onClick={handleBuscarComanda} className="btn-primary flex-1">
                  Buscar
                </button>
                <button onClick={handleCriarComanda} className="btn-secondary flex-1">
                  Nova
                </button>
              </div>

              {mensagem && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    mensagem.includes('sucesso')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {mensagem}
                </div>
              )}
            </div>
          </div>

          {/* Servicos de Tempo Livre em Andamento */}
          <div className="mt-6">
            <ServicosTempoLivreList
              onFinalizarSuccess={async () => {
                setMensagem('Servico de tempo livre finalizado com sucesso!');
                if (comandaSelecionada) {
                  const comandaAtualizada = await buscarComanda(comandaSelecionada.numero);
                  if (comandaAtualizada) {
                    setComandaSelecionada(comandaAtualizada);
                  }
                }
              }}
            />
          </div>

          {/* Comandas Abertas */}
          <div className="card mt-6">
            <h2 className="text-xl font-bold mb-4">Comandas Abertas</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {comandas?.map((comanda) => (
                <div
                  key={comanda.id}
                  onClick={() => {
                    setNumeroComanda(comanda.numero.toString());
                    handleBuscarComanda();
                  }}
                  className="card-comanda border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">#{comanda.numero}</p>
                      {comanda.cliente_nome && (
                        <p className="text-sm text-gray-600">{comanda.cliente_nome}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">
                        R$ {parseFloat(comanda.total.toString()).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">{comanda.total_itens} itens</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna 2: Produtos */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Produtos</h2>

            {/* Categorias */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoriaSelecionada(undefined)}
                  className={`btn ${
                    categoriaSelecionada === undefined ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  Todos
                </button>
                {categorias?.map((categoria) => (
                  <button
                    key={categoria.id}
                    onClick={() => setCategoriaSelecionada(categoria.id)}
                    className={`btn ${
                      categoriaSelecionada === categoria.id ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {categoria.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Produtos */}
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {produtos?.map((produto) => (
                <button
                  key={produto.id}
                  onClick={() => setProdutoSelecionado(produto)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    produtoSelecionado?.id === produto.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{produto.nome}</p>
                  <p className="text-primary-600 font-bold">
                    R$ {parseFloat(produto.preco.toString()).toFixed(2)}
                  </p>
                  {produto.tipo === 'comissionado' && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-1 inline-block">
                      Comissionado
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna 3: Lançamento e Itens */}
        <div className="lg:col-span-1">
          {comandaSelecionada ? (
            <div className="space-y-6">
              {/* Informações da Comanda */}
              <div className="card bg-primary-50 border border-primary-200">
                <h2 className="text-2xl font-bold mb-2">Comanda #{comandaSelecionada.numero}</h2>
                {comandaSelecionada.cliente_nome && (
                  <p className="text-gray-600">{comandaSelecionada.cliente_nome}</p>
                )}
                <div className="mt-4 pt-4 border-t border-primary-200">
                  <p className="text-3xl font-bold text-primary-600">
                    R$ {parseFloat(comandaSelecionada.total.toString()).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Lançar Item */}
              {produtoSelecionado && (
                <div className="card bg-green-50 border border-green-200">
                  <h3 className="font-bold mb-4">Lançar Item</h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Produto</p>
                      <p className="font-bold">{produtoSelecionado.nome}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantidade}
                        onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                        className="input"
                      />
                    </div>

                    {produtoSelecionado.tipo === 'comissionado' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Acompanhante *
                        </label>
                        <select
                          value={acompanhanteSelecionada || ''}
                          onChange={(e) =>
                            setAcompanhanteSelecionada(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          className="input"
                          required
                        >
                          <option value="">Selecione...</option>
                          {acompanhantesAtivas?.map((acomp) => (
                            <option key={acomp.id} value={acomp.id}>
                              #{acomp.id} - {acomp.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <p className="text-2xl font-bold text-green-600">
                        R${' '}
                        {(parseFloat(produtoSelecionado.preco.toString()) * quantidade).toFixed(
                          2
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={handleAdicionarItem} className="btn-success flex-1">
                        Adicionar
                      </button>
                      <button
                        onClick={() => setProdutoSelecionado(null)}
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão de Serviço de Quarto */}
              {!produtoSelecionado && (
                <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div>
                        <h4 className="font-bold text-purple-900">Serviço de Quarto</h4>
                        <p className="text-xs text-purple-700">Lançar uso de quarto com acompanhantes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowServicoQuartoModal(true)}
                      className="btn-primary bg-purple-600 hover:bg-purple-700"
                    >
                      Lançar
                    </button>
                  </div>
                </div>
              )}

              {/* Itens da Comanda */}
              <div className="card">
                <h3 className="font-bold mb-4">Itens ({comandaSelecionada.itens?.length || 0})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {comandaSelecionada.itens?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.produto_nome}</p>
                        {item.acompanhante_nome && (
                          <p className="text-xs text-gray-600">Com: {item.acompanhante_nome}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {item.quantidade}x R${' '}
                          {parseFloat(item.valor_unitario.toString()).toFixed(2)}
                        </p>
                      </div>
                      <p className="font-bold">
                        R$ {parseFloat(item.valor_total.toString()).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">
              <p>Selecione ou crie uma comanda para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Serviço de Quarto */}
      {comandaSelecionada && (
        <ServicoQuartoModal
          isOpen={showServicoQuartoModal}
          onClose={() => setShowServicoQuartoModal(false)}
          comandaId={comandaSelecionada.id}
          onSuccess={handleServicoQuartoSuccess}
        />
      )}
    </Layout>
  );
};
