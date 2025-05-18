'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só redireciona se o carregamento inicial da sessão terminou e não há usuário
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, session, router]); // Adicionado session à dependência para reavaliar se a sessão mudar explicitamente

  // Se ainda estiver carregando a sessão, pode-se mostrar um loader global ou nada
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-100 via-cyan-50 to-sky-100">
        <p className="text-teal-700 text-xl">Carregando sua sessão...</p>
        {/* Ou um spinner mais elaborado */}
      </div>
    );
  }

  // Se houver usuário, renderiza o conteúdo protegido
  if (user) {
    return <>{children}</>;
  }

  // Se não estiver carregando e não houver usuário, o useEffect já deve ter redirecionado.
  // Retornar null aqui evita piscar o conteúdo antes do redirecionamento ser efetivado.
  return null;
} 