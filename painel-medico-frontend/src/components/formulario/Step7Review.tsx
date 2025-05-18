import React from 'react';
import { ListChecks, User, HeartPulse, Pill, ShieldAlert, ImageIcon, FileText, Edit3, CheckCircle, AlertCircle } from 'lucide-react';

// Importar ou definir FileUploadState, se não for importado de um local compartilhado
interface FileUploadState {
  id: string;
  file: File;
  status: 'pending' | 'getting_url' | 'uploading' | 'processing_metadata' | 'completed' | 'error';
  progress: number;
  error?: string;
  pathStorage?: string;
  tipoDocumento: 'foto' | 'exame';
}

interface Step7ReviewProps {
  formData: {
    nomePaciente: string;
    queixaPrincipal: string;
    medicacoesEmUso?: string;
    alergiasConhecidas?: string;
    naoPossuiAlergias?: boolean;
  };
  fotos: FileUploadState[]; // ATUALIZADO
  exames: FileUploadState[]; // ATUALIZADO
  onEditStep: (step: number) => void;
}

const Step7Review: React.FC<Step7ReviewProps> = ({ formData, fotos, exames, onEditStep }) => {
  const { nomePaciente, queixaPrincipal, medicacoesEmUso, alergiasConhecidas, naoPossuiAlergias } = formData;

  const renderFileList = (files: FileUploadState[], fileType: string) => {
    if (!files || files.length === 0) {
      return <p className="text-gray-500 italic">Nenhum arquivo de {fileType} enviado.</p>;
    }
    return (
      <ul className="list-disc list-inside space-y-1 pl-1">
        {files.map((uploadState) => (
          <li key={uploadState.id} className="text-gray-700 flex items-center">
            {uploadState.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />}
            {uploadState.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />}
            {uploadState.status !== 'completed' && uploadState.status !== 'error' && <ListChecks className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />} {/* Em andamento/Pendente */}
            <span className="truncate">{uploadState.file.name}</span>
            {uploadState.status === 'error' && <span className="text-xs text-red-500 ml-2">(Falha no upload)</span>}
            {uploadState.status !== 'completed' && uploadState.status !== 'error' && <span className="text-xs text-blue-500 ml-2">({uploadState.status === 'uploading' ? `Enviando ${uploadState.progress}%` : 'Processando...'})</span>}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center">
        <ListChecks className="w-16 h-16 text-emerald-600 mb-4" />
        <h2 className="text-3xl font-semibold text-gray-800">Revise suas Informações</h2>
        <p className="text-gray-600 mt-2">Por favor, verifique todos os dados antes de confirmar o envio.</p>
      </div>

      {/* Resumo dos Dados */}
      <div className="space-y-6">
        {/* Nome do Paciente */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <User className="w-6 h-6 text-emerald-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-700">Nome do Paciente</h3>
            </div>
            <button onClick={() => onEditStep(1)} className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center">
              <Edit3 className="w-4 h-4 mr-1" /> Editar
            </button>
          </div>
          <p className="text-gray-700 pl-9">{nomePaciente || <span className="italic text-gray-400">Não informado</span>}</p>
        </div>

        {/* Queixa Principal */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <HeartPulse className="w-6 h-6 text-emerald-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-700">Queixa Principal</h3>
            </div>
            <button onClick={() => onEditStep(2)} className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center">
              <Edit3 className="w-4 h-4 mr-1" /> Editar
            </button>
          </div>
          <p className="text-gray-700 pl-9 whitespace-pre-wrap">{queixaPrincipal || <span className="italic text-gray-400">Não informado</span>}</p>
        </div>

        {/* Medicações em Uso */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Pill className="w-6 h-6 text-emerald-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-700">Medicações em Uso</h3>
            </div>
            <button onClick={() => onEditStep(3)} className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center">
              <Edit3 className="w-4 h-4 mr-1" /> Editar
            </button>
          </div>
          <p className="text-gray-700 pl-9 whitespace-pre-wrap">{medicacoesEmUso || <span className="italic text-gray-400">Não informado</span>}</p>
        </div>

        {/* Alergias Conhecidas */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <ShieldAlert className="w-6 h-6 text-emerald-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-700">Alergias Conhecidas</h3>
            </div>
            <button onClick={() => onEditStep(4)} className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center">
              <Edit3 className="w-4 h-4 mr-1" /> Editar
            </button>
          </div>
          <p className="text-gray-700 pl-9 whitespace-pre-wrap">
            {naoPossuiAlergias ? "Paciente informou não possuir alergias conhecidas." : (alergiasConhecidas || <span className="italic text-gray-400">Não informado</span>)}
          </p>
        </div>

        {/* Fotos */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <ImageIcon className="w-6 h-6 text-emerald-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-700">Fotos Enviadas</h3>
            </div>
            <button onClick={() => onEditStep(5)} className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center">
              <Edit3 className="w-4 h-4 mr-1" /> Editar
            </button>
          </div>
          <div className="pl-9">
            {renderFileList(fotos, "fotos")}
          </div>
        </div>

        {/* Exames */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-emerald-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-700">Exames Enviados</h3>
            </div>
            <button onClick={() => onEditStep(6)} className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center">
              <Edit3 className="w-4 h-4 mr-1" /> Editar
            </button>
          </div>
          <div className="pl-9">
            {renderFileList(exames, "exames")}
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-gray-500">
          Ao confirmar, seus dados serão enviados de forma segura para o profissional de saúde.
        </p>
      </div>
    </div>
  );
};

export default Step7Review; 