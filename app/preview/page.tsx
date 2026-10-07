/**
 * @fileoverview Tela de entrada do preview editorial (`/preview`).
 * @module app/preview/page
 * @description Server Component com formulários nativos (sem JS no meio): o de
 *   entrada POSTa o segredo em `/api/preview`, o de saída em
 *   `/api/preview/logout`. Fica fora do índice e é dinâmico: a barreira de
 *   configuração (`isPreviewConfigured`) é lida do env a cada requisição e
 *   decide se o formulário aparece — pré-renderizar congelaria essa decisão no
 *   build.
 * @dependencies components/ui/input e components/ui/button,
 *   lib/preview/config (isPreviewConfigured).
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isPreviewConfigured } from '@/lib/preview/config';

export const dynamic = 'force-dynamic';
/**
 * `noindex` de propósito: é a porta de entrada de um modo restrito — quem tem
 * o link já sabe o que ele abre, e sumir da busca é metade do "restrito".
 */
export const metadata = {
  title: 'Preview editorial',
  robots: { index: false, follow: false },
};

/**
 * Página de preview: formulário de segredo + formulário de logout.
 *
 * @returns A entrada só quando o preview está configurado (caso contrário, o
 *   aviso no lugar dela); o logout fica sempre visível, para quem tem sessão
 *   vencida conseguir sair sem mexer em cookie na mão. A validação de origem,
 *   cota e token mora toda no route handler — o form só transporta.
 */
export default function PreviewPage() {
  return (
    <div className="container mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Preview editorial</h1>
      {/* Espelha `PREVIEW_TTL` (1800s) de lib/preview/session: mudar o TTL sem
          mudar este texto deixa a página prometendo prazo que não é o real. */}
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
    </div>
  );
}
