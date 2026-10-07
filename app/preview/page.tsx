import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isPreviewConfigured } from '@/lib/preview/config';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Preview editorial',
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return (
    <main className="container mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Preview editorial</h1>
      <p className="mb-6">
        A autorização vale por 30 minutos. Entre novamente quando o prazo
        terminar.
      </p>
      {isPreviewConfigured() ? (
        <form action="/api/preview" method="post" className="space-y-4">
          <label htmlFor="preview-token">Segredo de entrada</label>
          <Input
            id="preview-token"
            name="token"
            type="password"
            required
            autoComplete="off"
          />
          <Button type="submit">Entrar no preview</Button>
        </form>
      ) : (
        <p>Preview não configurado.</p>
      )}
      <form action="/api/preview/logout" method="post" className="mt-6">
        <Button variant="outline" type="submit">
          Encerrar preview
        </Button>
      </form>
    </main>
  );
}
