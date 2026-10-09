/**
 * @fileoverview app/admin-dashboard/(protegido)/page.tsx — dashboard administrativo principal
 * @module app/admin-dashboard/(protegido)/page
 * @description Visão geral operacional adaptada do TailAdmin 2.4.0. Exibe o estado da integração
 *   editorial com o Sanity Studio, indicadores de segurança de sessão (AAL2 ativo), atalho
 *   para emissão direta de preview autenticado e atalhos de manutenção.
 * @dependencies react, next/link, @/lib/env
 */

import { env } from '@/lib/env';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho da página com título e ação primária */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
            Painel de Operações Editoriais
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            Ambiente exclusivo para gestão do portal e inspeção de rascunhos.
          </p>
        </div>

        <a
          href={env.sanityStudioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
          <span>Abrir Sanity Studio</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      {/* Grid de Cards de Status / Indicadores Operacionais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: CMS Editorial Sanity */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Fonte Editorial
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
            Sanity CMS
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Studio isolado e desacoplado</span>
          </div>
        </div>

        {/* Card 2: Segurança AAL2 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Autenticação de Sessão
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
            Nível AAL2 Ativo
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Dois fatores verificados</span>
          </div>
        </div>

        {/* Card 3: Preview de Rascunhos */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Sessão de Preview
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.452 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
            Durable Object
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span>Revogação imediata</span>
          </div>
        </div>
      </div>

      {/* Seção Operacional: Emissão de Preview Seguro */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-bold tracking-tight text-gray-900 sm:text-base dark:text-white">
            Visualizar Rascunho de Artigo
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Emita uma sessão de preview segura diretamente pela sua autorização
            AAL2, sem necessidade de redigitar segredos compartilhados.
          </p>

          <form
            action="/api/admin/preview"
            method="POST"
            className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="slug"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Slug do Artigo (opcional para home)
              </label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  /artigos/
                </span>
                <input
                  type="text"
                  name="slug"
                  id="slug"
                  placeholder="ex: arquitetura-sanity"
                  className="block w-full rounded-none rounded-r-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
              <span>Gerar Sessão e Abrir Preview</span>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </form>
        </div>

        {/* Informações de Governança e Segurança */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-bold tracking-tight text-gray-900 sm:text-base dark:text-white">
            Diretrizes de Segurança do Operador
          </h2>
          <div className="mt-4 space-y-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-blue-600 dark:text-blue-400">✓</span>
              <span>
                <strong>UUID Exclusivo:</strong> O painel responde apenas ao
                UUID fixo do administrador configurado em variável de ambiente
                do servidor.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-blue-600 dark:text-blue-400">✓</span>
              <span>
                <strong>MFA em Camadas:</strong> Sessões AAL1 são limitadas
                estritamente a desafio e logout; operações administrativas
                exigem elevação a AAL2.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-blue-600 dark:text-blue-400">✓</span>
              <span>
                <strong>Zero Contas Públicas:</strong> Cadastros de leitores
                permanecem desabilitados no Supabase Auth.
              </span>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Link
              href="/admin-dashboard/mfa/setup"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              Gerenciar chaves e autenticador TOTP →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
