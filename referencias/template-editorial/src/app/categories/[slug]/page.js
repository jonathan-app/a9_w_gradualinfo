import { blogs as allBlogs } from "@/.velite/generated";
import BlogLayoutThree from "@/src/components/Blog/BlogLayoutThree";
import Categories from "@/src/components/Blog/Categories";
import siteMetadata from "@/src/utils/siteMetaData";
import { notFound } from "next/navigation";
import { tagSlug } from "@/src/utils";

// const slugger = new GithubSlugger();

const CATEGORY_NAMES = {
  all: "Todos os artigos",
};

// Slugs lose the original casing ("pwa" -> "Pwa"), so recover the tag as the
// author wrote it and fix up the tech terms that must stay uppercase.
const TAG_DISPLAY = {
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  pwa: "PWA",
  seo: "SEO",
  ux: "UX",
  ui: "UI",
};

const tagNames = new Map();
allBlogs.forEach((blog) => {
  blog.tags.forEach((tag) => tagNames.set(tagSlug(tag), tag));
});

// Portuguese keeps connectives lowercase: "Qualidade de Código", not "De".
const LOWER_WORDS = new Set([
  "a", "as", "à", "às", "ao", "aos", "com", "da", "das", "de", "do", "dos",
  "e", "em", "entre", "na", "nas", "no", "nos", "o", "os", "ou", "para",
  "pela", "pelas", "pelo", "pelos", "por", "que", "sem", "um", "uma",
]);

const capitalizePt = (text) =>
  text
    .split(" ")
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("pt-BR");
      if (index > 0 && LOWER_WORDS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
    })
    .join(" ");

const categoryName = (categorySlug) => {
  if (CATEGORY_NAMES[categorySlug]) return CATEGORY_NAMES[categorySlug];

  const tag = tagNames.get(categorySlug);
  if (!tag) return capitalizePt(categorySlug.replaceAll("-", " "));

  return TAG_DISPLAY[tagSlug(tag)] ?? (/[A-Z]/.test(tag) ? tag : capitalizePt(tag));
};

export async function generateStaticParams() {
  const categories = [];
  const paths = [{ slug: "all" }];

  allBlogs.map((blog) => {
    if (blog.isPublished) {
      blog.tags.map((tag) => {
        let slugified = tagSlug(tag);
        if (!categories.includes(slugified)) {
          categories.push(slugified);
          paths.push({ slug: slugified });
        }
      });
    }
  });

  return paths;
}

export async function generateMetadata({ params }) {
  const { slug: categorySlug } = await params;
  const name = categoryName(categorySlug);
  const path = `/categories/${categorySlug}`;
  const banner = {
    url: siteMetadata.socialBanner,
    width: siteMetadata.bannerWidth,
    height: siteMetadata.bannerHeight,
    alt: `${name} — ${siteMetadata.title}`,
  };
  const description =
    categorySlug === "all"
      ? `Todos os artigos do blog da ${siteMetadata.title} sobre presença digital, marketing para empresas locais, captação de leads e automação.`
      : `Artigos sobre ${name} escrita pela equipe da ${siteMetadata.title}.`;

  return {
    title: name,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: name,
      description,
      url: `${siteMetadata.siteUrl}${path}`,
      siteName: siteMetadata.title,
      locale: siteMetadata.openGraphLocale,
      type: "website",
      images: [banner],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [banner],
    },
  };
}


const CategoryPage = async ({ params }) => {
const { slug: categorySlug } = await params;
// Separating logic to create list of categories from all blogs
const allCategories = ["all"]; // Initialize with 'all' category
allBlogs.forEach(blog => {
  blog.tags.forEach(tag => {
    const slugified = tagSlug(tag);
    if (!allCategories.includes(slugified)) {
      allCategories.push(slugified);
    }
  });
});

// Sort allCategories to ensure they are in alphabetical order
allCategories.sort();

// Unknown slugs must 404 instead of rendering an empty list, otherwise any
// typo (/categories/qualidade-de-codigo) returns 200 and gets indexed.
if (!allCategories.includes(categorySlug)) {
  notFound();
}

// Step 2: Filter blogs based on the current category
const blogs = allBlogs.filter(blog => {
  if (categorySlug === "all") {
    return true; // Include all blogs if 'all' category is selected
  }
  return blog.tags.some(tag => tagSlug(tag) === categorySlug);
});

  return (
    <article className="mt-12 flex flex-col text-dark dark:text-light">
      <div className=" px-5 sm:px-10  md:px-24  sxl:px-32 flex flex-col">
        <h1 className="mt-6 font-semibold text-2xl md:text-4xl lg:text-5xl">
          #{categoryName(categorySlug)}
        </h1>
        <span className="mt-2 inline-block">
          Descubra mais categorias e aprofunde seu conhecimento.
        </span>
      </div>
      <Categories categories={allCategories} currentSlug={categorySlug} />

      <div className="grid  grid-cols-1 sm:grid-cols-2  lg:grid-cols-3 grid-rows-2 gap-16 mt-5 sm:mt-10 md:mt-24 sxl:mt-32 px-5 sm:px-10 md:px-24 sxl:px-32">
        {blogs.map((blog, index) => (
          <article key={index} className="col-span-1 row-span-1 relative">
            <BlogLayoutThree blog={blog} />
          </article>
        ))}
      </div>
    </article>
  );
};

export default CategoryPage;
