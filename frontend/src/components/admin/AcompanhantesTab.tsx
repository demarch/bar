import React, { useState } from 'react';
import { useAdmin, Acompanhante } from '../../hooks/useAdmin';
import { useAcompanhantesAtivas } from '../../hooks/useAcompanhantes';
import { AcompanhanteModal } from './AcompanhanteModal';

export const AcompanhantesTab: React.FC = () => {
  const { acompanhantes, isLoadingAcompanhantes, ativarAcompanhanteDia, desativarAcompanhanteDia } = useAdmin();
  const { acompanhantesAtivas } = useAcompanhantesAtivas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAcompanhante, setEditingAcompanhante] = useState<Acompanhante | null>(null);

  const handleEdit = (acompanhante: Acompanhante) => {
    setEditingAcompanhante(acompanhante);
    setIsModalOpen(true);
  };

  const handleToggleDiaAtiva = async (acompanhante: Acompanhante) => {
    const isAtiva = isAtivaHoje(acompanhante.id);

    try {
      if (isAtiva) {
        await desativarAcompanhanteDia(acompanhante.id);
      } else {
        await ativarAcompanhanteDia(acompanhante.id);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao alterar status do dia');
    }
  };

  const isAtivaHoje = (id: number) => {
    return acompanhantesAtivas?.some(a => a.id === id) || false;
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAcompanhante(null);
  };

  if (isLoadingAcompanhantes) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Acompanhantes</h2>
          <p className="text-gray-600 mt-1">Gerencie cadastro e ativação diária de acompanhantes</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Acompanhante
        </button>
      </div>

      {/* Informações sobre ativação diária */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Ativação Diária:</p>
            <p>Use o toggle "Hoje" para marcar as acompanhantes que estão trabalhando hoje. Apenas acompanhantes ativas no dia aparecem no sistema de quartos e PDV.</p>
          </div>
        </div>
      </div>

      {!acompanhantes || acompanhantes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-600 text-lg">Nenhuma acompanhante cadastrada</p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary mt-4">
            Cadastrar Primeira Acompanhante
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apelido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comissão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ativa Hoje</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {acompanhantes.map((acompanhante) => {
                const ativaHoje = isAtivaHoje(acompanhante.id);

                return (
                  <tr key={acompanhante.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{acompanhante.nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{acompanhante.apelido || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{acompanhante.telefone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{acompanhante.percentual_comissao}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          acompanhante.ativa
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {acompanhante.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleDiaAtiva(acompanhante)}
                        disabled={!acompanhante.ativa}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          !acompanhante.ativa
                            ? 'bg-gray-200 cursor-not-allowed'
                            : ativaHoje
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                        title={!acompanhante.ativa ? 'Acompanhante inativa' : ativaHoje ? 'Clique para desativar hoje' : 'Clique para ativar hoje'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            ativaHoje ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(acompanhante)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <AcompanhanteModal
          acompanhante={editingAcompanhante}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
