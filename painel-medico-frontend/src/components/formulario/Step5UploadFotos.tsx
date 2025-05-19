import React, { useState, useEffect } from 'react';
import { ImageIcon, XCircle, File as FileIcon, UploadCloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client'; // Para chamar as Edge Functions
import { v4 as uuidv4 } from 'uuid'; // Para gerar IDs locais de arquivo

// Importar o tipo FileUploadState do Stepper (ou definir um similar se não for exportado)
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

interface Step5UploadFotosProps {
  submissionAttemptId: string;
  onFileUploadStart: (file: File, tipoDocumento: 'foto' | 'exame', localFileId: string) => void;
  updateFileStateInStepper: (localFileId: string, newState: Partial<FileUploadState>) => void;
  initialFiles: FileUploadState[]; // Arquivos já conhecidos pelo Stepper (do tipo foto)
  // TODO: Adicionar uma prop para remover/cancelar um upload
  // onRemoveFileInStepper: (localFileId: string) => void;
}

const Step5UploadFotos: React.FC<Step5UploadFotosProps> = ({ 
  submissionAttemptId,
  onFileUploadStart,
  updateFileStateInStepper,
  initialFiles 
}) => {
  const supabase = createClient();
  // O estado local de `selectedFiles` não é mais a fonte primária da verdade para o stepper,
  // mas pode ser usado para gerenciar a seleção *antes* de iniciar o upload.
  // Por simplicidade inicial, vamos derivar a exibição dos `initialFiles` e focar no upload.

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      event.target.value = ''; // Limpar para permitir selecionar o mesmo arquivo novamente

      for (const file of newFiles) {
        const tipoDocumento = 'foto';
        const localFileId = `${file.name}-${file.lastModified}-${uuidv4()}`;

        // 1. Chamar onFileUploadStart para que o Stepper crie a entrada inicial.
        onFileUploadStart(file, tipoDocumento, localFileId);

        // AGORA, as chamadas subsequentes a updateFileStateInStepper devem encontrar o ID.
        try {
          updateFileStateInStepper(localFileId, { status: 'getting_url', progress: 10 });
          
          // ADICIONAR CONSOLE.LOG PARA DEBUG
          console.log('[Step5UploadFotos] Chamando gerar-url-upload com:', {
            fileName: file.name,
            submissionAttemptId,
            tipoDocumento
          });

          const { data: signedUrlData, error: signedUrlError } = await supabase.functions.invoke(
            'gerar-url-upload',
            { body: { fileName: file.name, submissionAttemptId, tipoDocumento } }
          );

          if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error('[Step5UploadFotos] Signed URL Error:', signedUrlError, signedUrlData);
            throw signedUrlError || new Error('URL de upload inválida retornada pela função.');
          }
          const { signedUrl, path: pathStorage } = signedUrlData;
          updateFileStateInStepper(localFileId, { progress: 20 });

          // 3. Fazer upload para o Storage com monitoramento de progresso
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', signedUrl, true);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                updateFileStateInStepper(localFileId, { status: 'uploading', progress: 20 + Math.round(percentComplete * 0.6) }); // 20-80%
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

          // 4. Registrar metadados
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
            console.error('[Step5UploadFotos] Metadata Error:', metaError);
            throw metaError;
          }

          updateFileStateInStepper(localFileId, { status: 'completed', progress: 100 });

        } catch (error: any) {
          console.error(`Erro no processamento do arquivo ${file.name} (localId: ${localFileId}):`, error);
          updateFileStateInStepper(localFileId, { 
            status: 'error', 
            progress: 0, // Resetar progresso em caso de erro
            error: error.message || 'Ocorreu um erro desconhecido durante o upload.'
          });
        }
      }
    }
  };

  // A função de remover     arquivo precisará ser reavaliada.
  // Se o arquivo já foi enviado, a remoção envolve mais do que apenas o estado local.
  // Por agora, esta função não fará nada ou será removida para evitar confusão.
  const handleRemoveFileLocal = (localFileIdToRemove: string) => {
    // TODO: Implementar lógica de remoção/cancelamento, que pode precisar chamar o stepper
    // e possivelmente uma edge function para deletar do storage se já foi feito upload.
    console.warn("handleRemoveFileLocal não implementado para o novo fluxo", localFileIdToRemove);
    // Exemplo: onRemoveFileInStepper(localFileIdToRemove);
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
          className="hidden"
        />
        <UploadCloud className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-emerald-600 font-semibold">Clique para selecionar as fotos</p>
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
                    disabled // Desabilitado até a lógica de remoção ser totalmente implementada
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                {/* Barra de progresso e mensagens de status/erro */} 
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

export default Step5UploadFotos; 