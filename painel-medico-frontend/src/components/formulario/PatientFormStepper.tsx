import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle, FileText, HeartPulse, ImageIcon, ListChecks, Pill, ShieldAlert, User, XCircle, UploadCloud } from 'lucide-react';
import Step1Name from './Step1Name';
import Step2Queixa from './Step2Queixa';
import Step3Medicacoes from './Step3Medicacoes';
import Step4Alergias from './Step4Alergias';
import Step5UploadFotos from './Step5UploadFotos';
import Step6UploadExames from './Step6UploadExames';
import Step7Review from './Step7Review';
import { v4 as uuidv4 } from 'uuid';

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

interface FileUploadState {
  id: string;
  file: File;
  status: 'pending' | 'getting_url' | 'uploading' | 'processing_metadata' | 'completed' | 'error';
  progress: number;
  error?: string;
  pathStorage?: string;
  tipoDocumento: 'foto' | 'exame';
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
  const [submissionAttemptId, setSubmissionAttemptId] = useState<string | null>(null);
  const [fileUploads, setFileUploads] = useState<Record<string, FileUploadState>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 7;

  const steps = [
    { title: 'Nome', icon: <User className="w-5 h-5" /> },
    { title: 'Queixa Principal', icon: <HeartPulse className="w-5 h-5" /> },
    { title: 'Medicações', icon: <Pill className="w-5 h-5" /> },
    { title: 'Alergias', icon: <ShieldAlert className="w-5 h-5" /> },
    { title: 'Fotos (Opcional)', icon: <ImageIcon className="w-5 h-5" /> },
    { title: 'Exames (Opcional)', icon: <FileText className="w-5 h-5" /> },
    { title: 'Revisão', icon: <ListChecks className="w-5 h-5" /> },
  ];

  // Criar refs para cada elemento de step
  const stepRefs = useRef<Array<React.RefObject<HTMLDivElement>>>(steps.map(() => React.createRef<HTMLDivElement>()));

