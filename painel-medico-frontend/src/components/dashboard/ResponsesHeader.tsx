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
  totalCount?: number;
  unreadCount?: number;
  readCount?: number;
  recentStats?: { label: string; value: string | number; icon?: React.ReactNode }[];
}

export default function ResponsesHeader({ 
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onRefresh, 
  onGenerateNewLink,
  totalCount = 0,
  unreadCount = 0,
  readCount = 0,
  recentStats = []
}: ResponsesHeaderProps) {
  return (
    <div data-testid="responses-header-main-div" className="z-10 sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-slate-800 dark:to-slate-900 shadow-md p-6 rounded-b-xl mb-8">
      <div className="container mx-auto px-0 sm:px-4">
        {/* Título e subtítulo */}
        <div className="flex flex-col gap-1 sm:gap-2 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Respostas dos Pacientes</h1>
          <h2 className="text-base sm:text-lg text-white/90 font-medium">Área central para acompanhar, filtrar e gerenciar as respostas dos pacientes recebidas via formulários digitais.</h2>
        </div>
        {/* Estatísticas rápidas */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 min-w-[120px]">
            <span className="font-bold text-lg text-white">{totalCount}</span>
            <span className="text-white/80 text-sm">Total</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 min-w-[120px]">
            <span className="font-bold text-lg text-yellow-200">{unreadCount}</span>
            <span className="text-white/80 text-sm">Não lidas</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 min-w-[120px]">
            <span className="font-bold text-lg text-green-200">{readCount}</span>
            <span className="text-white/80 text-sm">Lidas</span>
          </div>
          {recentStats && recentStats.length > 0 && recentStats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 min-w-[120px]">
              {stat.icon && <span className="text-white/80">{stat.icon}</span>}
              <span className="font-bold text-lg text-white">{stat.value}</span>
              <span className="text-white/80 text-sm">{stat.label}</span>
            </div>
          ))}
        </div>
        {/* Busca, filtro e ações */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-2">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
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
          </div>
          <div className="flex gap-3">
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
              className="flex items-center gap-2 px-6 py-2.5 text-lg font-semibold bg-yellow-300 text-teal-900 hover:bg-yellow-400 focus:ring-offset-yellow-300 shadow-lg border-2 border-yellow-400/60"
            >
              <PlusCircle className="mr-2 w-6 h-6" />
              <span>Gerar Novo Link</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 