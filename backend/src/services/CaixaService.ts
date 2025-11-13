import { Transaction, Op } from 'sequelize';
import sequelize from '../config/database';
import MovimentoCaixa from '../models/MovimentoCaixa';
import LancamentoCaixa from '../models/LancamentoCaixa';
import Comanda from '../models/Comanda';
import Usuario from '../models/Usuario';
import {
  AbrirCaixaDTO,
  FecharCaixaDTO,
  SangriaDTO,
  StatusCaixa,
  TipoLancamentoCaixa,
  CategoriaLancamento,
  StatusComanda
} from '../types';
import { AppError } from '../middlewares/errorHandler';
import { logFinancial } from '../config/logger';

class CaixaService {
  async abrir(data: AbrirCaixaDTO, usuarioId: number): Promise<MovimentoCaixa> {
    return await sequelize.transaction(async (transaction: Transaction) => {
      // Verificar se já existe caixa aberto para este usuário
      const caixaAberto = await MovimentoCaixa.findOne({
        where: {
          usuarioId,
          status: StatusCaixa.ABERTO
        },
        transaction
      });

      if (caixaAberto) {
        throw new AppError('Já existe um caixa aberto para este usuário', 409);
      }

      // Criar movimento de caixa
      const movimento = await MovimentoCaixa.create(
        {
          usuarioId,
          dataAbertura: new Date(),
          valorAbertura: data.valorAbertura,
          status: StatusCaixa.ABERTO
        },
        { transaction }
      );

      logFinancial(
        'CAIXA_ABERTO',
        { movimentoId: movimento.id, valorAbertura: data.valorAbertura },
        usuarioId
      );

      return movimento;
    });
  }

  async fechar(data: FecharCaixaDTO, usuarioId: number): Promise<MovimentoCaixa> {
    return await sequelize.transaction(async (transaction: Transaction) => {
      // Buscar movimento de caixa
      const movimento = await MovimentoCaixa.findByPk(data.movimentoCaixaId, {
        include: [{ model: LancamentoCaixa, as: 'lancamentos' }],
        transaction
      });

      if (!movimento) {
        throw new AppError('Movimento de caixa não encontrado', 404);
      }

      if (movimento.status !== StatusCaixa.ABERTO) {
        throw new AppError('Caixa já está fechado', 400);
      }

      // Verificar se há comandas abertas
      const comandasAbertas = await Comanda.count({
        where: {
          movimentoCaixaId: data.movimentoCaixaId,
          status: StatusComanda.ABERTA
        },
        transaction
      });

      if (comandasAbertas > 0) {
        throw new AppError(
          `Existem ${comandasAbertas} comanda(s) aberta(s). Feche todas antes de fechar o caixa.`,
          400
        );
      }

      // Calcular total de vendas
      const comandas = await Comanda.findAll({
        where: {
          movimentoCaixaId: data.movimentoCaixaId,
          status: StatusComanda.FECHADA
        },
        transaction
      });

      const totalVendas = comandas.reduce((sum, c) => sum + Number(c.total), 0);

      // Calcular total de saídas (sangrias)
      const lancamentos = movimento.lancamentos || [];
      const totalSaidas = lancamentos
        .filter(l => l.tipo === TipoLancamentoCaixa.SAIDA)
        .reduce((sum, l) => sum + Number(l.valor), 0);

      // Valor esperado no caixa
      const valorFechamento = Number(movimento.valorAbertura) + totalVendas - totalSaidas;

      // Fechar caixa
      movimento.dataFechamento = new Date();
      movimento.valorFechamento = valorFechamento;
      movimento.status = StatusCaixa.FECHADO;
      await movimento.save({ transaction });

      logFinancial(
        'CAIXA_FECHADO',
        {
          movimentoId: movimento.id,
          valorAbertura: movimento.valorAbertura,
          valorFechamento,
          totalVendas,
          totalSaidas
        },
        usuarioId
      );

      return movimento;
    });
  }

  async registrarSangria(data: SangriaDTO, usuarioId: number): Promise<LancamentoCaixa> {
    return await sequelize.transaction(async (transaction: Transaction) => {
      // Verificar se caixa está aberto
      const movimento = await MovimentoCaixa.findByPk(data.movimentoCaixaId, { transaction });
      if (!movimento || movimento.status !== StatusCaixa.ABERTO) {
        throw new AppError('Caixa não está aberto', 400);
      }

      // Criar lançamento
      const lancamento = await LancamentoCaixa.create(
        {
          movimentoCaixaId: data.movimentoCaixaId,
          tipo: TipoLancamentoCaixa.SAIDA,
          categoria: CategoriaLancamento.SANGRIA,
          valor: data.valor,
          descricao: data.descricao
        },
        { transaction }
      );

      logFinancial(
        'SANGRIA_REGISTRADA',
        { movimentoId: data.movimentoCaixaId, valor: data.valor, descricao: data.descricao },
        usuarioId
      );

      return lancamento;
    });
  }

  async buscarCaixaAberto(usuarioId?: number): Promise<MovimentoCaixa | null> {
    const where: any = { status: StatusCaixa.ABERTO };
    if (usuarioId) {
      where.usuarioId = usuarioId;
    }

    return await MovimentoCaixa.findOne({
      where,
      include: [
        { model: Usuario, as: 'usuario' },
        { model: LancamentoCaixa, as: 'lancamentos' }
      ],
      order: [['dataAbertura', 'DESC']]
    });
  }

  async buscarPorId(id: number): Promise<MovimentoCaixa | null> {
    return await MovimentoCaixa.findByPk(id, {
      include: [
        { model: Usuario, as: 'usuario' },
        { model: LancamentoCaixa, as: 'lancamentos' }
      ]
    });
  }

  async listarMovimentos(dataInicio?: Date, dataFim?: Date): Promise<MovimentoCaixa[]> {
    const where: any = {};

    if (dataInicio || dataFim) {
      where.dataAbertura = {};
      if (dataInicio) {
        where.dataAbertura[Op.gte] = dataInicio;
      }
      if (dataFim) {
        where.dataAbertura[Op.lte] = dataFim;
      }
    }

    return await MovimentoCaixa.findAll({
      where,
      include: [
        { model: Usuario, as: 'usuario' },
        { model: LancamentoCaixa, as: 'lancamentos' }
      ],
      order: [['dataAbertura', 'DESC']]
    });
  }
}

export default new CaixaService();
