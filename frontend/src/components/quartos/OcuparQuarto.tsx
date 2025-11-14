import React, { useState } from 'react';
import { useQuartos } from '../../hooks/useQuartos';
import { useComandas } from '../../hooks/useComandas';
import { useAcompanhantesAtivas } from '../../hooks/useAcompanhantes';

export const OcuparQuarto: React.FC = () => {
  const { quartosDisponiveis, loadingDisponiveis, ocuparQuarto } = useQuartos();
  const { comandas } = useComandas();
  const { acompanhantesAtivas } = useAcompanhantesAtivas();

  const [numeroComanda, setNumeroComanda] = useState('');
  const [comandaSelecionada, setComandaSelecionada] = useState<any>(null);
  const [acompanhanteId, setAcompanhanteId] = useState('');
  const [quartoSelecionado, setQuartoSelecionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'comanda' | 'acompanhante' | 'quarto'>('comanda');

  const buscarComanda = () => {
    if (!numeroComanda) {
      setError('Digite o número da comanda');
      return;
    }

    const comanda = comandas?.find(
      (c) => c.numero.toString() === numeroComanda.toString()
    );

    if (!comanda) {
      setError('Comanda não encontrada');
      setComandaSelecionada(null);
      return;
    }

    setComandaSelecionada(comanda);
    setError('');
    setStep('acompanhante');
  };

  const selecionarAcompanhante = () => {
    if (!acompanhanteId) {
      setError('Selecione uma acompanhante');
      return;
    }

    setError('');
    setStep('quarto');
  };

  const handleOcuparQuarto = async () => {
    if (!comandaSelecionada || !acompanhanteId || !quartoSelecionado) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await ocuparQuarto({
        comanda_id: comandaSelecionada.id,
        acompanhante_id: parseInt(acompanhanteId),
        numero_quarto: quartoSelecionado,
      });

      setSuccess(`Quarto ${quartoSelecionado} ocupado com sucesso!`);

      // Resetar formulário após 2 segundos
      setTimeout(() => {
        setNumeroComanda('');
        setComandaSelecionada(null);
        setAcompanhanteId('');
        setQuartoSelecionado(null);
        setStep('comanda');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao ocupar quarto');
    } finally {
      setLoading(false);
    }
  };

  const voltar = () => {
    if (step === 'acompanhante') {
      setStep('comanda');
      setAcompanhanteId('');
    } else if (step === 'quarto') {
      setStep('acompanhante');
      setQuartoSelecionado(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Ocupar Quarto</h2>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step === 'comanda'
                ? 'bg-blue-600 text-white'
                : 'bg-green-500 text-white'
            }`}
          >
            1
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Comanda</span>
        </div>

        <div className="flex-1 h-1 mx-2 bg-gray-200">
          <div
            className={`h-full transition-all ${
              step === 'acompanhante' || step === 'quarto' ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
        </div>

        <div className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step === 'acompanhante'
                ? 'bg-blue-600 text-white'
                : step === 'quarto'
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            2
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Acompanhante</span>
        </div>

        <div className="flex-1 h-1 mx-2 bg-gray-200">
          <div
            className={`h-full transition-all ${
              step === 'quarto' ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
        </div>

        <div className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step === 'quarto' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}
          >
            3
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Quarto</span>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: Comanda */}
      {step === 'comanda' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="numeroComanda" className="block text-sm font-medium text-gray-700 mb-2">
              Número da Comanda *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="numeroComanda"
                value={numeroComanda}
                onChange={(e) => setNumeroComanda(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    buscarComanda();
                  }
                }}
                className="input flex-1"
                placeholder="Digite o número da comanda..."
                autoFocus
              />
              <button onClick={buscarComanda} className="btn-primary">
                Buscar
              </button>
            </div>
          </div>

          {comandaSelecionada && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Comanda Selecionada</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p>
                  <span className="font-medium">Número:</span> #{comandaSelecionada.numero}
                </p>
                {comandaSelecionada.cliente_nome && (
                  <p>
                    <span className="font-medium">Cliente:</span> {comandaSelecionada.cliente_nome}
                  </p>
                )}
                <p>
                  <span className="font-medium">Total:</span> R${' '}
                  {parseFloat(comandaSelecionada.total).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Acompanhante */}
      {step === 'acompanhante' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="acompanhanteId" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a Acompanhante *
            </label>
            <select
              id="acompanhanteId"
              value={acompanhanteId}
              onChange={(e) => setAcompanhanteId(e.target.value)}
              className="input"
              autoFocus
            >
              <option value="">Selecione uma acompanhante...</option>
              {acompanhantesAtivas?.map((acomp) => (
                <option key={acomp.id} value={acomp.id}>
                  {acomp.nome}
                </option>
              ))}
            </select>
            {acompanhantesAtivas && acompanhantesAtivas.length === 0 && (
              <p className="text-xs text-yellow-600 mt-2">
                ⚠️ Nenhuma acompanhante ativa hoje.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={voltar} className="btn-secondary flex-1">
              Voltar
            </button>
            <button
              onClick={selecionarAcompanhante}
              className="btn-primary flex-1"
              disabled={!acompanhanteId}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Quarto */}
      {step === 'quarto' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecione um Quarto Disponível *
            </label>

            {loadingDisponiveis ? (
              <div className="flex justify-center py-8">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600"
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
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {quartosDisponiveis?.map((quarto) => (
                  <button
                    key={quarto.numero}
                    onClick={() => {
                      if (quarto.disponivel) {
                        setQuartoSelecionado(quarto.numero);
                      }
                    }}
                    disabled={!quarto.disponivel}
                    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                      quartoSelecionado === quarto.numero
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : quarto.disponivel
                        ? 'bg-white border-gray-300 text-gray-800 hover:border-blue-600'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg">{quarto.numero}</div>
                      <div className="text-xs mt-1">
                        {quarto.disponivel ? 'Disponível' : 'Ocupado'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={voltar} className="btn-secondary flex-1" disabled={loading}>
              Voltar
            </button>
            <button
              onClick={handleOcuparQuarto}
              className="btn-primary flex-1"
              disabled={!quartoSelecionado || loading}
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
                  Ocupando...
                </>
              ) : (
                'Confirmar Ocupação'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
