import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { StatusCaixa } from '../types';
import Usuario from './Usuario';

class MovimentoCaixa extends Model {
  public id!: number;
  public usuarioId!: number;
  public dataAbertura!: Date;
  public dataFechamento?: Date;
  public valorAbertura!: number;
  public valorFechamento?: number;
  public status!: StatusCaixa;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MovimentoCaixa.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
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
    valorAbertura: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    valorFechamento: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(...Object.values(StatusCaixa)),
      defaultValue: StatusCaixa.ABERTO,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'movimentos_caixa',
    timestamps: true,
    underscored: true
  }
);

// Relacionamentos
MovimentoCaixa.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

export default MovimentoCaixa;
