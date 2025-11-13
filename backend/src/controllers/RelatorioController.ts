import { Request, Response } from 'express';
import RelatorioService from '../services/RelatorioService';
import { asyncHandler } from '../middlewares/errorHandler';

class RelatorioController {
  vendas = asyncHandler(async (req: Request, res: Response) => {
    const { movimentoCaixaId, dataInicio, dataFim } = req.query;

    const relatorio = await RelatorioService.gerarRelatorioVendas(
      Number(movimentoCaixaId),
      dataInicio ? new Date(dataInicio as string) : undefined,
      dataFim ? new Date(dataFim as string) : undefined
    );

    res.json(relatorio);
  });

  comissoes = asyncHandler(async (req: Request, res: Response) => {
    const { movimentoCaixaId, dataInicio, dataFim } = req.query;

    const relatorio = await RelatorioService.gerarRelatorioComissoes(
      movimentoCaixaId ? Number(movimentoCaixaId) : undefined,
      dataInicio ? new Date(dataInicio as string) : undefined,
      dataFim ? new Date(dataFim as string) : undefined
    );

    res.json(relatorio);
  });

  fluxoCaixa = asyncHandler(async (req: Request, res: Response) => {
    const { movimentoCaixaId } = req.query;

    if (!movimentoCaixaId) {
      res.status(400).json({ error: 'movimentoCaixaId é obrigatório' });
      return;
    }

    const relatorio = await RelatorioService.gerarRelatorioFluxoCaixa(Number(movimentoCaixaId));
    res.json(relatorio);
  });

  dashboard = asyncHandler(async (req: Request, res: Response) => {
    const { movimentoCaixaId } = req.query;

    if (!movimentoCaixaId) {
      res.status(400).json({ error: 'movimentoCaixaId é obrigatório' });
      return;
    }

    const dashboard = await RelatorioService.buscarDashboard(Number(movimentoCaixaId));
    res.json(dashboard);
  });
}

export default new RelatorioController();
