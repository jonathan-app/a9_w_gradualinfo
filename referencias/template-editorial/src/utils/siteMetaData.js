// Single source of truth for brand, SEO and contact information.
// Kept as CommonJS because next-sitemap.config.js `require`s it at postbuild.
const siteMetadata = {
  // ---- Brand -------------------------------------------------------------
  title: "GradualInfo",
  headerTitle: "GradualInfo",
  author: "GradualInfo",
  organization: {
    legalName: "GradualInfo Editorial",
    foundingDate: "2020",
  },

  // ---- SEO ---------------------------------------------------------------
  // Title shown on the home page. Page titles use `${pageTitle} | GradualInfo`.
  homepageTitle:
    "GradualInfo | Tecnologia e consumo digital com informação confiável",
  titleTemplate: "%s | GradualInfo",
  description:
    "Portal editorial sobre tecnologia e consumo digital: notícias, guias e análises com fonte declarada, em português do Brasil.",
  keywords: [
    "tecnologia",
    "consumo digital",
    "mercado e ecossistema",
    "inteligência artificial",
    "segurança digital",
    "guias",
    "análises",
    "GradualInfo",
  ],
  category: "Tecnologia e Consumo Digital",
  language: "pt-BR",
  locale: "pt_BR",
  openGraphLocale: "pt_BR",
  theme: "light", // light, dark or system (first visit, before the user picks)

  // ---- URLs --------------------------------------------------------------
  siteUrl: "https://gradualinfo.com.br",
  siteLogo: "/logo.png",
  socialBanner: "/social-banner.png", // 1200x630, generated from the brand palette
  bannerAlt:
    "GradualInfo — informação confiável sobre tecnologia e consumo digital",
  bannerWidth: 1200,
  bannerHeight: 630,

  // ---- Contact -----------------------------------------------------------
  // Empty values are skipped by Header/Footer so no dead links are rendered.
  email: "",
  whatsapp: "https://wa.me/5527999999999",
  whatsappLabel: "+55 27 99999-9999",
  whatsappMessage: "Olá!",
  address: {
    addressCountry: "BR",
  },
  areaServed: "Brasil",
  sameAs: [],

  // ---- Social (empty until the brand profiles exist) ---------------------
  github: "",
  twitter: "",
  facebook: "",
  youtube: "",
  linkedin: "",
  dribbble: "",
  instagram: "",
};

module.exports = siteMetadata;