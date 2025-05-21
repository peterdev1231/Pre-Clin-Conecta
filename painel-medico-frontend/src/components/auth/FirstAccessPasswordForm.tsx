'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Detecta se o fluxo é de primeiro acesso pelo URL
function isFirstAccessFlow() {
  if (typeof window === 'undefined') return false;
  
  // Verifica se há parâmetros na URL que indiquem que é um link de signup
  const urlHash = window.location.hash;
  if (urlHash && urlHash.includes('type=signup')) {
    console.log('First access flow detected from URL hash:', urlHash);
    return true;
  }
  
  // Verifica o caminho da URL
  if (window.location.pathname.includes('/definir-senha')) {
    console.log('On first access page, assuming first access flow');
    return true;
  }
  
  return false;
}

export default function FirstAccessPasswordForm() {
  const { supabase, session, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  
  // Verificar se é um fluxo de primeiro acesso
  const [isFirstAccessDetected, setIsFirstAccessDetected] = useState(() => isFirstAccessFlow());

  // Timeout para mostrar mensagem de erro se o token expirou
  useEffect(() => {
    if (isFirstAccessDetected && !session) {
      const timer = setTimeout(() => {
        setError('O link de ativação expirou ou já foi utilizado. Por favor, solicite um novo link.');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isFirstAccessDetected, session]);

  useEffect(() => {
    console.log('FirstAccessPasswordForm: Checking session status', {
      isFirstAccessDetected,
      hasSession: !!session,
      sessionDetails: session,
      userMetadata: user?.user_metadata
    });

    // Se temos sessão, verificamos o status nos metadados
    if (session && user) {
      const metadata = user.user_metadata || {};
      const userStatus = metadata.status || 'unknown';
      
      if (userStatus === 'awaiting_first_access' || !metadata.first_access_completed_at) {
        console.log('FirstAccessPasswordForm: User needs to set first password');
        setIsFirstAccess(true);
        setIsSessionReady(true);
        setError(null);
      } else if (userStatus === 'active' || metadata.first_access_completed_at) {
        console.log('FirstAccessPasswordForm: User already set password before');
        setIsFirstAccess(false);
        setError('Sua senha já foi definida anteriormente. Para redefinir sua senha, use a opção "Esqueci minha senha".');
      } else {
        // Se não há status definido, mas temos sessão, permitimos o fluxo
        console.log('FirstAccessPasswordForm: No status found but session exists - enabling form');
        setIsFirstAccess(true);
        setIsSessionReady(true);
      }
    } else if (!session) {
      console.log('FirstAccessPasswordForm: Waiting for session to be established...');
      setIsSessionReady(false);
    }
  }, [session, user, isFirstAccessDetected]);

  const handleSetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      // Atualizar os metadados do usuário
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          status: 'active',
          first_access_completed_at: new Date().toISOString()
        }
      });

      if (metadataError) {
        console.warn('Erro ao atualizar metadados do usuário:', metadataError);
        // Não impedimos o fluxo se apenas os metadados falharem
      }

      setSuccess('Senha definida com sucesso! Você será redirecionado para o painel em alguns segundos.');
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err: unknown) {
      console.error('Set password error:', err);
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao tentar definir sua senha.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 sm:space-y-8 bg-white rounded-xl shadow-2xl">
      <div className="text-center">
         <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-teal-500 rounded-full text-white shadow-md">
          <Lock className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Definir Senha</h1>
        <p className="mt-2 text-gray-600">Bem-vindo! Defina sua senha para acessar sua conta.</p>
      </div>

      {!isSessionReady && !error && !success && (
        <div className="flex items-center p-3.5 text-sm text-blue-700 bg-blue-100 rounded-lg border border-blue-300" role="alert">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="font-medium">Aguarde, preparando formulário para definição de senha...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-3.5 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center p-3.5 text-sm text-green-700 bg-green-100 rounded-lg border border-green-300" role="alert">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {!success && !error && isSessionReady && isFirstAccess && (
        <form onSubmit={handleSetPassword} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="sr-only">Nova Senha</label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md"
                placeholder="Digite sua senha (mín. 6 caracteres)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-teal-600 focus:outline-none p-1"
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className="sr-only">Confirme a Senha</label>
            <div className="relative">
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md"
                placeholder="Confirme sua senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-teal-600 focus:outline-none p-1"
                aria-label={showConfirmPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Definindo...
                </>
              ) : (
                'Definir Senha'
              )}
            </button>
          </div>
        </form>
      )}

      {success && (
         <p className="mt-6 text-center text-sm text-gray-600">
            Redirecionando para o dashboard em alguns segundos...
        </p>
      )}

      {error && (
         <p className="mt-6 text-center text-sm text-gray-600">
            <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500 hover:underline">
              Voltar para o login
            </Link>
        </p>
      )}

    </div>
  );
} 