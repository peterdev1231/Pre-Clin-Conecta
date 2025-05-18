'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/lib/database.types'; // Assuming you have this types file
import { AlertTriangle, Loader2, ListChecks, BookOpenCheck, Inbox } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Import Recharts components

// Interface for the statistics data
interface StatsData {
  totalResponses: number;
  readResponses: number;
  unreadResponses: number;
}

// Placeholder for a Card component, you might have one from Shadcn/UI
const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string; value: string | number; icon: React.ElementType, colorClass: string }) => (
  <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center space-x-4`}>
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
      <Icon className={`w-7 h-7 ${colorClass}`} />
    </div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
      <p className="text-3xl font-bold text-slate-700 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

// Define colors for the chart segments
const COLORS = {
  read: '#10b981', // emerald-500
  unread: '#f59e0b' // amber-500
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent * 100 < 5) return null; // Don't render label if segment is too small

  return (
    <text x={x} y={y} fill="#000000" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="bold">
      {`${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export default function StatisticsOverview() {
  const { supabase, user } = useAuth();
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!user || !supabase) {
      setIsLoading(false);
      setError('Usuário não autenticado ou cliente Supabase indisponível.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Get profissional_id from user_id
      const { data: profissionalData, error: profissionalError } = await supabase
        .from('profissionais_saude')
        .select('id')
        .eq('id_usuario_supabase', user.id)
        .single();

      if (profissionalError) throw new Error(`Erro ao buscar perfil profissional: ${profissionalError.message}`);
      if (!profissionalData) throw new Error('Perfil profissional não encontrado para este usuário.');
      
      const profissionalId = profissionalData.id;

      // 2. Get all responses for this professional
      const { data: responsesData, error: responsesError } = await supabase
        .from('respostas_pacientes')
        .select('id, revisado_pelo_profissional')
        .eq('profissional_id', profissionalId);

      if (responsesError) throw new Error(`Erro ao buscar respostas: ${responsesError.message}`);

      const totalResponses = responsesData?.length || 0;
      const readResponses = responsesData?.filter(r => r.revisado_pelo_profissional).length || 0;
      const unreadResponses = totalResponses - readResponses;

      setStatsData({
        totalResponses,
        readResponses,
        unreadResponses,
      });

    } catch (err: any) {
      console.error("Erro ao buscar estatísticas:", err);
      setError(err.message || 'Falha ao carregar estatísticas.');
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const pieChartData = statsData ? [
    { name: 'Lidas', value: statsData.readResponses, color: COLORS.read },
    { name: 'Não Lidas', value: statsData.unreadResponses, color: COLORS.unread },
  ].filter(entry => entry.value > 0) : []; // Filter out zero-value entries for cleaner chart

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 min-h-[300px] bg-white dark:bg-slate-800 shadow-lg rounded-lg">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Carregando estatísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 min-h-[300px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 shadow-lg rounded-lg">
        <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
        <p className="text-red-700 dark:text-red-300 font-semibold mb-2">Erro ao carregar estatísticas</p>
        <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className="p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
        <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Visão Geral das Estatísticas
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Nenhum dado de estatística encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
        Visão Geral das Estatísticas
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total de Respostas" 
          value={statsData.totalResponses} 
          icon={ListChecks} 
          colorClass="text-sky-500 dark:text-sky-400"
        />
        <StatCard 
          title="Respostas Lidas" 
          value={statsData.readResponses} 
          icon={BookOpenCheck} 
          colorClass="text-emerald-500 dark:text-emerald-400"
        />
        <StatCard 
          title="Respostas Não Lidas" 
          value={statsData.unreadResponses} 
          icon={Inbox} 
          colorClass="text-amber-500 dark:text-amber-400"
        />
      </div>
      
      {/* Gráfico de Pizza */}
      <div className="mt-8 p-4 sm:p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-6 text-center">Distribuição de Respostas</h3>
        {pieChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                innerRadius={60} // Makes it a Donut chart
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(30, 41, 59, 0.9)', // bg-slate-800 with opacity
                  borderColor: 'rgba(51, 65, 85, 0.9)', // border-slate-700
                  borderRadius: '0.5rem',
                  color: '#e2e8f0' // text-slate-200
                }}
                itemStyle={{ color: '#e2e8f0' }}
                cursor={{ fill: 'rgba(71, 85, 105, 0.2)' }} // slate-600 with opacity
              />
              <Legend 
                iconSize={12}
                wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="min-h-[300px] flex items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400 text-center">
              Não há dados suficientes para exibir o gráfico.
              {statsData.totalResponses === 0 && " (Nenhuma resposta registrada)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 