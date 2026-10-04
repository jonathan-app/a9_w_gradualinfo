// Both the locale and the time zone are pinned on purpose. Without a fixed
// locale the server and the browser format dates differently (hydration
// mismatch), and without a fixed time zone a post published late in the day can
// shift to the previous/next date depending on where it is rendered.
//
// America/Sao_Paulo is the authoring time zone, so the calendar day written in
// the front matter is always the day the reader sees.
const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/** "8 de maio de 2024" */
export const formatDate = (value) => DATE_FORMAT.format(new Date(value));

/** "9 min de leitura" — reading-time ships an English string ("9 min read"). */
export const formatReadingTime = (readingTime) => {
  const minutes = Math.max(1, Math.round(readingTime?.minutes ?? 0));
  return `${minutes} min de leitura`;
};