import React, { useState, useEffect } from 'react';
import { useAdmin, Usuario } from '../../hooks/useAdmin';

interface UsuarioModalProps {
  usuario: Usuario | null;
  onClose: () => void;
}

export const UsuarioModal: React.FC<UsuarioModalProps> = ({ usuario, onClose }) => {
  const { criarUsuario, atualizarUsuario } = useAdmin();

  const [formData, setFormData] = useState({
    nome: '',
    login: '',
    senha: '',
    confirmarSenha: '',
    tipo: 'atendente' as 'admin' | 'caixa' | 'atendente',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome,
        login: usuario.login,
        senha: '',
        confirmarSenha: '',
        tipo: usuario.tipo,
      });
    }
  }, [usuario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nome || !formData.login || !formData.tipo) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar senha apenas se estiver criando OU se senha foi preenchida na edição
    if (!usuario || formData.senha) {
      if (!formData.senha) {
        setError('Senha é obrigatória');
        return;
      }

      if (formData.senha.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres');
        return;
      }

      if (formData.senha !== formData.confirmarSenha) {
        setError('As senhas não coincidem');
        return;
      }
    }

    try {
      setLoading(true);

      const data: any = {
        nome: formData.nome.trim(),
        login: formData.login.trim(),
        tipo: formData.tipo,
      };

      // Adicionar senha apenas se foi preenchida
      if (formData.senha) {
        data.senha = formData.senha;
      }

      if (usuario) {
        await atualizarUsuario({ id: usuario.id, ...data });
      } else {
        await criarUsuario(data);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário');
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
              {usuario ? 'Editar Usuário' : 'Novo Usuário'}
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
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="input"
                  placeholder="Ex: João Silva"
                  required
                  autoFocus
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              {/* Login */}
              <div>
                <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                  Login *
                </label>
                <input
                  type="text"
                  id="login"
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  className="input"
                  placeholder="Ex: joao.silva"
                  required
                  disabled={loading}
                  maxLength={50}
                />
              </div>

              {/* Tipo */}
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Usuário *
                </label>
                <select
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="input"
                  required
                  disabled={loading}
                >
                  <option value="atendente">Atendente</option>
                  <option value="caixa">Caixa</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tipo === 'admin' && 'Acesso total ao sistema'}
                  {formData.tipo === 'caixa' && 'Acesso a PDV e Caixa'}
                  {formData.tipo === 'atendente' && 'Acesso apenas ao PDV'}
                </p>
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha {usuario ? '(deixe em branco para manter)' : '*'}
                </label>
                <input
                  type="password"
                  id="senha"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="input"
                  placeholder="Mínimo 6 caracteres"
                  required={!usuario}
                  disabled={loading}
                  minLength={6}
                />
              </div>

              {/* Confirmar Senha */}
              {(!usuario || formData.senha) && (
                <div>
                  <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    id="confirmarSenha"
                    value={formData.confirmarSenha}
                    onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                    className="input"
                    placeholder="Repita a senha"
                    required={!usuario || !!formData.senha}
                    disabled={loading}
                  />
                </div>
              )}
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
                ) : usuario ? (
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
