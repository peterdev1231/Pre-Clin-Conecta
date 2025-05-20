'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, Check, AlertTriangle, Loader2, Link as LinkIcon, Info, X as XIcon } from 'lucide-react';
import { toast } from "sonner"; // Usaremos sonner para notificações

interface GenerateLinkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GenerateLinkFormModal({ isOpen, onClose }: GenerateLinkFormModalProps) {
  const { supabase, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const resetModalState = () => {
    setIsLoading(false);
    setGeneratedLink(null);
    setError(null);
    setIsCopied(false);
  };

  const handleGenerateLink = async () => {
    if (!user) {
      setError('Usuário não autenticado.');
      toast.error('Erro ao gerar link: Usuário não autenticado.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedLink(null);
    setIsCopied(false);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(sessionError?.message || 'Sessão não encontrada. Faça login novamente.');
      }
      const token = sessionData.session.access_token;

      const { data, error: functionError } = await supabase.functions.invoke('gerar-link-formulario', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // A Edge Function não espera um body, mas se precisasse, seria aqui:
        // body: JSON.stringify({ profissionalId: user.id }), 
      });

      if (functionError) {
        console.error('Erro da função Supabase:', functionError);
        let detailedError = 'Falha ao gerar o link.';
        if (functionError.message.includes('Function not found')) {
          detailedError = 'Erro: Função de geração de link não encontrada no servidor.';
        } else if (functionError.message) {
          try {
            const parsedError = JSON.parse(functionError.message);
            detailedError = parsedError.error || detailedError;
          } catch {
            // se não for JSON, usa a mensagem da função
            detailedError = functionError.message.length < 100 ? functionError.message : detailedError;
          }
        }
        throw new Error(detailedError);
      }

      if (data && data.linkId) {
        // Assumindo que a URL base do seu app frontend onde o formulário estará é process.env.NEXT_PUBLIC_APP_URL
        // Esta variável de ambiente precisa ser configurada no seu .env.local (ex: NEXT_PUBLIC_APP_URL=http://localhost:3000)
        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const fullLink = `${appBaseUrl}/formulario/${data.linkId}`;
        setGeneratedLink(fullLink);
        toast.success('Link gerado com sucesso!');
      } else {
        throw new Error('Resposta da função inválida ou ID do link ausente.');
      }
    } catch (err: unknown) {
      console.error('Erro ao gerar link:', err);
      const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(message);
      toast.error(`Erro ao gerar link: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink).then(() => {
        setIsCopied(true);
        toast.success('Link copiado para a área de transferência!');
        setTimeout(() => setIsCopied(false), 2000); // Resetar o estado de "copiado" após 2s
      }).catch(err => {
        console.error('Falha ao copiar o link:', err);
        toast.error('Falha ao copiar o link.');
      });
    }
  };

  // Resetar estado quando o modal é fechado ou reaberto
  useEffect(() => {
    if (isOpen) {
      resetModalState();
    } else {
      // Pequeno delay para animação de fechamento antes de resetar
      setTimeout(resetModalState, 300);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="custom-generate-link-modal bg-gradient-to-r from-[#1B3B2E] to-[#CCD5DE] text-slate-100 rounded-xl shadow-xl p-0 sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <DialogHeader className="relative text-center p-6 sm:p-8 pb-4 sm:pb-6 border-b border-[#3A5A40]/70 flex-shrink-0">
          <DialogClose asChild>
            <button 
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="absolute top-5 right-5 sm:top-6 sm:right-6 p-1.5 rounded-full text-white bg-[#25392C] hover:bg-[#1B3B2E] transition-colors focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#1B3B2E] z-30"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </DialogClose>
          <div className="flex items-center justify-center mb-2">
            <LinkIcon className="h-6 w-6 mr-2 text-[#00A651]" />
            <DialogTitle className="font-montserrat text-xl font-semibold text-slate-50 tracking-tight">
              Gerar Novo Link
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-200 tracking-wide mx-auto max-w-xs sm:max-w-sm text-center">
            Crie um link seguro e exclusivo para o paciente preencher o formulário de pré-consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-6">
          {error && !generatedLink && (
            <div className="p-3 bg-red-500/30 border border-red-400/50 text-white rounded-lg flex items-center text-sm tracking-wide">
              <AlertTriangle className="h-5 w-5 mr-2.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {generatedLink && (
            <div className="p-4 border border-green-400/50 bg-green-500/30 text-white rounded-lg shadow-md">
              <div className="flex items-center mb-3">
                <Check className="h-6 w-6 mr-2 text-white flex-shrink-0" />
                <p className="text-md font-semibold tracking-wide">Link gerado com sucesso!</p>
              </div>
              <p className="text-xs text-slate-200 mb-3 tracking-wide">
                Copie o link abaixo e compartilhe com o paciente.
              </p>
              <div className="flex items-center space-x-2 p-2.5 bg-slate-700/60 border border-slate-500/70 rounded-md focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#00A651]/70 dark:focus-within:ring-[#00A651] focus-within:ring-offset-[#1B3B2E] transition-all duration-150">
                <Input
                  id="generatedLinkInput"
                  value={generatedLink}
                  readOnly
                  className="flex-1 text-sm bg-transparent border-none focus:ring-0 focus:outline-none text-slate-100 tracking-wide"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  variant="ghost" // Usar ghost para não ter fundo próprio, apenas o da classe
                  className={`transition-all duration-150 ease-in-out text-sm tracking-wide px-3 py-1.5 font-medium rounded-md 
                    ${isCopied 
                      ? 'bg-[#00A651] hover:bg-green-700 text-white' 
                      : 'bg-slate-600/80 hover:bg-slate-500/80 text-slate-100'}`}
                >
                  {isCopied ? <Check className="h-4 w-4 mr-1.5 flex-shrink-0" /> : <Copy className="h-4 w-4 mr-1.5 flex-shrink-0" />}
                  {isCopied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>
          )}

          {!generatedLink && (
            <div className="text-center p-4 rounded-lg bg-[#25392C]/80 border border-[#3A5A40]/80">
              <p className="text-sm text-slate-100 tracking-wide">
                O link será válido por 7 dias após a criação.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center p-6 sm:p-8 pt-4 sm:pt-6 border-t border-[#3A5A40]/70 flex-shrink-0">
          <div className="flex items-center text-xs text-slate-200 tracking-wide text-center sm:text-left mb-4 sm:mb-0">
            <Info className="h-4 w-4 mr-1.5 flex-shrink-0 hidden sm:inline" />
            <span>Link válido por 7 dias.</span>
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-3 sm:space-y-0 sm:space-x-3">
            <DialogClose asChild>
              <Button
                type="button"
                className="w-full sm:w-auto text-sm tracking-wide font-medium rounded-md text-slate-200 border border-slate-400/80 hover:border-slate-300/90 bg-slate-600/50 hover:bg-slate-500/60 focus-visible:ring-2 focus-visible:ring-slate-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B3B2E]"
                onClick={() => { if (generatedLink) onClose(); }}
              >
                {generatedLink ? 'Fechar' : 'Cancelar'}
              </Button>
            </DialogClose>
            {!generatedLink && (
              <Button
                type="button"
                onClick={handleGenerateLink}
                disabled={isLoading}
                className="w-full sm:w-auto bg-[#00A651] hover:bg-[#008f48] text-white text-sm tracking-wide font-semibold shadow-md hover:shadow-lg transition-all duration-150 ease-in-out rounded-md"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" /> Gerando...</>
                ) : (
                  <><LinkIcon className="mr-2 h-4 w-4 flex-shrink-0" /> Confirmar e Gerar Link</>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 