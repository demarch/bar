import React, { useState } from 'react';
import { useCaixa } from '../../hooks/useCaixa';
import { useComandas } from '../../hooks/useComandas';

interface FecharCaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FecharCaixaModal: React.FC<FecharCaixaModalProps> = ({ isOpen, onClose }) => {
  const { caixaAberto, fecharCaixa } = useCaixa();
  const { comandas } = useComandas();
  const [valorFechamento, setValorFechamento] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'validacao' | 'confirmacao'>('validacao');

  // Validar se pode fechar
  const podeFechar = !comandas || comandas.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const valor = parseFloat(valorFechamento);

    if (isNaN(valor) || valor < 0) {
      setError('Informe um valor válido');
      return;
    }

    try {
      setLoading(true);
      await fecharCaixa({ valor_fechamento: valor });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fechar caixa');
      setLoading(false);
    }
  };

  if (!isOpen || !caixaAberto) return null;

  // Calcular totais
  const valorAbertura = parseFloat(caixaAberto.valor_abertura || '0');
  const totalVendas = caixaAberto.total_vendas || 0;
  const totalComissoes = caixaAberto.total_comissoes || 0;
  const totalSangrias = caixaAberto.total_sangrias || 0;
  const saldoEsperado = valorAbertura + totalVendas - totalSangrias;

  const valorInformado = parseFloat(valorFechamento) || 0;
  const diferenca = valorInformado - saldoEsperado;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Fechar Caixa</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Validação de comandas abertas */}
          {!podeFechar && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-2">Não é possível fechar o caixa</p>
                  <p>
                    Existem <strong>{comandas?.length}</strong>{' '}
                    {comandas?.length === 1 ? 'comanda aberta' : 'comandas abertas'}. Feche
                    todas as comandas antes de fechar o caixa.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Resumo do movimento */}
            <div className="mb-6 space-y-3">
              <h3 className="font-semibold text-gray-800 mb-3">Resumo do Movimento</h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Valor de Abertura:</span>
                  <span className="font-semibold">R$ {valorAbertura.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total de Vendas:</span>
                  <span className="font-semibold text-green-600">
                    + R$ {totalVendas.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sangrias:</span>
                  <span className="font-semibold text-red-600">
                    - R$ {totalSangrias.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2"></div>
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-gray-800">Saldo Esperado:</span>
                  <span className="font-bold text-primary-600 text-lg">
                    R$ {saldoEsperado.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 space-y-2 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Comissões a Pagar:</span>
                  <span className="font-semibold text-yellow-600">
                    R$ {totalComissoes.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lucro Líquido:</span>
                  <span className="font-semibold text-blue-600">
                    R$ {(totalVendas - totalComissoes).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Valor de fechamento */}
            <div className="mb-6">
              <label
                htmlFor="valorFechamento"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Valor Contado no Caixa *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">R$</span>
                <input
                  type="number"
                  id="valorFechamento"
                  value={valorFechamento}
                  onChange={(e) => setValorFechamento(e.target.value)}
                  className="input pl-12 text-lg font-semibold"
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  disabled={loading || !podeFechar}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Conte o dinheiro físico no caixa e informe o valor total encontrado.
              </p>
            </div>

            {/* Diferença */}
            {valorFechamento && (
              <div
                className={`mb-6 p-4 rounded-lg border ${
                  Math.abs(diferenca) < 0.01
                    ? 'bg-green-50 border-green-200'
                    : diferenca > 0
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">Diferença:</span>
                  <span
                    className={`text-xl font-bold ${
                      Math.abs(diferenca) < 0.01
                        ? 'text-green-600'
                        : diferenca > 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                    }`}
                  >
                    {diferenca > 0 ? '+' : ''}R$ {diferenca.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm mt-2 text-gray-600">
                  {Math.abs(diferenca) < 0.01
                    ? 'Valores conferem! ✓'
                    : diferenca > 0
                    ? 'Sobra de caixa (positiva)'
                    : 'Falta de caixa (negativa)'}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Atenção:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Confira o valor antes de confirmar</li>
                    <li>Esta operação não pode ser desfeita</li>
                    <li>Um relatório completo será gerado</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-danger flex-1"
                disabled={loading || !podeFechar}
              >
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
                    Fechando...
                  </>
                ) : (
                  'Fechar Caixa'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
