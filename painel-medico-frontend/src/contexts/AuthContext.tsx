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
    console.log('%cAuthContext: useEffect mounting. Setting up onAuthStateChange listener.', 'color: purple; font-weight: bold;', {
      initialHash: typeof window !== 'undefined' ? window.location.hash : 'N/A'
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        '%cAuthContext: onAuthStateChange Event Fired',
        'color: blue; font-weight: bold;',
        {
          event: event,
          session: session,
          hashAtEventTime: typeof window !== 'undefined' ? window.location.hash : "N/A"
        }
      );

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('%cAuthContext: PASSWORD_RECOVERY event detected!', 'color: green; font-weight: bold;', session);
      }
    });

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