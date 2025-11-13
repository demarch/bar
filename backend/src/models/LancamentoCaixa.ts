import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { TipoLancamentoCaixa, CategoriaLancamento } from '../types';
import MovimentoCaixa from './MovimentoCaixa';

class LancamentoCaixa extends Model {
  public id!: number;
  public movimentoCaixaId!: number;
  public tipo!: TipoLancamentoCaixa;
  public categoria!: CategoriaLancamento;
  public valor!: number;
  public descricao!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LancamentoCaixa.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    movimentoCaixaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'movimentos_caixa',
        key: 'id'
      }
    },
    tipo: {
      type: DataTypes.ENUM(...Object.values(TipoLancamentoCaixa)),
      allowNull: false
    },
    categoria: {
      type: DataTypes.ENUM(...Object.values(CategoriaLancamento)),
      allowNull: false
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'lancamentos_caixa',
    timestamps: true,
    underscored: true
  }
);

// Relacionamentos
LancamentoCaixa.belongsTo(MovimentoCaixa, { foreignKey: 'movimentoCaixaId', as: 'movimentoCaixa' });
MovimentoCaixa.hasMany(LancamentoCaixa, { foreignKey: 'movimentoCaixaId', as: 'lancamentos' });

export default LancamentoCaixa;
