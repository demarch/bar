import { Transaction } from 'sequelize';
import sequelize from '../config/database';
import OcupacaoQuarto from '../models/OcupacaoQuarto';
import Comanda from '../models/Comanda';
import Acompanhante from '../models/Acompanhante';
import ConfiguracaoQuarto from '../models/ConfiguracaoQuarto';
import ItemComanda from '../models/ItemComanda';
import Produto from '../models/Produto';
import {
  IniciarOcupacaoQuartoDTO,
  FinalizarOcupacaoQuartoDTO,
  StatusQuarto,
  StatusComanda,
  TipoItem
} from '../types';
import { AppError } from '../middlewares/errorHandler';
import { logFinancial } from '../config/logger';

class QuartoService {
  async iniciarOcupacao(data: IniciarOcupacaoQuartoDTO, usuarioId: number): Promise<OcupacaoQuarto> {
    return await sequelize.transaction(async (transaction: Transaction) => {
      // Verificar se comanda existe e está aberta
      const comanda = await Comanda.findByPk(data.comandaId, { transaction });
      if (!comanda || comanda.status !== StatusComanda.ABERTA) {
        throw new AppError('Comanda não encontrada ou não está aberta', 400);
      }

      // Verificar se acompanhante existe e está ativa
      const acompanhante = await Acompanhante.findByPk(data.acompanhanteId, { transaction });
      if (!acompanhante || !acompanhante.ativaHoje) {
        throw new AppError('Acompanhante não encontrada ou não está ativa', 400);
      }

      // Verificar se quarto já está ocupado
      const quartoOcupado = await OcupacaoQuarto.findOne({
        where: {
          numeroQuarto: data.numeroQuarto,
          status: StatusQuarto.OCUPADO
        },
        transaction
      });

      if (quartoOcupado) {
        throw new AppError(`Quarto ${data.numeroQuarto} já está ocupado`, 409);
      }

      // Criar ocupação
      const ocupacao = await OcupacaoQuarto.create(
        {
          comandaId: data.comandaId,
          acompanhanteId: data.acompanhanteId,
          numeroQuarto: data.numeroQuarto,
          horaInicio: new Date(),
          status: StatusQuarto.OCUPADO
        },
        { transaction }
      );

      logFinancial(
        'QUARTO_OCUPADO',
        {
          ocupacaoId: ocupacao.id,
          comandaId: data.comandaId,
          numeroQuarto: data.numeroQuarto,
          acompanhanteId: data.acompanhanteId
        },
        usuarioId
      );

      return ocupacao;
    });
  }

  async finalizarOcupacao(data: FinalizarOcupacaoQuartoDTO, usuarioId: number): Promise<OcupacaoQuarto> {
    return await sequelize.transaction(async (transaction: Transaction) => {
      // Buscar ocupação
      const ocupacao = await OcupacaoQuarto.findByPk(data.ocupacaoId, {
        include: [{ model: Acompanhante, as: 'acompanhante' }],
        transaction
      });

      if (!ocupacao) {
        throw new AppError('Ocupação não encontrada', 404);
      }

      if (ocupacao.status !== StatusQuarto.OCUPADO) {
        throw new AppError('Ocupação já foi finalizada', 400);
      }

      // Calcular tempo decorrido
      const horaFim = new Date();
      const horaInicio = new Date(ocupacao.horaInicio);
      const diferencaMs = horaFim.getTime() - horaInicio.getTime();
      const minutosTotal = Math.ceil(diferencaMs / (1000 * 60));

      // Buscar configuração de preço apropriada
      const configuracoes = await ConfiguracaoQuarto.findAll({
        order: [['minutos', 'ASC']],
        transaction
      });

      if (!configuracoes || configuracoes.length === 0) {
        throw new AppError('Configurações de quarto não encontradas', 500);
      }

      // Encontrar faixa de preço adequada
      let valorCobrado = configuracoes[0].valor;
      for (const config of configuracoes) {
        if (minutosTotal >= config.minutos) {
          valorCobrado = config.valor;
        }
      }

      // Atualizar ocupação
      ocupacao.horaFim = horaFim;
      ocupacao.minutosTotal = minutosTotal;
      ocupacao.valorCobrado = valorCobrado;
      ocupacao.status = StatusQuarto.FINALIZADO;
      await ocupacao.save({ transaction });

      // Buscar ou criar produto "Quarto"
      let produtoQuarto = await Produto.findOne({
        where: { nome: 'Ocupação de Quarto', categoria: 'Quarto' },
        transaction
      });

      if (!produtoQuarto) {
        produtoQuarto = await Produto.create(
          {
            nome: 'Ocupação de Quarto',
            categoria: 'Quarto',
            preco: valorCobrado,
            tipo: 'normal',
            ativo: true
          },
          { transaction }
        );
      }

      // Lançar valor na comanda
      const comanda = await Comanda.findByPk(ocupacao.comandaId, { transaction });
      if (!comanda) {
        throw new AppError('Comanda não encontrada', 404);
      }

      const item = await ItemComanda.create(
        {
          comandaId: ocupacao.comandaId,
          produtoId: produtoQuarto.id,
          acompanhanteId: ocupacao.acompanhanteId,
          quantidade: 1,
          valorUnitario: valorCobrado,
          valorTotal: valorCobrado,
          tipoItem: TipoItem.QUARTO
        },
        { transaction }
      );

      // Atualizar total da comanda
      comanda.total = Number(comanda.total) + valorCobrado;
      await comanda.save({ transaction });

      logFinancial(
        'QUARTO_FINALIZADO',
        {
          ocupacaoId: ocupacao.id,
          comandaId: ocupacao.comandaId,
          numeroQuarto: ocupacao.numeroQuarto,
          minutosTotal,
          valorCobrado
        },
        usuarioId
      );

      return ocupacao;
    });
  }

  async listarOcupados(): Promise<OcupacaoQuarto[]> {
    return await OcupacaoQuarto.findAll({
      where: { status: StatusQuarto.OCUPADO },
      include: [
        { model: Comanda, as: 'comanda' },
        { model: Acompanhante, as: 'acompanhante' }
      ],
      order: [['horaInicio', 'DESC']]
    });
  }

  async buscarPorComanda(comandaId: number): Promise<OcupacaoQuarto[]> {
    return await OcupacaoQuarto.findAll({
      where: { comandaId },
      include: [{ model: Acompanhante, as: 'acompanhante' }],
      order: [['horaInicio', 'DESC']]
    });
  }

  async verificarDisponibilidade(numeroQuarto: number): Promise<boolean> {
    const ocupado = await OcupacaoQuarto.findOne({
      where: {
        numeroQuarto,
        status: StatusQuarto.OCUPADO
      }
    });

    return !ocupado;
  }
}

export default new QuartoService();
