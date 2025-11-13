import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { TipoUsuario } from '../types';

class Usuario extends Model {
  public id!: number;
  public nome!: string;
  public login!: string;
  public senha!: string;
  public tipo!: TipoUsuario;
  public ativo!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Usuario.init(
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
    login: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM(...Object.values(TipoUsuario)),
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'usuarios',
    timestamps: true,
    underscored: true
  }
);

export default Usuario;
