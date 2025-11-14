import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Quarto {
  id: number;
  numero: string;
  descricao?: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface CreateQuartoDTO {
  numero: string;
  descricao?: string;
  ordem?: number;
}

export interface UpdateQuartoDTO {
  numero?: string;
  descricao?: string;
  ativo?: boolean;
  ordem?: number;
}

export const useQuartosAdmin = () => {
  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuartos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/quartos');
      setQuartos(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar quartos');
      console.error('Erro ao carregar quartos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const criarQuarto = async (data: CreateQuartoDTO): Promise<Quarto> => {
    try {
      const response = await api.post('/admin/quartos', data);
      await fetchQuartos();
      return response.data.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao criar quarto');
    }
  };

  const atualizarQuarto = async (id: number, data: UpdateQuartoDTO): Promise<Quarto> => {
    try {
      const response = await api.put(`/admin/quartos/${id}`, data);
      await fetchQuartos();
      return response.data.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao atualizar quarto');
    }
  };

  const deletarQuarto = async (id: number): Promise<void> => {
    try {
      await api.delete(`/admin/quartos/${id}`);
      await fetchQuartos();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao deletar quarto');
    }
  };

  const toggleAtivoQuarto = async (id: number, ativo: boolean): Promise<void> => {
    try {
      await api.put(`/admin/quartos/${id}`, { ativo });
      await fetchQuartos();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao alterar status do quarto');
    }
  };

  useEffect(() => {
    fetchQuartos();
  }, [fetchQuartos]);

  return {
    quartos,
    loading,
    error,
    fetchQuartos,
    criarQuarto,
    atualizarQuarto,
    deletarQuarto,
    toggleAtivoQuarto,
  };
};
