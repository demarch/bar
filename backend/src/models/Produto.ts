import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { TipoProduto } from '../types';

class Produto extends Model {
  public id!: number;
  public nome!: string;
  public categoria!: string;
  public preco!: number;
  public tipo!: TipoProduto;
  public comissaoPercentual?: number;
  public ativo!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Produto.init(
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
    categoria: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM(...Object.values(TipoProduto)),
      allowNull: false
    },
    comissaoPercentual: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'produtos',
    timestamps: true,
    underscored: true
  }
);

export default Produto;
