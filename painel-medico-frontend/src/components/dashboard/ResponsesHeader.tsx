'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, PlusCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; 

interface ResponsesHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'Todos' | 'Lido' | 'Não Lido';
  setStatusFilter: (status: 'Todos' | 'Lido' | 'Não Lido') => void;
  onRefresh?: () => void;
  onGenerateNewLink?: () => void;
}

export default function ResponsesHeader({ 
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onRefresh, 
  onGenerateNewLink 
}: ResponsesHeaderProps) {
  return (
    <div data-testid="responses-header-main-div" className="z-10 sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-slate-800 dark:to-slate-900 shadow-md p-4 rounded-b-lg mb-6">
      <div className="container mx-auto px-0 sm:px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Respostas dos Pacientes
          </h1>
          <p className="text-sm text-white/80 text-center sm:text-left max-w-md">
            Visualize e gerencie as informações pré-consulta para um atendimento mais eficiente.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-center gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-700/70 dark:text-slate-300/70" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-transparent rounded-lg bg-white/90 dark:bg-slate-800/60 text-teal-800 dark:text-slate-100 focus:ring-2 focus:ring-white dark:focus:ring-teal-300 shadow-sm hover:shadow-md transition-all duration-150 ease-in-out"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(value: 'Todos' | 'Lido' | 'Não Lido') => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px] border-transparent rounded-lg bg-white/90 dark:bg-slate-800/60 text-teal-800 dark:text-slate-100 focus:ring-2 focus:ring-white dark:focus:ring-teal-300 shadow-sm hover:shadow-md transition-all duration-150 ease-in-out">
              <SelectValue placeholder="Filtrar por status" className="placeholder-teal-700/70 dark:placeholder-slate-300/70" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-teal-800 dark:text-slate-100 rounded-md shadow-lg">
              <SelectItem value="Todos" className="hover:bg-teal-50 dark:hover:bg-slate-700 focus:bg-teal-100 dark:focus:bg-teal-700/50 cursor-pointer">Todos</SelectItem>
              <SelectItem value="Não Lido" className="hover:bg-teal-50 dark:hover:bg-slate-700 focus:bg-teal-100 dark:focus:bg-teal-700/50 cursor-pointer">Não Lido</SelectItem>
              <SelectItem value="Lido" className="hover:bg-teal-50 dark:hover:bg-slate-700 focus:bg-teal-100 dark:focus:bg-teal-700/50 cursor-pointer">Lido</SelectItem>
            </SelectContent>
          </Select>

          {/* Botão de Atualizar */}
          <Button 
            onClick={onRefresh}
            title="Atualizar dados"
            variant="outline"
            size="icon"
            className="p-2.5 bg-white/20 hover:bg-white/30 text-white border-transparent focus:ring-2 focus:ring-white"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>

          {/* Botão de Gerar Novo Link */}
          <Button 
            onClick={onGenerateNewLink}
            variant="default"
            className="w-full sm:w-auto bg-white text-teal-700 hover:bg-teal-50 focus:ring-offset-teal-600 dark:focus:ring-offset-teal-700"
          >
            <PlusCircle className="mr-2 w-5 h-5" />
            <span>Gerar Novo Link</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 