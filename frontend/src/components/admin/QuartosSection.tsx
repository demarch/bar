import React, { useState } from 'react';
import { useQuartosAdmin, type Quarto, type CreateQuartoDTO } from '../../hooks/useQuartosAdmin';

export const QuartosSection: React.FC = () => {
  const { quartos, loading, criarQuarto, atualizarQuarto, deletarQuarto, toggleAtivoQuarto } = useQuartosAdmin();
  const [showModal, setShowModal] = useState(false);
  const [editingQuarto, setEditingQuarto] = useState<Quarto | null>(null);
  const [formData, setFormData] = useState<CreateQuartoDTO>({
    numero: '',
    descricao: '',
    ordem: 0,
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenModal = (quarto?: Quarto) => {
    if (quarto) {
      setEditingQuarto(quarto);
      setFormData({
        numero: quarto.numero,
        descricao: quarto.descricao || '',
        ordem: quarto.ordem,
      });
    } else {
      setEditingQuarto(null);
      setFormData({
        numero: '',
        descricao: '',
        ordem: quartos.length,
      });
    }
    setShowModal(true);
    setErrorMessage(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQuarto(null);
    setFormData({ numero: '', descricao: '', ordem: 0 });
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      if (editingQuarto) {
        await atualizarQuarto(editingQuarto.id, formData);
      } else {
        await criarQuarto(formData);
      }
      handleCloseModal();
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este quarto?')) {
      return;
    }

    try {
      await deletarQuarto(id);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleToggleAtivo = async (quarto: Quarto) => {
    try {
      await toggleAtivoQuarto(quarto.id, !quarto.ativo);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-2 text-gray-600">Carregando quartos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-xl font-bold text-gray-800">Quartos Disponíveis</h3>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Quarto
        </button>
      </div>

      {quartos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum quarto cadastrado</p>
          <p className="text-sm mt-2">Clique em "Novo Quarto" para adicionar</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Número</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Descrição</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quartos.map((quarto) => (
                <tr key={quarto.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-primary-600">{quarto.numero}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{quarto.descricao || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {quarto.ativo ? (
                      <span className="badge-success">Ativo</span>
                    ) : (
                      <span className="badge-danger">Inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(quarto)}
                        className="btn-sm btn-secondary"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(quarto)}
                        className={`btn-sm ${quarto.ativo ? 'btn-warning' : 'btn-success'}`}
                        title={quarto.ativo ? 'Desativar' : 'Ativar'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {quarto.ativo ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(quarto.id)}
                        className="btn-sm btn-danger"
                        title="Excluir"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar/Editar Quarto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                {editingQuarto ? 'Editar Quarto' : 'Novo Quarto'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Quarto *
                  </label>
                  <input
                    type="text"
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="input-field"
                    placeholder="Ex: 101, VIP1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pode conter letras e números (ex: 101, 102, VIP1)
                  </p>
                </div>

                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="input-field"
                    placeholder="Ex: Quarto Standard, Suíte VIP"
                  />
                </div>

                <div>
                  <label htmlFor="ordem" className="block text-sm font-medium text-gray-700 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    id="ordem"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) })}
                    className="input-field"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ordem em que o quarto aparecerá na lista
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : (editingQuarto ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
