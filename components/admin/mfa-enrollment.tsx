/**
 * @fileoverview Ação explícita de matrícula TOTP, com segredo transitório.
 * @module components/admin/mfa-enrollment
 * @description O segredo nunca é persistido e é removido ao sair ou confirmar.
 * @dependencies React, react-dom e endpoints administrativos.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

interface Enrollment {
  factorId: string;
  secret: string;
  uri: string;
  qrCode: string;
}

/**
 * Exibe matrícula somente após POST e confirma o fator na mesma sessão.
 * @param props - Destino previamente sanitizado pelo servidor.
 * @returns Controles de matrícula, confirmação e recuperação manual.
 */
export function MfaEnrollment({ redirectTo }: { redirectTo: string }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const clear = () => {
      controller.current?.abort();
      controller.current = null;
      // pagehide deve apagar também o DOM que pode voltar pelo histórico do browser.
      flushSync(() => {
        setEnrollment(null);
        setBusy(false);
      });
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') clear();
    };
    const logout = (event: Event) => {
      if (
        event.target instanceof HTMLFormElement &&
        new URL(event.target.action).pathname === '/api/admin/auth/logout'
      )
        clear();
    };
    document.addEventListener('submit', logout, true);
    window.addEventListener('pagehide', clear);
    window.addEventListener('popstate', clear);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      controller.current?.abort();
      controller.current = null;
      document.removeEventListener('submit', logout, true);
      window.removeEventListener('pagehide', clear);
      window.removeEventListener('popstate', clear);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  const begin = async () => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/auth/mfa/enroll', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: current.signal,
      });
      const data = await response.json();
      if (current.signal.aborted) return;
      if (
        response.ok &&
        data.ok &&
        ['factorId', 'secret', 'uri', 'qrCode'].every(
          (key) => typeof data[key] === 'string',
        )
      ) {
        setEnrollment({
          factorId: data.factorId,
          secret: data.secret,
          uri: data.uri,
          qrCode: data.qrCode,
        });
      } else if (response.status === 409) {
        setMessage(
          'Já existe um fator. Use seu autenticador para confirmar. Se você perdeu a configuração, faça a recuperação manual pelo proprietário no Supabase.',
        );
      } else
        setMessage(
          'Não foi possível iniciar a configuração. Aguarde e tente novamente.',
        );
    } catch {
      if (!current.signal.aborted)
        setMessage(
          'Serviço indisponível. Nenhuma repetição automática foi realizada.',
        );
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <section data-sentry-block data-sentry-mask className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Inicie a configuração e adicione a chave ao seu aplicativo autenticador.
        Ela será exibida somente nesta etapa.
      </p>
      {message && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {message}
        </p>
      )}
      {!enrollment ? (
        <>
          <button
            type="button"
            onClick={begin}
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Iniciando…' : 'Iniciar configuração TOTP'}
          </button>
          <a
            href="/admin-dashboard/mfa/verify"
            className="block text-sm text-blue-700 dark:text-blue-300">
            Já configurei o autenticador
          </a>
        </>
      ) : (
        <div className="space-y-4">
          {enrollment.secret && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Chave para adicionar manualmente ao autenticador
              </p>
              {enrollment.qrCode && (
                <img
                  alt="QR para configurar o autenticador"
                  width={200}
                  height={200}
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qrCode)}`}
                />
              )}
              <code className="block break-all py-2 font-mono text-sm">
                {enrollment.secret}
              </code>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                A chave será apagada ao sair desta página. Se não concluir a
                configuração, poderá precisar de recuperação manual.
              </p>
            </div>
          )}
          <form
            action="/api/admin/auth/mfa/verify"
            method="POST"
            onSubmit={() =>
              setEnrollment({ ...enrollment, secret: '', uri: '', qrCode: '' })
            }
            className="space-y-4">
            <input type="hidden" name="factorId" value={enrollment.factorId} />
            <input type="hidden" name="source" value="setup" />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <label htmlFor="setup-code" className="block text-sm font-medium">
              Código do autenticador
            </label>
            <input
              id="setup-code"
              name="code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full rounded-lg border border-gray-300 p-3 font-mono dark:border-gray-700"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              Confirmar e ativar MFA
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
