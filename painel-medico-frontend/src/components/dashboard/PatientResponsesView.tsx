'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ResponsesHeader from './ResponsesHeader';
import ResponsesTable, { PacienteResponse } from './ResponsesTable';
import GenerateLinkFormModal from './GenerateLinkFormModal';
import { useAuth } from '@/contexts/AuthContext';

// Interface para os dados brutos do Supabase que serão buscados
interface FetchedResponseData {
  id: string;
  nome_paciente: string; 
  data_envio: string | null; // data_envio pode ser null conforme database.types.ts
  revisado_pelo_profissional: boolean | null; // Corrigido de 'lido' e pode ser null
}

// Interface para erros que podem vir do Supabase com mais detalhes
interface SupabaseErrorLike {
  details?: string;
  hint?: string;
  code?: string;
}

export default function PatientResponsesView() {
  const { supabase, user } = useAuth();
  console.log("[PatientResponsesView] User context:", user);
  const [responses, setResponses] = useState<PacienteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Lido' | 'Não Lido'>('Todos');
  const [isGenerateLinkModalOpen, setIsGenerateLinkModalOpen] = useState(false);

  // Cálculo dos contadores
  const totalCount = responses.length;
  const unreadCount = responses.filter(r => r.status === 'Não Lido').length;
  const readCount = responses.filter(r => r.status === 'Lido').length;

  // Exemplo de estatística rápida (última resposta)
  const recentStats = [];
  if (responses.length > 0) {
    const last = responses[0];
    recentStats.push({
      label: 'Último paciente',
      value: last.nomePaciente,
      icon: null
    });
    if (last.dataEnvio) {
      recentStats.push({
        label: 'Recebido em',
        value: new Date(last.dataEnvio).toLocaleDateString('pt-BR'),
        icon: null
      });
    }
  }

  const fetchResponses = useCallback(async () => {
    console.log("[PatientResponsesView] fetchResponses called. User:", user?.id, "SearchTerm:", searchTerm, "StatusFilter:", statusFilter);
    if (!user) {
      console.log("[PatientResponsesView] No user, aborting fetch.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      console.log("[PatientResponsesView] Step 1: Fetching profissional_saude ID for user.id:", user.id);
      const { data: profissionalData, error: profissionalError } = await supabase
        .from('profissionais_saude')
        .select('id')
        .eq('id_usuario_supabase', user.id)
        .single();

      if (profissionalError) {
        console.error("[PatientResponsesView] Error fetching profissional_saude:", profissionalError);
        throw profissionalError;
      }
      if (!profissionalData) {
        console.error("[PatientResponsesView] Perfil profissional não encontrado para user.id:", user.id);
        throw new Error('Perfil profissional não encontrado.');
      }
      
      const profissionalId = profissionalData.id;
      console.log("[PatientResponsesView] Step 1 Result - Profissional ID:", profissionalId);

      console.log("[PatientResponsesView] Step 2: Fetching links_formularios for profissional_id:", profissionalId);
      const { data: linksData, error: linksError } = await supabase
        .from('links_formularios')
        .select('id')
        .eq('profissional_id', profissionalId);
      console.log("[PatientResponsesView] Step 2 Result - Links Data Raw:", linksData);

      if (linksError) {
        console.error("[PatientResponsesView] Error fetching links_formularios:", linksError);
        throw linksError;
      }
      if (!linksData || linksData.length === 0) {
        console.log("[PatientResponsesView] No links found for profissional_id:", profissionalId, "Setting responses to empty.");
        setResponses([]);
        setIsLoading(false);
        return;
      }

      const linkIds = linksData.map(link => link.id);
      console.log("[PatientResponsesView] Step 2 Result - Link IDs for query:", linkIds);

      console.log("[PatientResponsesView] Step 3: Fetching respostas_pacientes for link_ids:", linkIds);
      
      let query = supabase
        .from('respostas_pacientes')
        .select('id, nome_paciente, data_envio, revisado_pelo_profissional') 
        .in('link_formulario_id', linkIds);

      query = query.order('data_envio', { ascending: false, nullsFirst: false });

      const { data: respostasData, error: respostasError } = await query;

      if (respostasError) {
        console.error("[PatientResponsesView] Error fetching respostas_pacientes:", respostasError);
        throw respostasError;
      }

      const mappedResponses: PacienteResponse[] = respostasData ? respostasData.map((res: FetchedResponseData) => ({
        id: res.id,
        nomePaciente: res.nome_paciente || 'Nome não informado', 
        dataEnvio: res.data_envio, // Agora passa null diretamente, se for o caso
        status: res.revisado_pelo_profissional === true ? 'Lido' : 'Não Lido', // Trata null e false como 'Não Lido'
      })) : [];
      console.log("[PatientResponsesView] Mapped Responses (BEFORE searchTerm and statusFilter):", mappedResponses);

      let filteredResponses = mappedResponses;

      // Aplicar filtro de nome
      if (searchTerm) {
        filteredResponses = filteredResponses.filter(response => 
            response.nomePaciente.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      // Aplicar filtro de status
      if (statusFilter !== 'Todos') {
        filteredResponses = filteredResponses.filter(response => response.status === statusFilter);
      }
      
      console.log("[PatientResponsesView] Filtered Responses (final for table):", filteredResponses);

      setResponses(filteredResponses);

    } catch (err: unknown) {
      console.error('[PatientResponsesView] CATCH BLOCK - Erro detalhado ao buscar respostas:', {
        message: (err instanceof Error ? err.message : JSON.stringify(err)),
        details: (err as SupabaseErrorLike)?.details,
        hint: (err as SupabaseErrorLike)?.hint,
        code: (err as SupabaseErrorLike)?.code,
        fullError: err
      });
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error(JSON.stringify(err)));
      }
    } finally {
      console.log("[PatientResponsesView] fetchResponses finally block. isLoading should be false.");
      setIsLoading(false);
    }
  }, [user, searchTerm, supabase, statusFilter]);

  useEffect(() => {
    console.log("[PatientResponsesView] useEffect for fetchResponses triggered.");
    fetchResponses();
  }, [fetchResponses]);

  const handleResponseDeleted = (responseId: string) => {
    setResponses(prevResponses => prevResponses.filter(response => response.id !== responseId));
  };

  console.log("[PatientResponsesView] Rendering. isLoading:", isLoading, "Error:", error, "Responses count:", responses.length);
  return (
    <div className="space-y-6 md:space-y-8">
      <ResponsesHeader 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onRefresh={fetchResponses} 
        onGenerateNewLink={() => {
          console.log("[PatientResponsesView] Generate New Link button clicked.");
          setIsGenerateLinkModalOpen(true)
        }}
        totalCount={totalCount}
        unreadCount={unreadCount}
        readCount={readCount}
        recentStats={recentStats}
      />
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl p-6 md:p-8">
        <ResponsesTable 
          responses={responses} 
          isLoading={isLoading} 
          error={error} 
          onResponseDeleted={handleResponseDeleted}
        />
      </div>
      <GenerateLinkFormModal 
        isOpen={isGenerateLinkModalOpen} 
        onClose={() => {
          console.log("[PatientResponsesView] Closing Generate Link Modal.");
          setIsGenerateLinkModalOpen(false)
        }}
      />
    </div>
  );
} 