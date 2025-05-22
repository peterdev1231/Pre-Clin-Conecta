'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthOtpResponse } from '@supabase/supabase-js';

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

// Função para extrair o token de acesso e o tipo da URL (REINTRODUZIDA)
function getTokenInfoFromUrl() {
  if (typeof window === 'undefined') return { accessToken: null, tokenType: null, refreshToken: null, expiresIn: null };
  
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  return {
    accessToken: hashParams.get('access_token'),
    tokenType: hashParams.get('type'),
    refreshToken: hashParams.get('refresh_token'), // Capturar se presente
    expiresIn: hashParams.get('expires_in'),     // Capturar se presente
  };
}

// Função para extrair parâmetros da query string
function getQueryParam(param: string): string | null {
  if (typeof window === 'undefined') return null;
  const queryParams = new URLSearchParams(window.location.search);
  return queryParams.get(param);
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
  
  // Estado para controlar se o formulário deve estar ativo. Inicialmente true.
  const [isFormActive, setIsFormActive] = useState(true); 
  const [isOnCorrectPath, setIsOnCorrectPath] = useState(() => isCorrectPathForPasswordForm());
  
  // Estados para o formulário de senha
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para controlar o loading do botão
  const [isSessionLoaded, setIsSessionLoaded] = useState(false); // Novo estado para rastrear se a sessão foi carregada

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    console.log('[DebugForm] useEffect for timeout triggered. Conditions:', { isOnCorrectPath, isFormActive, success, loading, error });
    if (isOnCorrectPath && isFormActive && !success && !loading && !error) {
      console.log('[DebugForm] Setting up timeout for link expiration message.');
      timer = setTimeout(() => {
        // Verifique novamente as condições DENTRO do timeout, pois o estado pode ter mudado
        if (!loading && !error && !success && isFormActive) { 
          console.log('[DebugForm] Timeout reached! Setting link expired error.');
          setError('O link pode ter expirado ou ser inválido (timeout). Se o problema persistir, contate o suporte.');
          setIsFormActive(false);
        }
      }, 30000); // Aumentado para 30 segundos
    } else {
      console.log('[DebugForm] Timeout not set or conditions not met.');
    }
    return () => {
      console.log('[DebugForm] Clearing timeout.');
      clearTimeout(timer);
    };
  }, [isOnCorrectPath, isFormActive, success, loading, error]);


  useEffect(() => {
    console.log('[DebugForm] Initial mount useEffect. isOnCorrectPath:', isOnCorrectPath);
    if (!isOnCorrectPath) {
        console.log('[DebugForm] Path is incorrect, setting error and deactivating form.');
        setError("Página inválida para esta operação.");
        setIsFormActive(false);
    }
  }, [isOnCorrectPath]);

  // Extrair o email da query string ao montar o componente (ainda pode ser útil para debug ou contexto)
  useEffect(() => {
    const email = getQueryParam('email'); // Extrair email da query string
    
    console.log('[DebugForm] Email extracted:', { 
      emailFromQuery: email // Logar email extraído
    });
    
    if (!email && isOnCorrectPath) { 
      setError('Informações incompletas no link. O e-mail é necessário para convites. Por favor, use o link original.');
      setIsFormActive(false);
    }
    
    // Marcar a sessão como carregada após a primeira renderização e extração inicial
    setIsSessionLoaded(true);

  }, [isOnCorrectPath]); // Dependência apenas em isOnCorrectPath para rodar na montagem e se o path mudar

  // Adicionar log para verificar o estado da sessão sempre que mudar
  useEffect(() => {
      console.log('[DebugForm] Session state changed:', { session, user });
      // Opcional: Redirecionar automaticamente se uma sessão válida for estabelecida
      // if (session && isOnCorrectPath) {
      //     console.log('[DebugForm] Valid session found, redirecting to dashboard.');
      //     router.push('/dashboard');
      // }
  }, [session, user, isOnCorrectPath, router]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar se as senhas coincidem e atendem ao comprimento mínimo
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true); // Inicia o estado de submissão
    setError(null); // Limpa erros anteriores
    setSuccess(null); // Limpa sucesso anterior

    // VERIFICAR SE A SESSÃO EXISTE ANTES DE TENTAR ATUALIZAR
    if (!session) {
        console.error('[DebugForm] handleSetPassword: Auth session is missing before updateUser call.');
        setError('Sessão de autenticação não encontrada. O link pode ser inválido ou expirado. Tente novamente com um novo link ou contate o suporte.');
        setIsSubmitting(false);
        // Opcional: Redirecionar para login após este erro
        // router.push('/login');
        return;
    }

    try {
      // Supabase Client SDK já deve ter processado o token da URL e estabelecido a sessão.
      // Agora, simplesmente atualizamos a senha do usuário logado temporariamente.
      console.log('[DebugForm] Attempting to update user password.', { currentSession: session });
      const { error: updateError } = await supabase.auth.updateUser({ password: password });

      if (updateError) {
        console.error('[DebugForm] Error updating password:', updateError);
        let detailedUpdateErrorMessage = updateError.message;
        // Adicionar mais detalhes do erro se disponíveis (pode variar dependendo do erro exato)
        // if ((updateError as any).source) { 
        //     detailedUpdateErrorMessage += ` (Source: ${JSON.stringify((updateError as any).source)})`;
        // }
        setError(`Falha ao definir a senha: ${detailedUpdateErrorMessage}`);
      } else {
        console.log('[DebugForm] Password set successfully.');
        setSuccess('Senha definida com sucesso!');
        setPassword('');
        setConfirmPassword('');
        setIsFormActive(false); // Desativa o formulário em caso de sucesso
        
        // O AuthContext deve lidar com a navegação automática após a atualização bem-sucedida do usuário.
        // Não precisamos chamar router.push() aqui manualmente, a menos que queiramos forçar um redirecionamento específico.
        // Exemplo (se AuthContext não redirecionar automaticamente): setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (err: any) {
      console.error('[DebugForm] Unexpected error during password update:', err);
      setError(`Ocorreu um erro inesperado: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false); // Finaliza o estado de submissão
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

      {!success && isFormActive && isSessionLoaded && (
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
              disabled={isSubmitting || !isSessionLoaded || !session}
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

      {!isFormActive && !success && !error && isSessionLoaded && (
         <p className="mt-6 text-center text-sm text-gray-600">
            Não é possível definir a senha no momento. <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500">Voltar para o login</Link>.
        </p>
      )}

      {(!isFormActive || success || error) && !isSubmitting && isSessionLoaded && (
          <div className="mt-8 text-center">
            <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500 hover:underline">
              Ir para Login
            </Link>
          </div>
      )}

      {!isSessionLoaded && (
          <div className="mt-8 text-center">
              <p className="text-gray-600">Verificando link de acesso...</p>
          </div>
      )}
    </div>
  );
} 