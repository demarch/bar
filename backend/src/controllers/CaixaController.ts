import { Request, Response } from 'express';
import CaixaService from '../services/CaixaService';
import { asyncHandler } from '../middlewares/errorHandler';
import { AbrirCaixaDTO, FecharCaixaDTO, SangriaDTO } from '../types';

class CaixaController {
  abrir = asyncHandler(async (req: Request, res: Response) => {
    const data: AbrirCaixaDTO = req.body;
    const movimento = await CaixaService.abrir(data, req.user!.id);
    res.status(201).json(movimento);
  });

  fechar = asyncHandler(async (req: Request, res: Response) => {
    const data: FecharCaixaDTO = req.body;
    const movimento = await CaixaService.fechar(data, req.user!.id);
    res.json(movimento);
  });

  registrarSangria = asyncHandler(async (req: Request, res: Response) => {
    const data: SangriaDTO = req.body;
    const lancamento = await CaixaService.registrarSangria(data, req.user!.id);
    res.status(201).json(lancamento);
  });

  buscarCaixaAberto = asyncHandler(async (req: Request, res: Response) => {
    const { usuarioId } = req.query;
    const movimento = await CaixaService.buscarCaixaAberto(
      usuarioId ? Number(usuarioId) : undefined
    );

    if (!movimento) {
      res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
      return;
    }

    res.json(movimento);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const movimento = await CaixaService.buscarPorId(Number(id));

    if (!movimento) {
      res.status(404).json({ error: 'Movimento de caixa não encontrado' });
      return;
    }

    res.json(movimento);
  });

  listarMovimentos = asyncHandler(async (req: Request, res: Response) => {
    const { dataInicio, dataFim } = req.query;
    const movimentos = await CaixaService.listarMovimentos(
      dataInicio ? new Date(dataInicio as string) : undefined,
      dataFim ? new Date(dataFim as string) : undefined
    );
    res.json(movimentos);
  });
}

export default new CaixaController();
