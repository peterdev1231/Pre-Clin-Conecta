'use client';

import React, { useState } from 'react';
import { Search, RefreshCw, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
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
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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

const datePresets = [
  { label: "Hoje", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Ontem", getValue: () => ({ from: addDays(new Date(), -1), to: addDays(new Date(), -1) }) },
  { label: "Últimos 7 dias", getValue: () => ({ from: addDays(new Date(), -6), to: new Date() }) },
  { label: "Últimos 30 dias", getValue: () => ({ from: addDays(new Date(), -29), to: new Date() }) },
  { label: "Esta semana", getValue: () => ({ from: startOfWeek(new Date(), { locale: ptBR }), to: endOfWeek(new Date(), { locale: ptBR }) }) },
  { label: "Semana passada", getValue: () => {
      const today = new Date();
      const prevWeekStart = startOfWeek(addDays(today, -7), { locale: ptBR });
      const prevWeekEnd = endOfWeek(addDays(today, -7), { locale: ptBR });
      return { from: prevWeekStart, to: prevWeekEnd };
    }
  },
  { label: "Este mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Mês passado", getValue: () => {
      const today = new Date();
      const prevMonth = subMonths(today, 1);
      return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    }
  },
];

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
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) setStartDate(range.from);
    else setStartDate(null);
    
    if (range?.to) setEndDate(range.to);
    else if (range?.from) setEndDate(range.from);
    else setEndDate(null);
  };

  const handlePresetSelect = (preset: typeof datePresets[0]) => {
    const { from, to } = preset.getValue();
    setStartDate(from);
    setEndDate(to);
    setIsDatePopoverOpen(false);
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 flex-wrap flex-shrink-0">
          {/* Barra de Busca */}
          <div className="relative w-full sm:w-auto grow sm:grow-0">
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

          {/* Date Range Picker */}
          <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                id="date"
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
            <PopoverContent className="w-auto p-0 flex flex-col sm:flex-row bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xl rounded-md" align="end">
              <div className="flex flex-col p-3 space-y-1 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700">
                {datePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className="w-full justify-start text-sm h-auto py-1.5 px-2 text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-slate-800"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-sm h-auto py-1.5 px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
                        onClick={clearDates}
                    >
                        Limpar
                    </Button>
                </div>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={startDate || new Date()}
                selected={{ from: startDate!, to: endDate || undefined }}
                onSelect={(range) => handleDateRangeSelect(range as { from?: Date; to?: Date })}
                numberOfMonths={1}
                locale={ptBR}
                className="p-3"
                classNames={{
                  day_selected: "bg-teal-600 text-white hover:bg-teal-600 hover:text-white focus:bg-teal-600 focus:text-white dark:bg-teal-500 dark:hover:bg-teal-500",
                  day_today: "bg-teal-100 text-teal-700 dark:bg-teal-800 dark:text-teal-200",
                }}
              />
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