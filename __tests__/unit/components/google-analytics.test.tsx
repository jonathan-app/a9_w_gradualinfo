import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/script', () => ({
  __esModule: true,
  default: function MockScript(
    props: React.DetailedHTMLProps<
      React.ScriptHTMLAttributes<HTMLScriptElement>,
      HTMLScriptElement
    >,
  ) {
    if (props.src) {
      return <script src={props.src} />;
    }
    return (
      <script
        id={props.id}
        dangerouslySetInnerHTML={{ __html: props.children }}
      />
    );
  },
}));

/**
 * __tests__/unit/components/google-analytics.test.tsx
 * @fileoverview Renderização condicional do GoogleAnalytics por measurementId.
 *
 * Testa a renderização condicional do componente GoogleAnalytics
 * baseado no valor de `env.gaMeasurementId`.
 */
describe('GoogleAnalytics', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('não renderiza scripts quando measurementId estiver vazio', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        gaMeasurementId: '',
      },
    }));

    const { GoogleAnalytics } =
      await import('@/components/shared/google-analytics');
    const { container } = render(<GoogleAnalytics />);

    expect(container.firstChild).toBeNull();
  });

  it('renderiza os scripts quando measurementId estiver configurado', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        gaMeasurementId: 'G-TEST12345',
      },
    }));

    const { GoogleAnalytics } =
      await import('@/components/shared/google-analytics');
    render(<GoogleAnalytics />);

    const scriptSrc = document.querySelector(
      'script[src="https://www.googletagmanager.com/gtag/js?id=G-TEST12345"]',
    );
    expect(scriptSrc).toBeInTheDocument();

    const inlineScript = document.getElementById('google-analytics-init');
    expect(inlineScript).toBeInTheDocument();
    expect(inlineScript?.textContent).toContain('G-TEST12345');
  });
});
