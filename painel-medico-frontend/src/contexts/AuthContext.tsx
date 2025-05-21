'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, User, SupabaseClient, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] useEffect mounting. Current URL hash:', window.location.hash);

    const processAuthHash = async () => {
      console.log('%cAuthContext: processAuthHash called.', 'color: orange; font-weight: bold;');
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        console.log('%cAuthContext: Hash com access_token detectado. Tentando supabase.auth.getSession().', 'color: orange; font-weight: bold;');
        // A própria chamada a getSession e o onAuthStateChange deveriam lidar com o hash.
        // O Supabase SDK é projetado para pegar o hash automaticamente.
        // Vamos garantir que o loading seja gerenciado corretamente.
        const { data: { session: sessionFromHashAttempt }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('AuthContext: Error fetching session in processAuthHash:', sessionError);
        }

        if (sessionFromHashAttempt) {
          console.log('%cAuthContext: Session established via getSession() in processAuthHash', 'color: green; font-weight: bold;', sessionFromHashAttempt);
          setSession(sessionFromHashAttempt);
          setUser(sessionFromHashAttempt.user);
          // Limpar o hash DEPOIS de confirmar a sessão
          if (window.location.hash) {
            console.log('%cAuthContext: Clearing URL hash AFTER session from processAuthHash():', 'color: orange; font-weight: bold;', window.location.hash);
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          console.log('%cAuthContext: No session found via getSession() in processAuthHash.', 'color: orange;');
        }
      }
      setLoading(false); // Sempre define loading como false após a tentativa inicial
      console.log('%cAuthContext: processAuthHash finished. Loading set to false.', 'color: orange;');
    };

    processAuthHash(); // Chamar imediatamente na montagem

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, sessionState) => {
      console.log(
        '%cAuthContext: onAuthStateChange Event Fired',
        'color: blue; font-weight: bold;',
        {
          event: event,
          sessionFromEvent: sessionState,
          hashAtEventTime: typeof window !== 'undefined' ? window.location.hash : "N/A",
          pathAtEventTime: typeof window !== 'undefined' ? window.location.pathname : "N/A"
        }
      );

      // Se o evento é INITIAL_SESSION ou SIGNED_IN e a sessão ainda é null,
      // mas o hash existe, isso pode indicar que o SDK ainda não o processou.
      // A chamada processAuthHash acima já tenta isso, mas vamos adicionar um log aqui.
      if (!sessionState && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        console.warn('%cAuthContext: onAuthStateChange viu evento de login/inicial mas sessionState é null e hash presente. processAuthHash deveria ter lidado.', 'color: yellow; font-weight: bold;');
        // Poderia chamar processAuthHash() novamente, mas pode causar loops.
        // O SDK do Supabase deveria ter pego o hash.
      }

      setSession(sessionState);
      setUser(sessionState?.user ?? null);
      
      // Se setLoading(true) foi chamado em signOut, setLoading(false) pode ser necessário se o evento for SIGNED_OUT
      // No entanto, processAuthHash define loading como false.
      if (event === 'SIGNED_OUT') {
        setLoading(false); // Garante que o loading não fique preso se o signOut ocorrer.
      }

      // Sua lógica de redirecionamento para /definir-senha baseada nos metadados do usuário
      if (event === 'SIGNED_IN' && sessionState) {
        console.log('%cAuthContext: SIGNED_IN event detected by onAuthStateChange!', 'color: green; font-weight: bold;', {
          user: sessionState?.user,
          metadata: sessionState?.user?.user_metadata,
          path: typeof window !== 'undefined' ? window.location.pathname : "N/A"
        });
        
        const metadata = sessionState.user?.user_metadata || {};
        if (metadata.status === 'awaiting_first_access' && 
            !metadata.first_access_completed_at && 
            typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path === '/login') { // Apenas redireciona se estiver no login
            console.log('%cAuthContext: Redirecting to /definir-senha due to awaiting_first_access.', 'color: green;');
            window.location.href = '/definir-senha';
          }
        }
      }
      
      if (event === 'USER_UPDATED') {
        console.log('%cAuthContext: USER_UPDATED event detected!', 'color: green; font-weight: bold;', sessionState);
        // Pode ser útil chamar refreshUser aqui se você quiser garantir que os metadados mais recentes estão no estado user
        // No entanto, o próprio `sessionState.user` já deve estar atualizado.
      }

      if (event === 'PASSWORD_RECOVERY') {
        console.log('%cAuthContext: PASSWORD_RECOVERY event detected!', 'color: green; font-weight: bold;', sessionState);
        // A sessão pode ser nula aqui, o usuário precisa definir a nova senha.
        // O formulário de recuperação de senha (UpdatePasswordForm) lidará com isso.
      }
    });

    return () => {
      // clearTimeout(timerId); // Removido pois timerId foi removido
      console.log('%cAuthContext: useEffect unmounting. Unsubscribing authListener.', 'color: purple;');
      authListener.subscription.unsubscribe();
    };
  }, [supabase]); // A dependência é apenas o cliente supabase

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user: updatedUser }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching updated user:", userError);
      } else {
        setUser(updatedUser);
      }
      
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error fetching updated session:", sessionError);
      } else {
        setSession(currentSession);
      }

    } catch (error) {
      console.error("Unexpected error in refreshUser:", error);
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
    supabase,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 