import React from 'react';
import { Database } from "@/lib/database.types"; // Ajuste se o caminho for diferente
import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Pill,
  XCircle,
  ShieldAlert,
  MessageSquareText,
  FileQuestion,
  FileArchive,
  FileJson,
  Paperclip,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Definindo o tipo para os dados do formulário explicitamente
// Isso deve espelhar a estrutura que você salva em 'dados_formulario'
interface DadosFormulario {
  nomePaciente: string;
  queixaPrincipal: string;
  medicacoesEmUso?: string | null;
  alergiasConhecidas?: string | null;
  naoPossuiAlergias?: boolean;
  // fotos?: Array<{ nome: string; url?: string; tipo?: string }>; // Removido, será tratado por arquivosPaciente
  // exames?: Array<{ nome: string; url?: string; tipo?: string }>; // Removido, será tratado por arquivosPaciente
}

type ResponseData = Database["public"]["Tables"]["respostas_pacientes"]["Row"];

interface ResponseDetailViewProps {
  response: ResponseData;
  onMarkAsReadToggle?: (responseId: string, currentState: boolean) => Promise<void>; // Opcional
}

// Interface para os arquivos retornados pela Edge Function
interface ArquivoPaciente {
  id: string;
  nome_arquivo: string;
  tipo_documento: "foto" | "exame" | string; 
  path_storage: string;
  criado_em: string;
  signedUrl: string | null;
  error?: string;
  tipo_mime?: string | null;
}

