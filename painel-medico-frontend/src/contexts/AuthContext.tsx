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

    let initialSessionLoaded = false;

    const handleAuthFlow = async () => {
      console.log('%cAuthContext: handleAuthFlow called.', 'color: orange; font-weight: bold;');
      try {
        // Tenta obter a sessão. Isso pode processar o hash se presente.
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('AuthContext: Error fetching session on handleAuthFlow:', sessionError);
        }
        
        if (currentSession) {
          console.log('%cAuthContext: Session established via getSession()', 'color: green; font-weight: bold;', currentSession);
          setSession(currentSession);
          setUser(currentSession.user);
          initialSessionLoaded = true; // Marca que a sessão foi carregada

          // Limpar o hash DEPOIS de confirmar a sessão
          if (typeof window !== 'undefined' && window.location.hash) {
            const hash = window.location.hash;
            // Simplificado para verificar access_token ou error, já que são os mais relevantes do magic link
            if (hash.includes('access_token=') || hash.includes('error=')) { 
              console.log('%cAuthContext: Clearing URL hash AFTER session from getSession():', 'color: orange; font-weight: bold;', hash);
              history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }
        } else {
          console.log('%cAuthContext: No session found via getSession().', 'color: orange;');
        }
      } catch (err) {
        console.error('AuthContext: Unexpected error in handleAuthFlow:', err);
      } finally {
        setLoading(false); // Define loading como false após a tentativa inicial
        console.log('%cAuthContext: handleAuthFlow finished. Loading set to false.', 'color: orange;');
      }
    };

    // Chama handleAuthFlow na montagem para tentar processar o hash imediatamente
    // handleAuthFlow(); // Comentado para testar com delay

    // Tentar com um pequeno delay
    const timerId = setTimeout(() => {
      console.log('%cAuthContext: Calling handleAuthFlow after a short delay (100ms).', 'color: orange; font-weight: bold;');
      handleAuthFlow();
    }, 100); // Delay de 100ms

    const { data: authListener } = supabase.auth.onAuthStateChange((event, sessionState) => {
      console.log(
        '%cAuthContext: onAuthStateChange Event Fired',
        'color: blue; font-weight: bold;',
        {
          event: event,
          sessionFromEvent: sessionState, // Logando a sessão do evento
          hashAtEventTime: typeof window !== 'undefined' ? window.location.hash : "N/A",
          pathAtEventTime: typeof window !== 'undefined' ? window.location.pathname : "N/A"
        }
      );

      // A sessão principal é atualizada por handleAuthFlow ou por este listener.
      // Se initialSessionLoaded é true, significa que handleAuthFlow já tentou.
      // Se sessionState for diferente da session atual, atualize.
      // Esta lógica pode precisar de refinamento para evitar renders desnecessários,
      // mas o objetivo principal é garantir que o estado reflita a sessão correta.

      setSession(sessionState);
      setUser(sessionState?.user ?? null);
      
      // Se setLoading(true) for chamado em signOut, precisamos de setLoading(false) aqui também.
      // Mas handleAuthFlow já define como false. Se a sessão mudar DEPOIS de handleAuthFlow (ex: signOut),
      // o loading já estaria false.
      // Se um evento como TOKEN_REFRESHED ocorre, loading já deve ser false.
      // Talvez não seja necessário mexer no loading aqui, a menos que um fluxo específico o exija.

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

    // O initializeSession foi substituído por handleAuthFlow.
    // Mantenha o setLoading(false) dentro do finally de handleAuthFlow.

    return () => {
      clearTimeout(timerId); // Limpar o timeout ao desmontar
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