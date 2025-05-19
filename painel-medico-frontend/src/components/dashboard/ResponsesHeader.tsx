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
    <div data-testid="responses-header-main-div" className="z-10 sticky top-0 bg-cinza-claro shadow-md p-6 rounded-b-xl mb-8">
      <div className="container mx-auto px-0 sm:px-4">
        {/* Título e subtítulo */}
        <div className="flex flex-col gap-1 sm:gap-2 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-verde-escuro">Respostas dos Pacientes</h1>
          <h2 className="text-base sm:text-lg text-verde-escuro/80 font-medium">Área central para acompanhar, filtrar e gerenciar as respostas dos pacientes recebidas via formulários digitais.</h2>
        </div>
        {/* Estatísticas rápidas */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 bg-verde-menta rounded-lg px-4 py-2 min-w-[120px] border border-verde-escuro/10">
            <span className="font-bold text-lg text-verde-escuro">{totalCount}</span>
            <span className="text-verde-escuro/80 text-sm">Total</span>
          </div>
          <div className="flex items-center gap-2 bg-verde-menta rounded-lg px-4 py-2 min-w-[120px] border border-verde-escuro/10">
            <span className="font-bold text-lg text-yellow-700">{unreadCount}</span>
            <span className="text-verde-escuro/80 text-sm">Não lidas</span>
          </div>
          <div className="flex items-center gap-2 bg-verde-menta rounded-lg px-4 py-2 min-w-[120px] border border-verde-escuro/10">
            <span className="font-bold text-lg text-green-700">{readCount}</span>
            <span className="text-verde-escuro/80 text-sm">Lidas</span>
          </div>
          {recentStats && recentStats.length > 0 && recentStats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-verde-menta/70 rounded-lg px-4 py-2 min-w-[120px] border border-verde-escuro/10">
              {stat.icon && <span className="text-verde-escuro/80">{stat.icon}</span>}
              <span className="font-bold text-lg text-verde-escuro">{stat.value}</span>
              <span className="text-verde-escuro/80 text-sm">{stat.label}</span>
            </div>
          ))}
        </div>
        {/* Busca, filtro e ações */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-2">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-verde-escuro/60" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-verde-menta rounded-lg bg-white text-verde-escuro focus:ring-2 focus:ring-verde-escuro/30 shadow-sm hover:shadow-md transition-all duration-150 ease-in-out"
              />
            </div>
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: 'Todos' | 'Lido' | 'Não Lido') => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px] border border-verde-menta rounded-lg bg-white text-verde-escuro focus:ring-2 focus:ring-verde-escuro/30 shadow-sm hover:shadow-md transition-all duration-150 ease-in-out">
                <SelectValue placeholder="Filtrar por status" className="placeholder-verde-escuro/60" />
              </SelectTrigger>
              <SelectContent className="bg-white border-verde-menta text-verde-escuro rounded-md shadow-lg">
                <SelectItem value="Todos" className="hover:bg-verde-menta/60 focus:bg-verde-menta/80 cursor-pointer">Todos</SelectItem>
                <SelectItem value="Não Lido" className="hover:bg-verde-menta/60 focus:bg-verde-menta/80 cursor-pointer">Não Lido</SelectItem>
                <SelectItem value="Lido" className="hover:bg-verde-menta/60 focus:bg-verde-menta/80 cursor-pointer">Lido</SelectItem>
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
              className="p-2.5 bg-verde-menta hover:bg-verde-menta/80 text-verde-escuro border border-verde-escuro/20 focus:ring-2 focus:ring-verde-escuro"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
            {/* Botão de Gerar Novo Link */}
            <Button 
              onClick={onGenerateNewLink}
              variant="default"
              className="flex items-center gap-2 px-6 py-2.5 text-lg font-semibold bg-verde-escuro text-cinza-claro hover:bg-verde-escuro/90 focus:ring-offset-verde-menta shadow-lg border-2 border-verde-escuro/60"
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