/**
 * lib/utils/format.ts — formatação de dado para exibição
 *
 * Funções puras, sem React e sem `process.env` lido dentro: recebem o locale
 * por parâmetro e devolvem string. Isso as torna testáveis sem mock e
 * reutilizáveis em Server Component, Route Handler e Client Component.
 */

const DEFAULT_LOCALE = 'pt-BR';

export type FormatOptions = {
  locale?: string;
};

/** Número com separador de milhar e casas decimais. */
export function formatNumber(
  value: number,
  { locale = DEFAULT_LOCALE }: FormatOptions = {},
): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Moeda. O default é real (BRL) porque é a moeda do produto. */
export function formatCurrency(
  valueInCents: number,
  { locale = DEFAULT_LOCALE }: FormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInCents / 100);
}

/** Data por extenso no formato curto do locale. */
export function formatDate(
  value: Date | string | number,
  { locale = DEFAULT_LOCALE }: FormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/**
 * Data relativa ("há 3 dias"). Usa `Intl.RelativeTimeFormat` em vez de
 * diff manual: ele conhece os plurais e a separação de casos do locale.
 */
export function formatRelativeDate(
  value: Date | string | number,
  { locale = DEFAULT_LOCALE }: FormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffInSeconds = (date.getTime() - Date.now()) / 1000;

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(diffInSeconds) >= secondsInUnit) {
      return formatter.format(Math.round(diffInSeconds / secondsInUnit), unit);
    }
  }

  return formatter.format(0, 'second');
}

/**
 * Iniciais para avatar: "Ana Silva" → "AS". Também serve para placeholders de
 * imagem e para tags ARIA (`aria-label` precisa do nome, não da inicial).
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0);

  if (!first) return '';

  // Primeiro e último nome é o que a pessoa espera ver: "Ana Maria Silva" vira
  // "AS", não "AM" (que parece abreviação do segundo nome).
  const last = parts.length > 1 ? (parts.at(-1) ?? first) : first;

  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}
