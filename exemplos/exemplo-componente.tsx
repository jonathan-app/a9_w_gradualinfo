'use client';

/**
 * @fileoverview exemplos/exemplo-componente.tsx — componente com props,
 * variantes e a11y documentados. Mostra o nível esperado de JSDoc para
 * componentes exportados.
 */
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type Variante = 'info' | 'sucesso' | 'erro' | 'aviso';

interface AvisoProps {
  /** Texto principal. Sempre obrigatório — aviso vazio não renderiza. */
  mensagem: string;
  /** Tipo de aviso; define cor e ícone. Padrão: 'info'. */
  variante?: Variante;
  /** Se pode ser dispensado pelo usuário. Padrão: false. */
  dispensavel?: boolean;
  className?: string;
}

const estilosPorVariante: Record<Variante, string> = {
  info: 'border-blue-500 bg-blue-50 text-blue-900',
  sucesso: 'border-green-500 bg-green-50 text-green-900',
  erro: 'border-red-500 bg-red-50 text-red-900',
  aviso: 'border-yellow-500 bg-yellow-50 text-yellow-900',
};

/**
 * Aviso acessível (banner de alerta).
 *
 * @a11y Usa role="alert" para tela ler automaticamente; botão de fechar tem
 *   aria-label. Quando dispensavel=false, não renderiza botão.
 * @performance Estado local só quando dispensavel=true; sem ele, componente
 *   é puro (Server Component-friendly se não fosse 'use client' por causa do
 *   botão).
 *
 * @example
 * <Aviso mensagem="Perfil salvo." variante="sucesso" />
 */
export function Aviso({
  mensagem,
  variante = 'info',
  dispensavel = false,
  className,
}: AvisoProps) {
  const [visivel, setVisivel] = React.useState(true);
  if (!visivel || !mensagem) return null;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
        estilosPorVariante[variante],
        className,
      )}>
      <span className="flex-1">{mensagem}</span>
      {dispensavel && (
        <button
          type="button"
          aria-label="Dispensar aviso"
          onClick={() => setVisivel(false)}
          className="opacity-60 hover:opacity-100">
          ×
        </button>
      )}
    </div>
  );
}
