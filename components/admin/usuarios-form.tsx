/**
 * @fileoverview components/admin/usuarios-form.tsx — formulário de atribuição e revogação de papéis
 * @module components/admin/usuarios-form
 * @description Formulário independente que permite conceder ou revogar um papel
 *   a uma conta existente via UUID, mesmo que ainda não conste na listagem.
 *   Inclui diálogo de confirmação, prevenção de envio duplicado, foco gerenciado
 *   e fechamento por tecla Escape.
 * @dependencies react, @/components/ui/button, @/components/ui/input, @/components/ui/badge
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ROLES = ['admin', 'editor', 'revisor'] as const;

export function UsuariosForm() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('editor');
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'assign' | 'revoke'>('assign');
  const [targetUserId, setTargetUserId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // A spec 0037 exige foco inicial no campo UUID. O efeito roda no cliente,
  // depois da hidratação, e não interfere no foco que o modal devolve ao
  // fechar.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      cancelRef.current?.focus();
    } else if (!pending && returnFocusRef.current) {
      // O botão de origem só pode receber foco após terminar a requisição.
      returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }
  }, [isOpen, pending]);

  const openAssign = useCallback(() => {
    setActionType('assign');
    setTargetUserId(userId.trim().toLowerCase());
    setError(null);
    setSuccess(null);
    setIsOpen(true);
    returnFocusRef.current = document.activeElement as HTMLElement | null;
  }, [userId]);

  const openRevoke = useCallback(() => {
    setActionType('revoke');
    setTargetUserId(userId.trim().toLowerCase());
    setError(null);
    setSuccess(null);
    setIsOpen(true);
    returnFocusRef.current = document.activeElement as HTMLElement | null;
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current || !isOpen) return;
    inFlight.current = true;
    setError(null);
    setSuccess(null);
    setPending(true);

    try {
      if (actionType === 'assign') {
        const res = await fetch('/api/admin/usuarios/papeis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ userId: targetUserId, role }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(
            body.message || `Falha ao atribuir papel (${res.status}).`,
          );
        }
        setSuccess(`Papel "${role}" atribuído com sucesso.`);
        // Fecha o diálogo assim que a ação conclui: deixá-lo aberto cobre a
        // página e o foco continua preso ao botão de confirmação.
        close();
        router.refresh();
      } else {
        const res = await fetch(`/api/admin/usuarios/papeis/${targetUserId}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(
            body.message || `Falha ao revogar papel (${res.status}).`,
          );
        }
        setSuccess('Papel revogado com sucesso. A conta foi preservada.');
        close();
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  /**
   * Enter no formulário abre a confirmação; nunca envia sozinho.
   *
   * O `onSubmit` apontava direto para `handleSubmit`, então Enter no campo de
   * UUID disparava a mutação sem passar pelo diálogo. Agora o envio implícito
   * tem o mesmo efeito de clicar em "Atribuir papel": abre a confirmação.
   *
   * @param event - Evento de envio do formulário.
   */
  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || !userId) return;
    openAssign();
  };

  return (
    <section aria-labelledby="usuarios-form-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            id="usuarios-form-heading"
            className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
            Atribuir ou revogar papel
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Digite o UUID da conta de autenticação e escolha o papel.
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="user-id"
              className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              UUID da conta
            </label>
            <Input
              ref={inputRef}
              id="user-id"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              required
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="role-select"
              className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Papel
            </label>
            <select
              id="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[0])}
              className="h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === 'admin'
                    ? 'Administrador'
                    : r === 'editor'
                      ? 'Editor'
                      : 'Revisor'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && !isOpen && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {/* type="button": quem dispara a requisição é o botão do diálogo de
              confirmação. Como submit, o clique abria o diálogo e enviava a
              atribuição na mesma ação, sem confirmação nenhuma. */}
          <Button
            type="button"
            variant="default"
            disabled={pending || !userId}
            onClick={openAssign}>
            {pending ? 'Processando…' : 'Atribuir papel'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !userId}
            onClick={openRevoke}>
            {pending ? 'Processando…' : 'Revogar papel'}
          </Button>
        </div>
      </form>

      {success && (
        <div
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {success}
        </div>
      )}

      {/* Diálogo de confirmação */}
      {isOpen && (
        <dialog
          ref={dialogRef}
          className="m-auto w-full max-w-md rounded-xl bg-transparent p-4 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
          aria-labelledby="usuarios-confirm-title"
          aria-describedby="usuarios-confirm-description"
          aria-modal="true"
          onCancel={(event) => {
            event.preventDefault();
            if (!inFlight.current) close();
          }}>
          <div className="relative bg-white rounded-xl border border-gray-200 p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 w-full max-w-md mx-4">
            <h3
              id="usuarios-confirm-title"
              className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              {actionType === 'assign'
                ? 'Confirmar atribuição'
                : 'Confirmar revogação'}
            </h3>
            <p
              id="usuarios-confirm-description"
              className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Confirme a ação para
              {actionType === 'assign'
                ? ` atribuir o papel ${role}`
                : ' retirar todo o acesso administrativo'}{' '}
              da conta{' '}
              <span className="font-mono font-semibold">{targetUserId}</span>.
            </p>
            {error && (
              <p
                role="alert"
                className="mb-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button
                ref={cancelRef}
                type="button"
                variant="ghost"
                onClick={close}
                disabled={pending}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant={actionType === 'assign' ? 'default' : 'destructive'}
                onClick={handleSubmit}
                disabled={pending}>
                {pending ? 'Processando…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
