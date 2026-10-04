import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * app/not-found.tsx — o que aparece em URL que não existe
 *
 * Server Component. O 404 é também onde a busca decide o que indexar: uma
 * página "não encontrada" com `noindex` evita que o buscador guarde páginas de
 * erro como conteúdo do site.
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
