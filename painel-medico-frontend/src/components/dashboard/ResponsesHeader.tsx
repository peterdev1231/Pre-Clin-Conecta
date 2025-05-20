'use client';

import React from 'react';
import { Search, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  quickPeriod?: string;
  setQuickPeriod: (period: string | undefined) => void;
  recentStats?: { label: string; value: string | number; icon?: React.ReactNode }[];
}

const filterOptions = [
  { value: 'Todos', label: 'Todos' },
  { value: 'Lido', label: 'Lidas' },
  { value: 'Não Lido', label: 'Não lidas' },
];

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
  quickPeriod,
  setQuickPeriod,
  recentStats = []
}: ResponsesHeaderProps) {
  const quickPeriods = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'ontem', label: 'Ontem' },
    { key: 'ultimos7dias', label: 'Últimos 7 dias' },
    { key: 'ultimos30dias', label: 'Últimos 30 dias' },
  ];

  const handleQuickPeriodSelect = (periodKey: string) => {
    setQuickPeriod(periodKey);
  };

  return (
    <div className="mb-8 p-6 rounded-lg shadow-lg bg-gradient-to-r from-[#25392C] to-[#3A5A40] text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Respostas dos Pacientes</h1>
          <p className="text-slate-300 mt-1">
            Área central para acompanhar, filtrar e gerenciar as respostas dos pacientes recebidas via formulários digitais.
          </p>
        </div>
        <button
          onClick={onGenerateNewLink}
          className="mt-4 md:mt-0 flex items-center bg-[#00A651] hover:bg-opacity-90 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-150 ease-in-out"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Gerar Novo Link
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-300">Total</h3>
          <p className="text-2xl font-semibold">{totalCount}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-300">Não lidas</h3>
          <p className="text-2xl font-semibold">{unreadCount}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-300">Lidas</h3>
          <p className="text-2xl font-semibold">{readCount}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-300">Último paciente</h3>
          {recentStats && recentStats.length > 0 && recentStats.find(stat => stat.label === 'Último paciente') ? (
            <>
              <p className="text-lg font-semibold truncate">{recentStats.find(stat => stat.label === 'Último paciente')?.value || 'N/A'}</p>
              {recentStats.find(stat => stat.label === 'Recebido em') && (
                <p className="text-xs text-slate-400">
                  {recentStats.find(stat => stat.label === 'Recebido em')?.value} Recebido em
                </p>
              )}
            </>
          ) : (
            <p className="text-lg font-semibold truncate">Nenhum</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-grow w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white/20 border-slate-500 focus:ring-2 focus:ring-[#00A651] focus:border-[#00A651] placeholder-slate-400 text-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'Todos' | 'Lido' | 'Não Lido')}
              className="flex-grow sm:flex-grow-0 w-full sm:w-auto bg-white/20 border border-slate-500 text-white py-2.5 pl-3 pr-8 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-[#00A651] appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-[#25392C] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {quickPeriods.map((period) => (
            <Button
              key={period.key}
              variant="outline"
              size="sm"
              onClick={() => handleQuickPeriodSelect(period.key)}
              className={cn(
                "font-normal transition-colors",
                quickPeriod === period.key
                  ? "bg-[#00A651] text-white hover:bg-[#008f48] border-[#00A651]"
                  : "bg-white/20 text-slate-300 hover:bg-white/30 border-slate-500 hover:text-white"
              )}
            >
              {period.label}
            </Button>
          ))}
           <Button
              variant="outline"
              size="sm"
              onClick={() => { setQuickPeriod(undefined); }}
              className={cn(
                "font-normal transition-colors text-slate-300 hover:bg-white/30 border-slate-500 hover:text-white",
                 (!quickPeriod)
                  ? "bg-[#00A651] text-white hover:bg-[#008f48] border-[#00A651]"
                  : "bg-white/20"
              )}
            >
              Limpar Filtro
            </Button>
        </div>
      </div>
    </div>
  );
} 