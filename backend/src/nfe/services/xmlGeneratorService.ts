/**
 * Serviço de Geração de XML para NF-e
 * Gera XML conforme Manual de Integração - Contribuinte
 * Versão do layout: 4.00
 */

import {
  NfeCompleta,
  NfeConfiguracao,
  NfeItem,
  NfeDestinatario,
  NfePagamento,
  NfeAmbiente,
  NfeFormaEmissao,
  NfeTipoOperacao,
  NfeFinalidadeEmissao,
  NfeRegimeTributario,
  NfeMeioPagamento,
  NfeModalidadeFrete,
  NfeCancelamento,
  NfeInutilizacao
} from '../types';

/**
 * Classe para geração de XMLs da NF-e
 */
export class XmlGeneratorService {
  private versaoLayout = '4.00';
  private namespace = 'http://www.portalfiscal.inf.br/nfe';

  /**
   * Gera a chave de acesso da NF-e (44 dígitos)
   */
  gerarChaveAcesso(
    cUF: string,       // 2 dígitos - código UF
    dataEmissao: Date,
    cnpj: string,      // 14 dígitos
    mod: string,       // 2 dígitos - modelo (55)
    serie: number,     // 3 dígitos
    numero: number,    // 9 dígitos
    tpEmis: number,    // 1 dígito - tipo emissão
    cNF: string        // 8 dígitos - código numérico
  ): string {
    const ano = String(dataEmissao.getFullYear()).slice(2);
    const mes = String(dataEmissao.getMonth() + 1).padStart(2, '0');

    const chave =
      cUF.padStart(2, '0') +
      ano +
      mes +
      cnpj.padStart(14, '0') +
      mod.padStart(2, '0') +
      String(serie).padStart(3, '0') +
      String(numero).padStart(9, '0') +
      String(tpEmis) +
      cNF.padStart(8, '0');

    // Calcula dígito verificador
    const dv = this.calcularDigitoVerificador(chave);

    return chave + dv;
  }

  /**
   * Calcula o dígito verificador da chave de acesso (módulo 11)
   */
  private calcularDigitoVerificador(chave: string): string {
    let soma = 0;
    let peso = 2;

    for (let i = chave.length - 1; i >= 0; i--) {
      soma += parseInt(chave[i]) * peso;
      peso++;
      if (peso > 9) peso = 2;
    }

    const resto = soma % 11;
    const dv = 11 - resto;

    return dv >= 10 ? '0' : String(dv);
  }

  /**
   * Gera código numérico aleatório de 8 dígitos
   */
  gerarCodigoNumerico(): string {
    return String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  }

  /**
   * Gera o XML completo da NF-e
   */
  gerarXmlNfe(nfe: NfeCompleta, config: NfeConfiguracao): string {
    const dataEmissao = nfe.dataEmissao || new Date();
    const cNF = this.gerarCodigoNumerico();

    // Gera chave de acesso se não existir
    const chaveAcesso = nfe.chaveAcesso || this.gerarChaveAcesso(
      '41', // PR
      dataEmissao,
      config.cnpj,
      '55', // NF-e
      nfe.serie || config.serieNfe,
      nfe.numero!,
      nfe.formaEmissao || NfeFormaEmissao.NORMAL,
      cNF
    );

    const ide = this.gerarIde(nfe, config, dataEmissao, cNF, chaveAcesso);
    const emit = this.gerarEmit(config);
    const dest = nfe.destinatario ? this.gerarDest(nfe.destinatario, nfe.ambiente || config.ambiente) : '';
    const det = this.gerarDet(nfe.itens);
    const total = this.gerarTotal(nfe);
    const transp = this.gerarTransp(nfe);
    const pag = this.gerarPag(nfe.pagamentos);
    const infAdic = this.gerarInfAdic(nfe);

    const infNFe = `<infNFe versao="${this.versaoLayout}" Id="NFe${chaveAcesso}">`
      + ide
      + emit
      + dest
      + det
      + total
      + transp
      + pag
      + infAdic
      + `</infNFe>`;

    const NFe = `<NFe xmlns="${this.namespace}">${infNFe}</NFe>`;

    return `<?xml version="1.0" encoding="UTF-8"?>${NFe}`;
  }

