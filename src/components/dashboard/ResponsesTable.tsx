'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2 } from 'lucide-react';
import { FileText } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface PacienteResponse {
  id: string;
  nomePaciente: string;
  dataEnvio: string | null;
  status: 'Lido' | 'Não Lido';
}

interface ResponsesTableProps {
  responses: PacienteResponse[];
  isLoading: boolean;
  error: Error | null;
  onResponseDeleted: (responseId: string) => void;
}

export default function ResponsesTable({ responses, isLoading, error, onResponseDeleted }: ResponsesTableProps) {
  const { supabase } = useAuth();
  const [responseToDelete, setResponseToDelete] = useState<PacienteResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (response: PacienteResponse) => {
    setResponseToDelete(response);
  };

  const handleCloseModal = () => {
    setResponseToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!responseToDelete) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('respostas_pacientes')
        .delete()
        .match({ id: responseToDelete.id });

      if (deleteError) {
        throw deleteError;
      }

      toast.success(`Resposta de "${responseToDelete.nomePaciente}" excluída com sucesso.`);
      onResponseDeleted(responseToDelete.id);
      handleCloseModal();
    } catch (err: any) {
      console.error("Erro ao excluir resposta:", err);
      toast.error(`Erro ao excluir resposta: ${err.message || 'Ocorreu um problema.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-10">Carregando respostas...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-10">Erro ao carregar respostas: {error.message}</p>;
  }

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText size={48} className="text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-300 mb-1">Nenhuma Resposta Encontrada</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ainda não há respostas de pacientes para exibir.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-w-full">
      <Table className="min-w-[600px] sm:min-w-full table-auto">
        <TableHeader className="bg-teal-100 dark:bg-teal-900/40">
          <TableRow className="border-b-2 border-slate-200 dark:border-slate-700">
            <TableHead className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold whitespace-nowrap">Paciente</TableHead>
            <TableHead className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold whitespace-nowrap">Data de Envio</TableHead>
            <TableHead className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold whitespace-nowrap">Status</TableHead>
            <TableHead className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold whitespace-nowrap text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((response) => (
            <TableRow 
              key={response.id} 
              className="border-b border-emerald-200/60 dark:border-emerald-500/20 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150"
            >
              <TableCell className="px-4 py-4 font-medium">
                <Link href={`/dashboard/respostas/${response.id}`} className="text-base text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-sm">
                  {response.nomePaciente}
                </Link>
              </TableCell>
              <TableCell className="px-4 py-4 text-slate-500 dark:text-slate-400 text-sm">
                {response.dataEnvio ? (
                  <>
                    {new Date(response.dataEnvio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <span className="ml-2 text-slate-400 dark:text-slate-500">
                      {new Date(response.dataEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">Data Indisponível</span>
                )}
              </TableCell>
              <TableCell className="px-4 py-4">
                <Badge 
                  className={`
                    py-0.5 px-2 text-xs rounded-full font-medium
                    ${response.status === 'Lido' 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'}
                  `}
                >
                  {response.status}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-4 text-right space-x-2">
                <Button asChild variant="ghost" size="icon" title="Visualizar Detalhes" className="text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-500 focus:ring-teal-500/50">
                  <Link href={`/dashboard/respostas/${response.id}`}>
                    <Eye className="h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Excluir Resposta"
                  className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-500 focus:ring-red-500/50"
                  onClick={() => handleDeleteClick(response)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {responseToDelete && (
        <DeleteConfirmationModal
          isOpen={!!responseToDelete}
          onClose={handleCloseModal}
          onConfirm={handleConfirmDelete}
          responseName={responseToDelete.nomePaciente}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
} 