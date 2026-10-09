/**
 * @fileoverview app/admin-dashboard/layout.tsx — layout raiz da área administrativa
 * @module app/admin-dashboard/layout
 * @description Configura metadados para desindexação (noindex, nofollow) de todas as rotas
 *   sob /admin-dashboard.
 * @dependencies next
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Painel Administrativo | GradualInfo',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
      {children}
    </div>
  );
}
