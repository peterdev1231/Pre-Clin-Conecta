'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, User, SupabaseClient } from '@supabase/supabase-js';

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
    // Temporariamente comentado para depurar o fluxo de PASSWORD_RECOVERY
    /*
    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log('AuthContext: onAuthStateChange event:', _event, 'session:', currentSession); // Adicionado log
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
    */
    console.log('AuthContext: Lógica de sessão inicial e listener temporariamente desabilitados para teste de PASSWORD_RECOVERY.');
    setLoading(false); // Garante que o loading não fique preso
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