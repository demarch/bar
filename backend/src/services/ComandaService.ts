import { Transaction } from 'sequelize';
import sequelize from '../config/database';
import Comanda from '../models/Comanda';
import ItemComanda from '../models/ItemComanda';
import Produto from '../models/Produto';
import Acompanhante from '../models/Acompanhante';
import MovimentoCaixa from '../models/MovimentoCaixa';
import OcupacaoQuarto from '../models/OcupacaoQuarto';
import {
  CriarComandaDTO,
  LancarItemDTO,
  FecharComandaDTO,
  StatusComanda,
  StatusCaixa,
  TipoItem,
  TipoProduto,
  StatusQuarto
} from '../types';
import { AppError } from '../middlewares/errorHandler';
import { logFinancial } from '../config/logger';

class ComandaService {
  async criar(data: CriarComandaDTO, usuarioId: number): Promise<Comanda> {
    // Verificar se movimento de caixa está aberto
    const movimentoCaixa = await MovimentoCaixa.findByPk(data.movimentoCaixaId);
    if (!movimentoCaixa || movimentoCaixa.status !== StatusCaixa.ABERTO) {
      throw new AppError('Caixa não está aberto', 400);
    }

    // Verificar se número já existe neste movimento de caixa
    const comandaExistente = await Comanda.findOne({
      where: {
        numero: data.numero,
        movimentoCaixaId: data.movimentoCaixaId
      }
    });

    if (comandaExistente) {
      throw new AppError('Número de comanda já existe', 409);
    }

    const comanda = await Comanda.create({
      numero: data.numero,
      movimentoCaixaId: data.movimentoCaixaId,
      clienteNome: data.clienteNome,
      total: 0,
      status: StatusComanda.ABERTA
    });

    logFinancial('COMANDA_CRIADA', { comandaId: comanda.id, numero: comanda.numero }, usuarioId);

    return comanda;
  }

  async lancarItem(data: LancarItemDTO, usuarioId: number): Promise<ItemComanda> {
    return await sequelize.transaction(async (transaction: Transaction) => {
      // Buscar comanda
      const comanda = await Comanda.findByPk(data.comandaId, { transaction });
      if (!comanda) {
        throw new AppError('Comanda não encontrada', 404);
      }

      if (comanda.status !== StatusComanda.ABERTA) {
        throw new AppError('Comanda não está aberta', 400);
      }

      // Buscar produto
      const produto = await Produto.findByPk(data.produtoId, { transaction });
      if (!produto || !produto.ativo) {
        throw new AppError('Produto não encontrado ou inativo', 404);
      }

      // Determinar tipo de item e calcular valores
      let tipoItem = TipoItem.NORMAL;
      let valorComissao: number | undefined;
      let acompanhanteId: number | undefined;

      // Se produto é comissionado e tem acompanhante
      if (produto.tipo === TipoProduto.COMISSIONADO && data.acompanhanteId) {
        // Verificar se acompanhante existe e está ativa
        const acompanhante = await Acompanhante.findByPk(data.acompanhanteId, { transaction });
        if (!acompanhante) {
          throw new AppError('Acompanhante não encontrada', 404);
        }
        if (!acompanhante.ativaHoje) {
          throw new AppError('Acompanhante não está ativa hoje', 400);
        }

        tipoItem = TipoItem.COMISSIONADO;
        acompanhanteId = data.acompanhanteId;

        // Calcular comissão
        const percentualComissao = produto.comissaoPercentual || acompanhante.percentualComissao;
        const valorTotalItem = produto.preco * data.quantidade;
        valorComissao = (valorTotalItem * percentualComissao) / 100;
      }

      // Criar item
      const valorUnitario = produto.preco;
      const valorTotal = valorUnitario * data.quantidade;

      const item = await ItemComanda.create(
        {
          comandaId: data.comandaId,
          produtoId: data.produtoId,
          acompanhanteId,
          quantidade: data.quantidade,
          valorUnitario,
          valorTotal,
          valorComissao,
          tipoItem
        },
        { transaction }
      );

      // Atualizar total da comanda
      comanda.total = Number(comanda.total) + valorTotal;
      await comanda.save({ transaction });

      logFinancial(
        'ITEM_LANCADO',
        {
          comandaId: comanda.id,
          itemId: item.id,
          produtoId: produto.id,
          valor: valorTotal,
          comissao: valorComissao
        },
        usuarioId
      );

      return item;
    });
  }

