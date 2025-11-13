import { Request, Response } from 'express';
import QuartoService from '../services/QuartoService';
import { asyncHandler } from '../middlewares/errorHandler';
import { IniciarOcupacaoQuartoDTO, FinalizarOcupacaoQuartoDTO } from '../types';

class QuartoController {
  iniciarOcupacao = asyncHandler(async (req: Request, res: Response) => {
    const data: IniciarOcupacaoQuartoDTO = req.body;
    const ocupacao = await QuartoService.iniciarOcupacao(data, req.user!.id);
    res.status(201).json(ocupacao);
  });

  finalizarOcupacao = asyncHandler(async (req: Request, res: Response) => {
    const data: FinalizarOcupacaoQuartoDTO = req.body;
    const ocupacao = await QuartoService.finalizarOcupacao(data, req.user!.id);
    res.json(ocupacao);
  });

  listarOcupados = asyncHandler(async (req: Request, res: Response) => {
    const ocupacoes = await QuartoService.listarOcupados();
    res.json(ocupacoes);
  });

  buscarPorComanda = asyncHandler(async (req: Request, res: Response) => {
    const { comandaId } = req.params;
    const ocupacoes = await QuartoService.buscarPorComanda(Number(comandaId));
    res.json(ocupacoes);
  });

  verificarDisponibilidade = asyncHandler(async (req: Request, res: Response) => {
    const { numeroQuarto } = req.params;
    const disponivel = await QuartoService.verificarDisponibilidade(Number(numeroQuarto));
    res.json({ disponivel });
  });
}

export default new QuartoController();
