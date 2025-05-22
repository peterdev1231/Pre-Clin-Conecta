import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Ajuste o caminho conforme a localização real do seu AuthContext

interface SubscriptionData {
  tipo_plano: string;
  status_assinatura: string;
  data_expiracao_acesso: string | null; // ISO string
  data_inicio_assinatura: string | null; // ISO string
}

interface UseSubscriptionStatusResult {
  subscription: SubscriptionData | null;
  loading: boolean;
  error: string | null;
}

export const useSubscriptionStatus = (): UseSubscriptionStatusResult => {
  const { user, supabase } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user || !supabase) {
        // Se não houver usuário logado ou cliente supabase, não há dados para buscar
        setSubscription(null);
        setLoading(false);
        // O erro pode ser tratado na UI principal se o user for null
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Buscar os dados da assinatura na tabela perfis_profissionais para o usuário logado
        const { data, error: dbError } = await supabase
          .from('perfis_profissionais')
          .select('tipo_plano, status_assinatura, data_expiracao_acesso, data_inicio_assinatura')
          .eq('user_id', user.id)
          .single(); // Assume que há apenas um perfil por user_id

        if (dbError) {
          console.error('Erro ao buscar status da assinatura:', dbError);
          setError('Não foi possível carregar o status da assinatura.');
          setSubscription(null);
        } else if (data) {
          setSubscription(data);
        } else {
          // Usuário logado, mas sem entrada em perfis_profissionais (improvável se o webhook funcionar, mas bom tratar)
          setSubscription(null); // Sem dados de assinatura encontrados
        }
      } catch (err: any) {
        console.error('Erro inesperado ao buscar status da assinatura:', err);
        setError('Ocorreu um erro ao carregar o status da assinatura.');
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();

    // Opcional: Adicionar um listener realtime se o status puder mudar enquanto a página está aberta
    // (ex: via outro webhook ou ação do admin)
    // const channel = supabase
    //   .channel('subscription_status_channel') // Nome único para o canal
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: 'UPDATE',
    //       schema: 'public',
    //       table: 'perfis_profissionais',
    //       filter: `user_id=eq.${user?.id}`,
    //     },
    //     (payload) => {
    //       console.log('Mudança no status da assinatura detectada:', payload);
    //       if (payload.new) {
    //         setSubscription(payload.new as SubscriptionData);
    //       }
    //     }
    //   )
    //   .subscribe();

    // return () => {
    //   supabase.removeChannel(channel); // Limpar o listener ao desmontar
    // };

  }, [user, supabase]); // Dependências do useEffect

  return { subscription, loading, error };
}; 