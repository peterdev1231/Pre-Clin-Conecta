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
  
  // Estados para accessToken e tokenType (REINTRODUZIDOS)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenType, setTokenType] = useState<string | null>(null);
  // refreshToken e expiresIn podem ser úteis para debug ou contextos futuros, mas não são usados diretamente em verifyOtp.
  // const [refreshToken, setRefreshToken] = useState<string | null>(null); 
  // const [expiresIn, setExpiresIn] = useState<string | null>(null);

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

  // Extrair o token ao montar o componente (REINTRODUZIDO E AJUSTADO)
  useEffect(() => {
    const { accessToken: token, tokenType: type, refreshToken: rToken, expiresIn: expIn } = getTokenInfoFromUrl();
    console.log('[DebugForm] Token info extracted:', { 
      hasToken: !!token, // Simplificado
      tokenType: type,
      hasRefreshToken: !!rToken,
      expiresIn: expIn
    });
    
    setAccessToken(token);
    setTokenType(type);
    // setRefreshToken(rToken); 
    // setExpiresIn(expIn);
    
    if (!token && isOnCorrectPath) { // Se não temos token e estamos na página correta
      setError('Token de acesso não encontrado na URL. Por favor, use o link completo enviado para o seu email.');
      setIsFormActive(false); // Desativa o formulário
      // Limpar hash para não confundir o usuário ou expor token inválido/ausente
      if (typeof window !== 'undefined') {
        history.replaceState(null, '', window.location.pathname);
      }
    } else if (token && type !== 'recovery' && isOnCorrectPath) {
      // Se temos um token, mas não é do tipo 'recovery', isso pode ser um problema.
      // Para o fluxo de definir-senha, esperamos 'recovery'.
      console.warn('[DebugForm] Token encontrado, mas não é do tipo "recovery". Tipo recebido:', type);
      // Poderia-se adicionar um setError aqui se outros tipos não são esperados/tratados.
      // setError('O link utilizado não é válido para recuperação de senha. Verifique o link ou contate o suporte.');
      // setIsFormActive(false);
    }
  }, [isOnCorrectPath]); // Dependência apenas em isOnCorrectPath para rodar na montagem e se o path mudar

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
      // Verificar se temos o token de acesso
      if (!accessToken) {
        // Esta verificação agora deve ser mais robusta devido ao useEffect acima
        setError('Token de acesso não está disponível. O link pode ser inválido ou ter expirado.');
        setLoading(false);
        return;
      }

      // Este formulário é para 'recovery' ou 'invite' type tokens.
      if (tokenType !== 'recovery' && tokenType !== 'invite') {
        console.error(`[DebugForm] Tipo de token inválido para esta página: '${tokenType}'. Esperado 'recovery' ou 'invite'.`);
        setError('Link inválido ou tipo de token não suportado para esta operação. Por favor, use o link correto.');
        setLoading(false);
        return;
      }
      
      const otpParams = {
        token: accessToken!, 
        type: tokenType as 'recovery' | 'invite', // Usar o tokenType validado
      };
      
      console.log(`[DebugForm] Attempting to verify OTP with params:`, otpParams);
      
      // Usar verifyOtp para consumir o token de recuperação e estabelecer a sessão
      // @ts-ignore -- Mantendo temporariamente SE o usuário confirmar que o erro de tipo persiste após limpeza
      const { data, error: otpError } = await supabase.auth.verifyOtp(otpParams);

      // A resposta (data) deve ser do tipo AuthOtpResponse
      // O tipo de 'data' retornado por verifyOtp já é AuthOtpResponse['data'] | null
      // então um cast direto para AuthOtpResponse['data'] pode não ser ideal se for null.
      // Vamos verificar data antes de acessar suas propriedades.

      if (otpError) {
        console.error('[DebugForm] Error verifying OTP:', otpError);
        let detailedErrorMessage = otpError.message;
        if ((otpError as any).source) { 
            detailedErrorMessage += ` (Source: ${JSON.stringify((otpError as any).source)})`;
        }
        setError(`Falha ao verificar o token: ${detailedErrorMessage}`);
        setLoading(false);
        return; 
      }

      // Verificar se data e data.session existem
      if (!data || !data.session) {
        console.error('[DebugForm] OTP verified but no session returned in data:', data);
        setError('Não foi possível estabelecer uma sessão após verificar o token. Verifique o console para detalhes.');
        setLoading(false);
        return;
      }
      
      // Agora data e data.session são conhecidos por existirem
      console.log('[DebugForm] OTP verified, session established. User:', data.user);
      console.log('[DebugForm] Session details:', data.session);
      console.log('[DebugForm] Now attempting to update password');

      // Agora, com a sessão estabelecida por verifyOtp, updateUser deve funcionar
      const { error: updateError } = await supabase.auth.updateUser({ 
        password
      });

      if (updateError) {
        console.error('[DebugForm] Error updating password after OTP verification:', updateError);
        // Adicionar mais detalhes do erro se disponíveis:
        let detailedUpdateErrorMessage = updateError.message;
        if ((updateError as any).source) { 
            detailedUpdateErrorMessage += ` (Source: ${JSON.stringify((updateError as any).source)})`;
        }
        setError(`Falha ao atualizar a senha: ${detailedUpdateErrorMessage}`);
        setLoading(false); // Mantém o loading false aqui, pois o catch geral também o fará.
        return; // Retorna para evitar o bloco de sucesso.
      }

      setSuccess('Senha definida com sucesso! Você será redirecionado para a página de login.');
      setIsFormActive(false); // Desativa o formulário após sucesso
      setTimeout(() => {
        router.push('/login'); // Alterado para redirecionar para /login
      }, 3000);

    } catch (err: unknown) {
      console.error('Set password error:', err);
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao tentar definir sua senha.';
      console.error('[DebugForm] Error in handleSetPassword:', message);
      setError(message);
      // Não desativar o formulário aqui, para que o usuário possa ver o erro e tentar novamente se for algo transitório
      // setIsFormActive(false); 
    } finally {
      console.log('[DebugForm] handleSetPassword finally block. Loading set to false.');
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