// @vitest-environment node
/**
 * @fileoverview Guarda de deriva do hash CSP do script de tema.
 * @module __tests__/unit/theme-csp-hash
 * @description O `next-themes` injeta um `<script>` inline antes da hidratação,
 *   e o layout raiz é estático (a home é ISR), então o provider não recebe o
 *   nonce. A política do painel libera exatamente esse conteúdo por hash. Se a
 *   configuração do provider mudar, o conteúdo muda e o hash deixa de valer em
 *   silêncio; este teste recalcula o hash do HTML realmente renderizado e
 *   compara com a política.
 * @dependencies vitest, react-dom/server, node:crypto, ThemeProvider,
 *   lib/security-headers.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { contentSecurityPolicy } from '@/lib/security-headers';

describe('hash CSP do script de tema', () => {
  it('a política do painel libera o script que o ThemeProvider renderiza', () => {
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, null, createElement('span', null, 'ok')),
    );
    const script = /^<script>([\s\S]*?)<\/script>/.exec(html)?.[1];

    expect(
      script,
      'ThemeProvider deve renderizar o script de tema',
    ).toBeTruthy();

    const hash = createHash('sha256')
      .update(script ?? '')
      .digest('base64');

    expect(contentSecurityPolicy(true, 'nonce-de-teste')).toContain(
      `'sha256-${hash}'`,
    );
  });
});