  /**
   * Gera o grupo de identificação da NF-e (ide)
   */
  private gerarIde(
    nfe: NfeCompleta,
    config: NfeConfiguracao,
    dataEmissao: Date,
    cNF: string,
    chaveAcesso: string
  ): string {
    const ambiente = nfe.ambiente || config.ambiente;
    const formaEmissao = nfe.formaEmissao || config.formaEmissao;

    return `<ide>`
      + `<cUF>41</cUF>` // Paraná
      + `<cNF>${cNF}</cNF>`
      + `<natOp>${this.escaparXml(nfe.naturezaOperacao)}</natOp>`
      + `<mod>55</mod>` // NF-e
      + `<serie>${nfe.serie || config.serieNfe}</serie>`
      + `<nNF>${nfe.numero}</nNF>`
      + `<dhEmi>${this.formatarDataHora(dataEmissao)}</dhEmi>`
      + `<tpNF>${nfe.tipoOperacao}</tpNF>` // 0=Entrada, 1=Saída
      + `<idDest>${this.determinarDestinoOperacao(nfe)}</idDest>`
      + `<cMunFG>${config.codigoMunicipio}</cMunFG>`
      + `<tpImp>${config.tipoImpressaoDanfe}</tpImp>`
      + `<tpEmis>${formaEmissao}</tpEmis>`
      + `<cDV>${chaveAcesso.slice(-1)}</cDV>`
      + `<tpAmb>${ambiente}</tpAmb>`
      + `<finNFe>${nfe.finalidadeEmissao}</finNFe>`
      + `<indFinal>1</indFinal>` // Consumidor final
      + `<indPres>1</indPres>` // Operação presencial
      + `<procEmi>0</procEmi>` // Aplicativo do contribuinte
      + `<verProc>BAR-PDV-1.0</verProc>`
      + (formaEmissao !== NfeFormaEmissao.NORMAL && nfe.justificativaContingencia
        ? `<dhCont>${this.formatarDataHora(nfe.dataEntradaContingencia || new Date())}</dhCont>`
          + `<xJust>${this.escaparXml(nfe.justificativaContingencia)}</xJust>`
        : '')
      + `</ide>`;
  }

  /**
   * Determina o destino da operação (1=Interna, 2=Interestadual, 3=Exterior)
   */
  private determinarDestinoOperacao(nfe: NfeCompleta): number {
    if (!nfe.destinatario?.endereco?.uf) return 1;
    if (nfe.destinatario.endereco.uf === 'EX') return 3;
    if (nfe.destinatario.endereco.uf !== 'PR') return 2;
    return 1;
  }

  /**
   * Gera o grupo do emitente (emit)
   */
  private gerarEmit(config: NfeConfiguracao): string {
    let crt: number;
    switch (config.codigoRegimeTributario) {
      case NfeRegimeTributario.SIMPLES_NACIONAL:
        crt = 1;
        break;
      case NfeRegimeTributario.SIMPLES_NACIONAL_EXCESSO:
        crt = 2;
        break;
      default:
        crt = 3;
    }

    return `<emit>`
      + `<CNPJ>${config.cnpj}</CNPJ>`
      + `<xNome>${this.escaparXml(config.razaoSocial)}</xNome>`
      + (config.nomeFantasia ? `<xFant>${this.escaparXml(config.nomeFantasia)}</xFant>` : '')
      + `<enderEmit>`
      + `<xLgr>${this.escaparXml(config.logradouro)}</xLgr>`
      + `<nro>${this.escaparXml(config.numero)}</nro>`
      + (config.complemento ? `<xCpl>${this.escaparXml(config.complemento)}</xCpl>` : '')
      + `<xBairro>${this.escaparXml(config.bairro)}</xBairro>`
      + `<cMun>${config.codigoMunicipio}</cMun>`
      + `<xMun>${this.escaparXml(config.nomeMunicipio)}</xMun>`
      + `<UF>${config.uf}</UF>`
      + `<CEP>${config.cep}</CEP>`
      + `<cPais>${config.codigoPais || '1058'}</cPais>`
      + `<xPais>${config.nomePais || 'BRASIL'}</xPais>`
      + (config.telefone ? `<fone>${config.telefone.replace(/\D/g, '')}</fone>` : '')
      + `</enderEmit>`
      + `<IE>${config.inscricaoEstadual}</IE>`
      + (config.inscricaoMunicipal ? `<IM>${config.inscricaoMunicipal}</IM>` : '')
      + (config.cnaeFiscal ? `<CNAE>${config.cnaeFiscal}</CNAE>` : '')
      + `<CRT>${crt}</CRT>`
      + `</emit>`;
  }