  async fechar(data: FecharComandaDTO, usuarioId: number): Promise<Comanda> {
    return await sequelize.transaction(async (transaction: Transaction) => {
      const comanda = await Comanda.findByPk(data.comandaId, {
        include: [{ model: OcupacaoQuarto, as: 'quartos' }],
        transaction
      });

      if (!comanda) {
        throw new AppError('Comanda não encontrada', 404);
      }

      if (comanda.status !== StatusComanda.ABERTA) {
        throw new AppError('Comanda já está fechada', 400);
      }

      // Verificar se há quartos ocupados
      const quartosOcupados = await OcupacaoQuarto.findOne({
        where: {
          comandaId: data.comandaId,
          status: StatusQuarto.OCUPADO
        },
        transaction
      });

      if (quartosOcupados) {
        throw new AppError('Não é possível fechar comanda com quartos ocupados', 400);
      }

      // Fechar comanda
      comanda.status = StatusComanda.FECHADA;
      comanda.dataFechamento = new Date();
      comanda.formaPagamento = data.formaPagamento;
      await comanda.save({ transaction });

      logFinancial(
        'COMANDA_FECHADA',
        {
          comandaId: comanda.id,
          total: comanda.total,
          formaPagamento: data.formaPagamento
        },
        usuarioId
      );

      return comanda;
    });
  }

  async buscarPorId(id: number): Promise<Comanda | null> {
    return await Comanda.findByPk(id, {
      include: [
        {
          model: ItemComanda,
          as: 'itens',
          include: [
            { model: Produto, as: 'produto' },
            { model: Acompanhante, as: 'acompanhante' }
          ]
        },
        {
          model: OcupacaoQuarto,
          as: 'quartos',
          include: [{ model: Acompanhante, as: 'acompanhante' }]
        }
      ]
    });
  }

  async listarAbertas(movimentoCaixaId?: number): Promise<Comanda[]> {
    const where: any = { status: StatusComanda.ABERTA };
    if (movimentoCaixaId) {
      where.movimentoCaixaId = movimentoCaixaId;
    }

    return await Comanda.findAll({
      where,
      include: [
        {
          model: ItemComanda,
          as: 'itens',
          include: [{ model: Produto, as: 'produto' }]
        }
      ],
      order: [['numero', 'ASC']]
    });
  }

  async buscarPorNumero(numero: number, movimentoCaixaId: number): Promise<Comanda | null> {
    return await Comanda.findOne({
      where: { numero, movimentoCaixaId },
      include: [
        {
          model: ItemComanda,
          as: 'itens',
          include: [
            { model: Produto, as: 'produto' },
            { model: Acompanhante, as: 'acompanhante' }
          ]
        }
      ]
    });
  }

  async removerItem(itemId: number, usuarioId: number): Promise<void> {
    return await sequelize.transaction(async (transaction: Transaction) => {
      const item = await ItemComanda.findByPk(itemId, { transaction });
      if (!item) {
        throw new AppError('Item não encontrado', 404);
      }

      const comanda = await Comanda.findByPk(item.comandaId, { transaction });
      if (!comanda) {
        throw new AppError('Comanda não encontrada', 404);
      }

      if (comanda.status !== StatusComanda.ABERTA) {
        throw new AppError('Não é possível remover item de comanda fechada', 400);
      }

      // Atualizar total da comanda
      comanda.total = Number(comanda.total) - Number(item.valorTotal);
      await comanda.save({ transaction });

      // Remover item
      await item.destroy({ transaction });

      logFinancial(
        'ITEM_REMOVIDO',
        { comandaId: comanda.id, itemId: item.id, valor: item.valorTotal },
        usuarioId
      );
    });
  }
}

export default new ComandaService();
