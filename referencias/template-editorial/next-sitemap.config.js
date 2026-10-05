const fs = require("fs");
const path = require("path");
const siteMetadata = require("./src/utils/siteMetaData");

// Blog posts are the money pages; the category hub and static pages rank below.
const priorityByPath = (loc) => {
  if (loc === "/") return 1.0;
  if (loc.startsWith("/blogs/")) return 0.8;
  if (loc.startsWith("/categories/")) return 0.6;
  if (loc === "/about") return 0.4;
  return 0.5;
};

const changefreqByPath = (loc) => {
  if (loc === "/") return "weekly";
  if (loc.startsWith("/blogs/")) return "monthly";
  return "monthly";
};

// Prefer each post's own updatedAt over the build timestamp, so crawlers see a
// truthful lastmod instead of "now" on every deploy.
const blogLastmod = () => {
  const file = path.join(__dirname, ".velite/generated/blogs.json");
  if (!fs.existsSync(file)) return new Map();
  try {
    const blogs = JSON.parse(fs.readFileSync(file, "utf8"));
    return new Map(
      blogs.map((blog) => [
        blog.url,
        new Date(blog.updatedAt || blog.publishedAt).toISOString(),
      ])
    );
  } catch {
    return new Map();
  }
};

module.exports = {
  siteUrl: siteMetadata.siteUrl,
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  autoLastmod: true,
  // Metadata routes (icons, manifest) are files, not pages — never list them.
  exclude: [
    "/apple-icon.png",
    "/icon.png",
    "/icon-512.png",
    "/favicon.ico",
    "/manifest.webmanifest",
  ],
  transform: async (config, loc) => {
    const lastmod = blogLastmod().get(loc);
    return {
      loc,
      lastmod: lastmod ?? (config?.autoLastmod ? new Date().toISOString() : undefined),
      changefreq: changefreqByPath(loc),
      priority: priorityByPath(loc),
      alternateRefs: [],
    };
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemapUrls: [`${siteMetadata.siteUrl}/sitemap.xml`],
    host: siteMetadata.siteUrl,
  },
};