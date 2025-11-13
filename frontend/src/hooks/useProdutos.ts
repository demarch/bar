import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Produto, Categoria, ApiResponse } from '../types';

export const useProdutos = (categoria_id?: number, tipo?: string) => {
  const { data: produtos, isLoading, error } = useQuery({
    queryKey: ['produtos', categoria_id, tipo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoria_id) params.append('categoria_id', categoria_id.toString());
      if (tipo) params.append('tipo', tipo);

      const response = await api.get<ApiResponse<Produto[]>>(`/produtos?${params}`);
      return response.data.data || [];
    },
  });

  return { produtos, isLoading, error };
};

export const useCategorias = () => {
  const { data: categorias, isLoading, error } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Categoria[]>>('/produtos/categorias');
      return response.data.data || [];
    },
  });

  return { categorias, isLoading, error };
};
