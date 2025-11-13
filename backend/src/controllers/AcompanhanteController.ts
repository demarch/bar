import { Request, Response } from 'express';
import Acompanhante from '../models/Acompanhante';
import { asyncHandler } from '../middlewares/errorHandler';

class AcompanhanteController {
  criar = asyncHandler(async (req: Request, res: Response) => {
    const acompanhante = await Acompanhante.create(req.body);
    res.status(201).json(acompanhante);
  });

  listar = asyncHandler(async (req: Request, res: Response) => {
    const { ativas } = req.query;
    const where: any = {};

    if (ativas === 'true') {
      where.ativaHoje = true;
    }

    const acompanhantes = await Acompanhante.findAll({
      where,
      order: [['nome', 'ASC']]
    });

    res.json(acompanhantes);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const acompanhante = await Acompanhante.findByPk(id);

    if (!acompanhante) {
      res.status(404).json({ error: 'Acompanhante não encontrada' });
      return;
    }

    res.json(acompanhante);
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const acompanhante = await Acompanhante.findByPk(id);

    if (!acompanhante) {
      res.status(404).json({ error: 'Acompanhante não encontrada' });
      return;
    }

    await acompanhante.update(req.body);
    res.json(acompanhante);
  });

  ativar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const acompanhante = await Acompanhante.findByPk(id);

    if (!acompanhante) {
      res.status(404).json({ error: 'Acompanhante não encontrada' });
      return;
    }

    acompanhante.ativaHoje = true;
    await acompanhante.save();
    res.json(acompanhante);
  });

  desativar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const acompanhante = await Acompanhante.findByPk(id);

    if (!acompanhante) {
      res.status(404).json({ error: 'Acompanhante não encontrada' });
      return;
    }

    acompanhante.ativaHoje = false;
    await acompanhante.save();
    res.json(acompanhante);
  });

  deletar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const acompanhante = await Acompanhante.findByPk(id);

    if (!acompanhante) {
      res.status(404).json({ error: 'Acompanhante não encontrada' });
      return;
    }

    await acompanhante.destroy();
    res.status(204).send();
  });
}

export default new AcompanhanteController();