  /**
   * Gera o grupo do destinatário (dest)
   */
  private gerarDest(dest: NfeDestinatario, ambiente: NfeAmbiente): string {
    // Em homologação, o nome deve ser "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
    const razaoSocial = ambiente === NfeAmbiente.HOMOLOGACAO
      ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
      : dest.razaoSocial || 'CONSUMIDOR NAO IDENTIFICADO';

    let result = `<dest>`;

    if (dest.cnpjCpf) {
      if (dest.cnpjCpf.length === 14) {
        result += `<CNPJ>${dest.cnpjCpf}</CNPJ>`;
      } else if (dest.cnpjCpf.length === 11) {
        result += `<CPF>${dest.cnpjCpf}</CPF>`;
      }
    }

    result += `<xNome>${this.escaparXml(razaoSocial)}</xNome>`;

    if (dest.endereco) {
      result += `<enderDest>`
        + (dest.endereco.logradouro ? `<xLgr>${this.escaparXml(dest.endereco.logradouro)}</xLgr>` : '')
        + (dest.endereco.numero ? `<nro>${this.escaparXml(dest.endereco.numero)}</nro>` : '')
        + (dest.endereco.complemento ? `<xCpl>${this.escaparXml(dest.endereco.complemento)}</xCpl>` : '')
        + (dest.endereco.bairro ? `<xBairro>${this.escaparXml(dest.endereco.bairro)}</xBairro>` : '')
        + (dest.endereco.codigoMunicipio ? `<cMun>${dest.endereco.codigoMunicipio}</cMun>` : '')
        + (dest.endereco.nomeMunicipio ? `<xMun>${this.escaparXml(dest.endereco.nomeMunicipio)}</xMun>` : '')
        + (dest.endereco.uf ? `<UF>${dest.endereco.uf}</UF>` : '')
        + (dest.endereco.cep ? `<CEP>${dest.endereco.cep}</CEP>` : '')
        + `<cPais>${dest.endereco.codigoPais || '1058'}</cPais>`
        + `<xPais>${dest.endereco.nomePais || 'BRASIL'}</xPais>`
        + (dest.endereco.telefone ? `<fone>${dest.endereco.telefone.replace(/\D/g, '')}</fone>` : '')
        + `</enderDest>`;
    }

    result += `<indIEDest>${dest.indicadorIe}</indIEDest>`;

    if (dest.inscricaoEstadual && dest.indicadorIe === 1) {
      result += `<IE>${dest.inscricaoEstadual}</IE>`;
    }

    if (dest.email) {
      result += `<email>${dest.email}</email>`;
    }

    result += `</dest>`;

    return result;
  }

  /**
   * Gera os grupos de detalhamento dos produtos (det)
   */
  private gerarDet(itens: NfeItem[]): string {
    return itens.map((item, index) => {
      const nItem = item.numeroItem || (index + 1);

      return `<det nItem="${nItem}">`
        + this.gerarProd(item)
        + this.gerarImposto(item)
        + (item.informacoesAdicionais ? `<infAdProd>${this.escaparXml(item.informacoesAdicionais)}</infAdProd>` : '')
        + `</det>`;
    }).join('');
  }

