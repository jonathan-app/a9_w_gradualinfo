/**
 * @fileoverview app/admin-dashboard/layout.tsx — layout raiz da área administrativa
 * @module app/admin-dashboard/layout
 * @description Configura metadados para desindexação (noindex, nofollow) de todas as rotas
 *   sob /admin-dashboard.
 * @dependencies next
 */
import { requireAdminAccessPage } from '@/lib/admin/access-guard';

import type { Metadata } from 'next';

/** Metadados privados e sem indexação do painel; o template raiz põe o sufixo. */
export const metadata: Metadata = {
  title: 'Painel Administrativo',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

/**
 * Apresenta somente conteúdo com admissão Worker comprovada.
 * @param props - Filhos administrativos.
 * @returns Layout privado.
 */
export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminAccessPage();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
      {children}
    </div>
  );
}
