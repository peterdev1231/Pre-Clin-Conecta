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

    let initialAuthEventProcessed = false;

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

      if (!initialAuthEventProcessed) {
        setLoading(false);
        initialAuthEventProcessed = true;
        console.log('%cAuthContext: First auth event processed, setLoading(false).', 'color: orange;');
      }

      // Definir o estado da sessão e do usuário
      setSession(sessionState);
      setUser(sessionState?.user ?? null);

      // Limpar o hash da URL APÓS uma sessão ser estabelecida E o hash ainda estiver presente
      if (sessionState && typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        console.log('%cAuthContext: Session established and hash present. Clearing URL hash.', 'color: orange; font-weight: bold;', window.location.hash);
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      
      // Se setLoading(true) foi chamado em signOut, setLoading(false) pode ser necessário se o evento for SIGNED_OUT
      // e foi o primeiro evento. O bloco acima já cuida de setLoading(false) no primeiro evento.
      // Se for um SIGNED_OUT subsequente, loading já deve ser false.

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