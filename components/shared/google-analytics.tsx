import Script from 'next/script';
import { env } from '@/lib/env';

/**
 * components/shared/google-analytics.tsx — Google Analytics (GA4) via gtag.js
 *
 * Por que este componente existe
 * - O gtag.js precisa ser carregado de forma assíncrona sem bloquear o FCP
 *   ou o LCP da página.
 * - Usamos o componente nativo `Script` do Next.js com a estratégia
 *   `afterInteractive`, que gerencia deduplicação e execução segura no browser.
 * - O Measurement ID vem de `env.gaMeasurementId` (configurável via
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID ou padrão de produção).
 */
export function GoogleAnalytics() {
  const measurementId = env.gaMeasurementId;

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
