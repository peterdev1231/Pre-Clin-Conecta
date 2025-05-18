'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; 
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; 
import { cn } from "@/lib/utils"; 
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [currentSelectedDateRange, setCurrentSelectedDateRange] = useState<DateRange | undefined>(
    startDate && endDate ? { from: startDate, to: endDate } : undefined
  );

  // Sincronizar o estado interno do calendário se as props externas mudarem
  useEffect(() => {
    if (startDate && endDate) {
      setCurrentSelectedDateRange({ from: startDate, to: endDate });
    } else if (!startDate && !endDate) {
      setCurrentSelectedDateRange(undefined);
    }
    // Se apenas uma das datas externas for nula, o usuário pode estar no meio de uma seleção
    // ou uma limpeza parcial, então não forçamos a mudança aqui para evitar comportamento inesperado.
  }, [startDate, endDate]);

  const handleApplyDateFilter = () => {
    setStartDate(currentSelectedDateRange?.from || null);
    setEndDate(currentSelectedDateRange?.to || currentSelectedDateRange?.from || null); // Se 'to' não existir, usa 'from'
    setIsPopoverOpen(false);
  };

  const handleClearDateFilter = () => {
    setCurrentSelectedDateRange(undefined);
    setStartDate(null);
    setEndDate(null);
    setIsPopoverOpen(false);
  };

  return (
    <div className="z-10 sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-slate-800 dark:to-slate-900 shadow-md p-4 rounded-b-lg mb-6">
      <div className="container mx-auto px-0 sm:px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Respostas dos Pacientes
          </h1>
          <p className="text-sm text-white/80 text-center sm:text-left max-w-md">
            Visualize e gerencie as informações pré-consulta para um atendimento mais eficiente.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 items-center gap-3">
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

          {/* Date Range Picker REIMPLEMENTADO */}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                id="date-range-picker-trigger"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[260px] justify-start text-left font-normal bg-white/90 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-teal-800 dark:text-slate-100 border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:ring-2 focus:ring-white dark:focus:ring-teal-300 shadow-sm hover:shadow-md",
                  !startDate && "text-teal-700/70 dark:text-slate-300/70"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate && endDate ? (
                  <>
                    {format(startDate, "dd/MM/yy", { locale: ptBR })} - {format(endDate, "dd/MM/yy", { locale: ptBR })}
                  </>
                ) : startDate ? (
                  format(startDate, "dd/MM/yy", { locale: ptBR })
                ) : (
                  <span>Selecione o período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <Calendar
                initialFocus
                mode="range"
                selected={currentSelectedDateRange}
                onSelect={setCurrentSelectedDateRange}
                numberOfMonths={1}
                locale={ptBR}
                classNames={{
                  day_selected: "bg-teal-600 text-white hover:bg-teal-600 hover:text-white focus:bg-teal-600 focus:text-white dark:bg-teal-500 dark:hover:bg-teal-500",
                  day_today: "bg-teal-100 text-teal-700 dark:bg-teal-800 dark:text-teal-200",
                  day_range_middle: "aria-selected:bg-teal-100 aria-selected:text-teal-700 dark:aria-selected:bg-teal-800 dark:aria-selected:text-teal-200",
                }}
              />
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleClearDateFilter} className="text-sm">
                  Limpar
                </Button>
                <Button size="sm" onClick={handleApplyDateFilter} className="text-sm bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600">
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

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