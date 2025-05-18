import React from 'react';
import { File as FileIcon, Edit3 } from 'lucide-react';

interface Step7ReviewProps {
  formData: {
    nomePaciente: string;
    queixaPrincipal: string;
    medicacoesEmUso: string;
    alergiasConhecidas: string;
    naoPossuiAlergias?: boolean;
  };
  fotos: File[];
  exames: File[];
  onEditStep: (step: number) => void;
}

const ReviewItem: React.FC<{label: string, value: string, step: number, onEditStep: (step: number) => void}> = ({label, value, step, onEditStep}) => (
  <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-emerald-50 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm font-medium text-emerald-700">{label}</p>
        <p className="text-lg text-gray-800 whitespace-pre-wrap break-words">{value || 'Não informado'}</p>
      </div>
      <button
        onClick={() => onEditStep(step)}
        className="text-sm text-emerald-600 hover:text-emerald-800 transition-colors p-2 rounded-md hover:bg-emerald-100 flex items-center"
      >
        <Edit3 size={16} className="mr-1" /> Editar
      </button>
    </div>
  </div>
);

const FileListItem: React.FC<{file: File}> = ({file}) => (
  <li className="flex items-center space-x-2 py-1">
    <FileIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
    <span className="text-gray-700 truncate">{file.name}</span>
    <span className="text-gray-500 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
  </li>
);

const Step7Review: React.FC<Step7ReviewProps> = ({ formData, fotos, exames, onEditStep }) => {
  const displayAlergias = formData.naoPossuiAlergias 
    ? 'Paciente informou não possuir alergias conhecidas' 
    : formData.alergiasConhecidas || 'Não informado';

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
        Revise suas Informações
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReviewItem label="Nome do Paciente" value={formData.nomePaciente} step={1} onEditStep={onEditStep} />
        <ReviewItem label="Queixa Principal" value={formData.queixaPrincipal} step={2} onEditStep={onEditStep} />
        <ReviewItem label="Medicações em Uso" value={formData.medicacoesEmUso} step={3} onEditStep={onEditStep} />
        <ReviewItem label="Alergias Conhecidas" value={displayAlergias} step={4} onEditStep={onEditStep} />
        
        {/* Fotos (Opcional) */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-emerald-50 hover:shadow-md transition-shadow md:col-span-1">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-emerald-700">Fotos Enviadas (Opcional)</p>
            <button
              onClick={() => onEditStep(5)}
              className="text-sm text-emerald-600 hover:text-emerald-800 transition-colors p-2 rounded-md hover:bg-emerald-100 flex items-center"
            >
              <Edit3 size={16} className="mr-1" /> Editar
            </button>
          </div>
          {fotos && fotos.length > 0 ? (
            <ul className="space-y-1 mt-1">
              {fotos.map((file, index) => (
                <FileListItem key={`foto-${index}`} file={file} />
              ))}
            </ul>
          ) : (
            <p className="text-md text-gray-600">Nenhuma foto será enviada.</p>
          )}
        </div>

        {/* Exames (Opcional) */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-emerald-50 hover:shadow-md transition-shadow md:col-span-1">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-emerald-700">Exames Enviados (Opcional)</p>
            <button
              onClick={() => onEditStep(6)}
              className="text-sm text-emerald-600 hover:text-emerald-800 transition-colors p-2 rounded-md hover:bg-emerald-100 flex items-center"
            >
              <Edit3 size={16} className="mr-1" /> Editar
            </button>
          </div>
          {exames && exames.length > 0 ? (
            <ul className="space-y-1 mt-1">
              {exames.map((file, index) => (
                <FileListItem key={`exame-${index}`} file={file} />
              ))}
            </ul>
          ) : (
            <p className="text-md text-gray-600">Nenhum exame será enviado.</p>
          )}
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-600 text-center bg-yellow-50 border border-yellow-200 p-3 rounded-md">
        Por favor, revise todas as informações cuidadosamente. Após o envio, não será possível editar.
      </p>
    </div>
  );
};

export default Step7Review; 