import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { TipoItem } from '../types';
import Comanda from './Comanda';
import Produto from './Produto';
import Acompanhante from './Acompanhante';

class ItemComanda extends Model {
  public id!: number;
  public comandaId!: number;
  public produtoId!: number;
  public acompanhanteId?: number;
  public quantidade!: number;
  public valorUnitario!: number;
  public valorTotal!: number;
  public valorComissao?: number;
  public tipoItem!: TipoItem;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ItemComanda.init(
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
    produtoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'produtos',
        key: 'id'
      }
    },
    acompanhanteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'acompanhantes',
        key: 'id'
      }
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    valorUnitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    valorTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    valorComissao: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    tipoItem: {
      type: DataTypes.ENUM(...Object.values(TipoItem)),
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'itens_comanda',
    timestamps: true,
    underscored: true
  }
);

// Relacionamentos
ItemComanda.belongsTo(Comanda, { foreignKey: 'comandaId', as: 'comanda' });
ItemComanda.belongsTo(Produto, { foreignKey: 'produtoId', as: 'produto' });
ItemComanda.belongsTo(Acompanhante, { foreignKey: 'acompanhanteId', as: 'acompanhante' });

// Relacionamentos inversos
Comanda.hasMany(ItemComanda, { foreignKey: 'comandaId', as: 'itens' });

export default ItemComanda;
