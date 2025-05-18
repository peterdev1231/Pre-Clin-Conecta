'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordForm() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordResetRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Para o Supabase, o redirectURL deve estar configurado na lista de permissões do seu projeto Supabase.
    // Ex: http://localhost:3000/atualizar-senha
    const redirectURL = `${window.location.origin}/atualizar-senha`;

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectURL,
      });

      if (authError) {
        throw authError;
      }

      setSuccess('Se uma conta existir para este e-mail, um link para redefinir sua senha foi enviado.');
    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      // Mesmo em caso de erro, mostramos uma mensagem genérica por segurança
      setSuccess('Se uma conta existir para este e-mail, um link para redefinir sua senha foi enviado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 sm:space-y-8 bg-white rounded-xl shadow-2xl">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-teal-500 rounded-full text-white shadow-md">
          <KeyRound className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Recuperar Senha</h1>
        <p className="mt-2 text-gray-600">Insira seu e-mail para receber o link de redefinição.</p>
      </div>

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
        <form onSubmit={handlePasswordResetRequest} className="space-y-6">
          <div>
            <label htmlFor="email-forgot" className="sr-only">Email</label>
            <div className="relative">
              <input
                id="email-forgot"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-3 pr-10 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md"
                placeholder="Seu e-mail"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
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
                  Enviando...
                </>
              ) : (
                'Enviar Link de Redefinição'
              )}
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-gray-600">
        Lembrou sua senha?{
        ' '}
        <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500 hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  );
} 