  /**
   * Gera o grupo do produto (prod)
   */
  private gerarProd(item: NfeItem): string {
    return `<prod>`
      + `<cProd>${this.escaparXml(item.codigoProduto)}</cProd>`
      + `<cEAN>SEM GTIN</cEAN>`
      + `<xProd>${this.escaparXml(item.descricao)}</xProd>`
      + `<NCM>${item.ncm}</NCM>`
      + `<CFOP>${item.cfop}</CFOP>`
      + `<uCom>${item.unidade}</uCom>`
      + `<qCom>${this.formatarNumero(item.quantidade, 4)}</qCom>`
      + `<vUnCom>${this.formatarNumero(item.valorUnitario, 10)}</vUnCom>`
      + `<vProd>${this.formatarNumero(item.valorTotal, 2)}</vProd>`
      + `<cEANTrib>SEM GTIN</cEANTrib>`
      + `<uTrib>${item.unidade}</uTrib>`
      + `<qTrib>${this.formatarNumero(item.quantidade, 4)}</qTrib>`
      + `<vUnTrib>${this.formatarNumero(item.valorUnitario, 10)}</vUnTrib>`
      + (item.valorDesconto && item.valorDesconto > 0
        ? `<vDesc>${this.formatarNumero(item.valorDesconto, 2)}</vDesc>` : '')
      + `<indTot>1</indTot>` // Valor do item compõe o total da NF-e
      + `</prod>`;
  }

  /**
   * Gera o grupo de impostos (imposto)
   * Implementação para Simples Nacional (CSOSN) e Regime Normal (CST)
   */
  private gerarImposto(item: NfeItem): string {
    let imposto = `<imposto>`;

    // Valor aproximado de tributos (Lei da Transparência)
    if (item.valorAproximadoTributos) {
      imposto += `<vTotTrib>${this.formatarNumero(item.valorAproximadoTributos, 2)}</vTotTrib>`;
    }

    // ICMS
    imposto += this.gerarIcms(item);

    // PIS
    imposto += this.gerarPis(item);

    // COFINS
    imposto += this.gerarCofins(item);

    imposto += `</imposto>`;

    return imposto;
  }

  /**
   * Gera o grupo ICMS
   */
  private gerarIcms(item: NfeItem): string {
    const origem = item.icmsOrigem || 0;

    // Se tem CSOSN, é Simples Nacional
    if (item.icmsCsosn) {
      return `<ICMS>`
        + `<ICMSSN102>` // CSOSN 102 - Tributada sem permissão de crédito
        + `<orig>${origem}</orig>`
        + `<CSOSN>${item.icmsCsosn}</CSOSN>`
        + `</ICMSSN102>`
        + `</ICMS>`;
    }

    // Regime Normal com CST
    const cst = item.icmsCst || '00';
    const bcIcms = item.icmsBaseCalculo || item.valorTotal;
    const aliqIcms = item.icmsAliquota || 0;
    const valorIcms = item.icmsValor || (bcIcms * aliqIcms / 100);

    if (cst === '00') {
      return `<ICMS>`
        + `<ICMS00>`
        + `<orig>${origem}</orig>`
        + `<CST>${cst}</CST>`
        + `<modBC>0</modBC>`
        + `<vBC>${this.formatarNumero(bcIcms, 2)}</vBC>`
        + `<pICMS>${this.formatarNumero(aliqIcms, 4)}</pICMS>`
        + `<vICMS>${this.formatarNumero(valorIcms, 2)}</vICMS>`
        + `</ICMS00>`
        + `</ICMS>`;
    }

    if (cst === '40' || cst === '41' || cst === '50') {
      return `<ICMS>`
        + `<ICMS40>`
        + `<orig>${origem}</orig>`
        + `<CST>${cst}</CST>`
        + `</ICMS40>`
        + `</ICMS>`;
    }

    // CST 60 - ICMS cobrado anteriormente por ST
    if (cst === '60') {
      return `<ICMS>`
        + `<ICMS60>`
        + `<orig>${origem}</orig>`
        + `<CST>${cst}</CST>`
        + `</ICMS60>`
        + `</ICMS>`;
    }

    // Padrão: tributação normal
    return `<ICMS>`
      + `<ICMS00>`
      + `<orig>${origem}</orig>`
      + `<CST>00</CST>`
      + `<modBC>0</modBC>`
      + `<vBC>${this.formatarNumero(bcIcms, 2)}</vBC>`
      + `<pICMS>${this.formatarNumero(aliqIcms, 4)}</pICMS>`
      + `<vICMS>${this.formatarNumero(valorIcms, 2)}</vICMS>`
      + `</ICMS00>`
      + `</ICMS>`;
  }

