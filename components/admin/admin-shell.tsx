/**
 * @fileoverview components/admin/admin-shell.tsx — casca de layout interativa do painel
 * @module components/admin/admin-shell
 * @description Componente client leve que gerencia a abertura/fechamento do menu lateral
 *   em telas menores e organiza o cabeçalho e a área de conteúdo principal.
 * @dependencies react, @/components/admin/admin-header, @/components/admin/admin-sidebar
 */

'use client';

import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useState } from 'react';

interface AdminShellProps {
  userEmail: string;
  children: React.ReactNode;
}

export function AdminShell({ userEmail, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <AdminHeader
          userEmail={userEmail}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
