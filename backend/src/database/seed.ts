import dotenv from 'dotenv';
import sequelize from '../config/database';
import AuthService from '../services/AuthService';
import { TipoUsuario } from '../types';
import Produto from '../models/Produto';
import ConfiguracaoQuarto from '../models/ConfiguracaoQuarto';
import Acompanhante from '../models/Acompanhante';
import logger from '../config/logger';

dotenv.config();

const seedDatabase = async () => {
  try {
    logger.info('Iniciando seed do banco de dados...');

    // Sincronizar banco (cria as tabelas)
    await sequelize.sync({ force: true });
    logger.info('Tabelas criadas com sucesso');

    // Criar usuário admin
    const admin = await AuthService.criarUsuario(
      'Administrador',
      'admin',
      'admin123',
      TipoUsuario.ADMIN
    );
    logger.info(`✓ Usuário admin criado (login: admin, senha: admin123)`);

    // Criar usuário caixa
    const caixa = await AuthService.criarUsuario(
      'Operador de Caixa',
      'caixa',
      'caixa123',
      TipoUsuario.CAIXA
    );
    logger.info(`✓ Usuário caixa criado (login: caixa, senha: caixa123)`);

    // Criar usuário atendente
    const atendente = await AuthService.criarUsuario(
      'Atendente PDV',
      'atendente',
      'atendente123',
      TipoUsuario.ATENDENTE
    );
    logger.info(`✓ Usuário atendente criado (login: atendente, senha: atendente123)`);

    // Criar produtos de exemplo
    const produtos = [
      // Cervejas
      { nome: 'Heineken Long Neck', categoria: 'Cerveja', preco: 12.00, tipo: 'normal' },
      { nome: 'Budweiser Long Neck', categoria: 'Cerveja', preco: 10.00, tipo: 'normal' },
      { nome: 'Stella Artois Long Neck', categoria: 'Cerveja', preco: 13.00, tipo: 'normal' },
      { nome: 'Corona Extra', categoria: 'Cerveja', preco: 15.00, tipo: 'normal' },
      { nome: 'Brahma Chopp 300ml', categoria: 'Cerveja', preco: 8.00, tipo: 'normal' },

      // Drinks
      { nome: 'Caipirinha', categoria: 'Drinks', preco: 18.00, tipo: 'normal' },
      { nome: 'Caipiroska', categoria: 'Drinks', preco: 20.00, tipo: 'normal' },
      { nome: 'Gin Tônica', categoria: 'Drinks', preco: 22.00, tipo: 'normal' },
      { nome: 'Cuba Libre', categoria: 'Drinks', preco: 18.00, tipo: 'normal' },
      { nome: 'Mojito', categoria: 'Drinks', preco: 20.00, tipo: 'normal' },

      // Destilados
      { nome: 'Dose Whisky Red Label', categoria: 'Destilados', preco: 15.00, tipo: 'normal' },
      { nome: 'Dose Whisky Black Label', categoria: 'Destilados', preco: 25.00, tipo: 'normal' },
      { nome: 'Dose Vodka Absolut', categoria: 'Destilados', preco: 18.00, tipo: 'normal' },
      { nome: 'Dose Gin Tanqueray', categoria: 'Destilados', preco: 20.00, tipo: 'normal' },
      { nome: 'Dose Tequila José Cuervo', categoria: 'Destilados', preco: 18.00, tipo: 'normal' },

      // Bebidas Comissionadas
      { nome: 'Champagne Chandon', categoria: 'Comissionados', preco: 150.00, tipo: 'comissionado', comissaoPercentual: 40 },
      { nome: 'Whisky Premium', categoria: 'Comissionados', preco: 200.00, tipo: 'comissionado', comissaoPercentual: 40 },
      { nome: 'Energético Especial', categoria: 'Comissionados', preco: 50.00, tipo: 'comissionado', comissaoPercentual: 40 },
      { nome: 'Vodka Premium', categoria: 'Comissionados', preco: 80.00, tipo: 'comissionado', comissaoPercentual: 40 },

      // Outros
      { nome: 'Água Mineral 500ml', categoria: 'Não Alcoólicos', preco: 5.00, tipo: 'normal' },
      { nome: 'Refrigerante Lata', categoria: 'Não Alcoólicos', preco: 6.00, tipo: 'normal' },
      { nome: 'Suco Natural', categoria: 'Não Alcoólicos', preco: 10.00, tipo: 'normal' },
      { nome: 'Energético Red Bull', categoria: 'Não Alcoólicos', preco: 15.00, tipo: 'normal' }
    ];

    for (const produtoData of produtos) {
      await Produto.create(produtoData as any);
    }
    logger.info(`✓ ${produtos.length} produtos criados`);

    // Criar configurações de quartos
    const configuracoesQuartos = [
      { minutos: 30, descricao: '30 minutos', valor: 70.00 },
      { minutos: 60, descricao: '1 hora', valor: 100.00 },
      { minutos: 90, descricao: '1 hora e meia', valor: 150.00 },
      { minutos: 120, descricao: '2 horas', valor: 200.00 }
    ];

    for (const config of configuracoesQuartos) {
      await ConfiguracaoQuarto.create(config);
    }
    logger.info(`✓ ${configuracoesQuartos.length} configurações de quartos criadas`);

    // Criar acompanhantes de exemplo
    const acompanhantes = [
      { nome: 'Maria Silva', apelido: 'Mari', percentualComissao: 40, ativaHoje: true },
      { nome: 'Ana Paula', apelido: 'Ana', percentualComissao: 40, ativaHoje: true },
      { nome: 'Julia Santos', apelido: 'Ju', percentualComissao: 40, ativaHoje: false },
      { nome: 'Carla Souza', apelido: 'Carlinha', percentualComissao: 45, ativaHoje: true }
    ];

    for (const acompanhanteData of acompanhantes) {
      await Acompanhante.create(acompanhanteData);
    }
    logger.info(`✓ ${acompanhantes.length} acompanhantes criadas`);

    logger.info('
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ✓ Seed concluído com sucesso!                     ║
║                                                       ║
║   Credenciais de acesso:                            ║
║   - Admin: admin / admin123                         ║
║   - Caixa: caixa / caixa123                         ║
║   - Atendente: atendente / atendente123             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    ');

    process.exit(0);
  } catch (error) {
    logger.error('Erro ao fazer seed do banco de dados:', error);
    process.exit(1);
  }
};

seedDatabase();
