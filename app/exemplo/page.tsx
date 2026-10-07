/**
 * @fileoverview Rota de exemplo que existe para devolver 404 (`/exemplo`).
 * @module app/exemplo/page
 * @description É o alvo dos links de exemplo (stories do Storybook e testes de
 *   botão `asChild`): a rota não tem conteúdo de propósito, e chamar
 *   `notFound()` garante que qualquer navegação de teste caia na tela de 404
 *   real do app, com status e semântica de verdade, em vez de numa página stub
 *   com 200. Por isso também não aparece no sitemap — sitemap lista só home e
 *   artigos publicados.
 * @dependencies next/navigation (notFound).
 */
import { notFound } from 'next/navigation';

/**
 * Página que dispara o 404 do App Router.
 *
 * @returns Nunca renderiza JSX: `notFound()` lança antes de retornar.
 */
export default function ExamplePage() {
  notFound();
}
