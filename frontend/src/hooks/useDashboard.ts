import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface DashboardStats {
  vendas_mes: number;
  comandas_abertas: number;
  comissoes_pendentes: number;
  quartos_ocupados: number;
  ticket_medio: number;
  produtos_mais_vendidos: Array<{
    nome: string;
    quantidade: number;
    total: number;
  }>;
  vendas_por_dia: Array<{
    data: string;
    total: number;
  }>;
}

export const useDashboard = () => {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data.data as DashboardStats;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
