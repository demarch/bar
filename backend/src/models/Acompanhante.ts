import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

class Acompanhante extends Model {
  public id!: number;
  public nome!: string;
  public apelido?: string;
  public telefone?: string;
  public documento?: string;
  public percentualComissao!: number;
  public ativaHoje!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Acompanhante.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    apelido: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    telefone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    documento: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    percentualComissao: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 40.00,
      allowNull: false
    },
    ativaHoje: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'acompanhantes',
    timestamps: true,
    underscored: true
  }
);

export default Acompanhante;
