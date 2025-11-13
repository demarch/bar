import { Request, Response } from 'express';
import Produto from '../models/Produto';
import { asyncHandler } from '../middlewares/errorHandler';

class ProdutoController {
  criar = asyncHandler(async (req: Request, res: Response) => {
    const produto = await Produto.create(req.body);
    res.status(201).json(produto);
  });

  listar = asyncHandler(async (req: Request, res: Response) => {
    const { categoria, tipo, ativo } = req.query;
    const where: any = {};

    if (categoria) {
      where.categoria = categoria;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    const produtos = await Produto.findAll({
      where,
      order: [['categoria', 'ASC'], ['nome', 'ASC']]
    });

    res.json(produtos);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);

    if (!produto) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }

    res.json(produto);
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);

    if (!produto) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }

    await produto.update(req.body);
    res.json(produto);
  });

  deletar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);

    if (!produto) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }

    await produto.destroy();
    res.status(204).send();
  });

  categorias = asyncHandler(async (req: Request, res: Response) => {
    const result = await Produto.findAll({
      attributes: [
        [Produto.sequelize!.fn('DISTINCT', Produto.sequelize!.col('categoria')), 'categoria']
      ],
      raw: true
    });

    const categorias = result.map((r: any) => r.categoria);
    res.json(categorias);
  });
}

export default new ProdutoController();
