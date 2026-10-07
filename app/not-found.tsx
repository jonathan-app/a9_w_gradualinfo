import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * app/not-found.tsx — o que aparece em URL que não existe
 *
 * Server Component. O 404 é também onde a busca decide o que indexar: uma
 * página "não encontrada" com `noindex` evita que o buscador guarde páginas de
 * erro como conteúdo do site.
 *
 * @fileoverview Tela de página inexistente do App Router.
 * @module app/not-found
 * @dependencies next/link, components/ui/button.
 */
/**
 * Conteúdo do 404 (usado por qualquer rota que chame `notFound()`).
 *
 * @returns Explicação curta e um link de volta ao início — `asChild` mantém o
 *   `<Link>` como link, para abrir em nova aba e copiar endereço continuarem
 *   funcionando.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Página não encontrada
      </h1>
      <p className="max-w-prose text-muted-foreground">
        O endereço acessado não existe, ou o conteúdo foi movido.
      </p>
      <Button asChild>
        <Link href="/">Voltar para o início</Link>
      </Button>
    </div>
  );
}
