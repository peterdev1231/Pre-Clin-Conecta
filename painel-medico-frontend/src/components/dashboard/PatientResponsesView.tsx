'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ResponsesHeader from './ResponsesHeader';
import ResponsesTable, { PacienteResponse } from './ResponsesTable';
import GenerateLinkFormModal from './GenerateLinkFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Interface para os dados brutos do Supabase que serão buscados
interface FetchedResponseData {
  id: string;
  nome_paciente: string; 
  data_envio: string | null; // data_envio pode ser null conforme database.types.ts
  revisado_pelo_profissional: boolean | null; // Corrigido de 'lido' e pode ser null
  link_formulario_id: string; // Adicionado para o filtro realtime
  code?: string;
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
  
  const [quickPeriod, setQuickPeriod] = useState<string | undefined>(undefined);

  const [isGenerateLinkModalOpen, setIsGenerateLinkModalOpen] = useState(false);

  const [profissionalLinkIds, setProfissionalLinkIds] = useState<string[]>([]); // Estado para IDs de link

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
    console.log("[PatientResponsesView] fetchResponses called. User:", user?.id, "SearchTerm:", searchTerm, "StatusFilter:", statusFilter, "QuickPeriod:", quickPeriod);
    if (!user || !supabase) { // Adicionado !supabase para segurança
      console.log("[PatientResponsesView] No user or supabase client, aborting fetch.");
      setIsLoading(false);
      setProfissionalLinkIds([]); // Limpa os link IDs
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      console.log("[PatientResponsesView] Step 1: Fetching profissional_saude ID for user.id:", user.id);
      const { data: perfilProfissionalData, error: perfilProfissionalError } = await supabase
        .from('perfis_profissionais')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (perfilProfissionalError) {
        console.error("[PatientResponsesView] Error fetching perfil profissional:", perfilProfissionalError);
        throw perfilProfissionalError;
      }
      if (!perfilProfissionalData) {
        console.error("[PatientResponsesView] Perfil profissional não encontrado para user.id:", user.id);
        throw new Error('Perfil profissional não encontrado. O webhook pode não ter processado o usuário ainda ou houve uma falha.');
      }
      
      const profissionalId = perfilProfissionalData.id;
      console.log("[PatientResponsesView] Step 1 Result - ID do Perfil Profissional (usado como profissional_id para links):", profissionalId);

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

      const currentLinkIds = linksData.map(link => link.id);
      setProfissionalLinkIds(currentLinkIds); // Armazena os IDs de link
      console.log("[PatientResponsesView] Step 2 Result - Link IDs for query:", currentLinkIds);

      console.log("[PatientResponsesView] Step 3: Fetching respostas_pacientes for link_ids:", currentLinkIds);
      
      let query = supabase
        .from('respostas_pacientes')
        .select('id, nome_paciente, data_envio, revisado_pelo_profissional, link_formulario_id') 
        .in('link_formulario_id', currentLinkIds);

      // Aplicar filtro de data se quickPeriod estiver definido
      let effectiveFrom: Date | undefined;
      let effectiveTo: Date | undefined;

      if (quickPeriod) {
        const now = new Date();
        if (quickPeriod === 'hoje') {
          effectiveFrom = startOfDay(now);
          effectiveTo = endOfDay(now);
        } else if (quickPeriod === 'ontem') {
          const yesterday = subDays(now, 1);
          effectiveFrom = startOfDay(yesterday);
          effectiveTo = endOfDay(yesterday);
        } else if (quickPeriod === 'ultimos7dias') {
          effectiveFrom = startOfDay(subDays(now, 6));
          effectiveTo = endOfDay(now);
        } else if (quickPeriod === 'ultimos30dias') {
          effectiveFrom = startOfDay(subDays(now, 29));
          effectiveTo = endOfDay(now);
        }
      }

      if (effectiveFrom && effectiveTo) {
        console.log(`[PatientResponsesView] Applying date filter: FROM ${effectiveFrom.toISOString()} TO ${effectiveTo.toISOString()}`);
        query = query.gte('data_envio', effectiveFrom.toISOString());
        query = query.lte('data_envio', effectiveTo.toISOString());
      }

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
  }, [user, supabase, searchTerm, statusFilter, quickPeriod]);

  useEffect(() => {
    console.log("[PatientResponsesView] useEffect for fetchResponses triggered.");
    fetchResponses();
  }, [fetchResponses]);

  // useEffect para Realtime updates
  useEffect(() => {
    if (!supabase || !user || profissionalLinkIds.length === 0) {
      console.log('[Realtime] Condições não atendidas para inscrição (sem supabase, user ou linkIds).');
      return;
    }

    console.log('[Realtime] Configurando inscrição para link_ids:', profissionalLinkIds);
    const channel = supabase.channel('respostas-pacientes-profissional-' + user.id) // Canal específico do usuário
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'respostas_pacientes',
          // Filtro no lado do cliente, pois o filtro server-side por array de IDs pode ser limitado
        },
        (payload) => {
          console.log('[Realtime] Nova submissão recebida (payload):', payload);
          const novaResposta = payload.new as FetchedResponseData;
          
          // Verifica se a nova resposta pertence a um dos links do profissional
          if (novaResposta && novaResposta.link_formulario_id && profissionalLinkIds.includes(novaResposta.link_formulario_id)) {
            console.log('[Realtime] Nova resposta relevante detectada para o profissional. Atualizando...');
            fetchResponses(); // Recarrega os dados para incluir a nova resposta
          } else {
            console.log('[Realtime] Nova resposta não é relevante para os links deste profissional ou falta link_formulario_id:', profissionalLinkIds, novaResposta?.link_formulario_id);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Conectado ao canal de respostas!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Realtime] Erro ou timeout no canal:', err);
        }
      });

    return () => {
      if (channel) {
        console.log('[Realtime] Removendo inscrição do canal.');
        supabase.removeChannel(channel).catch(err => console.error('[Realtime] Erro ao remover canal:', err));
      }
    };
  }, [supabase, user, profissionalLinkIds, fetchResponses]); // Adicionado fetchResponses como dependência

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
        quickPeriod={quickPeriod}
        setQuickPeriod={setQuickPeriod}
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