import React, { useState, useEffect } from 'react';
import { ImageIcon, XCircle, File as FileIcon } from 'lucide-react';

interface Step5UploadFotosProps {
  // A prop antiga onFilesSelected será substituída
  // onFilesSelected: (files: File[]) => void;
  setFotosNoStepper: (files: File[]) => void; // Nova prop para atualizar o estado no Stepper
  initialFiles?: File[]; // Para restaurar o estado se o usuário voltar para esta etapa
}

const Step5UploadFotos: React.FC<Step5UploadFotosProps> = ({ setFotosNoStepper, initialFiles = [] }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>(initialFiles);

  useEffect(() => {
    // Atualiza o estado no stepper sempre que selectedFiles mudar
    setFotosNoStepper(selectedFiles);
  }, [selectedFiles, setFotosNoStepper]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      // Adicionar apenas arquivos que ainda não foram selecionados (baseado no nome e tamanho)
      const uniqueNewFiles = newFiles.filter(newFile => 
        !selectedFiles.some(existingFile => 
          existingFile.name === newFile.name && existingFile.size === newFile.size
        )
      );
      setSelectedFiles(prevFiles => [...prevFiles, ...uniqueNewFiles]);
      // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente após remoção
      event.target.value = ''; 
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <ImageIcon className="w-16 h-16 text-emerald-600 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Upload de Fotos (Opcional)</h2>
        <p className="text-gray-500 mt-1">Se relevante, envie fotos (ex: lesão na pele). Formatos aceitos: JPG, PNG. Limite de 5 arquivos, 5MB cada.</p>
      </div>
      
      <label htmlFor="file-upload-fotos" className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-emerald-500 transition-colors block">
        <input 
          id="file-upload-fotos"
          type="file" 
          multiple 
          accept=".jpg, .jpeg, .png"
          onChange={handleFileChange} 
          className="hidden" // O input real fica escondido, o label é o gatilho visual
        />
        <p className="text-emerald-600 font-semibold">Clique aqui para selecionar as fotos</p>
        <p className="text-xs text-gray-400 mt-1">Ou arraste e solte os arquivos aqui</p>
      </label>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-600">Arquivos Selecionados:</h3>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
            {selectedFiles.map((file, index) => (
              <li key={index} className="px-3 py-2 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <FileIcon className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700 truncate max-w-xs">{file.name}</span>
                  <span className="text-gray-500 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleRemoveFile(file.name)} 
                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                  title="Remover arquivo"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Step5UploadFotos; 