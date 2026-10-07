import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * __tests__/unit/components/google-tag-manager.test.tsx
 * @fileoverview Renderização condicional do GoogleTagManager por gtmId.
 *
 * Testa a renderização condicional do componente GoogleTagManager
 * baseado no valor de `env.gtmId`.
 */
describe('GoogleTagManager', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('não renderiza scripts nem iframe quando gtmId estiver vazio', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        gtmId: '',
      },
    }));

    const { GoogleTagManager } =
      await import('@/components/shared/google-tag-manager');
    const { container } = render(<GoogleTagManager />);

    expect(container.firstChild).toBeNull();
  });

  it('renderiza script e noscript quando gtmId estiver configurado', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        gtmId: 'GTM-TEST1234',
      },
    }));

    const { GoogleTagManager } =
      await import('@/components/shared/google-tag-manager');
    const { container } = render(<GoogleTagManager />);

    const gtmScript = document.getElementById('google-tag-manager');
    expect(gtmScript).toBeInTheDocument();
    expect(gtmScript?.textContent).toContain('GTM-TEST1234');

    expect(container.querySelector('noscript')).toBeInTheDocument();
  });
});
