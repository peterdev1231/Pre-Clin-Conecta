import React from 'react';
import { FileText, XCircle, File as FileIcon, UploadCloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Idealmente, FileUploadState seria um tipo compartilhado.
interface FileUploadState {
  id: string;
  file: File;
  status: 'pending' | 'getting_url' | 'uploading' | 'processing_metadata' | 'completed' | 'error';
  progress: number;
  error?: string;
  pathStorage?: string;
  tipoDocumento: 'foto' | 'exame';
}

interface Step6UploadExamesProps {
  submissionAttemptId: string;
  updateFileStateInStepper: (localFileId: string, newState: Partial<FileUploadState>) => void;
  initialFiles: FileUploadState[]; // Arquivos já conhecidos pelo Stepper (do tipo exame)
  // onRemoveFileInStepper: (localFileId: string) => void; // Para futura implementação
}

const Step6UploadExames: React.FC<Step6UploadExamesProps> = ({ 
  submissionAttemptId,
  updateFileStateInStepper,
  initialFiles 
}) => {
  const supabase = createClient();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      event.target.value = ''; 

      for (const file of newFiles) {
        const localFileId = `${file.name}-${file.lastModified}-${uuidv4()}`;
        const tipoDocumento = 'exame'; // MODIFICADO para 'exame'

        updateFileStateInStepper(localFileId, {
          id: localFileId,
          file,
          status: 'pending',
          progress: 0,
          tipoDocumento,
        });

        try {
          updateFileStateInStepper(localFileId, { status: 'getting_url', progress: 10 });
          const { data: signedUrlData, error: signedUrlError } = await supabase.functions.invoke(
            'gerar-url-upload',
            { body: { fileName: file.name, submissionAttemptId, tipoDocumento } }
          );

          if (signedUrlError || !signedUrlData?.signedUrl) {
            throw signedUrlError || new Error('URL de upload inválida retornada pela função.');
          }
          const { signedUrl, path: pathStorage } = signedUrlData;
          updateFileStateInStepper(localFileId, { progress: 20 });

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', signedUrl, true);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                updateFileStateInStepper(localFileId, { status: 'uploading', progress: 20 + Math.round(percentComplete * 0.6) });
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                updateFileStateInStepper(localFileId, { status: 'processing_metadata', progress: 80, pathStorage });
                resolve();
              } else {
                reject(new Error(`Falha no upload para o Storage: ${xhr.status} ${xhr.statusText}`));
              }
            };
            xhr.onerror = () => reject(new Error('Erro de rede durante o upload para o Storage.'));
            xhr.send(file);
          });

          const { error: metaError } = await supabase.functions.invoke('upload-arquivo-paciente', {
            body: {
              submission_attempt_id: submissionAttemptId,
              nome_arquivo_original: file.name,
              path_storage: pathStorage,
              tipo_mime: file.type || 'application/octet-stream',
              tipo_documento: tipoDocumento,
              tamanho_arquivo_bytes: file.size,
            },
          });

          if (metaError) {
            throw metaError;
          }
          updateFileStateInStepper(localFileId, { status: 'completed', progress: 100 });
        } catch (error: any) {
          console.error(`Erro no processamento do arquivo ${file.name} (tipo: ${tipoDocumento}):`, error);
          updateFileStateInStepper(localFileId, { 
            status: 'error', 
            progress: 0,
            error: error.message || 'Ocorreu um erro desconhecido durante o upload.'
          });
        }
      }
    }
  };

  const handleRemoveFileLocal = (localFileIdToRemove: string) => {
    console.warn("handleRemoveFileLocal não implementado para o novo fluxo", localFileIdToRemove);
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
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" // Atributo accept apropriado para exames
          onChange={handleFileChange} 
          className="hidden"
        />
        <UploadCloud className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-emerald-600 font-semibold">Clique para selecionar os exames</p>
        <p className="text-xs text-gray-400 mt-1">Ou arraste e solte os arquivos aqui</p>
      </label>

      {initialFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-600">Arquivos em Processamento/Enviados:</h3>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
            {initialFiles.map((uploadState) => (
              <li key={uploadState.id} className="px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    {uploadState.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> :
                     uploadState.status === 'error' ? <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" /> :
                     <FileIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                    <span className="text-gray-700 truncate">{uploadState.file.name}</span>
                    <span className="text-gray-500 text-xs flex-shrink-0">({(uploadState.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveFileLocal(uploadState.id)} 
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remover arquivo (desabilitado temporariamente)"
                    disabled 
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                {(uploadState.status === 'uploading' || uploadState.status === 'getting_url' || uploadState.status === 'processing_metadata') && (
                  <div className="mt-1.5 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-150"
                      style={{ width: `${uploadState.progress}%` }}
                    ></div>
                  </div>
                )}
                <p className={`mt-1 text-xs ${uploadState.status === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
                  {uploadState.status === 'uploading' ? `Enviando... ${uploadState.progress}%` :
                   uploadState.status === 'completed' ? 'Upload concluído com sucesso!' :
                   uploadState.status === 'error' ? `Erro: ${uploadState.error || 'Falha no upload'}` :
                   uploadState.status === 'pending' ? 'Aguardando para iniciar upload...' :
                   uploadState.status === 'getting_url' ? 'Obtendo permissão de upload...' :
                   uploadState.status === 'processing_metadata' ? 'Finalizando e registrando arquivo...' :
                   ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Step6UploadExames; 