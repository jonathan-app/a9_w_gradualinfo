/**
 * @fileoverview __tests__/unit/components/admin/usuarios-form.test.tsx — form de atribuicao/revogacao
 * @module __tests__/unit/components/admin/usuarios-form
 * @description Testa `UsuariosForm` de `components/admin/usuarios-form.tsx`:
 *   dialogo de confirmacao, prevencao de envio duplicado, fechamento por Escape,
 *   foco gerenciado e mensagens de sucesso/erro (usuarios/AC-4, AC-6, AC-7, AC-8).
 * @dependencies @testing-library/react, @testing-library/user-event, @/components/admin/usuarios-form
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { UsuariosForm } from '@/components/admin/usuarios-form';

const UUID = '00000000-0000-4000-8000-000000000002';

type FetchMock = ReturnType<typeof vi.fn> & {
  lastCall?: { method: string; url: string; body?: unknown };
};

let fetchMock: FetchMock;

const jsonResponse = (ok: boolean, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  refreshMock.mockReset();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.dispatchEvent(new Event('cancel', { cancelable: true }));
        }
      };
      document.addEventListener('keydown', onKeyDown, { once: true });
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();
    let body: unknown;
    if (init?.body) body = JSON.parse(String(init.body));
    (fetchMock as FetchMock).lastCall = { method, url, body };
    if (url.endsWith('/papeis') && method === 'POST') {
      return jsonResponse(true, 200, { ok: true });
    }
    if (url.includes('/papeis/') && method === 'DELETE') {
      return jsonResponse(true, 200, { ok: true });
    }
    return jsonResponse(false, 500, { message: 'erro do servidor' });
  }) as FetchMock;
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderForm = () => {
  render(<UsuariosForm />);
};

const clicarAtribuir = async (user: ReturnType<typeof userEvent.setup>) => {
  const input = screen.getByLabelText('UUID da conta');
  await user.type(input, UUID);
  await user.click(screen.getByRole('button', { name: /Atribuir papel/ }));
  await vi.waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
};

describe('UsuariosForm', () => {
  it('renderiza campo UUID, seletor de papel e botoes de acao', () => {
    renderForm();

    expect(screen.getByLabelText('UUID da conta')).toBeInTheDocument();
    expect(screen.getByLabelText('Papel')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Atribuir papel/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Revogar papel/ }),
    ).toBeInTheDocument();
  });

  it('desabilita botoes enquanto o UUID esta vazio', () => {
    renderForm();

    expect(
      screen.getByRole('button', { name: /Atribuir papel/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Revogar papel/ }),
    ).toBeDisabled();
  });

  it('habilita botoes apos digitar um UUID', async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText('UUID da conta');
    await user.type(input, UUID);

    expect(
      screen.getByRole('button', { name: /Atribuir papel/ }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Revogar papel/ }),
    ).not.toBeDisabled();
  });

  it('abre o dialogo de confirmacao ao clicar em Atribuir papel', async () => {
    const user = userEvent.setup();
    renderForm();

    await clicarAtribuir(user);

    expect(screen.getByText(/Confirmar atribu/)).toBeInTheDocument();
    expect(screen.getByText(UUID)).toBeInTheDocument();
  });

  it('envio implicito do formulario abre a confirmacao e nao muta nada', async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText('UUID da conta');
    await user.type(input, UUID);

    // Simula o Enter no campo: dispara o submit do form. Sem a guarda, ele
    // chamava handleSubmit direto e a mutacao acontecia sem confirmacao.
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fecha o dialogo com a tecla Escape sem disparar requisicao (usuarios/AC-7)', async () => {
    const user = userEvent.setup();
    renderForm();

    await clicarAtribuir(user);
    const callsAntes = fetchMock.mock.calls.length;

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Escape sozinho nao dispara requisicao de mutacao
    expect(fetchMock.mock.calls.length).toBe(callsAntes);
  });

  it('envia atribuicao ao confirmar e mostra mensagem de sucesso', async () => {
    const user = userEvent.setup();
    renderForm();

    await clicarAtribuir(user);
    await user.click(
      screen.getByRole('button', { name: /Confirmar atribuicao|Confirmar/ }),
    );

    expect(fetchMock.lastCall?.method).toBe('POST');
    expect(fetchMock.lastCall?.url).toContain('/api/admin/usuarios/papeis');
    expect(fetchMock.lastCall?.body).toEqual({ userId: UUID, role: 'editor' });

    await vi.waitFor(() => {
      expect(screen.getByText(/com sucesso/)).toBeInTheDocument();
    });
  });

  it('envia revocacao ao confirmar e preserva a conta', async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText('UUID da conta');
    await user.type(input, UUID);
    await user.click(screen.getByRole('button', { name: /Revogar papel/ }));
    await vi.waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: /Confirmar revog|Confirmar/ }),
    );

    expect(fetchMock.lastCall?.method).toBe('DELETE');
    expect(fetchMock.lastCall?.url).toContain(
      `/api/admin/usuarios/papeis/${UUID}`,
    );
    await vi.waitFor(() => {
      expect(screen.getByText(/revogado com sucesso/)).toBeInTheDocument();
    });
  });

  it('mostra mensagem de erro quando a API falha', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async () =>
      jsonResponse(false, 400, { message: 'Papel invalido' }),
    );

    renderForm();

    await clicarAtribuir(user);
    await user.click(
      screen.getByRole('button', { name: /Confirmar atribu|Confirmar/ }),
    );

    await vi.waitFor(() => {
      expect(screen.getByText('Papel invalido')).toBeInTheDocument();
    });
  });

  it('desabilita o botao de confirmacao enquanto a requisicao esta pendente (usuarios/AC-6)', async () => {
    let resolveFetch!: (value: Response) => void;
    const pending = new Promise<Response>((res) => {
      resolveFetch = res;
    });
    fetchMock.mockImplementation(() => pending);

    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText('UUID da conta');
    await user.type(input, UUID);
    await user.click(screen.getByRole('button', { name: /Atribuir papel/ }));
    await vi.waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmar = within(dialog).getByRole('button', {
      name: /Confirmar/,
    });
    // A requisição só começa na confirmação: abrir o diálogo não envia nada.
    await user.click(confirmar);
    await vi.waitFor(() => {
      expect(confirmar).toBeDisabled();
    });

    resolveFetch(jsonResponse(true, 200, { ok: true }));
    await vi.waitFor(() => {
      expect(screen.getByText(/com sucesso/)).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('devolve o foco ao elemento que abriu o modal ao fechar (usuarios/AC-8)', async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText('UUID da conta');
    const atribuir = screen.getByRole('button', { name: /Atribuir papel/ });

    // O botao so esta habilitado apos preencher o UUID; o foco esta no input
    await user.type(input, UUID);
    expect(document.activeElement).toBe(input);

    await user.click(atribuir);
    await vi.waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Cancelar/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Foco volta ao botao que abriu o modal (ele estava focado ao ser clicado)
    expect(document.activeElement).toBe(atribuir);
  });
});