  // Efeito para scrollar o step ativo para a visão
  useEffect(() => {
    const activeStepRef = stepRefs.current[currentStep - 1];
    if (activeStepRef && activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentStep]);

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

  const handleFileUploadStart = (file: File, tipoDocumento: 'foto' | 'exame', localFileId: string) => {
    if (!submissionAttemptId) {
      console.error("submissionAttemptId ainda não está definido. Upload não pode iniciar.");
      return;
    }
    setFileUploads(prev => ({
      ...prev,
      [localFileId]: {
        id: localFileId,
        file,
        status: 'pending',
        progress: 0,
        tipoDocumento,
      }
    }));
  };

  const updateFileUploadState = (localFileId: string, newState: Partial<FileUploadState>) => {
    setFileUploads(prev => {
      if (!prev[localFileId] && newState.file && newState.status === 'pending' && newState.id === localFileId && newState.tipoDocumento) {
        return {
          ...prev,
          [localFileId]: {
            id: localFileId,
            file: newState.file,
            status: newState.status,
            progress: newState.progress || 0,
            tipoDocumento: newState.tipoDocumento,
            error: newState.error,
            pathStorage: newState.pathStorage,
          },
        };
      } else if (prev[localFileId]) {
        return {
          ...prev,
          [localFileId]: { ...prev[localFileId], ...newState },
        };
      }
      console.warn(`[Stepper] Tentativa de atualizar estado para ID de arquivo desconhecido OU criação inválida: ${localFileId}`, newState);
      return prev;
    });
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
    
    const uploadsEmAndamento = Object.values(fileUploads).some(f => 
      f.status === 'uploading' || 
      f.status === 'getting_url' || 
      f.status === 'pending' || 
      f.status === 'processing_metadata'
    );
    if (uploadsEmAndamento) {
        setError("Aguarde a conclusão de todos os uploads de arquivos antes de enviar o formulário.");
        return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!submissionAttemptId) {
        throw new Error("ID da tentativa de submissão não encontrado.");
      }

      const payload = {
        linkId: linkId,
        submissionAttemptId: submissionAttemptId, 
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
        let displayError = 'Ocorreu um erro ao submeter o formulário. Tente novamente.';
        if (submissionError.message.includes('Function returned an error')) {
          try {
            const errorResponse = JSON.parse(submissionError.message.substring(submissionError.message.indexOf('{')));
            displayError = errorResponse.error || displayError;
          } catch {}
        } else if (submissionError.message.includes('NetworkError')) {
            displayError = 'Erro de rede. Verifique sua conexão e tente novamente.';
        }
        setError(displayError);
        setIsSubmitting(false);
        return;
      }

      if (data && data.respostaId) {
        onFormSubmitSuccess(data.respostaId);
      } else {
        setError('Resposta inesperada do servidor ao submeter dados.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('Erro inesperado durante a submissão:', err);
      setError(err.message || 'Ocorreu um erro inesperado. Por favor, contate o suporte.');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (linkId && !submissionAttemptId) {
      setSubmissionAttemptId(uuidv4());
    }
  }, [linkId, submissionAttemptId]);

  const fotosParaRevisao = Object.values(fileUploads).filter(f => f.tipoDocumento === 'foto');
  const examesParaRevisao = Object.values(fileUploads).filter(f => f.tipoDocumento === 'exame');

  return (
    <div className="selection:bg-emerald-400 selection:text-white w-full flex justify-center">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Formulário do Paciente</h1>
          <p className="text-center text-gray-500 mb-6">Por favor, preencha as informações abaixo com atenção.</p>
          <div className="flex items-center mb-2 px-1 overflow-x-auto pb-2 gap-x-4 sm:gap-x-6">
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
                <div key={index} ref={stepRefs.current[index]} className="flex items-center">
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
                </div>
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

        {isSubmitting && <p>Carregando formulário...</p>}
        {!isSubmitting && !error && (
          <div className="transition-all duration-300 ease-in-out">
            {currentStep === 1 && <Step1Name formData={formData} onChange={handleChange('nomePaciente')} />}
            {currentStep === 2 && <Step2Queixa formData={formData} onChange={handleChange('queixaPrincipal')} />}
            {currentStep === 3 && <Step3Medicacoes formData={formData} onChange={handleChange('medicacoesEmUso')} />}
            {currentStep === 4 && <Step4Alergias formData={formData} onChange={handleChange} />}
            {currentStep === 5 && submissionAttemptId && (
              <Step5UploadFotos 
                submissionAttemptId={submissionAttemptId}
                onFileUploadStart={handleFileUploadStart}
                updateFileStateInStepper={updateFileUploadState}
                initialFiles={Object.values(fileUploads).filter(f => f.tipoDocumento === 'foto')}
              />
            )}
            {currentStep === 6 && submissionAttemptId && (
              <Step6UploadExames
                submissionAttemptId={submissionAttemptId}
                onFileUploadStart={handleFileUploadStart}
                updateFileStateInStepper={updateFileUploadState}
                initialFiles={Object.values(fileUploads).filter(f => f.tipoDocumento === 'exame')}
              />
            )}
            {currentStep === 7 && (
              <Step7Review 
                formData={formData} 
                fotos={fotosParaRevisao}
                exames={examesParaRevisao}
                onEditStep={handleEditStep} 
              />
            )}
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
              disabled={isSubmitting || Object.values(fileUploads).some(f => f.status === 'uploading' || f.status === 'pending' || f.status === 'getting_url')}
              className="px-8 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:bg-emerald-300 flex items-center shadow-md hover:shadow-lg"
            >
              {isSubmitting || Object.values(fileUploads).some(f => f.status === 'pending' || f.status === 'uploading') ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {Object.values(fileUploads).some(f => f.status === 'pending' || f.status === 'uploading') ? `Enviando arquivos...` : 'Enviando formulário...'}
                </>
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {isSubmitting || Object.values(fileUploads).some(f => f.status === 'pending' || f.status === 'uploading') ? '' : 'Confirmar e Enviar'}
            </button>
          )}
        </div>

        {Object.keys(fileUploads).length > 0 && (
          <div className="my-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Progresso dos Uploads:</h3>
            <ul className="space-y-3">
              {Object.values(fileUploads).map(upState => (
                <li key={upState.id} className="p-3 bg-white rounded-lg shadow border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-600 truncate w-3/5">{upState.file.name} ({upState.tipoDocumento})</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      upState.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      upState.status === 'error' ? 'bg-red-100 text-red-700' :
                      upState.status === 'uploading' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600' // Default para pending, etc.
                    }`}>
                      {upState.status === 'uploading' ? `Enviando ${upState.progress}%` : 
                       upState.status === 'completed' ? 'Concluído' : 
                       upState.status === 'error' ? 'Erro' : 
                       upState.status === 'pending' ? 'Pendente' :
                       upState.status === 'getting_url' ? 'Obtendo URL' :
                       upState.status === 'processing_metadata' ? 'Processando' :
                       upState.status // Fallback para outros status, caso existam
                      }
                    </span>
                  </div>
                  {upState.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all duration-150" style={{ width: `${upState.progress}%` }}></div>
                    </div>
                  )}
                  {upState.status === 'error' && upState.error && (
                    <p className="text-xs text-red-600 mt-1">{upState.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientFormStepper; 