  /**
   * Gera o grupo PIS
   */
  private gerarPis(item: NfeItem): string {
    const cst = item.pisCst || '07'; // 07 = Isento

    if (['04', '05', '06', '07', '08', '09'].includes(cst)) {
      return `<PIS><PISAliq><CST>${cst}</CST><vBC>0.00</vBC><pPIS>0.0000</pPIS><vPIS>0.00</vPIS></PISAliq></PIS>`;
    }

    const bcPis = item.pisBaseCalculo || item.valorTotal;
    const aliqPis = item.pisAliquota || 0;
    const valorPis = item.pisValor || (bcPis * aliqPis / 100);

    return `<PIS>`
      + `<PISAliq>`
      + `<CST>${cst}</CST>`
      + `<vBC>${this.formatarNumero(bcPis, 2)}</vBC>`
      + `<pPIS>${this.formatarNumero(aliqPis, 4)}</pPIS>`
      + `<vPIS>${this.formatarNumero(valorPis, 2)}</vPIS>`
      + `</PISAliq>`
      + `</PIS>`;
  }

  /**
   * Gera o grupo COFINS
   */
  private gerarCofins(item: NfeItem): string {
    const cst = item.cofinsCst || '07'; // 07 = Isento

    if (['04', '05', '06', '07', '08', '09'].includes(cst)) {
      return `<COFINS><COFINSAliq><CST>${cst}</CST><vBC>0.00</vBC><pCOFINS>0.0000</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSAliq></COFINS>`;
    }

    const bcCofins = item.cofinsBaseCalculo || item.valorTotal;
    const aliqCofins = item.cofinsAliquota || 0;
    const valorCofins = item.cofinsValor || (bcCofins * aliqCofins / 100);

    return `<COFINS>`
      + `<COFINSAliq>`
      + `<CST>${cst}</CST>`
      + `<vBC>${this.formatarNumero(bcCofins, 2)}</vBC>`
      + `<pCOFINS>${this.formatarNumero(aliqCofins, 4)}</pCOFINS>`
      + `<vCOFINS>${this.formatarNumero(valorCofins, 2)}</vCOFINS>`
      + `</COFINSAliq>`
      + `</COFINS>`;
  }

