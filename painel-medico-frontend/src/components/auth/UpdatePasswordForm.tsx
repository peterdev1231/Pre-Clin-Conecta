'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Para redirecionamento
import Link from 'next/link';

export default function UpdatePasswordForm() {
  const { supabase, session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (session && hash.includes('type=recovery')) {
        console.log('UpdatePasswordForm: Sessão via AuthContext detectada no fluxo de recuperação. Formulário pronto.');
        setIsSessionReady(true);
      } else if (!session && hash.includes('type=recovery')) {
        console.log('UpdatePasswordForm: Fluxo de recuperação indicado pela URL, mas sem sessão do AuthContext ainda. Aguardando...');
        setIsSessionReady(false); // Mantém "Aguarde..."
      } else if (session && !hash.includes('type=recovery')) {
        console.warn('UpdatePasswordForm: Sessão existe, mas URL não indica fluxo de recuperação. Acesso indevido?');
        setError("Página de atualização de senha acessada fora do fluxo de recuperação.");
        setIsSessionReady(false);
      } else {
        console.log('UpdatePasswordForm: Sem sessão do AuthContext ou não está no fluxo de recuperação.');
        setIsSessionReady(false);
      }
    }
  }, [session, supabase]);

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
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
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setSuccess('Senha atualizada com sucesso! Você já pode fazer login com sua nova senha.');
      setTimeout(() => {
        router.push('/login');
      }, 3000); // Redireciona para login após 3 segundos

    } catch (err: unknown) {
      console.error('Update password error:', err);
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao tentar atualizar sua senha.';
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
        <h1 className="text-3xl font-bold text-gray-800">Definir Nova Senha</h1>
        <p className="mt-2 text-gray-600">Crie uma nova senha para sua conta.</p>
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

      {!success && (
        <form onSubmit={handleUpdatePassword} className="space-y-6">
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
                placeholder="Digite sua nova senha (mín. 6 caracteres)"
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
            <label htmlFor="confirmNewPassword" className="sr-only">Confirme a Nova Senha</label>
            <div className="relative">
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md"
                placeholder="Confirme sua nova senha"
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
              disabled={loading || !isSessionReady}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Atualizando...
                </>
              ) : (
                'Atualizar Senha'
              )}
            </button>
          </div>
        </form>
      )}

      {success && (
         <p className="mt-6 text-center text-sm text-gray-600">
            Redirecionando para o login em alguns segundos...
        </p>
      )}

      {!success && error && (
         <p className="mt-6 text-center text-sm text-gray-600">
            Problemas? Tente <Link href="/recuperar-senha" className="font-medium text-teal-600 hover:text-teal-500 hover:underline">solicitar um novo link</Link>.
        </p>
      )}

    </div>
  );
} 