import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle, FileText, HeartPulse, ImageIcon, ListChecks, Pill, ShieldAlert, User, XCircle, UploadCloud } from 'lucide-react';
import Step1Name from './Step1Name';
import Step2Queixa from './Step2Queixa';
import Step3Medicacoes from './Step3Medicacoes';
import Step4Alergias from './Step4Alergias';
import Step5UploadFotos from './Step5UploadFotos';
import Step6UploadExames from './Step6UploadExames';
import Step7Review from './Step7Review';

interface PatientFormStepperProps {
  linkId: string;
  onFormSubmitSuccess: (submissionId: string) => void;
}

interface FormData {
  nomePaciente: string;
  queixaPrincipal: string;
  medicacoesEmUso: string;
  alergiasConhecidas: string;
  naoPossuiAlergias?: boolean;
}

const PatientFormStepper: React.FC<PatientFormStepperProps> = ({ linkId, onFormSubmitSuccess }) => {
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    nomePaciente: '',
    queixaPrincipal: '',
    medicacoesEmUso: '',
    alergiasConhecidas: '',
    naoPossuiAlergias: false,
  });
  const [fotosSelecionadas, setFotosSelecionadas] = useState<File[]>([]);
  const [examesSelecionados, setExamesSelecionados] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filesUploaded, setFilesUploaded] = useState(0);
  const [totalFilesToUpload, setTotalFilesToUpload] = useState(0);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const totalSteps = 7;

  const logToScreen = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
    const messageParts: string[] = [];
    args.forEach(arg => {
      if (typeof arg === 'object') {
        try {
          messageParts.push(JSON.stringify(arg, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          , 2));
        } catch (e: any) {
          messageParts.push(`[Não serializável: ${e.message}]`);
        }
      } else {
        messageParts.push(String(arg));
      }
    });
    const fullMessage = `[${level.toUpperCase()}] ${new Date().toISOString()} - ${messageParts.join(' ')}`;
    
    setDebugMessages(prev => [...prev.slice(-100), fullMessage]);

    if (level === 'log') console.log(...args);
    else if (level === 'warn') console.warn(...args);
    else if (level === 'error') console.error(...args);
  };

  const steps = [
    { title: 'Nome', icon: <User className="w-5 h-5" /> },
    { title: 'Queixa Principal', icon: <HeartPulse className="w-5 h-5" /> },
    { title: 'Medicações', icon: <Pill className="w-5 h-5" /> },
    { title: 'Alergias', icon: <ShieldAlert className="w-5 h-5" /> },
    { title: 'Fotos (Opcional)', icon: <ImageIcon className="w-5 h-5" /> },
    { title: 'Exames (Opcional)', icon: <FileText className="w-5 h-5" /> },
    { title: 'Revisão', icon: <ListChecks className="w-5 h-5" /> },
  ];

  const handleChange = (input: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prevState => ({
         ...prevState,
        [input]: value,
        ...(input === 'naoPossuiAlergias' && value === true && { alergiasConhecidas: '' }),
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 1 && !formData.nomePaciente.trim()) {
        setError('O nome do paciente é obrigatório.');
        return;
      }
      if (currentStep === 2 && !formData.queixaPrincipal.trim()) {
        setError('A queixa principal é obrigatória.');
        return;
      }
      setError(null);
      setCurrentStep(prevStep => prevStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prevStep => prevStep - 1);
      setError(null);
    }
  };
  
  const handleEditStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
      setError(null);
    }
  };

  const uploadFile = async (file: File, respostaId: string, tipoDocumento: 'foto' | 'exame') => {
    logToScreen('log', `[UPLOAD_LOGS] START - Tipo: ${tipoDocumento}, Arquivo: ${file.name}, Tamanho: ${file.size}, MimeType: ${file.type}, LastModified: ${file.lastModified}`);
    try {
      logToScreen('log', '[UPLOAD_LOGS] File Object (JSON.stringify attempt):', file);
    } catch (e: any) {
      logToScreen('warn', '[UPLOAD_LOGS] Could not stringify complete File object directly for screen log:', e.message);
    }

    try {
      logToScreen('log', `[UPLOAD_LOGS ${tipoDocumento}] Requesting signed URL for: ${file.name}`);
      const { data: signedUrlData, error: signedUrlError } = await supabase.functions.invoke('gerar-url-upload', {
        body: {
          fileName: file.name,
          respostaPacienteId: respostaId,
          tipoDocumento: tipoDocumento,
        },
      });

      if (signedUrlError) {
        logToScreen('error', `[UPLOAD_LOGS ${tipoDocumento}] ERROR - Failed to get signed URL for ${file.name}:`, signedUrlError.message, signedUrlError);
        setUploadError(prev => `${prev || ''}Falha ao obter URL para ${file.name}: ${signedUrlError.message}. `);
        setFilesUploaded(prev => prev + 1);
        return;
      }

      if (!signedUrlData || !signedUrlData.signedUrl || !signedUrlData.path) {
        logToScreen('error', `[UPLOAD_LOGS ${tipoDocumento}] ERROR - Invalid signed URL data for ${file.name}:`, signedUrlData);
        setUploadError(prev => `${prev || ''}Dados de URL inválidos para ${file.name}. `);
        setFilesUploaded(prev => prev + 1);
        return;
      }

      const { signedUrl, path: pathStorage } = signedUrlData;
      logToScreen('log', `[UPLOAD_LOGS ${tipoDocumento}] Got signed URL for ${file.name}. URL: ${signedUrl}, Uploading to path: ${pathStorage}`);

      const response = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!response.ok) {
        let errorBodyText = 'Could not read error body';
        try {
            errorBodyText = await response.text();
        } catch (e: any) {
            logToScreen('warn', `[UPLOAD_LOGS ${tipoDocumento}] WARN - Could not read text from error response for ${file.name}: ${e.message}`);
        }
        logToScreen('error', `[UPLOAD_LOGS ${tipoDocumento}] FAILED - Direct upload to Storage failed for ${file.name} (Status: ${response.status}, StatusText: ${response.statusText}). Body:`, errorBodyText);
        setUploadError(prev => `${prev || ''}Upload direto falhou para ${file.name} (Status: ${response.status}). Detalhe: ${errorBodyText}. `);
      } else {
        logToScreen('log', `[UPLOAD_LOGS ${tipoDocumento}] SUCCESS - Successfully uploaded ${file.name} directly to Storage. Path: ${pathStorage}`);

        logToScreen('log', `[UPLOAD_LOGS ${tipoDocumento}] Registering metadata for ${file.name}, path: ${pathStorage}`);
        const { error: metaError } = await supabase.functions.invoke('upload-arquivo-paciente', {
          body: {
            resposta_paciente_id: respostaId,
            nome_arquivo_original: file.name,
            path_storage: pathStorage,
            tipo_mime: file.type || 'application/octet-stream',
            tipo_documento: tipoDocumento,
            tamanho_arquivo_bytes: file.size,
          },
        });

        if (metaError) {
          logToScreen('error', `[UPLOAD_LOGS ${tipoDocumento}] ERROR - Failed to register metadata for ${file.name}:`, metaError.message, metaError);
          setUploadError(prev => `${prev || ''}Falha ao registrar metadados para ${file.name}: ${metaError.message}. `);
        } else {
          logToScreen('log', `[UPLOAD_LOGS ${tipoDocumento}] SUCCESS - Successfully registered metadata for ${file.name}`);
        }
      }

    } catch (err: any) {
      let detailedErrorMessage = err.message;
      logToScreen(
        'error',
        `[UPLOAD_LOGS ${tipoDocumento}] EXCEPTION - Upload process for ${file.name}: `,
        'Message:', err.message, 
        'Name:', err.name, 
        err.cause ? 'Cause:' : '', err.cause
      );
      if (err.cause) {
        try {
          const causeDetails = JSON.stringify(err.cause, Object.getOwnPropertyNames(err.cause));
          detailedErrorMessage += ` Causa: ${causeDetails}`;
        } catch (stringifyError: any) { 
          detailedErrorMessage += ` Causa: (não foi possível serializar causa - ${stringifyError.message})`;
        }
      }
      setUploadError(prev => `${prev || ''}Exceção no upload de ${file.name}: ${detailedErrorMessage}. `);
    } finally {
      setFilesUploaded(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (currentStep !== totalSteps) return;

    if (!formData.nomePaciente.trim()) {
      setError('O nome do paciente é obrigatório. Verifique na etapa de revisão.');
      setCurrentStep(1);
      return;
    }
    if (!formData.queixaPrincipal.trim()) {
      setError('A queixa principal é obrigatória. Verifique na etapa de revisão.');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadError(null);
    setFilesUploaded(0);
    setTotalFilesToUpload(fotosSelecionadas.length + examesSelecionados.length);

    let submissionId: string | null = null;

    try {
      const payload = {
        linkId: linkId,
        nomePaciente: formData.nomePaciente,
        queixaPrincipal: formData.queixaPrincipal,
        medicacoesEmUso: formData.medicacoesEmUso || '',
        alergiasConhecidas: formData.naoPossuiAlergias 
            ? 'Paciente informou não possuir alergias conhecidas' 
            : formData.alergiasConhecidas || 'Não informado',
      };

      const { data, error: submissionError } = await supabase.functions.invoke('submeter-formulario-paciente', {
        body: payload,
      });

      if (submissionError) {
        console.error('Erro ao submeter dados do formulário:', submissionError);
        let displayError = 'Ocorreu um erro ao submeter o formulário. Tente novamente.';
        if (submissionError.message.includes('Function returned an error')) {
          try {
            const errorResponse = JSON.parse(submissionError.message.substring(submissionError.message.indexOf('{')));
            displayError = errorResponse.error || displayError;
          } catch /* (e) */ {
            // Mantém o erro genérico se o parse falhar
          }
        } else if (submissionError.message.includes('NetworkError')) {
            displayError = 'Erro de rede. Verifique sua conexão e tente novamente.';
        }
        setError(displayError);
        setIsSubmitting(false);
        return;
      }

      if (data && data.respostaId) {
        submissionId = data.respostaId;
        
        if (submissionId && (fotosSelecionadas.length > 0 || examesSelecionados.length > 0)) {
          setFilesUploaded(0);
          setTotalFilesToUpload(fotosSelecionadas.length + examesSelecionados.length);

          const uploadPromises: Promise<void>[] = [];

          fotosSelecionadas.forEach(file => {
            uploadPromises.push(uploadFile(file, submissionId!, 'foto'));
          });
          examesSelecionados.forEach(file => {
            uploadPromises.push(uploadFile(file, submissionId!, 'exame'));
          });

          await Promise.all(uploadPromises);
        }
        
        if (submissionId) {
          onFormSubmitSuccess(submissionId);
        } else {
          setError('Falha ao obter o ID da submissão para finalizar.');
          setIsSubmitting(false);
        }

      } else {
        setError('Resposta inesperada do servidor ao submeter dados.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Erro inesperado durante a submissão:', err);
      setError('Ocorreu um erro inesperado. Por favor, contate o suporte.');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isSubmitting && filesUploaded === 0) {
      setError(null);
      setUploadError(null);
    }
  }, [currentStep, isSubmitting, filesUploaded]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-700 to-emerald-900 flex flex-col items-center justify-center p-4 selection:bg-emerald-400 selection:text-white">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Formulário do Paciente</h1>
          <p className="text-center text-gray-500 mb-6">Por favor, preencha as informações abaixo com atenção.</p>
          <div className="flex items-center justify-between mb-2 px-1">
            {steps.map((step, index) => {
              const isActive = index + 1 === currentStep;
              const isCompleted = index + 1 < currentStep;
              let iconColorClass = 'text-gray-400';
              let textColorClass = 'text-gray-500';
              let borderColorClass = 'border-gray-300';
              let bgColorClass = 'bg-transparent';

              if (isCompleted) {
                iconColorClass = 'text-white';
                textColorClass = 'text-emerald-600 font-semibold';
                borderColorClass = 'border-emerald-600';
                bgColorClass = 'bg-emerald-600';
              } else if (isActive) {
                iconColorClass = 'text-white';
                textColorClass = 'text-emerald-600 font-semibold';
                borderColorClass = 'border-emerald-500';
                bgColorClass = 'bg-emerald-500';
              }

              return (
                <React.Fragment key={index}>
                  <div className={`flex flex-col items-center ${textColorClass}`}>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${borderColorClass} ${bgColorClass}`}
                    >
                      {isCompleted ? <CheckCircle className="w-5 h-5 text-white" /> : React.cloneElement(step.icon, { className: `w-5 h-5 ${iconColorClass}` })}
                    </div>
                    <span className={`mt-2 text-xs text-center ${isActive || isCompleted ? 'font-semibold text-emerald-700' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded
                                       ${isCompleted ? 'bg-emerald-600' : (isActive ? 'bg-emerald-500' : 'bg-gray-300')}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {uploadError && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 text-orange-700 rounded-md flex items-center">
            <UploadCloud className="w-5 h-5 mr-3 flex-shrink-0" />
            <div>
                <p className="font-semibold">Erro no upload de arquivos:</p>
                <p className="text-sm">{uploadError}</p>
            </div>
          </div>
        )}

        {debugMessages.length > 0 && (
          <div className="my-4 p-3 border bg-gray-100 rounded-md text-xs text-gray-700">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-semibold">Logs de Depuração:</h4>
              <button 
                onClick={() => setDebugMessages([])} 
                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
              >
                Limpar Logs
              </button>
            </div>
            <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-all">
              {debugMessages.join('\n')}
            </pre>
          </div>
        )}

        {isSubmitting && <p>Carregando formulário...</p>}
        {!isSubmitting && !error && (
          <div className="transition-all duration-300 ease-in-out">
            {currentStep === 1 && <Step1Name formData={formData} onChange={handleChange('nomePaciente')} />}
            {currentStep === 2 && <Step2Queixa formData={formData} onChange={handleChange('queixaPrincipal')} />}
            {currentStep === 3 && <Step3Medicacoes formData={formData} onChange={handleChange('medicacoesEmUso')} />}
            {currentStep === 4 && <Step4Alergias formData={formData} onChange={handleChange} />}
            {currentStep === 5 && <Step5UploadFotos setFotosNoStepper={setFotosSelecionadas} initialFiles={fotosSelecionadas} />}
            {currentStep === 6 && <Step6UploadExames setExamesNoStepper={setExamesSelecionados} initialFiles={examesSelecionados} />}
            {currentStep === 7 && <Step7Review formData={formData} fotos={fotosSelecionadas} exames={examesSelecionados} onEditStep={handleEditStep} />}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1 || isSubmitting}
            className="px-6 py-3 bg-transparent border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Anterior
          </button>
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center shadow-md hover:shadow-lg"
            >
              Próximo
              <ArrowLeft className="w-5 h-5 ml-2 transform rotate-180" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || filesUploaded > 0}
              className="px-8 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:bg-emerald-300 flex items-center shadow-md hover:shadow-lg"
            >
              {isSubmitting || filesUploaded > 0 ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {filesUploaded > 0 ? `Enviando arquivos (${filesUploaded}/${totalFilesToUpload})...` : 'Enviando formulário...'}
                </>
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {isSubmitting || filesUploaded > 0 ? '' : 'Confirmar e Enviar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientFormStepper; 