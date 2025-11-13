import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { StatusComanda, FormaPagamento } from '../types';
import MovimentoCaixa from './MovimentoCaixa';

class Comanda extends Model {
  public id!: number;
  public numero!: number;
  public movimentoCaixaId!: number;
  public clienteNome?: string;
  public dataAbertura!: Date;
  public dataFechamento?: Date;
  public total!: number;
  public status!: StatusComanda;
  public formaPagamento?: FormaPagamento;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Comanda.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    numero: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    movimentoCaixaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'movimentos_caixa',
        key: 'id'
      }
    },
    clienteNome: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    dataAbertura: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dataFechamento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(...Object.values(StatusComanda)),
      defaultValue: StatusComanda.ABERTA,
      allowNull: false
    },
    formaPagamento: {
      type: DataTypes.ENUM(...Object.values(FormaPagamento)),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'comandas',
    timestamps: true,
    underscored: true
  }
);

// Relacionamentos
Comanda.belongsTo(MovimentoCaixa, { foreignKey: 'movimentoCaixaId', as: 'movimentoCaixa' });

export default Comanda;
