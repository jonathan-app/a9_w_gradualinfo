/**
 * @fileoverview Bloco de dados estruturados (JSON-LD) renderizado como script.
 * @module components/shared/json-ld
 * @description Único lugar que injeta `application/ld+json` no documento: todo
 *   bloco passa por `serializeJsonLd`, que escapa "<", ">", "&" e separadores
 *   Unicode de linha. Título e resumo vêm do banco, e entrar cru no `innerHTML`
 *   deixaria qualquer "</script>" quebrar o parser do documento.
 * @dependencies @/lib/utils/format (serializeJsonLd).
 */
import { serializeJsonLd } from '@/lib/utils/format';

/**
 * Renderiza um bloco JSON-LD com a serialização segura.
 *
 * @param props.data - Bloco schema.org completo, incluindo `@context`.
 * @returns Elemento `<script type="application/ld+json">` com o JSON escapado.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
