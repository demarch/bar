import { Request, Response } from 'express';
import ConfiguracaoQuarto from '../models/ConfiguracaoQuarto';
import { asyncHandler } from '../middlewares/errorHandler';

class ConfiguracaoController {
  listarConfiguracoesQuartos = asyncHandler(async (req: Request, res: Response) => {
    const configuracoes = await ConfiguracaoQuarto.findAll({
      order: [['minutos', 'ASC']]
    });
    res.json(configuracoes);
  });

  criarConfiguracaoQuarto = asyncHandler(async (req: Request, res: Response) => {
    const configuracao = await ConfiguracaoQuarto.create(req.body);
    res.status(201).json(configuracao);
  });

  atualizarConfiguracaoQuarto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const configuracao = await ConfiguracaoQuarto.findByPk(id);

    if (!configuracao) {
      res.status(404).json({ error: 'Configuração não encontrada' });
      return;
    }

    await configuracao.update(req.body);
    res.json(configuracao);
  });

  deletarConfiguracaoQuarto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const configuracao = await ConfiguracaoQuarto.findByPk(id);

    if (!configuracao) {
      res.status(404).json({ error: 'Configuração não encontrada' });
      return;
    }

    await configuracao.destroy();
    res.status(204).send();
  });
}

export default new ConfiguracaoController();
