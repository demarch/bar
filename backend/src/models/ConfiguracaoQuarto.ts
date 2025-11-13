import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

class ConfiguracaoQuarto extends Model {
  public id!: number;
  public minutos!: number;
  public descricao!: string;
  public valor!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ConfiguracaoQuarto.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    minutos: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'configuracao_quartos',
    timestamps: true,
    underscored: true
  }
);

export default ConfiguracaoQuarto;
