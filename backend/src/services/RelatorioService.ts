import { Op } from 'sequelize';
import sequelize from '../config/database';
import MovimentoCaixa from '../models/MovimentoCaixa';
import Comanda from '../models/Comanda';
import ItemComanda from '../models/ItemComanda';
import Produto from '../models/Produto';
import Acompanhante from '../models/Acompanhante';
import LancamentoCaixa from '../models/LancamentoCaixa';
import OcupacaoQuarto from '../models/OcupacaoQuarto';
import {
  RelatorioVendas,
  RelatorioComissoes,
  RelatorioFluxoCaixa,
  StatusComanda,
  StatusQuarto,
  TipoItem
} from '../types';
import { AppError } from '../middlewares/errorHandler';

class RelatorioService {
  async gerarRelatorioVendas(
    movimentoCaixaId: number,
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<RelatorioVendas> {
    const where: any = { status: StatusComanda.FECHADA };

    if (movimentoCaixaId) {
      where.movimentoCaixaId = movimentoCaixaId;
    }

    if (dataInicio || dataFim) {
      where.dataFechamento = {};
      if (dataInicio) {
        where.dataFechamento[Op.gte] = dataInicio;
      }
      if (dataFim) {
        where.dataFechamento[Op.lte] = dataFim;
      }
    }

    // Buscar comandas fechadas
    const comandas = await Comanda.findAll({
      where,
      include: [
        {
          model: ItemComanda,
          as: 'itens',
          include: [{ model: Produto, as: 'produto' }]
        }
      ]
    });

    const totalVendas = comandas.reduce((sum, c) => sum + Number(c.total), 0);
    const quantidadeComandas = comandas.length;
    const ticketMedio = quantidadeComandas > 0 ? totalVendas / quantidadeComandas : 0;

    // Vendas por categoria
    const vendasPorCategoria: { [key: string]: number } = {};
    const vendasPorProduto: { [key: string]: { quantidade: number; total: number; nome: string } } = {};

    comandas.forEach(comanda => {
      comanda.itens?.forEach((item: any) => {
        const produto = item.produto;
        const categoria = produto.categoria;
        const valorTotal = Number(item.valorTotal);

        // Por categoria
        if (!vendasPorCategoria[categoria]) {
          vendasPorCategoria[categoria] = 0;
        }
        vendasPorCategoria[categoria] += valorTotal;

        // Por produto
        if (!vendasPorProduto[produto.id]) {
          vendasPorProduto[produto.id] = {
            nome: produto.nome,
            quantidade: 0,
            total: 0
          };
        }
        vendasPorProduto[produto.id].quantidade += item.quantidade;
        vendasPorProduto[produto.id].total += valorTotal;
      });
    });

    return {
      totalVendas,
      quantidadeComandas,
      ticketMedio,
      vendasPorCategoria: Object.entries(vendasPorCategoria).map(([categoria, total]) => ({
        categoria,
        total
      })),
      vendasPorProduto: Object.entries(vendasPorProduto).map(([id, data]) => ({
        produto: data.nome,
        quantidade: data.quantidade,
        total: data.total
      }))
    };
  }

  async gerarRelatorioComissoes(
    movimentoCaixaId?: number,
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<RelatorioComissoes> {
    const whereComanda: any = { status: StatusComanda.FECHADA };

    if (movimentoCaixaId) {
      whereComanda.movimentoCaixaId = movimentoCaixaId;
    }

    if (dataInicio || dataFim) {
      whereComanda.dataFechamento = {};
      if (dataInicio) {
        whereComanda.dataFechamento[Op.gte] = dataInicio;
      }
      if (dataFim) {
        whereComanda.dataFechamento[Op.lte] = dataFim;
      }
    }

    // Buscar itens comissionados
    const itensComissionados = await ItemComanda.findAll({
      where: {
        tipoItem: TipoItem.COMISSIONADO,
        valorComissao: { [Op.ne]: null }
      },
      include: [
        {
          model: Comanda,
          as: 'comanda',
          where: whereComanda,
          required: true
        },
        {
          model: Acompanhante,
          as: 'acompanhante'
        }
      ]
    });

    // Buscar ocupações de quartos
    const ocupacoesQuartos = await OcupacaoQuarto.findAll({
      where: {
        status: StatusQuarto.FINALIZADO,
        valorCobrado: { [Op.ne]: null }
      },
      include: [
        {
          model: Comanda,
          as: 'comanda',
          where: whereComanda,
          required: true
        },
        {
          model: Acompanhante,
          as: 'acompanhante'
        }
      ]
    });

    // Agrupar por acompanhante
    const comissoesPorAcompanhante: {
      [key: number]: {
        acompanhanteId: number;
        nome: string;
        totalComissao: number;
        quantidadeItens: number;
        valorQuartos: number;
      };
    } = {};

    // Processar itens comissionados
    itensComissionados.forEach((item: any) => {
      if (!item.acompanhanteId) return;

      const id = item.acompanhanteId;
      if (!comissoesPorAcompanhante[id]) {
        comissoesPorAcompanhante[id] = {
          acompanhanteId: id,
          nome: item.acompanhante?.nome || 'N/A',
          totalComissao: 0,
          quantidadeItens: 0,
          valorQuartos: 0
        };
      }

      comissoesPorAcompanhante[id].totalComissao += Number(item.valorComissao || 0);
      comissoesPorAcompanhante[id].quantidadeItens += 1;
    });

    // Processar quartos (40% do valor para acompanhante)
    ocupacoesQuartos.forEach((ocupacao: any) => {
      const id = ocupacao.acompanhanteId;
      const valorQuarto = Number(ocupacao.valorCobrado || 0);
      const comissaoQuarto = valorQuarto * 0.4; // 40% para acompanhante

      if (!comissoesPorAcompanhante[id]) {
        comissoesPorAcompanhante[id] = {
          acompanhanteId: id,
          nome: ocupacao.acompanhante?.nome || 'N/A',
          totalComissao: 0,
          quantidadeItens: 0,
          valorQuartos: 0
        };
      }

      comissoesPorAcompanhante[id].totalComissao += comissaoQuarto;
      comissoesPorAcompanhante[id].valorQuartos += valorQuarto;
    });

    const totalComissoes = Object.values(comissoesPorAcompanhante).reduce(
      (sum, a) => sum + a.totalComissao,
      0
    );

    return {
      totalComissoes,
      comissoesPorAcompanhante: Object.values(comissoesPorAcompanhante)
    };
  }

  async gerarRelatorioFluxoCaixa(movimentoCaixaId: number): Promise<RelatorioFluxoCaixa> {
    const movimento = await MovimentoCaixa.findByPk(movimentoCaixaId, {
      include: [{ model: LancamentoCaixa, as: 'lancamentos' }]
    });

    if (!movimento) {
      throw new AppError('Movimento de caixa não encontrado', 404);
    }

    // Buscar comandas fechadas
    const comandas = await Comanda.findAll({
      where: {
        movimentoCaixaId,
        status: StatusComanda.FECHADA
      }
    });

    const totalVendas = comandas.reduce((sum, c) => sum + Number(c.total), 0);

    // Calcular comissões
    const relatorioComissoes = await this.gerarRelatorioComissoes(movimentoCaixaId);
    const totalComissoes = relatorioComissoes.totalComissoes;

    // Calcular lançamentos
    const lancamentos = movimento.lancamentos || [];
    const totalEntradas = lancamentos
      .filter(l => l.tipo === 'entrada')
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const totalSaidas = lancamentos
      .filter(l => l.tipo === 'saida')
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const valorAbertura = Number(movimento.valorAbertura);
    const saldoEsperado = valorAbertura + totalVendas + totalEntradas - totalSaidas;

    const relatorio: RelatorioFluxoCaixa = {
      valorAbertura,
      totalEntradas,
      totalSaidas,
      totalVendas,
      totalComissoes,
      saldoEsperado
    };

    if (movimento.valorFechamento !== null) {
      relatorio.valorFechamento = Number(movimento.valorFechamento);
      relatorio.diferencaCaixa = relatorio.valorFechamento - saldoEsperado;
    }

    return relatorio;
  }

  async buscarDashboard(movimentoCaixaId: number) {
    const [vendas, comissoes, fluxoCaixa, comandasAbertas] = await Promise.all([
      this.gerarRelatorioVendas(movimentoCaixaId),
      this.gerarRelatorioComissoes(movimentoCaixaId),
      this.gerarRelatorioFluxoCaixa(movimentoCaixaId),
      Comanda.count({
        where: {
          movimentoCaixaId,
          status: StatusComanda.ABERTA
        }
      })
    ]);

    return {
      vendas,
      comissoes,
      fluxoCaixa,
      comandasAbertas
    };
  }
}

export default new RelatorioService();
