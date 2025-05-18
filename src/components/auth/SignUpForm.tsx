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
    <div className="w-full max-w-lg p-8 space-y-6 sm:space-y-8 bg-white rounded-xl shadow-2xl">
      <div className="text-center">
         <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-teal-500 rounded-full text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Crie sua Conta</h1>
        <p className="mt-2 text-gray-600">É rápido e fácil para começar a usar.</p>
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
                className="w-full pl-3 pr-10 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md"
                placeholder="Seu nome completo"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-gray-400" />
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
                className="w-full pl-3 pr-10 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md"
                placeholder="Seu e-mail"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-gray-400" />
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
                className="w-full pl-3 pr-10 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition duration-150 ease-in-out shadow-sm hover:shadow-md"
                placeholder="Crie uma senha (mín. 6 caracteres)"
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
            <label htmlFor="confirmPassword" className="sr-only">Confirme sua senha</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
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
                  Processando...
                </>
              ) : (
                'Criar Conta'
              )}
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-gray-600">
        Já tem conta?{
        ' '}
        <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500 hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  );
} 