const DetailCard: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string; // Para estilizar o padding/etc do conteúdo se necessário
}> = ({ title, icon, children, className, contentClassName }) => (
  <div
    className={`flex flex-col shadow-lg rounded-lg overflow-hidden bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 ${className || ""} flex-1 min-w-[300px] md:min-w-[320px]`}
  >
    <div className="flex items-center p-3 md:p-4 bg-emerald-50 dark:bg-emerald-700/20 border-b border-emerald-100 dark:border-emerald-600/30">
      {icon && React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-5 w-5 text-emerald-600 dark:text-emerald-400" })}
      <h3 className="font-montserrat text-base md:text-lg font-semibold ml-2.5 text-emerald-700 dark:text-emerald-300">{title}</h3>
    </div>
    <div className={`p-4 text-gray-700 dark:text-slate-300 space-y-2 text-sm flex-grow ${contentClassName || ""}`}> 
      {children}
    </div>
  </div>
);

const FileListItem: React.FC<{ 
  file: ArquivoPaciente;
  onViewClick: (file: ArquivoPaciente) => void;
}> = ({ file, onViewClick }) => {
  const { signedUrl, nome_arquivo, tipo_mime } = file;

  const getFileIcon = () => {
    const extension = nome_arquivo?.split('.').pop()?.toLowerCase();
    const mime = tipo_mime?.toLowerCase();

    if (mime?.startsWith('image/')) return <ImageIcon size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />;
    if (mime === 'application/pdf') return <FileText size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />;
    if (extension === 'doc' || extension === 'docx') return <FileText size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />;
    if (extension === 'zip' || extension === 'rar') return <FileArchive size={18} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />;
    
    if (tipo_mime) return <FileQuestion size={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />;
    return <Paperclip size={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />;
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-600 hover:dark:bg-slate-500 transition-colors rounded-md">
      <div className="flex items-center truncate">
        {getFileIcon()} 
        <span className="ml-2 text-sm text-gray-600 dark:text-slate-200 truncate" title={nome_arquivo}>{nome_arquivo}</span>
      </div>
      {signedUrl ? (
        <button
          onClick={() => onViewClick(file)}
          className="ml-3 px-3 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm hover:shadow-md"
        >
          Ver
        </button>
      ) : (
        <span className="ml-4 px-3 py-1 text-xs bg-gray-500 text-gray-300 rounded-md font-semibold cursor-not-allowed">
          Indisponível
        </span>
      )}
    </div>
  );
};

export default function ResponseDetailView({
  response,
  onMarkAsReadToggle,
}: ResponseDetailViewProps) {
  const { supabase } = useAuth();
  const [dadosFormulario, setDadosFormulario] = useState<DadosFormulario | null>(null);
  const [arquivosPaciente, setArquivosPaciente] = useState<ArquivoPaciente[]>([]);
  const [loadingArquivos, setLoadingArquivos] = useState<boolean>(true);
  const [erroArquivos, setErroArquivos] = useState<string | null>(null);

  // Estados para o modal de imagem
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (response) {
      setDadosFormulario({
        nomePaciente: response.nome_paciente,
        queixaPrincipal: response.queixa_principal,
        medicacoesEmUso: response.medicacoes_em_uso,
        alergiasConhecidas: response.alergias_conhecidas,
      });
    }
  }, [response]);

  useEffect(() => {
    const fetchArquivos = async () => {
      if (!response?.id) return;
      setLoadingArquivos(true);
      setErroArquivos(null);
      setArquivosPaciente([]);
      try {
        const { data:responseData, error:functionError } = await supabase.functions.invoke<ArquivoPaciente[] | { error: string }>("listar-arquivos-resposta", {
          body: { resposta_paciente_id: response.id },
        });

        if (functionError) throw functionError;

        if (responseData) {
          if (Array.isArray(responseData)) {
            const processedData = responseData.map(file => ({ ...file, tipo_mime: file.tipo_mime || null }));
            setArquivosPaciente(processedData);
          } else if (responseData && typeof responseData.error === 'string') {
            throw new Error(responseData.error);
          } else {
            console.warn("Resposta inesperada da função listar-arquivos-resposta:", responseData);
            throw new Error("Formato de resposta inesperado ao listar arquivos.");
          }
        }
      } catch (err: unknown) {
        console.error("Erro ao buscar arquivos da resposta:", err);
        const message = err instanceof Error ? err.message : "Falha ao carregar arquivos.";
        setErroArquivos(message);
      } finally {
        setLoadingArquivos(false);
      }
    };
    fetchArquivos();
  }, [response?.id, supabase]);

  if (!response || !dadosFormulario) return (
    <div className="flex items-center justify-center p-10 text-slate-400">
      Carregando dados da resposta ou dados do formulário incompletos...
    </div>
  );

  const handleToggleReadStatus = async () => {
    if (onMarkAsReadToggle && response) {
      await onMarkAsReadToggle(response.id, response.revisado_pelo_profissional || false);
    } 
  };
  
  const fotosAnexadas = arquivosPaciente.filter(a => a.tipo_documento === 'foto');
  const examesAnexados = arquivosPaciente.filter(a => a.tipo_documento === 'exame');
  // const outrosArquivos = arquivosPaciente.filter(a => a.tipo_documento !== 'foto' && a.tipo_documento !== 'exame');

  // Função para lidar com o clique no botão "Ver" do FileListItem
  const handleViewFile = (file: ArquivoPaciente) => {
    if (file.signedUrl) {
      if (file.tipo_mime?.startsWith("image/")) {
        setSelectedImageUrl(file.signedUrl);
        setSelectedImageName(file.nome_arquivo);
        setImageLoading(true);
        setIsImageModalOpen(true);
      } else {
        // Para PDFs e outros tipos, abrir em nova aba
        window.open(file.signedUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="mb-8">
        <h2 className="font-montserrat text-2xl md:text-3xl font-bold text-gray-700 dark:text-slate-100">
          {dadosFormulario.nomePaciente || "Paciente Anônimo"}
        </h2>
        <p className="text-base text-gray-500 dark:text-slate-400 mt-1.5 font-sans">
          Resposta recebida em: {response.criado_em ? new Date(response.criado_em).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" }) : "Data não disponível"}
        </p>
      </div>

      <div className="flex flex-wrap gap-6 md:gap-8 mb-8">
        <DetailCard title="Queixa Principal" icon={<MessageSquareText />}>
          <p className="whitespace-pre-wrap min-h-[50px]">
            {dadosFormulario.queixaPrincipal || "Não informado"}
          </p>
        </DetailCard>

        <DetailCard title="Medicações em Uso" icon={<Pill />}>
          {dadosFormulario.medicacoesEmUso ? (
            <p className="whitespace-pre-wrap min-h-[50px]">
              {dadosFormulario.medicacoesEmUso}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 min-h-[50px]">Nenhuma medicação informada.</p>
          )}
        </DetailCard>

        <DetailCard title="Alergias Conhecidas" icon={<ShieldAlert />}>
          {dadosFormulario.alergiasConhecidas && dadosFormulario.alergiasConhecidas.trim() !== "" && !dadosFormulario.naoPossuiAlergias ? (
            <p className="whitespace-pre-wrap min-h-[50px]">
              {dadosFormulario.alergiasConhecidas}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 min-h-[50px]">Nenhuma alergia informada ou paciente indicou não possuir.</p>
          )}
        </DetailCard>

        <DetailCard title="Fotos Anexadas" icon={<ImageIcon />}>
          {loadingArquivos ? (
            <p className="text-gray-500 dark:text-slate-400">Carregando fotos...</p>
          ) : fotosAnexadas.length > 0 ? (
            <div className="space-y-2.5">
              {fotosAnexadas.map(file => <FileListItem key={file.id} file={file} onViewClick={handleViewFile} />)}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400">Nenhuma foto anexada.</p>
          )}
          {erroArquivos && !loadingArquivos && fotosAnexadas.length === 0 && <p className="text-red-500 dark:text-red-400 mt-2 text-xs">{erroArquivos}</p>}
        </DetailCard>

        <DetailCard title="Exames Anexados" icon={<FileText />}>
          {loadingArquivos ? (
            <p className="text-gray-500 dark:text-slate-400">Carregando exames...</p>
          ) : examesAnexados.length > 0 ? (
            <div className="space-y-2.5">
              {examesAnexados.map(file => <FileListItem key={file.id} file={file} onViewClick={handleViewFile} />)}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400">Nenhum exame anexado.</p>
          )}
           {erroArquivos && !loadingArquivos && examesAnexados.length === 0 && <p className="text-red-500 dark:text-red-400 mt-2 text-xs">{erroArquivos}</p>}
        </DetailCard>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-6 mt-4">
        <button 
          onClick={() => window.print()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-md font-semibold text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 transition-colors flex items-center justify-center shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-400"
          >
          <FileText size={16} className="mr-2"/>
          Imprimir
        </button>
        <button 
          onClick={handleToggleReadStatus} 
          className={`w-full sm:w-auto px-5 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center justify-center shadow-sm hover:shadow-md focus:outline-none focus:ring-2 
                      ${response.revisado_pelo_profissional 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-300 dark:focus:ring-amber-400' 
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-300 dark:focus:ring-emerald-400'}
                      disabled:opacity-60 disabled:cursor-not-allowed`}
          >
          {response.revisado_pelo_profissional ? <XCircle size={18} className="mr-2"/> : <CheckCircle2 size={18} className="mr-2"/>}
          {response.revisado_pelo_profissional ? "Marcar como Não Lido" : "Marcar como Lido"}
        </button>
      </div>

      {/* Modal para Visualização de Imagem */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="w-[95vw] sm:w-auto sm:max-w-3xl p-0 bg-white dark:bg-slate-800 shadow-2xl rounded-lg flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <DialogTitle className="font-montserrat text-lg font-semibold text-slate-800 dark:text-slate-100 truncate pr-8">
              {selectedImageName || "Visualizar Imagem"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Modal exibindo a imagem {selectedImageName || "anexada pelo paciente"}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-1 bg-slate-100 dark:bg-slate-900 flex-grow flex justify-center items-center relative overflow-hidden rounded-b-lg">
            {imageLoading && (
              <div className="absolute inset-0 flex justify-center items-center bg-gray-50 dark:bg-slate-900/50 z-10">
                <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
              </div>
            )}
            {selectedImageUrl && (
              <img
                src={selectedImageUrl}
                alt={selectedImageName || "Imagem do paciente"}
                className={`w-full h-auto max-w-full max-h-[80vh] object-contain rounded-md transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                style={{ width: '100%' }}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  console.error("Erro ao carregar a imagem no modal.");
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
} 