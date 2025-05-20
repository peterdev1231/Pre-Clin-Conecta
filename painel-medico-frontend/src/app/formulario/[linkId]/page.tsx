'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation'; // Para pegar o [linkId] da URL
import { createClient } from '@/lib/supabase/client'; // Adicionar
import PatientFormStepper from '@/components/formulario/PatientFormStepper'; // CORRIGIDO: Importar o stepper do diretório correto
import { CheckCircle } from 'lucide-react';

// Definindo os tipos esperados para a resposta da Edge Function
interface LinkValidationResponse {
  status: 'valid' | 'invalid';
  reason?: 'not_found' | 'inactive' | 'already_used' | 'missing_link_id' | 'internal_server_error';
  linkDetails?: {
    id: string;
    profissional_id: string;
  };
  error?: string;
}

export default function FormularioPage() {
  const params = useParams();
  const linkId = params.linkId as string; // Obtém o linkId da URL
  const supabase = createClient(); // Adicionar: criar cliente público

  const [pageState, setPageState] = useState<'loading' | 'valid' | 'invalid' | 'submitted'>('loading');
  const [message, setMessage] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (linkId) {
      const verifyLink = async () => {
        setPageState('loading');
        setMessage('Verificando o link, por favor aguarde...');
        try {
          const { data, error } = await supabase.functions.invoke<LinkValidationResponse>(
            'verificar-link-formulario',
            { body: { linkId: linkId } }
          );

          if (error) {
            console.error('Erro ao invocar a função verificar-link-formulario:', error);
            setPageState('invalid');
            setMessage('Ocorreu um erro ao verificar o link. Por favor, tente novamente mais tarde.');
            return;
          }

          if (data?.status === 'valid') {
            setPageState('valid');
            setMessage(''); // Limpa mensagem, stepper cuidará do título
          } else {
            setPageState('invalid');
            let readableMessage = 'Link inválido.';
            switch (data?.reason) {
              case 'not_found':
                readableMessage = 'Este link de formulário não foi encontrado.';
                break;
              case 'inactive':
                readableMessage = 'Este link de formulário não está mais ativo.';
                break;
              case 'already_used':
                readableMessage = 'Este link de formulário já foi utilizado.';
                break;
              default:
                readableMessage = data?.error || 'Não foi possível validar o link. Motivo desconhecido.';
            }
            setMessage(readableMessage);
          }
        } catch (e: unknown) {
          console.error('Exceção ao verificar o link:', e);
          setPageState('invalid');
          const message = e instanceof Error ? e.message : 'Ocorreu um erro crítico ao verificar o link.';
          setMessage(message);
        }
      };

      verifyLink();
    }
  }, [linkId, supabase]);

  const handleFormSubmissionSuccess = (id: string) => {
    console.log("Formulário submetido com sucesso, ID:", id);
    setSubmissionId(id);
    setPageState('submitted');
  };

  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-700 to-emerald-900 p-4 text-white">
        <p className="text-lg">{message || 'Carregando...'}</p>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-700 to-red-900 p-4 text-white text-center">
        <h1 className="text-2xl font-semibold mb-4">Acesso Inválido</h1>
        <p className="text-md">{message}</p>
      </div>
    );
  }

  if (pageState === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-700 to-emerald-900 flex flex-col items-center justify-center p-4 text-white">
        <CheckCircle className="w-20 h-20 text-white mb-6" />
        <h1 className="text-4xl font-bold mb-4">Formulário Enviado!</h1>
        <p className="text-lg mb-2">Suas informações foram enviadas com sucesso.</p>
        <p className="text-lg mb-8">O profissional de saúde entrará em contato em breve.</p>
        {submissionId && <p className="text-sm opacity-80">ID da sua submissão: {submissionId}</p>}
      </div>
    );
  }

  // pageState === 'valid' (formulário a ser exibido)
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#25392C] p-4">
      <PatientFormStepper linkId={linkId} onFormSubmitSuccess={handleFormSubmissionSuccess} />
    </div>
  );
} 