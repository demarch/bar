/**
 * Página de Configuração de NF-e
 * Configuração do emitente, certificado digital e parâmetros
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  useNfeConfiguracao,
  useSalvarNfeConfiguracao,
  useValidarCertificado,
  useUploadCertificado,
  useNfeStatusServico
} from '../../hooks/useNfe';
import { NfeConfiguracao } from '../../types';

// Regimes Tributários
const REGIMES_TRIBUTARIOS = [
  { value: 1, label: 'Simples Nacional' },
  { value: 2, label: 'Simples Nacional - Excesso de sublimite' },
  { value: 3, label: 'Regime Normal' }
];

// Ambientes
const AMBIENTES = [
  { value: 2, label: 'Homologação (Testes)' },
  { value: 1, label: 'Produção' }
];

export default function NfeConfig() {
  const [activeTab, setActiveTab] = useState<'emitente' | 'certificado' | 'parametros'>('emitente');
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [certificadoSenha, setCertificadoSenha] = useState('');

  const { data: config, isLoading: configLoading } = useNfeConfiguracao();
  const { data: certificadoInfo } = useValidarCertificado();
  const { data: statusServico } = useNfeStatusServico();

  const salvarMutation = useSalvarNfeConfiguracao();
  const uploadCertMutation = useUploadCertificado();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<NfeConfiguracao>>();

  useEffect(() => {
    if (config) {
      reset(config);
    }
  }, [config, reset]);

  const onSubmit = async (data: Partial<NfeConfiguracao>) => {
    try {
      await salvarMutation.mutateAsync(data);
      alert('Configuração salva com sucesso!');
    } catch (error: any) {
      alert('Erro ao salvar: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUploadCertificado = async () => {
    if (!certificadoFile || !certificadoSenha) {
      alert('Selecione o arquivo do certificado e informe a senha');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        await uploadCertMutation.mutateAsync({
          certificado: base64,
          senha: certificadoSenha
        });
        alert('Certificado carregado com sucesso!');
        setCertificadoFile(null);
        setCertificadoSenha('');
      };
      reader.readAsDataURL(certificadoFile);
    } catch (error: any) {
      alert('Erro ao carregar certificado: ' + (error.response?.data?.message || error.message));
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Configuração NF-e</h1>

      {/* Status do Serviço */}
      <div className={`mb-6 p-4 rounded-lg ${statusServico?.online ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusServico?.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="font-medium">
            Status SEFAZ: {statusServico?.online ? 'Online' : 'Offline'}
          </span>
          {statusServico && (
            <span className="text-sm text-gray-600">
              ({statusServico.ambiente === 1 ? 'Produção' : 'Homologação'})
            </span>
          )}
        </div>
        {statusServico && !statusServico.online && (
          <p className="text-sm text-red-600 mt-1">{statusServico.motivoStatus}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {[
            { id: 'emitente', label: 'Dados do Emitente' },
            { id: 'certificado', label: 'Certificado Digital' },
            { id: 'parametros', label: 'Parâmetros NF-e' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Tab: Dados do Emitente */}
        {activeTab === 'emitente' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razão Social *
                </label>
                <input
                  {...register('razaoSocial', { required: 'Razão social é obrigatória' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  maxLength={60}
                />
                {errors.razaoSocial && (
                  <span className="text-red-500 text-sm">{errors.razaoSocial.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Fantasia
                </label>
                <input
                  {...register('nomeFantasia')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ *
                </label>
                <input
                  {...register('cnpj', { required: 'CNPJ é obrigatório', pattern: /^\d{14}$/ })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="00000000000000"
                  maxLength={14}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inscrição Estadual *
                </label>
                <input
                  {...register('inscricaoEstadual', { required: 'IE é obrigatória' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inscrição Municipal
                </label>
                <input
                  {...register('inscricaoMunicipal')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNAE Fiscal
                </label>
                <input
                  {...register('cnaeFiscal')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  maxLength={7}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regime Tributário *
                </label>
                <select
                  {...register('codigoRegimeTributario', { required: true, valueAsNumber: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {REGIMES_TRIBUTARIOS.map((regime) => (
                    <option key={regime.value} value={regime.value}>
                      {regime.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  {...register('telefone')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="(41) 99999-9999"
                />
              </div>
            </div>

            <h3 className="text-lg font-medium mt-6 mb-4">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logradouro *
                </label>
                <input
                  {...register('logradouro', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número *
                </label>
                <input
                  {...register('numero', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complemento
                </label>
                <input
                  {...register('complemento')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro *
                </label>
                <input
                  {...register('bairro', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP *
                </label>
                <input
                  {...register('cep', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="00000000"
                  maxLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código Município *
                </label>
                <input
                  {...register('codigoMunicipio', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="4106902"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Município *
                </label>
                <input
                  {...register('nomeMunicipio', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UF *
                </label>
                <input
                  {...register('uf', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  defaultValue="PR"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Certificado Digital */}
        {activeTab === 'certificado' && (
          <div className="space-y-6">
            {/* Status do Certificado Atual */}
            {certificadoInfo && (
              <div className={`p-4 rounded-lg ${certificadoInfo.valido ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className="font-medium mb-2">
                  Certificado Atual: {certificadoInfo.valido ? 'Válido' : 'Inválido/Expirado'}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Titular:</span>
                    <span className="ml-2">{certificadoInfo.titular}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">CNPJ:</span>
                    <span className="ml-2">{certificadoInfo.cnpj}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Emissor:</span>
                    <span className="ml-2">{certificadoInfo.emissor}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Validade:</span>
                    <span className="ml-2">
                      {new Date(certificadoInfo.validadeFim).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Dias para expirar:</span>
                    <span className={`ml-2 font-medium ${certificadoInfo.diasParaExpirar <= 30 ? 'text-red-600' : 'text-green-600'}`}>
                      {certificadoInfo.diasParaExpirar} dias
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload de Novo Certificado */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-medium mb-4">Carregar Certificado Digital (A1)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arquivo do Certificado (.pfx ou .p12)
                  </label>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha do Certificado
                  </label>
                  <input
                    type="password"
                    value={certificadoSenha}
                    onChange={(e) => setCertificadoSenha(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Digite a senha do certificado"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUploadCertificado}
                  disabled={uploadCertMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadCertMutation.isPending ? 'Carregando...' : 'Carregar Certificado'}
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">Importante</h4>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>O certificado digital deve ser do tipo A1 (arquivo)</li>
                <li>Deve estar em nome da pessoa jurídica (CNPJ do emitente)</li>
                <li>Deve ser emitido por autoridade certificadora ICP-Brasil</li>
                <li>Certifique-se de que o certificado está válido</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab: Parâmetros NF-e */}
        {activeTab === 'parametros' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ambiente *
                </label>
                <select
                  {...register('ambiente', { required: true, valueAsNumber: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {AMBIENTES.map((amb) => (
                    <option key={amb.value} value={amb.value}>
                      {amb.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Use Homologação para testes. NF-e de homologação não têm validade fiscal.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Série NF-e *
                </label>
                <input
                  type="number"
                  {...register('serieNfe', { required: true, valueAsNumber: true, min: 1 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Próximo Número NF-e
                </label>
                <input
                  type="number"
                  {...register('proximoNumeroNfe', { valueAsNumber: true, min: 1 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100"
                  min={1}
                  disabled
                />
                <p className="text-sm text-gray-500 mt-1">
                  Controlado automaticamente pelo sistema
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formato DANFE
                </label>
                <select
                  {...register('tipoImpressaoDanfe', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Retrato</option>
                  <option value={2}>Paisagem</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Requisitos para Credenciamento (SEFA/PR)</h4>
              <p className="text-sm text-blue-700 mb-2">
                Para obter credenciamento como emissor de NF-e, é necessário realizar testes em ambiente de homologação:
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Autorizações: quantidade igual ao pico diário informado no requerimento</li>
                <li>Cancelamentos: 1/10 do pico diário (máximo 20)</li>
                <li>Inutilizações: 1/10 do pico diário (máximo 20)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={() => reset(config || {})}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvarMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {salvarMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </form>
    </div>
  );
}
