// Single source of truth for brand, SEO and contact information.
// Kept as CommonJS because next-sitemap.config.js `require`s it at postbuild.
const siteMetadata = {
  // ---- Brand -------------------------------------------------------------
  title: "Gradual Info",
  headerTitle: "Gradual Info",
  author: "Gradual Info",
  organization: {
    legalName: "Gradual Info",
    foundingDate: "2020",
  },

  // ---- SEO ---------------------------------------------------------------
  // Title shown on the home page. Page titles use `${pageTitle} | Gradual Info`.
  homepageTitle:
    "Gradual Info | Criação de Sites, Landing Pages e Marketing para Empresas Locais",
  titleTemplate: "%s | Gradual Info",
  description:
    "Agência digital especializada em criação de sites, landing pages de alta conversão e marketing para empresas locais. Conteúdo prático sobre presença digital, captação de leads e automação.",
  keywords: [
    "criação de sites",
    "landing pages",
    "marketing digital",
    "marketing para empresas locais",
    "desenvolvimento de sites",
    "gestão de tráfego pago",
    "growth marketing",
    "captação de clientes",
    "automação de vendas",
    "sites profissionais",
    "geração de leads",
    "Gradual Info",
  ],
  category: "Marketing Digital e Tecnologia",
  language: "pt-BR",
  locale: "pt_BR",
  openGraphLocale: "pt_BR",
  theme: "light", // light, dark or system (first visit, before the user picks)

  // ---- URLs --------------------------------------------------------------
  siteUrl: "https://gradualinfo.com.br",
  siteLogo: "/logo.png",
  socialBanner: "/social-banner.png", // 1200x630, generated from the brand palette
  bannerAlt:
    "Gradual Info — presença digital, conteúdo e sistemas de captação para empresas locais",
  bannerWidth: 1200,
  bannerHeight: 630,

  // ---- Contact -----------------------------------------------------------
  // Empty values are skipped by Header/Footer so no dead links are rendered.
  email: "",
  whatsapp: "https://wa.me/5527999999999",
  whatsappLabel: "+55 27 99999-9999",
  whatsappMessage:
    "Olá, quero um diagnóstico do meu negócio",
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