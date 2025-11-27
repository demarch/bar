/**
 * Página de Inutilização de Numeração de NF-e
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useInutilizarNumeracao, useNfeConfiguracao } from '../../hooks/useNfe';

interface InutilizacaoForm {
  serie: number;
  numeroInicial: number;
  numeroFinal: number;
  justificativa: string;
}

export default function NfeInutilizacao() {
  const { data: config } = useNfeConfiguracao();
  const inutilizarMutation = useInutilizarNumeracao();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<InutilizacaoForm>({
    defaultValues: {
      serie: 1,
      numeroInicial: 1,
      numeroFinal: 1,
      justificativa: ''
    }
  });

  const justificativa = watch('justificativa', '');

  const onSubmit = async (data: InutilizacaoForm) => {
    if (data.justificativa.length < 15) {
      alert('Justificativa deve ter no mínimo 15 caracteres');
      return;
    }

    if (data.numeroInicial > data.numeroFinal) {
      alert('Número inicial deve ser menor ou igual ao número final');
      return;
    }

    const confirmacao = window.confirm(
      `Confirma a inutilização da numeração ${data.numeroInicial} a ${data.numeroFinal} da série ${data.serie}?\n\n` +
      'Esta operação é IRREVERSÍVEL!'
    );

    if (!confirmacao) return;

    try {
      const result = await inutilizarMutation.mutateAsync(data);
      if (result.success) {
        alert('Numeração inutilizada com sucesso!\nProtocolo: ' + result.data?.protocolo);
        reset();
      } else {
        alert('Erro: ' + result.message);
      }
    } catch (error: any) {
      alert('Erro ao inutilizar: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Inutilização de Numeração</h1>

      {/* Informações */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">Quando usar a Inutilização?</h3>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Quando houver salto de numeração que não será utilizado</li>
          <li>Em caso de falha no sistema que gerou número sem emitir a NF-e</li>
          <li>A numeração inutilizada não poderá mais ser utilizada</li>
          <li>Deve ser feita até o 10º dia do mês subsequente</li>
        </ul>
      </div>

      {/* Configuração Atual */}
      {config && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Configuração Atual</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Série:</span>
              <span className="ml-2 font-medium">{config.serieNfe}</span>
            </div>
            <div>
              <span className="text-gray-500">Próximo Número:</span>
              <span className="ml-2 font-medium">{config.proximoNumeroNfe}</span>
            </div>
            <div>
              <span className="text-gray-500">Ambiente:</span>
              <span className={`ml-2 font-medium ${config.ambiente === 1 ? 'text-green-600' : 'text-yellow-600'}`}>
                {config.ambiente === 1 ? 'Produção' : 'Homologação'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Formulário */}
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Série *
              </label>
              <input
                type="number"
                {...register('serie', { required: true, min: 1, valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número Inicial *
              </label>
              <input
                type="number"
                {...register('numeroInicial', { required: true, min: 1, valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número Final *
              </label>
              <input
                type="number"
                {...register('numeroFinal', { required: true, min: 1, valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Justificativa * (mínimo 15 caracteres)
            </label>
            <textarea
              {...register('justificativa', { required: true, minLength: 15 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Informe o motivo da inutilização da numeração"
            />
            <p className="text-xs text-gray-500 mt-1">
              {justificativa.length}/15 caracteres mínimos
            </p>
            {errors.justificativa && (
              <span className="text-red-500 text-sm">Justificativa é obrigatória (mínimo 15 caracteres)</span>
            )}
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800 font-medium">
              Atenção: Esta operação é IRREVERSÍVEL!
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Os números inutilizados não poderão mais ser utilizados para emissão de NF-e.
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Limpar
            </button>
            <button
              type="submit"
              disabled={inutilizarMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {inutilizarMutation.isPending ? 'Processando...' : 'Inutilizar Numeração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
