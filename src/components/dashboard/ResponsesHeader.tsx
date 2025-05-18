'use client';

import React from 'react';
import { Search, RefreshCw, PlusCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResponsesHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'Todos' | 'Lido' | 'Não Lido';
  setStatusFilter: (status: 'Todos' | 'Lido' | 'Não Lido') => void;
  startDate: Date | null;
  setStartDate: (date: Date | null) => void;
  endDate: Date | null;
  setEndDate: (date: Date | null) => void;
  onRefresh?: () => void;
  onGenerateNewLink?: () => void;
}

export default function ResponsesHeader({ 
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onRefresh, 
  onGenerateNewLink 
}: ResponsesHeaderProps) {
  return (
    <div className="mb-6 md:mb-8 p-6 md:p-8 bg-teal-600 dark:bg-teal-700 rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        {/* Título e Subtítulo */}
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-semibold text-white">
            Respostas dos Pacientes
          </h1>
          <p className="mt-1 text-teal-100 dark:text-teal-200 text-sm md:text-base">
            Visualize e gerencie as informações pré-consulta para um atendimento mais eficiente.
          </p>
        </div>

        {/* Ações Globais */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 flex-shrink-0">
          {/* Barra de Busca */}
          <div className="relative w-full sm:w-auto">
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 border-transparent rounded-lg bg-white/90 dark:bg-slate-800/60 text-teal-800 dark:text-slate-100 focus:ring-2 focus:ring-white dark:focus:ring-teal-300 outline-none transition-all shadow-sm hover:shadow-md placeholder-teal-700/70 dark:placeholder-slate-300/70"
            />
            <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-teal-600 dark:text-slate-300/80" />
            </div>
          </div>

          {/* Filtro de Status */}
          <Select value={statusFilter} onValueChange={(value: 'Todos' | 'Lido' | 'Não Lido') => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px] border-transparent rounded-lg bg-white/90 dark:bg-slate-800/60 text-teal-800 dark:text-slate-100 focus:ring-2 focus:ring-white dark:focus:ring-teal-300 shadow-sm hover:shadow-md">
              <SelectValue placeholder="Filtrar por status" className="placeholder-teal-700/70 dark:placeholder-slate-300/70" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-teal-800 dark:text-slate-100 rounded-md shadow-lg">
              <SelectItem value="Todos" className="hover:bg-teal-50 dark:hover:bg-slate-700 focus:bg-teal-100 dark:focus:bg-teal-700/50 cursor-pointer">Todos</SelectItem>
              <SelectItem value="Não Lido" className="hover:bg-teal-50 dark:hover:bg-slate-700 focus:bg-teal-100 dark:focus:bg-teal-700/50 cursor-pointer">Não Lido</SelectItem>
              <SelectItem value="Lido" className="hover:bg-teal-50 dark:hover:bg-slate-700 focus:bg-teal-100 dark:focus:bg-teal-700/50 cursor-pointer">Lido</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Data de Início */}
          <div className="relative w-full sm:w-auto">
            <input 
              type="date"
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              aria-label="Data de início"
              className="w-full sm:w-auto px-3 py-2.5 border-transparent rounded-lg bg-white/90 dark:bg-slate-800/60 text-teal-800 dark:text-slate-100 focus:ring-2 focus:ring-white dark:focus:ring-teal-300 outline-none transition-all shadow-sm hover:shadow-md placeholder-teal-700/70 dark:placeholder-slate-300/70"
            />
          </div>

          {/* Filtro de Data de Fim */}
          <div className="relative w-full sm:w-auto">
            <input 
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              min={startDate ? startDate.toISOString().split('T')[0] : undefined}
              aria-label="Data de fim"
              className="w-full sm:w-auto px-3 py-2.5 border-transparent rounded-lg bg-white/90 dark:bg-slate-800/60 text-teal-800 dark:text-slate-100 focus:ring-2 focus:ring-white dark:focus:ring-teal-300 outline-none transition-all shadow-sm hover:shadow-md placeholder-teal-700/70 dark:placeholder-slate-300/70"
            />
          </div>

          {/* Botão de Atualizar */}
          <button 
            onClick={onRefresh}
            title="Atualizar dados"
            className="p-2.5 border border-transparent rounded-lg bg-white/20 hover:bg-white/30 text-white focus:ring-2 focus:ring-white focus:outline-none transition-all shadow-sm hover:shadow-md flex items-center justify-center"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Botão de Gerar Novo Link */}
          <button 
            onClick={onGenerateNewLink}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-white text-teal-700 font-semibold rounded-lg shadow-md hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-teal-600 dark:focus:ring-offset-teal-700 transition-colors duration-150"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Gerar Novo Link</span>
          </button>
        </div>
      </div>
    </div>
  );
} 