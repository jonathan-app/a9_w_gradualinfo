/**
 * lib/utils/format.ts — formatação de dado para exibição
 * @fileoverview Funções puras de formatação para exibição.
 *
 * Funções puras, sem React e sem `process.env` lido dentro: recebem o locale
 * por parâmetro e devolvem string. Isso as torna testáveis sem mock e
 * reutilizáveis em Server Component, Route Handler e Client Component.
 */

/** Locale padrão do produto — evita repetir 'pt-BR' em cada assinatura opcional. */
const DEFAULT_LOCALE = 'pt-BR';

/**
 * Opções comuns às funções deste módulo: `locale` muda textos e pluralização;
 * `timeZone` muda o dia exibido (só nos formatos que incluem data).
 */
export type FormatOptions = {
  locale?: string;
  timeZone?: string;
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

/**
 * Fuso explícito evita mudar o dia editorial. Quando omitido, preserva o
 * fuso do ambiente para os consumidores existentes.
 */
export function formatDate(
  value: Date | string | number,
  { locale = DEFAULT_LOCALE, timeZone }: FormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone,
  }).format(date);
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

/**
 * Serializa objetos para inclusão segura dentro de blocos <script type="application/ld+json">.
 * Escapa sequências perigosas como "</script>", "<", ">", "&" e separadores Unicode de linha,
 * impedindo que metadados vindos do banco quebrem o parser HTML ou injetem scripts.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Converte nome de editoria ou rótulo em identificador seguro para âncoras HTML.
 * Normaliza acentos, converte para minúsculas e substitui caracteres não alfanuméricos por traço.
 */
export function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'editoria'
  );
}

/**
 * Gera um sufixo alfanumérico determinístico a partir do texto original da categoria.
 * Utiliza FNV-1a (32 bits) sem dependências externas para garantir consistência
 * universal e imunidade a deslocamento de índices quando novas categorias são inseridas.
 */
function stableHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}

/**
 * Converte uma lista de nomes de editorias em um mapa de identificadores de âncora determinísticos.
 * A geração é imune à ordem de aparição dos posts e à inserção de novas editorias colidentes:
 * extrai editorias únicas, agrupa por slug base e atribui o slug canônico limpo ao termo exato;
 * eventuais colisões adicionais recebem identificador discriminado por hash determinístico do nome,
 * garantindo que o ID de uma categoria existente nunca mude após novas adições.
 *
 * @param editorias Nomes de categorias/editorias
 * @returns Map associando o nome da categoria ao identificador estável (ex: "home-editoria-tech")
 */
export function buildStableEditoriaIdMap(
  editorias: string[],
): Map<string, string> {
  const unique = Array.from(
    new Set(editorias.map((e) => e.trim()).filter(Boolean)),
  ).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const slugGroups = new Map<string, string[]>();
  for (const name of unique) {
    const baseSlug = slugify(name);
    const list = slugGroups.get(baseSlug) ?? [];
    list.push(name);
    slugGroups.set(baseSlug, list);
  }

  const idMap = new Map<string, string>();
  for (const [baseSlug, names] of slugGroups) {
    if (names.length === 1) {
      idMap.set(names[0]!, `home-editoria-${baseSlug}`);
    } else {
      let canonicalAssigned = false;
      for (const name of names) {
        const normalized = name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toLowerCase();

        const isExactMatch =
          normalized.replace(/\s+/g, '-') === baseSlug ||
          normalized.replace(/\s*&\s*/g, '-').replace(/\s+/g, '-') === baseSlug;

        if (isExactMatch && !canonicalAssigned) {
          idMap.set(name, `home-editoria-${baseSlug}`);
          canonicalAssigned = true;
        } else {
          idMap.set(name, `home-editoria-${baseSlug}-${stableHash(name)}`);
        }
      }
    }
  }

  return idMap;
}