  /**
   * Gera o grupo de totais (total)
   */
  private gerarTotal(nfe: NfeCompleta): string {
    const t = nfe.totais;

    return `<total>`
      + `<ICMSTot>`
      + `<vBC>${this.formatarNumero(t.valorIcms ? (t.valorTotalProdutos) : 0, 2)}</vBC>`
      + `<vICMS>${this.formatarNumero(t.valorIcms || 0, 2)}</vICMS>`
      + `<vICMSDeson>0.00</vICMSDeson>`
      + `<vFCPUFDest>0.00</vFCPUFDest>`
      + `<vICMSUFDest>0.00</vICMSUFDest>`
      + `<vICMSUFRemet>0.00</vICMSUFRemet>`
      + `<vFCP>0.00</vFCP>`
      + `<vBCST>0.00</vBCST>`
      + `<vST>${this.formatarNumero(t.valorIcmsSt || 0, 2)}</vST>`
      + `<vFCPST>0.00</vFCPST>`
      + `<vFCPSTRet>0.00</vFCPSTRet>`
      + `<vProd>${this.formatarNumero(t.valorTotalProdutos, 2)}</vProd>`
      + `<vFrete>${this.formatarNumero(t.valorFrete || 0, 2)}</vFrete>`
      + `<vSeg>${this.formatarNumero(t.valorSeguro || 0, 2)}</vSeg>`
      + `<vDesc>${this.formatarNumero(t.valorDesconto || 0, 2)}</vDesc>`
      + `<vII>0.00</vII>`
      + `<vIPI>${this.formatarNumero(t.valorIpi || 0, 2)}</vIPI>`
      + `<vIPIDevol>0.00</vIPIDevol>`
      + `<vPIS>${this.formatarNumero(t.valorPis || 0, 2)}</vPIS>`
      + `<vCOFINS>${this.formatarNumero(t.valorCofins || 0, 2)}</vCOFINS>`
      + `<vOutro>${this.formatarNumero(t.valorOutros || 0, 2)}</vOutro>`
      + `<vNF>${this.formatarNumero(t.valorTotalNf, 2)}</vNF>`
      + (t.valorAproximadoTributos
        ? `<vTotTrib>${this.formatarNumero(t.valorAproximadoTributos, 2)}</vTotTrib>` : '')
      + `</ICMSTot>`
      + `</total>`;
  }

  /**
   * Gera o grupo de transporte (transp)
   */
  private gerarTransp(nfe: NfeCompleta): string {
    const modFrete = nfe.modalidadeFrete ?? NfeModalidadeFrete.SEM_FRETE;

    let result = `<transp>`
      + `<modFrete>${modFrete}</modFrete>`;

    if (nfe.transportador) {
      result += `<transporta>`;
      if (nfe.transportador.cnpjCpf) {
        if (nfe.transportador.cnpjCpf.length === 14) {
          result += `<CNPJ>${nfe.transportador.cnpjCpf}</CNPJ>`;
        } else {
          result += `<CPF>${nfe.transportador.cnpjCpf}</CPF>`;
        }
      }
      if (nfe.transportador.razaoSocial) {
        result += `<xNome>${this.escaparXml(nfe.transportador.razaoSocial)}</xNome>`;
      }
      if (nfe.transportador.inscricaoEstadual) {
        result += `<IE>${nfe.transportador.inscricaoEstadual}</IE>`;
      }
      if (nfe.transportador.endereco) {
        result += `<xEnder>${this.escaparXml(nfe.transportador.endereco)}</xEnder>`;
      }
      if (nfe.transportador.municipio) {
        result += `<xMun>${this.escaparXml(nfe.transportador.municipio)}</xMun>`;
      }
      if (nfe.transportador.uf) {
        result += `<UF>${nfe.transportador.uf}</UF>`;
      }
      result += `</transporta>`;
    }

    result += `</transp>`;

    return result;
  }

  /**
   * Gera o grupo de pagamento (pag)
   */
  private gerarPag(pagamentos: NfePagamento[]): string {
    if (!pagamentos || pagamentos.length === 0) {
      // Pagamento padrão: à vista em dinheiro
      return `<pag>`
        + `<detPag>`
        + `<indPag>0</indPag>`
        + `<tPag>01</tPag>`
        + `<vPag>0.00</vPag>`
        + `</detPag>`
        + `</pag>`;
    }

    let result = `<pag>`;

    for (const pag of pagamentos) {
      result += `<detPag>`
        + `<indPag>${pag.indicadorFormaPagamento}</indPag>`
        + `<tPag>${pag.meioPagamento}</tPag>`
        + `<vPag>${this.formatarNumero(pag.valorPagamento, 2)}</vPag>`;

      // Dados do cartão (se aplicável)
      if (pag.meioPagamento === NfeMeioPagamento.CARTAO_CREDITO ||
        pag.meioPagamento === NfeMeioPagamento.CARTAO_DEBITO) {
        result += `<card>`
          + `<tpIntegra>${pag.tipoIntegracao || 2}</tpIntegra>` // 2 = Não integrado
          + (pag.cnpjCredenciadora ? `<CNPJ>${pag.cnpjCredenciadora}</CNPJ>` : '')
          + (pag.bandeira ? `<tBand>${pag.bandeira}</tBand>` : '')
          + (pag.autorizacao ? `<cAut>${pag.autorizacao}</cAut>` : '')
          + `</card>`;
      }

      result += `</detPag>`;
    }

    result += `</pag>`;

    return result;
  }

