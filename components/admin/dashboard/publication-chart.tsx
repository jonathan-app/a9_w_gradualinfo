/**
 * @fileoverview components/admin/dashboard/publication-chart.tsx — gráfico temporal de publicações
 * @module components/admin/dashboard/publication-chart
 * @description Gráfico de barras empilhadas em SVG nativo que renderiza o volume de artigos por status
 *   ao longo do tempo com alternador interativo de período (7, 14 e 30 dias) (Spec 0033 AC-04).
 * @dependencies react, @/lib/services/dashboard-summary
 */

'use client';

import { useState } from 'react';
import type { PublicationDataPoint } from '@/lib/services/dashboard-summary';

interface PublicationChartProps {
  initialData?: PublicationDataPoint[];
  data?: PublicationDataPoint[];
}

export function PublicationChart({
  initialData,
  data: propData,
}: PublicationChartProps) {
  const [period, setPeriod] = useState<'7' | '14' | '30'>('14');

  const sourceData = initialData || propData || [];
  // Ajusta volume visível de dados de acordo com o período selecionado
  const data = period === '7' ? sourceData.slice(-7) : sourceData;

  const maxTotal = Math.max(
    ...(data.length > 0
      ? data.map((d) => (d.published || 0) + (d.review || 0) + (d.drafts || 0))
      : [35]),
    35,
  );

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Cabeçalho do Card e Controles de Período */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Publicações por Período
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Total de artigos publicados nos últimos {period} dias
          </p>
        </div>

        {/* Seletor de período tipo pills */}
        <div className="inline-flex rounded-xl border border-gray-100 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950">
          {(['7', '14', '30'] as const).map((p) => {
            const isActive = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}>
                {p} dias
              </button>
            );
          })}
        </div>
      </div>

      {/* Área do Gráfico SVG */}
      <div className="mt-8 h-64 w-full">
        <svg className="h-full w-full" viewBox="0 0 600 200" fill="none">
          {/* Linhas de grade horizontais e rótulos do eixo Y */}
          {[0, 10, 20, 30, 40].map((val) => {
            const y = 170 - (val / 40) * 150;
            return (
              <g key={val}>
                <line
                  x1="35"
                  y1={y}
                  x2="590"
                  y2={y}
                  stroke="currentColor"
                  className="text-gray-100 dark:text-gray-800/80"
                  strokeDasharray="3 3"
                />
                <text
                  x="25"
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-400 text-[10px] font-medium">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Barras Verticais Empilhadas por Data */}
          {data.map((item, index) => {
            const count = data.length;
            const barWidth = Math.max(12, Math.min(22, 450 / count - 8));
            const availableWidth = 540;
            const step = availableWidth / count;
            const x = 45 + index * step + (step - barWidth) / 2;

            // Alturas proporcionais com base em maxTotal
            const scale = 150 / Math.max(maxTotal, 1);
            const hPublished = item.published * scale;
            const hReview = item.review * scale;
            const hDrafts = item.drafts * scale;

            const yPublished = 170 - hPublished;
            const yReview = yPublished - hReview;
            const yDrafts = yReview - hDrafts;

            return (
              <g key={item.date} className="group">
                {/* 1. Publicados (Verde) */}
                <rect
                  x={x}
                  y={yPublished}
                  width={barWidth}
                  height={hPublished}
                  rx="3"
                  className="fill-emerald-500 transition-opacity hover:opacity-90"
                />

                {/* 2. Em revisão (Azul) */}
                <rect
                  x={x}
                  y={yReview}
                  width={barWidth}
                  height={hReview}
                  rx="3"
                  className="fill-blue-500 transition-opacity hover:opacity-90"
                />

                {/* 3. Rascunhos (Roxo/Índigo) */}
                <rect
                  x={x}
                  y={yDrafts}
                  width={barWidth}
                  height={hDrafts}
                  rx="3"
                  className="fill-indigo-500 transition-opacity hover:opacity-90"
                />

                {/* Rótulo de Data no Eixo X */}
                <text
                  x={x + barWidth / 2}
                  y="190"
                  textAnchor="middle"
                  className="fill-gray-400 text-[9px] font-medium">
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legenda de Status */}
      <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-gray-50 pt-4 dark:border-gray-800/60">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Publicados
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Em revisão
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Rascunhos
          </span>
        </div>
      </div>
    </div>
  );
}
