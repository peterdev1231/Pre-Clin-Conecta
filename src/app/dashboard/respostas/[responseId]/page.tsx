'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Database, Json } from '@/lib/database.types'; // Importar Json também
import ResponseDetailView from '@/components/dashboard/ResponseDetailView';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner'; // Para feedback visual
import { useAuth } from '@/contexts/AuthContext'; // Adicionar importação

interface DadosFormulario {
  nomePaciente: string;
  queixaPrincipal: string;
  medicacoesEmUso?: string;
  alergiasConhecidas?: string;
  naoPossuiAlergias?: boolean;
  // fotos e exames são tratados pela Edge Function de arquivos agora
}

// Tipo para o estado local onde dados_formulario foi processado
// Omitimos o dados_formulario original (que é Json | null) e adicionamos um novo com tipo DadosFormulario | null
interface ProcessedResponseData extends Omit<Database['public']['Tables']['respostas_pacientes']['Row'], 'dados_formulario'> {
  dados_formulario: DadosFormulario | null;
}

export default function ResponseDetailPage() {
  const params = useParams();
  const responseId = params.responseId as string;
  const { 
    session: authSession, 
    loading: authLoading, 
    supabase
  } = useAuth();

  const [response, setResponse] = useState<ProcessedResponseData | null>(null); // Estado usa o tipo processado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResponseDetails = useCallback(async () => {
    console.log('[ResponseDetailPage] Proceeding to fetch details for responseId:', responseId);
    if (!responseId) {
      setError('ID da resposta não fornecido.');
      setLoading(false);
      console.error('[ResponseDetailPage] responseId is missing during fetch attempt.');
      return;
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from('respostas_pacientes')
        .select('*')
        .eq('id', responseId)
        .single();

      if (supabaseError) throw supabaseError;

      if (data) {
        let processedFormulario: DadosFormulario | null = null;
        const rawFormularioData = data.dados_formulario;

        if (typeof rawFormularioData === 'string') {
          try {
            processedFormulario = JSON.parse(rawFormularioData) as DadosFormulario;
          } catch (parseError) {
            console.error("[ResponseDetailPage] Erro ao parsear dados_formulario (string):", parseError);
            processedFormulario = null; 
          }
        } else if (rawFormularioData && typeof rawFormularioData === 'object') {
          // Assumindo que se é objeto, está na forma correta de DadosFormulario.
          // Uma validação de schema com Zod seria ideal aqui.
          processedFormulario = rawFormularioData as DadosFormulario;
        } else {
          // Se for null, undefined, ou outro tipo inesperado, continua null
          processedFormulario = null;
        }

        // Omitir o dados_formulario original (Json | null) e adicionar o processado (DadosFormulario | null)
        // const { dados_formulario, ...restOfData } = data; // REMOVIDO - dados_formulario local não usado
        // Usar data diretamente, pois todos os outros campos são mantidos, e apenas dados_formulario (o campo da prop) é substituído.
        setResponse({ ...data, dados_formulario: processedFormulario });
      } else {
        setError('Resposta não encontrada.');
      }
    } catch (err: unknown) {
      console.error('[ResponseDetailPage] Erro ao buscar detalhes da resposta. ID:', responseId, 'Erro:', err);
      const message = err instanceof Error ? err.message : 'Falha ao buscar dados da resposta.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [responseId, supabase]);

  useEffect(() => {
    console.log('[ResponseDetailPage] useEffect triggered. AuthLoading:', authLoading, 'AuthSession:', !!authSession, 'ResponseId:', responseId);
    if (!authLoading && authSession && responseId) {
      setLoading(true);
      setError(null);
      console.log('[ResponseDetailPage] Conditions met. Calling fetchResponseDetails.');
      fetchResponseDetails();
    } else if (!authLoading && !authSession && responseId) {
      console.error('[ResponseDetailPage] Usuário não autenticado (useEffect). Abortando fetch.');
      setError('Usuário não autenticado. Faça login para ver os detalhes.');
      setLoading(false);
    } else if (authLoading) {
      console.log('[ResponseDetailPage] Auth ainda está carregando (useEffect)... setting page loading to true');
      setLoading(true);
    } else if (!responseId && !authLoading) {
      setError("ID da resposta não encontrado na URL.");
      setLoading(false);
    }
  }, [authLoading, authSession, responseId, fetchResponseDetails]);

  const handleMarkAsReadToggle = async (id: string, currentState: boolean) => {
    if (!response) return;

    const newState = !currentState;
    try {
      const { error: updateError } = await supabase
        .from('respostas_pacientes')
        .update({ revisado_pelo_profissional: newState })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      setResponse((prev) => prev ? { ...prev, revisado_pelo_profissional: newState } : null);
      toast.success(`Resposta marcada como ${newState ? 'Revisada' : 'Não Revisada'}.`);
    } catch (err: unknown) {
      console.error('Erro ao atualizar status da resposta:', err);
      const message = err instanceof Error ? err.message : 'Falha ao atualizar status.';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-600"></div>
        <p className="mt-4 text-lg text-gray-700">Carregando detalhes da resposta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Erro</h2>
          <p className="text-red-500">{error}</p>
          <Link href="/dashboard" className="mt-6 inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300">
            Voltar para a lista de respostas
          </Link>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
         <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Resposta não encontrada</h2>
          <p className="text-gray-500">Não foi possível encontrar os detalhes para esta resposta.</p>
          <Link href="/dashboard" className="mt-6 inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300">
            Voltar para a lista de respostas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 mb-6 md:mb-8 transition-colors group font-medium">
          <ArrowLeft size={20} className="mr-2 transition-transform group-hover:-translate-x-1" />
          Voltar para Respostas
        </Link>
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg p-6 sm:p-8">
          <ResponseDetailView response={response} onMarkAsReadToggle={handleMarkAsReadToggle} />
        </div>
      </div>
    </>
  );
} 