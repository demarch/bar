import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Acompanhante, ApiResponse } from '../types';

export const useAcompanhantes = () => {
  const { data: acompanhantes, isLoading, error } = useQuery({
    queryKey: ['acompanhantes'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Acompanhante[]>>('/acompanhantes');
      return response.data.data || [];
    },
  });

  return { acompanhantes, isLoading, error };
};

export const useAcompanhantesAtivas = () => {
  const { data: acompanhantesAtivas, isLoading, error } = useQuery({
    queryKey: ['acompanhantes', 'ativas'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Acompanhante[]>>('/acompanhantes/ativas');
      return response.data.data || [];
    },
  });

  return { acompanhantesAtivas, isLoading, error };
};
