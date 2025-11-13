// Exportar todos os modelos
import Usuario from './Usuario';
import Acompanhante from './Acompanhante';
import Produto from './Produto';
import MovimentoCaixa from './MovimentoCaixa';
import Comanda from './Comanda';
import ItemComanda from './ItemComanda';
import OcupacaoQuarto from './OcupacaoQuarto';
import LancamentoCaixa from './LancamentoCaixa';
import ConfiguracaoQuarto from './ConfiguracaoQuarto';

export {
  Usuario,
  Acompanhante,
  Produto,
  MovimentoCaixa,
  Comanda,
  ItemComanda,
  OcupacaoQuarto,
  LancamentoCaixa,
  ConfiguracaoQuarto
};

// Função para inicializar todos os relacionamentos
export const initModels = () => {
  // Os relacionamentos já foram definidos nos próprios arquivos de modelo
  console.log('✓ Modelos inicializados');
};
