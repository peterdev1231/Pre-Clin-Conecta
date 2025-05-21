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
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log(
        '%cAuthContext: onAuthStateChange Event Fired',
        'color: blue; font-weight: bold;',
        {
          event: _event,
          session: currentSession,
          hasAccessTokenInHash: typeof window !== "undefined" && window.location.hash.includes('access_token'),
          hash: typeof window !== "undefined" ? window.location.hash : "N/A (server-side or no window)"
        }
      );
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session: potentialRecoverySession } }) => {
      console.log('%cAuthContext: Explicit getSession() called after onAuthStateChange setup.', 'color: green; font-weight: bold;', {
        sessionFromGetSession: potentialRecoverySession,
        currentHash: typeof window !== "undefined" ? window.location.hash : 'N/A'
      });
    });

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

    return () => {
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