import "./globals.css";
import { cx } from "@/src/utils";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Header from "@/src/components/Header";
import Footer from "../components/Footer";
import siteMetadata from "../utils/siteMetaData";
import { organizationSchema } from "../utils/structuredData";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-in",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mr",
});

const banner = {
  url: siteMetadata.socialBanner,
  width: siteMetadata.bannerWidth,
  height: siteMetadata.bannerHeight,
  alt: siteMetadata.bannerAlt,
};

// Only platforms the brand actually has a profile on, so no dead links ship.
const socialProfiles = [
  ["instagram", siteMetadata.instagram],
  ["facebook", siteMetadata.facebook],
  ["linkedin", siteMetadata.linkedin],
  ["youtube", siteMetadata.youtube],
  ["twitter", siteMetadata.twitter],
  ["github", siteMetadata.github],
  ["dribbble", siteMetadata.dribbble],
].filter(([, url]) => Boolean(url));

export const metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: {
    template: siteMetadata.titleTemplate,
    default: siteMetadata.homepageTitle,
  },
  description: siteMetadata.description,
  applicationName: siteMetadata.title,
  authors: [{ name: siteMetadata.author, url: siteMetadata.siteUrl }],
  creator: siteMetadata.author,
  publisher: siteMetadata.title,
  keywords: siteMetadata.keywords,
  category: siteMetadata.category,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteMetadata.homepageTitle,
    description: siteMetadata.description,
    url: siteMetadata.siteUrl,
    siteName: siteMetadata.title,
    images: [banner],
    locale: siteMetadata.openGraphLocale,
    alternateLocale: [siteMetadata.locale.replace("_", "-")],
    type: "website",
    determiner: "brand",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    card: "summary_large_image",
    title: siteMetadata.homepageTitle,
    description: siteMetadata.description,
    images: [banner],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    ...(socialProfiles.length
      ? {
          other: Object.fromEntries(
            socialProfiles.map(([platform]) => [`me:${platform}`, siteMetadata[platform]])
          ),
        }
      : {}),
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6ff" },
    { media: "(prefers-color-scheme: dark)", color: "#06070d" },
  ],
};

// Runs synchronously while the browser parses <head>, so the correct theme is
// applied before the first paint. It also mutates <html> before React hydrates,
// which is why <html> carries suppressHydrationWarning below.
const themeScript = `(function(){try{
  var t = localStorage.getItem('theme');
  if (!t) {
    t = '${siteMetadata.theme}';
    if (t === 'system') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  }
  document.documentElement.classList.toggle('dark', t === 'dark');
}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang={siteMetadata.language} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema()),
          }}
        />
      </head>
      <body
        className={cx(
          inter.variable,
          jakarta.variable,
          "font-mr bg-light dark:bg-dark"
        )}
      >
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
