'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    console.log('%cAuthContext: useEffect mounting. Setting up onAuthStateChange listener.', 'color: purple; font-weight: bold;', {
      initialHash: typeof window !== 'undefined' ? window.location.hash : 'N/A',
      initialPath: typeof window !== 'undefined' ? window.location.pathname : 'N/A'
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        '%cAuthContext: onAuthStateChange Event Fired',
        'color: blue; font-weight: bold;',
        {
          event: event,
          session: session,
          hashAtEventTime: typeof window !== 'undefined' ? window.location.hash : "N/A",
          pathAtEventTime: typeof window !== 'undefined' ? window.location.pathname : "N/A"
        }
      );

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Limpar o hash da URL se contiver informações de token/erro que já foram processadas
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash;
        if (hash.includes('access_token=') || hash.includes('error=') || hash.includes('type=signup') || hash.includes('type=magiclink')) {
          console.log('%cAuthContext: Clearing URL hash:', 'color: orange; font-weight: bold;', hash);
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        console.log('%cAuthContext: PASSWORD_RECOVERY event detected!', 'color: green; font-weight: bold;', session);
      }
      
      if (event === 'SIGNED_IN') {
        console.log('%cAuthContext: SIGNED_IN event detected!', 'color: green; font-weight: bold;', {
          user: session?.user,
          metadata: session?.user?.user_metadata,
          path: typeof window !== 'undefined' ? window.location.pathname : "N/A"
        });
        
        // Verificar se o usuário está acessando pela primeira vez com base nos metadados
        const metadata = session?.user?.user_metadata || {};
        if (metadata.status === 'awaiting_first_access' && 
            !metadata.first_access_completed_at && 
            typeof window !== 'undefined') {
          const path = window.location.pathname;
          // Se estiver na página de login e for primeiro acesso, redirecionar para definir senha
          if (path === '/login') {
            window.location.href = '/definir-senha';
          }
        }
      }
      
      // Eventos válidos para AuthChangeEvent incluem:
      // 'INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED',
      // 'USER_DELETED', 'PASSWORD_RECOVERY', 'TOKEN_REFRESHED', 'MFA_CHALLENGE_VERIFIED'
      if (event === 'USER_UPDATED') {
        console.log('%cAuthContext: USER_UPDATED event detected!', 'color: green; font-weight: bold;', session);
      }
    });

    // Carregar a sessão no carregamento inicial
    const initializeSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error fetching initial session:', error);
        } else if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          console.log('%cAuthContext: Initial session loaded', 'color: purple;', {
            user: initialSession.user,
            metadata: initialSession.user.user_metadata
          });
        }
      } catch (err) {
        console.error('Unexpected error loading session:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initializeSession();

    return () => {
      console.log('%cAuthContext: useEffect unmounting. Unsubscribing authListener.', 'color: purple;');
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

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