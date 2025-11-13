import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bar_system',
  username: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'senha_segura',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

export default sequelize;

export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✓ Conexão com banco de dados estabelecida com sucesso');
    return true;
  } catch (error) {
    console.error('✗ Erro ao conectar com banco de dados:', error);
    return false;
  }
};

export const syncDatabase = async (force = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    console.log(`✓ Banco de dados sincronizado ${force ? '(FORCE)' : ''}`);
  } catch (error) {
    console.error('✗ Erro ao sincronizar banco de dados:', error);
    throw error;
  }
};
