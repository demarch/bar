import React, { useState, useEffect } from 'react';
import { useAdmin, Produto } from '../../hooks/useAdmin';

interface ProdutoModalProps {
  produto: Produto | null;
  onClose: () => void;
}

export const ProdutoModal: React.FC<ProdutoModalProps> = ({ produto, onClose }) => {
  const { categorias, criarProduto, atualizarProduto } = useAdmin();

  const [formData, setFormData] = useState({
    nome: '',
    categoria_id: '',
    preco: '',
    tipo: 'produto' as 'produto' | 'servico',
    comissao_percentual: '40',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (produto) {
      setFormData({
        nome: produto.nome,
        categoria_id: produto.categoria_id.toString(),
        preco: parseFloat(produto.preco.toString()).toFixed(2),
        tipo: produto.tipo,
        comissao_percentual: produto.comissao_percentual.toString(),
      });
    }
  }, [produto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nome || !formData.categoria_id || !formData.preco) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    const preco = parseFloat(formData.preco);
    const comissao = parseFloat(formData.comissao_percentual);

    if (isNaN(preco) || preco <= 0) {
      setError('Preço inválido');
      return;
    }

    if (isNaN(comissao) || comissao < 0 || comissao > 100) {
      setError('Comissão deve estar entre 0 e 100%');
      return;
    }

    try {
      setLoading(true);

      const data = {
        nome: formData.nome.trim(),
        categoria_id: parseInt(formData.categoria_id),
        preco,
        tipo: formData.tipo,
        comissao_percentual: comissao,
      };

      if (produto) {
        await atualizarProduto({ id: produto.id, ...data });
      } else {
        await criarProduto(data);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {produto ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              {/* Nome */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="input"
                  placeholder="Ex: Cerveja Heineken"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              {/* Categoria */}
              <div>
                <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria *
                </label>
                <select
                  id="categoria_id"
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="input"
                  required
                  disabled={loading}
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'produto' })}
                    className={`py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                      formData.tipo === 'produto'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    Produto
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'servico' })}
                    className={`py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                      formData.tipo === 'servico'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    Serviço
                  </button>
                </div>
              </div>

              {/* Preço */}
              <div>
                <label htmlFor="preco" className="block text-sm font-medium text-gray-700 mb-2">
                  Preço (R$) *
                </label>
                <input
                  type="number"
                  id="preco"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={loading}
                />
              </div>

              {/* Comissão */}
              <div>
                <label htmlFor="comissao_percentual" className="block text-sm font-medium text-gray-700 mb-2">
                  Comissão (%) *
                </label>
                <input
                  type="number"
                  id="comissao_percentual"
                  value={formData.comissao_percentual}
                  onChange={(e) => setFormData({ ...formData, comissao_percentual: e.target.value })}
                  className="input"
                  placeholder="40"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Salvando...
                  </>
                ) : produto ? (
                  'Atualizar'
                ) : (
                  'Criar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
