import BlogDetails from "@/src/components/Blog/BlogDetails";
import RenderMdx from "@/src/components/Blog/RenderMdx";
import Tag from "@/src/components/Elements/Tag";
import siteMetadata from "@/src/utils/siteMetaData";
import { blogPostingSchema, breadcrumbSchema } from "@/src/utils/structuredData";
import { blogs } from '@/.velite/generated'
import { tagSlug } from "@/src/utils";
import Image from "next/image";
import { notFound } from "next/navigation";

const absolute = (url) =>
  /^https?:\/\//i.test(url) ? url : `${siteMetadata.siteUrl}${url}`;

/** og:image as a full object — velite images carry width/height we should expose. */
const ogImage = (blog) =>
  blog.image
    ? {
        url: absolute(blog.image.src),
        width: blog.image.width,
        height: blog.image.height,
        alt: blog.title,
      }
    : {
        url: absolute(siteMetadata.socialBanner),
        width: siteMetadata.bannerWidth,
        height: siteMetadata.bannerHeight,
        alt: siteMetadata.bannerAlt,
      };

export async function generateStaticParams() {
  return blogs.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }) {
  const {slug} = await params
  const blog = blogs.find((blog) => blog.slug === slug);
  if (!blog) {
    return;
  }

  const url = absolute(blog.url);
  const image = ogImage(blog);

  return {
    title: blog.title,
    description: blog.description,
    keywords: blog.tags,
    authors: [{ name: siteMetadata.author, url: siteMetadata.siteUrl }],
    alternates: {
      canonical: blog.url,
    },
    openGraph: {
      title: blog.title,
      description: blog.description,
      url,
      siteName: siteMetadata.title,
      locale: siteMetadata.openGraphLocale,
      type: "article",
      publishedTime: new Date(blog.publishedAt).toISOString(),
      modifiedTime: new Date(blog.updatedAt || blog.publishedAt).toISOString(),
      authors: [siteMetadata.author],
      tags: blog.tags,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description: blog.description,
      images: [image],
    },
  };
}


function TableOfContentsItem({ item, level = "two" }){
  return (
    <li className="py-1">
      <a
        href={item.url}
        data-level={level}
        className="data-[level=two]:pl-0 data-[level=two]:pt-2
                  data-[level=two]:border-t border-solid border-dark/40
                  data-[level=three]:pl-4
                  sm:data-[level=three]:pl-6
                  flex items-center justify-start"
      >
        {level === "three" && (
          <span className="flex w-1 h-1 rounded-full bg-dark mr-2">&nbsp;</span>
        )}
        <span className="hover:underline">{item.title}</span>
      </a>
      {item.items.length > 0 && (
        <ul className="mt-1">
          {item.items.map((subItem) => (
            <TableOfContentsItem 
              key={subItem.url} 
              item={subItem} 
              level="three"
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function BlogPage({ params }) {
  const {slug} = await params
  const blog = blogs.find((blog) => {
    return blog.slug === slug
  });

  if(!blog){
    notFound()
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema(blog)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Início", url: "/" },
              { name: blog.tags[0], url: `/categories/${tagSlug(blog.tags[0])}` },
              { name: blog.title, url: blog.url },
            ])
          ),
        }}
      />
       <article>
      <div className="mb-8 text-center relative w-full h-[70vh] bg-dark">
        <div className="w-full z-10 flex flex-col items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Tag
            name={blog.tags[0]}
            link={`/categories/${tagSlug(blog.tags[0])}`}
            className="px-6 text-sm py-2"
          />
          <h1
            className="inline-block mt-6 font-semibold capitalize text-light text-2xl md:text-3xl lg:text-5xl !leading-normal relative w-5/6"
          >
            {blog.title}
          </h1>
        </div>
        <div className="absolute top-0 left-0 right-0 bottom-0 h-full bg-dark/60 dark:bg-dark/40" />
        <Image
          src={blog.image.src}
          placeholder="blur"
          blurDataURL={blog.image.blurDataURL}
          alt={blog.title}
          width={blog.image.width}
          height={blog.image.height}
          className="aspect-square w-full h-full object-cover object-center"
          priority
          sizes="100vw"
        />
      </div>
      <BlogDetails blog={blog} slug={slug} />

      <div className="grid grid-cols-12  gap-y-8 lg:gap-8 sxl:gap-16 mt-8 px-5 md:px-10">
        <div className="col-span-12  lg:col-span-4">
          <details
            className="border-[1px] border-solid border-dark dark:border-light text-dark dark:text-light rounded-lg p-4 sticky top-6 max-h-[80vh] overflow-hidden overflow-y-auto"
            open
          >
            <summary className="text-lg font-semibold capitalize cursor-pointer">
              Sumário
            </summary>
            <ul className="mt-4 font-in text-base">
              {blog.toc.map((item) => (
                <TableOfContentsItem key={item.url} item={item} />
              ))}
            </ul>
          </details>
        </div>
        <RenderMdx blog={blog} />
      </div>
    </article>
    </>
  );
}
