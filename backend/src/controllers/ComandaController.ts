import { Request, Response } from 'express';
import ComandaService from '../services/ComandaService';
import { asyncHandler } from '../middlewares/errorHandler';
import { CriarComandaDTO, LancarItemDTO, FecharComandaDTO } from '../types';

class ComandaController {
  criar = asyncHandler(async (req: Request, res: Response) => {
    const data: CriarComandaDTO = req.body;
    const comanda = await ComandaService.criar(data, req.user!.id);
    res.status(201).json(comanda);
  });

  lancarItem = asyncHandler(async (req: Request, res: Response) => {
    const data: LancarItemDTO = req.body;
    const item = await ComandaService.lancarItem(data, req.user!.id);
    res.status(201).json(item);
  });

  fechar = asyncHandler(async (req: Request, res: Response) => {
    const data: FecharComandaDTO = req.body;
    const comanda = await ComandaService.fechar(data, req.user!.id);
    res.json(comanda);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const comanda = await ComandaService.buscarPorId(Number(id));

    if (!comanda) {
      res.status(404).json({ error: 'Comanda não encontrada' });
      return;
    }

    res.json(comanda);
  });

  buscarPorNumero = asyncHandler(async (req: Request, res: Response) => {
    const { numero, movimentoCaixaId } = req.query;
    const comanda = await ComandaService.buscarPorNumero(
      Number(numero),
      Number(movimentoCaixaId)
    );

    if (!comanda) {
      res.status(404).json({ error: 'Comanda não encontrada' });
      return;
    }

    res.json(comanda);
  });

  listarAbertas = asyncHandler(async (req: Request, res: Response) => {
    const { movimentoCaixaId } = req.query;
    const comandas = await ComandaService.listarAbertas(
      movimentoCaixaId ? Number(movimentoCaixaId) : undefined
    );
    res.json(comandas);
  });

  removerItem = asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    await ComandaService.removerItem(Number(itemId), req.user!.id);
    res.status(204).send();
  });
}

export default new ComandaController();
