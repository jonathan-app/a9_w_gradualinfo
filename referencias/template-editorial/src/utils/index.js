import { compareDesc, parseISO } from "date-fns";
import { slug as githubSlug } from "github-slugger";

export const cx = (...classNames) => classNames.filter(Boolean).join(" ");

export const sortBlogs = (blogs) => {
  return blogs
    .slice()
    .sort((a, b) =>
      compareDesc(parseISO(a.publishedAt), parseISO(b.publishedAt))
    );
};

// Combining diacritical marks, stripped after NFD decomposition.
const DIACRITICS = /[̀-ͯ]/g;

/**
 * Category slug for a tag name.
 *
 * github-slugger keeps diacritics, so "qualidade de código" would become
 * "qualidade-de-código". Accented URLs require percent-encoding and do not
 * reliably match a pre-rendered route, so diacritics are stripped here to keep
 * every category URL plain ASCII.
 */
export const tagSlug = (tag) =>
  githubSlug(String(tag).normalize("NFD").replace(DIACRITICS, ""));