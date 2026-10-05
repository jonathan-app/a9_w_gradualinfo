import siteMetadata from "./siteMetaData";

const CONTEXT = "https://schema.org";

const absolute = (url) =>
  /^https?:\/\//i.test(url) ? url : `${siteMetadata.siteUrl}${url}`;

/** Site-level entities rendered once in the root layout. */
export function organizationSchema() {
  const socials = [
    siteMetadata.instagram,
    siteMetadata.facebook,
    siteMetadata.linkedin,
    siteMetadata.youtube,
    siteMetadata.twitter,
    siteMetadata.github,
  ].filter(Boolean);

  return {
    "@context": CONTEXT,
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteMetadata.siteUrl}/#organization`,
        name: siteMetadata.title,
        legalName: siteMetadata.organization.legalName,
        url: siteMetadata.siteUrl,
        logo: {
          "@type": "ImageObject",
          url: absolute(siteMetadata.siteLogo),
          width: 512,
          height: 512,
        },
        image: absolute(siteMetadata.socialBanner),
        description: siteMetadata.description,
        email: siteMetadata.email || undefined,
        foundingDate: siteMetadata.organization.foundingDate,
        areaServed: {
          "@type": "Country",
          name: siteMetadata.areaServed,
        },
        address: {
          "@type": "PostalAddress",
          addressCountry: siteMetadata.address.addressCountry,
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          areaServed: "BR",
          availableLanguage: "pt-BR",
          url: `${siteMetadata.siteUrl}/#contato`,
        },
        sameAs: socials.length ? socials : undefined,
      },
      {
        "@type": "WebSite",
        "@id": `${siteMetadata.siteUrl}/#website`,
        url: siteMetadata.siteUrl,
        name: siteMetadata.title,
        description: siteMetadata.description,
        inLanguage: siteMetadata.language,
        publisher: { "@id": `${siteMetadata.siteUrl}/#organization` },
      },
    ],
  };
}

/** Article entity for a single blog post. */
export function blogPostingSchema(blog) {
  const image = blog.image
    ? absolute(blog.image.src)
    : absolute(siteMetadata.socialBanner);
  const url = absolute(blog.url);

  return {
    "@context": CONTEXT,
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: blog.title,
    description: blog.description,
    image: [image],
    datePublished: new Date(blog.publishedAt).toISOString(),
    dateModified: new Date(blog.updatedAt || blog.publishedAt).toISOString(),
    inLanguage: siteMetadata.language,
    keywords: blog.tags?.join(", "),
    wordCount: blog.body ? blog.body.split(/\s+/).length : undefined,
    timeRequired: `PT${Math.round(blog.readingTime?.minutes ?? 1)}M`,
    articleSection: blog.tags?.[0],
    author: {
      "@type": "Organization",
      name: siteMetadata.title,
      url: siteMetadata.siteUrl,
    },
    publisher: {
      "@id": `${siteMetadata.siteUrl}/#organization`,
    },
  };
}

/** Breadcrumb trail rendered on a blog post. */
export function breadcrumbSchema(items) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.url),
    })),
  };
}