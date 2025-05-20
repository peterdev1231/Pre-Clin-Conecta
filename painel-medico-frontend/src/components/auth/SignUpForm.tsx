'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpForm() {
  const { supabase } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        console.log('[SignUpForm] User created in auth.users:', authData.user.id);
        console.log('[SignUpForm] Attempting to insert into profissionais_saude with data:', {
          id_usuario_supabase: authData.user.id,
          nome_completo: fullName,
          email: email 
        });

        const { error: profileError } = await supabase
          .from('profissionais_saude')
          .insert({ 
            id_usuario_supabase: authData.user.id,
            nome_completo: fullName,
            email: email 
          });

        if (profileError) {
          console.error('[SignUpForm] Error creating profile in profissionais_saude:', JSON.stringify(profileError, null, 2));
          const errorMessage = `Erro ao finalizar cadastro do perfil: ${profileError.message}. Contate o suporte.`;
          setError(errorMessage);
          // Consider not throwing an error here if you want to allow login even if profile creation fails,
          // but the user will likely experience issues later.
          // For now, we keep throwing to make the problem visible.
          throw new Error(errorMessage);
        }
        
        console.log('[SignUpForm] Profile successfully created inissionais_saude for user:', authData.user.id);
        setSuccess('Cadastro realizado com sucesso! Por favor, verifique seu e-mail para confirmar sua conta. Você será redirecionado para o login.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setSuccess('Verifique seu e-mail para confirmar sua conta ou tente fazer login.');
      }

    } catch (err: unknown) {
      console.error('[SignUpForm] Overall sign up error catch block:', err);
      if (err instanceof Error) {
          if (err.message.includes('User already registered')) {
            setError('Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.');
          } else if (err.message.includes('Password should be at least 6 characters')) {
            setError('A senha deve ter no mínimo 6 caracteres.');
          }
          else {
            setError(err.message || 'Ocorreu um erro ao tentar criar a conta.');
          }
      } else {
          setError('Ocorreu um erro desconhecido ao tentar criar a conta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-8 space-y-6 sm:space-y-8 bg-white dark:bg-slate-800 rounded-xl shadow-2xl">
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
        <h1 className="text-3xl font-bold text-[#25392C] dark:text-slate-100">Crie sua Conta</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">É rápido e fácil para começar a usar.</p>
      </div>

      {error && (
        <div className="flex items-center p-3.5 text-sm text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700" role="alert">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center p-3.5 text-sm text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700" role="alert">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="sr-only">Nome Completo</label>
            <div className="relative">
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-3 pr-10 py-3 text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00A651]/50 focus:border-[#00A651] focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-[#00A651]/50 dark:focus:border-[#00A651] placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Seu nome completo"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="email-signup" className="sr-only">Email</label>
            <div className="relative">
              <input
                id="email-signup"
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
            <label htmlFor="password-signup" className="sr-only">Crie uma senha</label>
            <div className="relative">
              <input
                id="password-signup"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-3 text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00A651]/50 focus:border-[#00A651] focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-[#00A651]/50 dark:focus:border-[#00A651] placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Crie uma senha (mín. 6 caracteres)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-[#00A651] dark:text-slate-400 dark:hover:text-[#00A651] focus:outline-none p-1"
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="sr-only">Confirme sua senha</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-3 text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00A651]/50 focus:border-[#00A651] focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-[#00A651]/50 dark:focus:border-[#00A651] placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Confirme sua senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-[#00A651] dark:text-slate-400 dark:hover:text-[#00A651] focus:outline-none p-1"
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
                'Criar Conta'
              )}
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Já tem conta?{
        ' '}
        <Link href="/login" className="font-medium text-[#00A651] hover:text-[#008f48] dark:text-[#00A651] dark:hover:text-[#00C25D] hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  );
} 