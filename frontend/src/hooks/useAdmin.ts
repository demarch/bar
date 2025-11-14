import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ============ TYPES ============
export interface Produto {
  id: number;
  nome: string;
  categoria_id: number;
  categoria_nome?: string;
  preco: string | number;
  tipo: 'produto' | 'servico';
  comissao_percentual: number;
  ativo: boolean;
}

export interface Categoria {
  id: number;
  nome: string;
  ordem: number;
  ativa: boolean;
}

export interface Acompanhante {
  id: number;
  nome: string;
  apelido?: string;
  telefone?: string;
  documento?: string;
  percentual_comissao: number;
  ativa: boolean;
  created_at?: string;
}

export interface Usuario {
  id: number;
  nome: string;
  login: string;
  tipo: 'admin' | 'caixa' | 'atendente';
  ativo: boolean;
  created_at?: string;
}

// ============ HOOKS ============

export const useAdmin = () => {
  const queryClient = useQueryClient();

  // ============ PRODUTOS ============
  const { data: produtos, isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const response = await api.get('/produtos');
      return response.data.data as Produto[];
    },
  });

  const criarProdutoMutation = useMutation({
    mutationFn: async (data: Partial<Produto>) => {
      const response = await api.post('/produtos', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
  });

  const atualizarProdutoMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Produto> & { id: number }) => {
      const response = await api.put(`/produtos/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
  });

  const desativarProdutoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/produtos/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
  });

  // ============ CATEGORIAS ============
  const { data: categorias, isLoading: isLoadingCategorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const response = await api.get('/produtos/categorias');
      return response.data.data as Categoria[];
    },
  });

  const criarCategoriaMutation = useMutation({
    mutationFn: async (data: Partial<Categoria>) => {
      const response = await api.post('/produtos/categorias', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
    },
  });

  const atualizarCategoriaMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Categoria> & { id: number }) => {
      const response = await api.put(`/produtos/categorias/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
    },
  });

  const desativarCategoriaMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/produtos/categorias/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
    },
  });

  // ============ ACOMPANHANTES ============
  const { data: acompanhantes, isLoading: isLoadingAcompanhantes } = useQuery({
    queryKey: ['acompanhantes-all'],
    queryFn: async () => {
      const response = await api.get('/acompanhantes');
      return response.data.data as Acompanhante[];
    },
  });

  const criarAcompanhanteMutation = useMutation({
    mutationFn: async (data: Partial<Acompanhante>) => {
      const response = await api.post('/acompanhantes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-all'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-ativas'] });
    },
  });

  const atualizarAcompanhanteMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Acompanhante> & { id: number }) => {
      const response = await api.put(`/acompanhantes/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-all'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-ativas'] });
    },
  });

  const excluirAcompanhanteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/acompanhantes/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-all'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-ativas'] });
    },
  });

  const ativarAcompanhanteDiaMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/acompanhantes/${id}/ativar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-all'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-ativas'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes', 'ativas'] });
    },
  });

  const desativarAcompanhanteDiaMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/acompanhantes/${id}/desativar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-all'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes-ativas'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes', 'ativas'] });
    },
  });

  // ============ USUÁRIOS ============
  const { data: usuarios, isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const response = await api.get('/usuarios');
      return response.data.data as Usuario[];
    },
  });

  const criarUsuarioMutation = useMutation({
    mutationFn: async (data: Partial<Usuario> & { senha: string }) => {
      const response = await api.post('/usuarios', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const atualizarUsuarioMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Usuario> & { id: number; senha?: string }) => {
      const response = await api.put(`/usuarios/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const desativarUsuarioMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/usuarios/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const ativarUsuarioMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/usuarios/${id}/ativar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  return {
    // Produtos
    produtos,
    isLoadingProdutos,
    criarProduto: criarProdutoMutation.mutateAsync,
    atualizarProduto: atualizarProdutoMutation.mutateAsync,
    desativarProduto: desativarProdutoMutation.mutateAsync,

    // Categorias
    categorias,
    isLoadingCategorias,
    criarCategoria: criarCategoriaMutation.mutateAsync,
    atualizarCategoria: atualizarCategoriaMutation.mutateAsync,
    desativarCategoria: desativarCategoriaMutation.mutateAsync,

    // Acompanhantes
    acompanhantes,
    isLoadingAcompanhantes,
    criarAcompanhante: criarAcompanhanteMutation.mutateAsync,
    atualizarAcompanhante: atualizarAcompanhanteMutation.mutateAsync,
    excluirAcompanhante: excluirAcompanhanteMutation.mutateAsync,
    ativarAcompanhanteDia: ativarAcompanhanteDiaMutation.mutateAsync,
    desativarAcompanhanteDia: desativarAcompanhanteDiaMutation.mutateAsync,

    // Usuários
    usuarios,
    isLoadingUsuarios,
    criarUsuario: criarUsuarioMutation.mutateAsync,
    atualizarUsuario: atualizarUsuarioMutation.mutateAsync,
    desativarUsuario: desativarUsuarioMutation.mutateAsync,
    ativarUsuario: ativarUsuarioMutation.mutateAsync,
  };
};
