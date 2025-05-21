'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Detecta se o fluxo é de primeiro acesso pelo URL
function isCorrectPathForPasswordForm() {
  if (typeof window === 'undefined') return false;
  
  // Verifica o caminho da URL
  // Este formulário agora serve para qualquer cenário onde a URL o chama para definir/atualizar senha via token no hash.
  if (window.location.pathname.includes('/definir-senha') || window.location.pathname.includes('/atualizar-senha')) {
    console.log('Password form page loaded, assuming password set/update flow via URL token.');
    return true;
  }
  
  return false;
}

export default function FirstAccessPasswordForm() {
  const { supabase } = useAuth(); // Removido session e user, pois não dependeremos deles inicialmente
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  
  // Estado para controlar se o formulário deve estar ativo. Inicialmente true.
  const [isFormActive, setIsFormActive] = useState(true); 
  const [isOnCorrectPath, setIsOnCorrectPath] = useState(() => isCorrectPathForPasswordForm());

  // Timeout para mostrar mensagem de erro genérica se nada acontecer (o token pode ser inválido)
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isOnCorrectPath && isFormActive && !success) { // Apenas ativa o timer se estivermos esperando interação
      timer = setTimeout(() => {
        if (!loading && !error && !success) { // Se o usuário não submeteu e não houve outro erro/sucesso
          setError('O link pode ter expirado ou ser inválido. Se o problema persistir, contate o suporte.');
          setIsFormActive(false); // Desativa o formulário
        }
      }, 15000); // Aumentado para 15 segundos para dar tempo ao usuário
    }
    return () => clearTimeout(timer);
  }, [isOnCorrectPath, isFormActive, success, loading, error]);


  useEffect(() => {
    // Este useEffect não depende mais de session/user para habilitar o formulário.
    // A validação do token ocorre implicitamente na chamada `updateUser`.
    // Se o componente está montado e na URL correta, consideramos pronto para uso.
    console.log('FirstAccessPasswordForm: Mounted. Ready for password input.');
    if (!isOnCorrectPath) {
        setError("Página inválida para esta operação.");
        setIsFormActive(false);
    }

  }, [isOnCorrectPath]);

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

      setSuccess('Senha definida com sucesso! Você será redirecionado para a página de login.');
      setIsFormActive(false); // Desativa o formulário após sucesso
      setTimeout(() => {
        router.push('/login'); // Alterado para redirecionar para /login
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

      {error && (
        <div className="flex items-center p-3.5 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {!success && isFormActive && (
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
            Redirecionando para a página de login em alguns segundos...
        </p>
      )}

      {!isFormActive && !success && !error && (
         <p className="mt-6 text-center text-sm text-gray-600">
            Não é possível definir a senha no momento. <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500">Voltar para o login</Link>.
        </p>
      )}

      {(!isFormActive || success || error) && !loading && (
          <div className="mt-8 text-center">
            <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500 hover:underline">
              Ir para Login
            </Link>
          </div>
      )}
    </div>
  );
} 