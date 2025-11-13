import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { StatusQuarto } from '../types';
import Comanda from './Comanda';
import Acompanhante from './Acompanhante';

class OcupacaoQuarto extends Model {
  public id!: number;
  public comandaId!: number;
  public acompanhanteId!: number;
  public numeroQuarto!: number;
  public horaInicio!: Date;
  public horaFim?: Date;
  public minutosTotal?: number;
  public valorCobrado?: number;
  public status!: StatusQuarto;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OcupacaoQuarto.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    comandaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'comandas',
        key: 'id'
      }
    },
    acompanhanteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'acompanhantes',
        key: 'id'
      }
    },
    numeroQuarto: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    horaInicio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    horaFim: {
      type: DataTypes.DATE,
      allowNull: true
    },
    minutosTotal: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    valorCobrado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(...Object.values(StatusQuarto)),
      defaultValue: StatusQuarto.OCUPADO,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'ocupacao_quartos',
    timestamps: true,
    underscored: true
  }
);

// Relacionamentos
OcupacaoQuarto.belongsTo(Comanda, { foreignKey: 'comandaId', as: 'comanda' });
OcupacaoQuarto.belongsTo(Acompanhante, { foreignKey: 'acompanhanteId', as: 'acompanhante' });

// Relacionamentos inversos
Comanda.hasMany(OcupacaoQuarto, { foreignKey: 'comandaId', as: 'quartos' });

export default OcupacaoQuarto;
