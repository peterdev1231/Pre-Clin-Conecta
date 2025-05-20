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
    <div className="w-full max-w-md p-8 space-y-6 sm:space-y-8 bg-white dark:bg-slate-800 rounded-xl shadow-2xl">
      <div className="text-center">
        <div className="mb-6 inline-flex flex-col items-center">
          {/* SVG do estetoscópio */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-[#00A651] dark:text-[#00C25D]" aria-hidden="true">
            <path d="M11 2v2"></path><path d="M5 2v2"></path><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"></path><path d="M8 15a6 6 0 0 0 12 0v-3"></path><circle cx="20" cy="10" r="2"></circle>
          </svg>
          {/* Texto do Logo */}
          <span className="text-2xl font-semibold text-[#25392C] dark:text-slate-100 mt-2">
            PréClin<span className="font-light">Conecta</span>
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[#25392C] dark:text-slate-100">Bem-vindo(a) de volta!</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Faça login para acessar seu painel.</p>
      </div>

      {error && (
        <div className="flex items-center p-3.5 text-sm text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700" role="alert">
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
              className="w-full pl-3 pr-10 py-3 text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00A651]/50 focus:border-[#00A651] focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-[#00A651]/50 dark:focus:border-[#00A651] placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Seu e-mail"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500" />
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
              className="w-full pl-3 pr-16 py-3 text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00A651]/50 focus:border-[#00A651] focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-[#00A651]/50 dark:focus:border-[#00A651] placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Sua senha"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
              <span className="pointer-events-none"><Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" /></span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-[#00A651] dark:text-slate-400 dark:hover:text-[#00A651] focus:outline-none p-1"
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
              className="h-4 w-4 text-[#00A651] border-slate-300 rounded focus:ring-[#00A651] cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:checked:bg-[#00A651]"
            />
            <label htmlFor="remember-me" className="ml-2 block text-slate-700 dark:text-slate-300 cursor-pointer">
              Lembrar-me
            </label>
          </div>
          <Link href="/recuperar-senha" className="font-medium text-[#00A651] hover:text-[#008f48] dark:text-[#00A651] dark:hover:text-[#00C25D] hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-[#00A651] hover:bg-[#008f48] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A651]/50 disabled:opacity-70 disabled:cursor-not-allowed transition duration-150 ease-in-out"
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

      <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Ainda não tem conta?{
        ' '}
        <Link href="/cadastro" className="font-medium text-[#00A651] hover:text-[#008f48] dark:text-[#00A651] dark:hover:text-[#00C25D] hover:underline">
          Crie uma agora
        </Link>
      </p>
    </div>
  );
} 