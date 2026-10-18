'use client';

/**
 * @fileoverview components/admin/dashboard/action-hub.tsx — central de rotinas operacionais administrativas
 * @module components/admin/dashboard/action-hub
 * @description Centraliza atalhos de suporte seguros: atalho direto para Sanity Studio (sem modal)
 *   e emissão de prévia protegida por diálogo modal acessível de confirmação.
 * @dependencies react, @/lib/env
 */

import { useState, useRef, useEffect } from 'react';

interface ActionHubProps {
  sanityStudioUrl: string;
}

export function ActionHub({ sanityStudioUrl }: ActionHubProps) {
  const [slug, setSlug] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    setIsModalOpen(false);
    formRef.current?.submit();
  };

  return (
    <section aria-labelledby="action-hub-heading" className="space-y-4">
      <div>
        <h2
          id="action-hub-heading"
          className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
          Central de Rotinas Operacionais (Action Hub)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ações seguras de suporte, inspeção editorial e atalhos de
          infraestrutura.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Atalho Seguro para Sanity Studio (Navegação direta sem modal) */}
        <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="flex items-center gap-2">
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Edição Editorial no Sanity Studio
              </h3>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Acesso ao ambiente desacoplado de produção de conteúdo,
              gerenciamento de mídias e redação de artigos.
            </p>
          </div>

          <div className="mt-5">
            <a
              href={sanityStudioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white">
              <span>Abrir Studio em nova aba</span>
              <svg
                className="h-3.5 w-3.5"
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
        </div>

        {/* Card 2: Emissão de Preview Seguro com Modal de Confirmação */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
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
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Emissão de Prévia Segura
            </h3>
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Gera sessão criptografada no Durable Object e assina cookie no
            navegador para inspecionar rascunhos.
          </p>

          <form
            ref={formRef}
            action="/api/admin/preview"
            method="POST"
            onSubmit={handleOpenConfirm}
            className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="preview-slug"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Slug do Artigo (deixe em branco para prévia da Home)
              </label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  /artigos/
                </span>
                <input
                  type="text"
                  name="slug"
                  id="preview-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ex: introducao-nextjs"
                  className="block w-full rounded-none rounded-r-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
              <span>Solicitar Sessão de Preview</span>
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
      </div>

      {/* Modal Acessível de Confirmação para Ação com Efeito Colateral */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h3
              id="modal-title"
              className="text-base font-bold text-gray-900 dark:text-white">
              Confirmar Emissão de Prévia
            </h3>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Esta ação registrará uma sessão de preview no Cloudflare Durable
              Object e assinará o cookie de autorização (
              <code className="font-mono text-[11px]">PREVIEW_COOKIE</code>) no
              seu navegador válido por 30 minutos.
              {slug ? (
                <>
                  {' '}
                  Você será redirecionado para o artigo{' '}
                  <strong className="text-gray-900 dark:text-white">
                    /artigos/{slug}
                  </strong>
                  .
                </>
              ) : (
                <>
                  {' '}
                  Você será redirecionado para a{' '}
                  <strong className="text-gray-900 dark:text-white">
                    página inicial
                  </strong>{' '}
                  com visibilidade de rascunhos ativada.
                </>
              )}
            </p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Confirmar e Abrir Prévia
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