  /**
   * Gera o grupo de informações adicionais (infAdic)
   */
  private gerarInfAdic(nfe: NfeCompleta): string {
    if (!nfe.informacoesAdicionaisContribuinte && !nfe.informacoesAdicionaisFisco) {
      return '';
    }

    let result = `<infAdic>`;

    if (nfe.informacoesAdicionaisFisco) {
      result += `<infAdFisco>${this.escaparXml(nfe.informacoesAdicionaisFisco)}</infAdFisco>`;
    }

    if (nfe.informacoesAdicionaisContribuinte) {
      result += `<infCpl>${this.escaparXml(nfe.informacoesAdicionaisContribuinte)}</infCpl>`;
    }

    result += `</infAdic>`;

    return result;
  }

  /**
   * Gera XML para envio em lote
   */
  gerarXmlEnviNfe(xmlsAssinados: string[], idLote: string): string {
    const nfes = xmlsAssinados.map(xml => {
      // Remove declaração XML e namespace se já existirem
      return xml
        .replace(/<\?xml[^?]*\?>/gi, '')
        .replace(/xmlns="[^"]*"/gi, '');
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>`
      + `<enviNFe xmlns="${this.namespace}" versao="${this.versaoLayout}">`
      + `<idLote>${idLote}</idLote>`
      + `<indSinc>1</indSinc>` // 0=Assíncrono, 1=Síncrono
      + nfes
      + `</enviNFe>`;
  }

  /**
   * Gera XML de cancelamento
   */
  gerarXmlCancelamento(cancelamento: NfeCancelamento, config: NfeConfiguracao): string {
    const dataEvento = new Date();
    const idEvento = `ID${cancelamento.tipoEvento}${cancelamento.chaveAcesso}${String(cancelamento.sequenciaEvento).padStart(2, '0')}`;

    return `<?xml version="1.0" encoding="UTF-8"?>`
      + `<envEvento xmlns="${this.namespace}" versao="1.00">`
      + `<idLote>${Date.now()}</idLote>`
      + `<evento versao="1.00">`
      + `<infEvento Id="${idEvento}">`
      + `<cOrgao>41</cOrgao>` // PR
      + `<tpAmb>${config.ambiente}</tpAmb>`
      + `<CNPJ>${config.cnpj}</CNPJ>`
      + `<chNFe>${cancelamento.chaveAcesso}</chNFe>`
      + `<dhEvento>${this.formatarDataHora(dataEvento)}</dhEvento>`
      + `<tpEvento>${cancelamento.tipoEvento}</tpEvento>`
      + `<nSeqEvento>${cancelamento.sequenciaEvento}</nSeqEvento>`
      + `<verEvento>1.00</verEvento>`
      + `<detEvento versao="1.00">`
      + `<descEvento>Cancelamento</descEvento>`
      + `<nProt>${cancelamento.protocoloAutorizacaoNfe}</nProt>`
      + `<xJust>${this.escaparXml(cancelamento.justificativa)}</xJust>`
      + `</detEvento>`
      + `</infEvento>`
      + `</evento>`
      + `</envEvento>`;
  }

  /**
   * Gera XML de inutilização
   */
  gerarXmlInutilizacao(inutilizacao: NfeInutilizacao, config: NfeConfiguracao): string {
    const ano = String(inutilizacao.ano).slice(2);
    const idInut = `ID41${ano}${config.cnpj.padStart(14, '0')}55${String(inutilizacao.serie).padStart(3, '0')}${String(inutilizacao.numeroInicial).padStart(9, '0')}${String(inutilizacao.numeroFinal).padStart(9, '0')}`;

    return `<?xml version="1.0" encoding="UTF-8"?>`
      + `<inutNFe xmlns="${this.namespace}" versao="${this.versaoLayout}">`
      + `<infInut Id="${idInut}">`
      + `<tpAmb>${config.ambiente}</tpAmb>`
      + `<xServ>INUTILIZAR</xServ>`
      + `<cUF>41</cUF>` // PR
      + `<ano>${ano}</ano>`
      + `<CNPJ>${config.cnpj}</CNPJ>`
      + `<mod>55</mod>`
      + `<serie>${inutilizacao.serie}</serie>`
      + `<nNFIni>${inutilizacao.numeroInicial}</nNFIni>`
      + `<nNFFin>${inutilizacao.numeroFinal}</nNFFin>`
      + `<xJust>${this.escaparXml(inutilizacao.justificativa)}</xJust>`
      + `</infInut>`
      + `</inutNFe>`;
  }

  /**
   * Gera XML de consulta de status do serviço
   */
  gerarXmlConsultaStatusServico(ambiente: NfeAmbiente): string {
    return `<?xml version="1.0" encoding="UTF-8"?>`
      + `<consStatServ xmlns="${this.namespace}" versao="${this.versaoLayout}">`
      + `<tpAmb>${ambiente}</tpAmb>`
      + `<cUF>41</cUF>` // PR
      + `<xServ>STATUS</xServ>`
      + `</consStatServ>`;
  }

  /**
   * Gera XML de consulta de NF-e por chave de acesso
   */
  gerarXmlConsultaNfe(chaveAcesso: string, ambiente: NfeAmbiente): string {
    return `<?xml version="1.0" encoding="UTF-8"?>`
      + `<consSitNFe xmlns="${this.namespace}" versao="${this.versaoLayout}">`
      + `<tpAmb>${ambiente}</tpAmb>`
      + `<xServ>CONSULTAR</xServ>`
      + `<chNFe>${chaveAcesso}</chNFe>`
      + `</consSitNFe>`;
  }

  /**
   * Gera XML de consulta de recibo de lote
   */
  gerarXmlConsultaRecibo(recibo: string, ambiente: NfeAmbiente): string {
    return `<?xml version="1.0" encoding="UTF-8"?>`
      + `<consReciNFe xmlns="${this.namespace}" versao="${this.versaoLayout}">`
      + `<tpAmb>${ambiente}</tpAmb>`
      + `<nRec>${recibo}</nRec>`
      + `</consReciNFe>`;
  }

  /**
   * Escapa caracteres especiais para XML
   */
  private escaparXml(texto: string): string {
    if (!texto) return '';

    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .substring(0, 2000); // Limita tamanho para evitar problemas
  }

  /**
   * Formata número para XML
   */
  private formatarNumero(valor: number, casasDecimais: number): string {
    return valor.toFixed(casasDecimais);
  }

  /**
   * Formata data/hora para formato NF-e (ISO 8601 com timezone)
   */
  private formatarDataHora(data: Date): string {
    const offset = -3; // Brasília
    const d = new Date(data.getTime() + (offset * 60 * 60 * 1000));

    const ano = d.getUTCFullYear();
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(d.getUTCDate()).padStart(2, '0');
    const hora = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    const seg = String(d.getUTCSeconds()).padStart(2, '0');

    return `${ano}-${mes}-${dia}T${hora}:${min}:${seg}-03:00`;
  }
}

// Instância singleton
let xmlGeneratorInstance: XmlGeneratorService | null = null;

export function getXmlGeneratorService(): XmlGeneratorService {
  if (!xmlGeneratorInstance) {
    xmlGeneratorInstance = new XmlGeneratorService();
  }
  return xmlGeneratorInstance;
}

export default XmlGeneratorService;
