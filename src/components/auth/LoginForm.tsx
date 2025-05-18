'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'; // Ícones
import Link from 'next/link'; // Importar Link para navegação
import { useRouter } from 'next/navigation'; // Importar useRouter

export default function LoginForm() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // Inicializar useRouter

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      console.log('Login successful:', data.user);
      router.push('/dashboard'); // Redirecionar para /dashboard
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha inválidos.');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.');
        } else {
          setError(err.message || 'Ocorreu um erro ao tentar fazer login.');
        }
      } else {
        setError('Ocorreu um erro desconhecido ao tentar fazer login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 sm:space-y-8 bg-white rounded-xl shadow-2xl">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-teal-500 rounded-full text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Bem-vindo(a) de volta!</h1>
        <p className="mt-2 text-gray-600">Faça login para acessar seu painel.</p>
      </div>

      {error && (
        <div className="flex items-center p-3.5 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label htmlFor="email" className="sr-only">Email</label>
          <div className="relative">
            <input
              id="email"
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
          <label htmlFor="password" className="sr-only">Senha</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-3 pr-16 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md"
              placeholder="Sua senha"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
              <span className="pointer-events-none"><Lock className="w-5 h-5 text-gray-400" /></span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-500 hover:text-teal-600 focus:outline-none p-1"
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-sm space-y-2 sm:space-y-0">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 block text-gray-700 cursor-pointer">
              Lembrar-me
            </label>
          </div>
          <Link href="/recuperar-senha" className="font-medium text-teal-600 hover:text-teal-500 hover:underline">
            Esqueci minha senha
          </Link>
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
                Processando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-gray-600">
        Ainda não tem conta?{
        ' '}
        <Link href="/cadastro" className="font-medium text-teal-600 hover:text-teal-500 hover:underline">
          Crie uma agora
        </Link>
      </p>
    </div>
  );
} 