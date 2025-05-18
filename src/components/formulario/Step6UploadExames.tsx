import React, { useState, useEffect } from 'react';
import { FileText, XCircle, File as FileIcon } from 'lucide-react';

interface Step6UploadExamesProps {
  setExamesNoStepper: (files: File[]) => void;
  initialFiles?: File[];
}

const Step6UploadExames: React.FC<Step6UploadExamesProps> = ({ setExamesNoStepper, initialFiles = [] }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>(initialFiles);

  useEffect(() => {
    setExamesNoStepper(selectedFiles);
  }, [selectedFiles, setExamesNoStepper]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const uniqueNewFiles = newFiles.filter(newFile => 
        !selectedFiles.some(existingFile => 
          existingFile.name === newFile.name && existingFile.size === newFile.size
        )
      );
      setSelectedFiles(prevFiles => [...prevFiles, ...uniqueNewFiles]);
      event.target.value = '';
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <FileText className="w-16 h-16 text-emerald-600 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Upload de Exames (Opcional)</h2>
        <p className="text-gray-500 mt-1">Se possuir, envie exames relevantes (ex: sangue, imagem). Formatos: PDF, JPG, PNG. Limite de 5 arquivos, 10MB cada.</p>
      </div>
      
      <label htmlFor="file-upload-exames" className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-emerald-500 transition-colors block">
        <input 
          id="file-upload-exames"
          type="file" 
          multiple 
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange} 
          className="hidden"
        />
        <p className="text-emerald-600 font-semibold">Clique aqui para selecionar os exames</p>
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

export default Step6UploadExames; 