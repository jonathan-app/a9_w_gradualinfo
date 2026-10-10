'use client';

/**
 * @fileoverview Capa decorativa com fallback neutro.
 * @module components/shared/editorial-cover
 * @description Mantém a proporção quando a imagem não existe ou falha.
 * @dependencies next/image, react.
 */
import Image from 'next/image';
import { useState } from 'react';

/**
 * Renderiza somente URLs já aprovadas no servidor.
 * @param props - URL validada, prioridade e largura responsiva.
 * @returns Imagem decorativa ou espaço neutro.
 */
export function EditorialCover({
  src,
  priority = false,
  sizes = '100vw',
}: {
  src: string | null;
  priority?: boolean;
  sizes?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return src && failedSource !== src ? (
    <Image
      src={src}
      alt=""
      fill
      unoptimized
      sizes={sizes}
      priority={priority}
      className="object-cover"
      onError={() => setFailedSource(src)}
    />
  ) : null;
}
